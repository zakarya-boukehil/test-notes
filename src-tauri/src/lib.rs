use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

#[tauri::command]
fn install_update(installer_path: String) -> Result<(), String> {
    println!("[Tauri] Lancement de l'installateur : {} avec /S", installer_path);
    std::process::Command::new(&installer_path)
        .arg("/S")
        .spawn()
        .map_err(|e| format!("Impossible de démarrer l'installateur: {}", e))?;

    // Quitter l'application pour permettre au Setup d'écraser les fichiers
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(None)))
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![install_update])
        .setup(|app| {
            let app_handle = app.handle().clone();
            start_backend_server(&app_handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    let state = window.state::<ServerProcess>();
                    if let Ok(mut lock) = state.0.lock() {
                        if let Some(mut child) = lock.take() {
                            println!("[Tauri] Arrêt du processus serveur...");
                            let _ = child.kill();
                        }
                    };
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

fn find_server_script(app_handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let mut candidates = Vec::new();

    // 1. Répertoire des ressources Tauri
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        println!("[Tauri] Resource dir: {:?}", res_dir);
        candidates.push(res_dir.join("dist-server").join("index.cjs"));
        candidates.push(res_dir.join("index.cjs"));
        candidates.push(res_dir.join("_up_").join("dist-server").join("index.cjs"));
    }

    // 2. Répertoire de l'exécutable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            println!("[Tauri] Executable dir: {:?}", exe_dir);
            candidates.push(exe_dir.join("dist-server").join("index.cjs"));
            candidates.push(exe_dir.join("resources").join("dist-server").join("index.cjs"));
            candidates.push(exe_dir.join("resources").join("index.cjs"));
            candidates.push(exe_dir.join("index.cjs"));
        }
    }

    // 3. Répertoire de travail courant
    candidates.push(std::path::PathBuf::from("dist-server").join("index.cjs"));
    candidates.push(std::path::PathBuf::from("..").join("dist-server").join("index.cjs"));

    for c in &candidates {
        if c.exists() {
            println!("[Tauri] ✅ Script serveur trouvé : {:?}", c);
            return Some(c.clone());
        }
    }

    println!("[Tauri] ⚠️ Aucun script serveur trouvé parmi les candidats testés.");
    None
}

fn find_node_binary(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    let mut candidates = Vec::new();

    // 1. Dans les ressources empaquetées
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        candidates.push(res_dir.join("dist-server").join("bin").join("node.exe"));
        candidates.push(res_dir.join("bin").join("node.exe"));
        candidates.push(res_dir.join("_up_").join("dist-server").join("bin").join("node.exe"));
    }

    // 2. À côté de l'exécutable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("dist-server").join("bin").join("node.exe"));
            candidates.push(exe_dir.join("resources").join("dist-server").join("bin").join("node.exe"));
            candidates.push(exe_dir.join("resources").join("bin").join("node.exe"));
            candidates.push(exe_dir.join("bin").join("node.exe"));
            candidates.push(exe_dir.join("node.exe"));
        }
    }

    // 3. Répertoire local de build
    candidates.push(std::path::PathBuf::from("dist-server").join("bin").join("node.exe"));
    candidates.push(std::path::PathBuf::from("..").join("dist-server").join("bin").join("node.exe"));

    // 4. Emplacement standard sous Windows
    candidates.push(std::path::PathBuf::from(r"C:\Program Files\nodejs\node.exe"));
    candidates.push(std::path::PathBuf::from(r"C:\Program Files (x86)\nodejs\node.exe"));

    for c in &candidates {
        if c.exists() {
            println!("[Tauri] ✅ Binaire Node.js trouvé : {:?}", c);
            return c.clone();
        }
    }

    println!("[Tauri] ℹ️ Repli sur la commande système 'node' du PATH");
    std::path::PathBuf::from("node")
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

    let server_script = match find_server_script(app_handle) {
        Some(script) => script,
        None => {
            // Mode fallback dev tsx
            let fallback_script = std::path::PathBuf::from("server/index.ts");
            if fallback_script.exists() {
                println!("[Tauri] Mode développement : tentative avec npx tsx server/index.ts");
                let mut cmd = std::process::Command::new("npx");
                cmd.args(["tsx", "server/index.ts"]);
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000);
                }
                if let Ok(child) = cmd.spawn() {
                    let state = app_handle.state::<ServerProcess>();
                    if let Ok(mut lock) = state.0.lock() {
                        *lock = Some(child);
                    };
                }
                return;
            }
            println!("[Tauri] ❌ Erreur : aucun script de serveur trouvé.");
            return;
        }
    };

    let node_bin = find_node_binary(app_handle);
    let mut cmd = std::process::Command::new(node_bin);
    cmd.arg(&server_script);

    if let Some(parent) = server_script.parent() {
        cmd.current_dir(parent);
    }

    cmd.env("NODE_ENV", "production");
    cmd.env("PORT", "3001");

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.spawn() {
        Ok(child) => {
            println!("[Tauri] Serveur backend lancé avec PID {}", child.id());
            let state = app_handle.state::<ServerProcess>();
            if let Ok(mut lock) = state.0.lock() {
                *lock = Some(child);
            };

            // Attendre brièvement que le serveur démarre (jusqu'à 2 secondes)
            for _ in 0..20 {
                std::thread::sleep(Duration::from_millis(100));
                if TcpStream::connect_timeout(
                    &"127.0.0.1:3001".parse().unwrap(),
                    Duration::from_millis(100),
                ).is_ok() {
                    println!("[Tauri] ✅ Serveur backend Hono opérationnel sur http://127.0.0.1:3001");
                    break;
                }
            }
        }
        Err(e) => {
            println!("[Tauri] ❌ Échec du lancement du serveur backend : {}", e);
        }
    }
}
