use std::process::{Command, Child};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
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
    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_else(|_| reqwest::blocking::Client::new());
    for i in 0..max_retries {
        match client
            .get("http://localhost:8642/health")
            .timeout(Duration::from_secs(2))
            .send()
        {
            Ok(resp) if resp.status().is_success() => {
                log::info!(
                    "Backend responded on attempt {}/{}",
                    i + 1,
                    max_retries
                );
                return true;
            }
            Ok(resp) => {
                log::debug!(
                    "Backend responded with status {} on attempt {}/{}",
                    resp.status(),
                    i + 1,
                    max_retries
                );
            }
            Err(e) => {
                log::debug!(
                    "Backend not ready on attempt {}/{}: {}",
                    i + 1,
                    max_retries,
                    e
                );
            }
        }
        thread::sleep(Duration::from_millis(interval_ms));
    }
    false
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

            // Get executable directory and resource directory
            let exe_path = std::env::current_exe().unwrap_or_else(|_| ".".into());
            let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
            let resources_dir = app
                .handle()
                .path()
                .resource_dir()
                .unwrap_or_else(|_| exe_dir.to_path_buf());

            log::info!("Executable directory: {:?}", exe_dir);
            log::info!("Resources directory: {:?}", resources_dir);

            // Try to find bundled backend executable first (production mode)
            // Tauri sidecar binaries are placed next to the main executable
            #[cfg(windows)]
            let bundled_backend_candidates =
                vec![exe_dir.join("nanki-backend.exe"), resources_dir.join("nanki-backend.exe")];

            #[cfg(not(windows))]
            let bundled_backend_candidates =
                vec![exe_dir.join("nanki-backend"), resources_dir.join("nanki-backend")];

            let bundled_backend = bundled_backend_candidates
                .iter()
                .find(|p| p.exists())
                .map(|p| p.clone());

            if let Some(ref backend_exe) = bundled_backend {
                log::info!("Found bundled backend: {:?}", backend_exe);

                let child = Command::new(backend_exe)
                    .env("NANKI_PORT", "8642")
                    .env("PYTHONUNBUFFERED", "1")
                    .current_dir(
                        backend_exe
                            .parent()
                            .unwrap_or(std::path::Path::new(".")),
                    )
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn();

                match child {
                    Ok(c) => {
                        app.manage(AppState {
                            backend: Mutex::new(BackendState { child: Some(c) }),
                        });
                        log::info!("Waiting for bundled backend to become ready...");
                        let ready = wait_for_backend(60, 500);
                        if ready {
                            log::info!("Backend is ready on port 8642");
                        } else {
                            log::error!(
                                "Bundled backend failed to start within 30 seconds"
                            );
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to start bundled backend: {}", e);
                        app.manage(AppState {
                            backend: Mutex::new(BackendState { child: None }),
                        });
                    }
                }
                return Ok(());
            }

            log::info!(
                "No bundled backend found, falling back to Python interpreter"
            );

            // Fallback to Python interpreter (development mode)
            #[cfg(windows)]
            let python_candidates =
                vec!["py", "python", "python3", "python3.12", "python3.11", "python3.13"];
            #[cfg(not(windows))]
            let python_candidates =
                vec!["python3", "python", "python3.12", "python3.11", "python3.13"];

            let python = python_candidates.iter().find(|cmd| {
                Command::new(cmd)
                    .arg("--version")
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .status()
                    .is_ok()
            }).map(|s| s.to_string());

            let python = match python {
                Some(p) => {
                    log::info!("Found Python interpreter: {}", p);
                    p
                }
                None => {
                    log::error!(
                        "Python interpreter not found. Attempted: {:?}",
                        python_candidates
                    );
                    log::error!("Please install Python 3.11+ and add it to PATH.");
                    log::error!(
                        "Alternatively, build the bundled backend with PyInstaller."
                    );
                    app.manage(AppState {
                        backend: Mutex::new(BackendState { child: None }),
                    });
                    return Ok(());
                }
            };

            // Resolve backend path: try multiple strategies for portability
            #[cfg(windows)]
            let possible_paths = vec![
                resources_dir.join("backend").join("python-core").join("run.py"),
                exe_dir.join("backend").join("python-core").join("run.py"),
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("backend")
                    .join("python-core")
                    .join("run.py"),
            ];

            #[cfg(target_os = "macos")]
            let possible_paths = vec![
                resources_dir.join("backend/python-core/run.py"),
                exe_dir.join("../../Resources/backend/python-core/run.py"),
                exe_dir.join("../../../backend/python-core/run.py"),
            ];

            #[cfg(not(any(windows, target_os = "macos")))]
            let possible_paths = vec![
                exe_dir.join("../share/nanki/backend/python-core/run.py"),
                exe_dir.join("../../share/nanki/backend/python-core/run.py"),
                exe_dir.join("../lib/nanki/backend/python-core/run.py"),
            ];

            let backend_script = possible_paths
                .into_iter()
                .find(|p| p.exists())
                .unwrap_or_else(|| {
                    log::warn!(
                        "Backend script not found in any location, using default path"
                    );
                    exe_dir.join("backend/python-core/run.py")
                });

            log::info!(
                "Starting backend: {} {}",
                python,
                backend_script.display()
            );
            log::info!("Working directory: {:?}", std::env::current_dir());

            // Set working directory to backend location
            let backend_dir =
                backend_script.parent().unwrap_or(std::path::Path::new("."));

            let child = Command::new(&python)
                .args(["-u", backend_script.to_str().unwrap_or("")])
                .env("NANKI_PORT", "8642")
                .env("PYTHONUNBUFFERED", "1")
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
                        log::error!(
                            "Backend failed to start within 30 seconds"
                        );
                        log::error!(
                            "Make sure Python 3.12+ is installed and all dependencies are available."
                        );
                        log::error!(
                            "Run: pip install -r backend/python-core/requirements.txt"
                        );
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