use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

const BRIDGE: &str = include_str!("../browser-bridge.js");
static DOCUMENT_ID: AtomicU64 = AtomicU64::new(1);

// Os componentes e geradores originais continuam usando as APIs do navegador.
// Só o invólucro desktop adapta essas operações ao sistema operacional.
#[tauri::command]
async fn save_export(window: WebviewWindow, name: String, bytes: Vec<u8>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        // O nome é apenas uma sugestão: a gravação exige a escolha no diálogo.
        let name = name.rsplit(['/', '\\']).next().unwrap_or("exportacao");
        let selected = window
            .dialog()
            .file()
            .set_parent(&window)
            .set_file_name(name)
            .blocking_save_file();
        let Some(selected) = selected else {
            return Ok(false);
        };
        let path = selected.into_path().map_err(|error| error.to_string())?;
        std::fs::write(path, bytes).map_err(|error| error.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn open_report(app: tauri::AppHandle, html: String) -> Result<(), String> {
    let label = format!("document-{}", DOCUMENT_ID.fetch_add(1, Ordering::Relaxed));
    // Uma página local mantém a origem segura e o IPC também nos relatórios.
    // JSON evita interpretar o conteúdo do relatório como código do invólucro.
    let html = serde_json::to_string(&html).map_err(|error| error.to_string())?;
    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("desktop-report.html".into()))
        .title("GeoSPT — Relatório")
        .inner_size(1100.0, 850.0)
        .initialization_script(BRIDGE)
        .initialization_script(format!(
            "window.addEventListener('DOMContentLoaded', () => {{ document.open(); document.write({html}); document.close(); }}, {{ once: true }});"
        ))
        .on_document_title_changed(|window, title| {
            let _ = window.set_title(&title);
        })
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
async fn open_manual(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("manual") {
        window.set_focus().map_err(|error| error.to_string())?;
    } else {
        WebviewWindowBuilder::new(&app, "manual", WebviewUrl::App("manual.html".into()))
            .title("GeoSPT — Manual")
            .inner_size(1200.0, 850.0)
            .build()
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn print_document(window: WebviewWindow) -> Result<(), String> {
    window.print().map_err(|error| error.to_string())
}

#[tauri::command]
async fn close_document(window: WebviewWindow) -> Result<(), String> {
    if window.label().starts_with("document-") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn desktop_error(window: WebviewWindow, message: String) {
    window
        .dialog()
        .message(message)
        .title("GeoSPT")
        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
        .show(|_| {});
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_export,
            open_report,
            open_manual,
            print_document,
            close_document,
            desktop_error,
        ])
        .setup(|app| {
            let config = &app.config().app.windows[0];
            WebviewWindowBuilder::from_config(app, config)?
                .initialization_script(BRIDGE)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o GeoSPT");
}
