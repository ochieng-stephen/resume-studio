import { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settingsStore";

export function usePrefersDark() {
  const themeSetting = useSettingsStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (themeSetting === "dark") return true;
  if (themeSetting === "light") return false;
  return systemDark;
}
