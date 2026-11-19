use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(None)))
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            start_backend_server(&app_handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<ServerProcess>();
                if let Ok(mut lock) = state.0.lock() {
                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                    }
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

fn start_backend_server(app_handle: &tauri::AppHandle) {
    use std::net::TcpStream;
    use std::time::Duration;

    // Si le serveur écoute déjà sur le port 3001, rien à faire
    if TcpStream::connect_timeout(
        &"127.0.0.1:3001".parse().unwrap(),
        Duration::from_millis(500),
    ).is_ok() {
        println!("[Tauri] Le serveur backend est déjà en cours d'exécution sur http://127.0.0.1:3001");
        return;
    }

    println!("[Tauri] Démarrage du serveur backend Node.js / Hono...");

    let mut cmd = std::process::Command::new("node");
    
    // Déterminer le script de serveur à exécuter
    let resource_dir = app_handle.path().resource_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let dist_server = resource_dir.join("server").join("dist").join("index.cjs");
    let fallback_script = std::path::PathBuf::from("server/index.ts");

    if dist_server.exists() {
        cmd.arg(&dist_server);
    } else if fallback_script.exists() {
        cmd = std::process::Command::new("npx");
        cmd.args(["tsx", "server/index.ts"]);
    } else {
        println!("[Tauri] Aucune source de serveur trouvée.");
        return;
    }

    match cmd.spawn() {
        Ok(child) => {
            println!("[Tauri] Serveur backend lancé avec PID {}", child.id());
            let state = app_handle.state::<ServerProcess>();
            if let Ok(mut lock) = state.0.lock() {
                *lock = Some(child);
            };
        }
        Err(e) => {
            println!("[Tauri] Note: Serveur Node géré séparément ou introuvable : {}", e);
        }
    }
}
