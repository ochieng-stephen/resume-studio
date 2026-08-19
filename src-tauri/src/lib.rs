mod fs_commands;
mod git;
mod pty;
mod workspace;

use tauri::menu::{Menu, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "Résumé Studio")
        .about(None)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("open_folder", "Open Folder…").build(app)?)
        .item(
            &MenuItemBuilder::with_id("new_file", "New File")
                .accelerator("CmdOrCtrl+N")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("save_file", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .separator()
        .close_window()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_terminal", "Toggle Terminal")
                .accelerator("CmdOrCtrl+J")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_preview", "Toggle Preview")
                .accelerator("CmdOrCtrl+Alt+P")
                .build(app)?,
        )
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;

    Menu::with_items(
        app,
        &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::PtyState::default())
        .manage(workspace::WatcherState::default())
        .setup(|app| {
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("menu-action", event.id().0.clone());
        })
        .invoke_handler(tauri::generate_handler![
            fs_commands::list_dir,
            fs_commands::read_text_file,
            fs_commands::write_text_file,
            fs_commands::write_binary_file,
            fs_commands::create_file,
            fs_commands::create_dir,
            fs_commands::rename_entry,
            fs_commands::delete_entry,
            fs_commands::copy_file_into,
            fs_commands::reveal_in_finder,
            fs_commands::search_workspace,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
            workspace::is_resume_workspace,
            workspace::scaffold_workspace,
            workspace::watch_workspace,
            git::git_snapshot,
            git::git_file_history,
            git::git_show_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
