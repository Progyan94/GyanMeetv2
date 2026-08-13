// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
  tauri_plugin_deep_link::prepare("com.gyanmeet.app");
  
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle();
      
      // Handle when app is already running
      let handle_clone = handle.clone();
      tauri_plugin_deep_link::register(
        "gyanmeet",
        move |request| {
          dbg!(&request);
          handle_clone.emit_all("scheme-request-received", request).unwrap();
        },
      )
      .unwrap_or_else(|err| {
        #[cfg(debug_assertions)]
        eprintln!("Deep link error: {}", err);
      });
      
      // Handle when app is launched for the first time via deep link
      let args: Vec<String> = std::env::args().collect();
      if let Some(url) = args.iter().find(|arg| arg.starts_with("gyanmeet://")) {
        let url_clone = url.clone();
        tauri::async_runtime::spawn(async move {
          // Wait for frontend to load
          tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
          handle.emit_all("scheme-request-received", url_clone).unwrap();
        });
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
