import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { EditorArea } from "./components/EditorArea";
import { PreviewPanel } from "./components/PreviewPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { FileContextMenu } from "./components/FileContextMenu";
import { CommandPalette } from "./components/CommandPalette";
import { ComparePicker } from "./components/ComparePicker";
import { JobCaptureModal } from "./components/JobCaptureModal";
import { GitHistoryPicker } from "./components/GitHistoryPicker";
import { SettingsModal } from "./components/SettingsModal";
import { useUIStore } from "./store/uiStore";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useTreeStore } from "./store/treeStore";
import { useSettingsStore } from "./store/settingsStore";

function App() {
  const {
    sidebarVisible,
    terminalVisible,
    previewVisible,
    toggleSidebar,
    toggleTerminal,
    togglePreview,
  } = useUIStore();
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    const unlisten = listen<string>("menu-action", (event) => {
      switch (event.payload) {
        case "toggle_sidebar":
          toggleSidebar();
          break;
        case "toggle_terminal":
          toggleTerminal();
          break;
        case "toggle_preview":
          togglePreview();
          break;
        case "open_folder":
          useWorkspaceStore.getState().openFolder();
          break;
        case "new_file": {
          const root = useWorkspaceStore.getState().rootPath;
          if (root) useTreeStore.getState().startCreate(root, "create-file");
          break;
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [toggleSidebar, toggleTerminal, togglePreview]);

  return (
    <div className="flex h-screen w-screen flex-col">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && <Sidebar />}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <EditorArea />
            {previewVisible && <PreviewPanel />}
          </div>
          <div className={terminalVisible ? "flex shrink-0 flex-col" : "hidden"}>
            <TerminalPanel />
          </div>
        </div>
      </div>
      <FileContextMenu />
      <CommandPalette />
      <ComparePicker />
      <JobCaptureModal />
      <GitHistoryPicker />
      <SettingsModal />
    </div>
  );
}

export default App;
