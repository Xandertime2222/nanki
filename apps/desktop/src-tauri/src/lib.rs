use std::sync::Mutex;
use std::process::{Command, Child};
use std::time::Duration;
use std::thread;
use tauri::Manager;

struct BackendState {
    child: Option<Child>,
}

struct AppState {
    backend: Mutex<BackendState>,
}

#[tauri::command]
fn backend_status() -> String {
    match reqwest::blocking::Client::new()
        .get("http://localhost:8642/health")
        .timeout(Duration::from_secs(2))
        .send()
    {
        Ok(resp) if resp.status().is_success() => "running".into(),
        _ => "unreachable".into(),
    }
}

fn wait_for_backend(max_retries: u32, interval_ms: u64) -> bool {
    let client = reqwest::blocking::Client::new();
    for _ in 0..max_retries {
        if let Ok(resp) = client
            .get("http://localhost:8642/health")
            .timeout(Duration::from_secs(2))
            .send()
        {
            if resp.status().is_success() {
                return true;
            }
        }
        thread::sleep(Duration::from_millis(interval_ms));
    }
    false
}

fn find_python() -> Option<String> {
    // Windows: try py launcher first, then python
    #[cfg(windows)]
    {
        if Command::new("py")
            .arg("--version")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .is_ok()
        {
            return Some("py".to_string());
        }
    }
    
    for cmd in &["python", "python3"] {
        if Command::new(cmd)
            .arg("--version")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .is_ok()
        {
            return Some(cmd.to_string());
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.handle().plugin(tauri_plugin_shell::init())?;

            // Check if backend is already running (for dev mode)
            let backend_already_running = wait_for_backend(1, 100);
            
            if backend_already_running {
                log::info!("Backend already running on port 8642");
                app.manage(AppState {
                    backend: Mutex::new(BackendState { child: None }),
                });
                return Ok(());
            }

            // Start backend only if not running
            let python = match find_python() {
                Some(p) => p,
                None => {
                    log::warn!("Python not found on PATH - backend will not be started. Please ensure Python 3.12+ is installed and in PATH.");
                    app.manage(AppState {
                        backend: Mutex::new(BackendState { child: None }),
                    });
                    return Ok(());
                }
            };

            log::info!("Found Python: {}", python);

            // Resolve backend path relative to app executable
            let exe_path = std::env::current_exe().unwrap_or_else(|_| ".".into());
            let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
            
            // Platform-specific paths
            #[cfg(windows)]
            let possible_paths = vec![
                exe_dir.join("backend").join("python-core").join("run.py"),
                exe_dir.join("..").join("backend").join("python-core").join("run.py"),
                exe_dir.join("..").join("..").join("backend").join("python-core").join("run.py"),
            ];
            
            #[cfg(not(windows))]
            let possible_paths = vec![
                exe_dir.join("backend/python-core/run.py"),
                exe_dir.join("../backend/python-core/run.py"),
                exe_dir.join("../../backend/python-core/run.py"),
            ];

            let backend_script = possible_paths
                .into_iter()
                .find(|p| p.exists())
                .unwrap_or_else(|| {
                    log::warn!("Backend script not found in any location, using default path");
                    exe_dir.join("backend/python-core/run.py")
                });

            log::info!("Starting backend: {} {}", python, backend_script.display());
            log::info!("Working directory: {:?}", std::env::current_dir());

            // Set working directory to backend location
            let backend_dir = backend_script.parent().unwrap_or(std::path::Path::new("."));

            let child = Command::new(&python)
                .arg(&backend_script)
                .env("NANKI_PORT", "8642")
                .current_dir(backend_dir)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn();

            match child {
                Ok(c) => {
                    app.manage(AppState {
                        backend: Mutex::new(BackendState { child: Some(c) }),
                    });
                    log::info!("Waiting for backend to become ready...");
                    let ready = wait_for_backend(60, 500);
                    if ready {
                        log::info!("Backend is ready on port 8642");
                    } else {
                        log::error!("Backend failed to start within 30 seconds");
                        log::error!("Make sure Python 3.12+ is installed and all dependencies are available.");
                        log::error!("Run: pip install -r backend/python-core/requirements.txt");
                    }
                }
                Err(e) => {
                    log::error!("Failed to start Python backend: {}", e);
                    log::error!("Make sure Python is installed and accessible from PATH.");
                    app.manage(AppState {
                        backend: Mutex::new(BackendState { child: None }),
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![backend_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}