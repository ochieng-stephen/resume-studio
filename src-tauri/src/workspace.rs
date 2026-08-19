use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct WatcherState(pub Mutex<Option<RecommendedWatcher>>);

const CLAUDE_MD: &str = include_str!("../scaffold/CLAUDE.md");
const PROFILE_JSON: &str = include_str!("../scaffold/profile.json");
const CLAUDE_SETTINGS: &str = include_str!("../scaffold/claude/settings.json");
const OUTPUT_STYLE: &str = include_str!("../scaffold/claude/output-styles/job-search.md");
const SKILL_SEARCH: &str = include_str!("../scaffold/claude/skills/search/SKILL.md");
const SKILL_TAILOR: &str = include_str!("../scaffold/claude/skills/tailor/SKILL.md");
const SKILL_COVER_LETTER: &str = include_str!("../scaffold/claude/skills/cover-letter/SKILL.md");
const SKILL_TRACKER: &str = include_str!("../scaffold/claude/skills/tracker/SKILL.md");
const SKILL_STRATEGY: &str = include_str!("../scaffold/claude/skills/strategy/SKILL.md");
const SKILL_AUTOPILOT: &str = include_str!("../scaffold/claude/skills/autopilot/SKILL.md");
const TEMPLATE_FULLTIME: &str =
    include_str!("../scaffold/templates/cover-letter-templates/fulltime-swe.md");
const TEMPLATE_CONTRACT: &str =
    include_str!("../scaffold/templates/cover-letter-templates/contract-freelance.md");
const TEMPLATE_AI_TRAINING: &str =
    include_str!("../scaffold/templates/cover-letter-templates/ai-training.md");
const STRATEGY_LEARNINGS: &str = include_str!("../scaffold/strategy/learnings.md");
const STRATEGY_KEYWORDS: &str = include_str!("../scaffold/strategy/keyword-performance.md");
const STRATEGY_PLATFORMS: &str = include_str!("../scaffold/strategy/platform-notes.md");
const TRACKER_DASHBOARD: &str = include_str!("../scaffold/tracker/dashboard.md");

fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn ensure_file(path: &Path, contents: &str) -> Result<(), String> {
    if !path.exists() {
        if let Some(parent) = path.parent() {
            ensure_dir(parent)?;
        }
        fs::write(path, contents).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn is_resume_workspace(path: String) -> bool {
    let base = Path::new(&path);
    base.join("CLAUDE.md").exists() && base.join(".claude").join("skills").exists()
}

#[tauri::command]
pub fn scaffold_workspace(path: String) -> Result<(), String> {
    let base = Path::new(&path);

    for dir in [
        "my-current-cvs",
        "my-current-resumes",
        "generated/tailored-cvs",
        "generated/tailored-resumes",
        "generated/cover-letters",
        "templates/cover-letter-templates",
        "tracker",
        "strategy",
        "tasks",
        ".claude/skills/search",
        ".claude/skills/tailor",
        ".claude/skills/cover-letter",
        ".claude/skills/tracker",
        ".claude/skills/strategy",
        ".claude/skills/autopilot",
        ".claude/output-styles",
    ] {
        ensure_dir(&base.join(dir))?;
    }

    ensure_file(&base.join("CLAUDE.md"), CLAUDE_MD)?;
    ensure_file(&base.join("profile.json"), PROFILE_JSON)?;
    ensure_file(&base.join(".claude/settings.json"), CLAUDE_SETTINGS)?;
    ensure_file(&base.join(".claude/output-styles/job-search.md"), OUTPUT_STYLE)?;
    ensure_file(&base.join(".claude/skills/search/SKILL.md"), SKILL_SEARCH)?;
    ensure_file(&base.join(".claude/skills/tailor/SKILL.md"), SKILL_TAILOR)?;
    ensure_file(
        &base.join(".claude/skills/cover-letter/SKILL.md"),
        SKILL_COVER_LETTER,
    )?;
    ensure_file(&base.join(".claude/skills/tracker/SKILL.md"), SKILL_TRACKER)?;
    ensure_file(&base.join(".claude/skills/strategy/SKILL.md"), SKILL_STRATEGY)?;
    ensure_file(
        &base.join(".claude/skills/autopilot/SKILL.md"),
        SKILL_AUTOPILOT,
    )?;
    ensure_file(
        &base.join("templates/cover-letter-templates/fulltime-swe.md"),
        TEMPLATE_FULLTIME,
    )?;
    ensure_file(
        &base.join("templates/cover-letter-templates/contract-freelance.md"),
        TEMPLATE_CONTRACT,
    )?;
    ensure_file(
        &base.join("templates/cover-letter-templates/ai-training.md"),
        TEMPLATE_AI_TRAINING,
    )?;
    ensure_file(&base.join("strategy/learnings.md"), STRATEGY_LEARNINGS)?;
    ensure_file(
        &base.join("strategy/keyword-performance.md"),
        STRATEGY_KEYWORDS,
    )?;
    ensure_file(&base.join("strategy/platform-notes.md"), STRATEGY_PLATFORMS)?;
    ensure_file(&base.join("tracker/dashboard.md"), TRACKER_DASHBOARD)?;

    let tracker_json_path = base.join("tracker/applications.json");
    if !tracker_json_path.exists() {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let contents = format!(
            "{{\n  \"version\": 1,\n  \"lastUpdated\": \"{}\",\n  \"applications\": []\n}}\n",
            today
        );
        fs::write(&tracker_json_path, contents).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn watch_workspace(
    path: String,
    app: AppHandle,
    state: State<WatcherState>,
) -> Result<(), String> {
    let app_handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            let paths: Vec<String> = event
                .paths
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            if !paths.is_empty() {
                let _ = app_handle.emit("workspace-changed", paths);
            }
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.0.lock().unwrap() = Some(watcher);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scaffold_creates_expected_structure_and_is_idempotent() {
        let dir = std::env::temp_dir().join(format!("resume-studio-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.to_string_lossy().to_string();

        assert!(!is_resume_workspace(path.clone()));

        scaffold_workspace(path.clone()).unwrap();

        assert!(is_resume_workspace(path.clone()));
        assert!(dir.join("profile.json").exists());
        assert!(dir.join("tracker/applications.json").exists());
        assert!(dir.join(".claude/skills/autopilot/SKILL.md").exists());
        assert!(dir
            .join("templates/cover-letter-templates/ai-training.md")
            .exists());

        let tracker_contents = fs::read_to_string(dir.join("tracker/applications.json")).unwrap();
        assert!(tracker_contents.contains("\"applications\": []"));

        // Idempotent: re-running must not clobber existing/edited content.
        fs::write(dir.join("profile.json"), "custom-edited-content").unwrap();
        scaffold_workspace(path.clone()).unwrap();
        let profile = fs::read_to_string(dir.join("profile.json")).unwrap();
        assert_eq!(profile, "custom-edited-content");

        fs::remove_dir_all(&dir).unwrap();
    }
}
