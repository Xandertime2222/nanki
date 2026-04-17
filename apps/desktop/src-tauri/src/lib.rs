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
    for cmd in &["python", "python3", "py"] {
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
            // Register HTTP plugin for fetch requests
            app.handle().plugin(tauri_plugin_http::init())?;

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
                    log::warn!("Python not found on PATH - backend will not be started");
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
            
            // Try multiple possible backend locations
            let possible_paths = vec![
                exe_dir.join("backend/python-core/run.py"),
                std::path::PathBuf::from("../../backend/python-core/run.py"),
                std::path::PathBuf::from("backend/python-core/run.py"),
            ];

            let backend_script = possible_paths
                .into_iter()
                .find(|p| p.exists())
                .unwrap_or_else(|| std::path::PathBuf::from("backend/python-core/run.py"));

            log::info!("Starting backend: {} {}", python, backend_script.display());

            let child = Command::new(&python)
                .arg(&backend_script)
                .env("NANKI_PORT", "8642")
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
                    }
                }
                Err(e) => {
                    log::error!("Failed to start Python backend: {}", e);
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