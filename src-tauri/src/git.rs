use serde::Serialize;
use std::path::Path;
use std::process::{Command, Output};

fn run_git(repo_path: &str, args: &[&str]) -> Result<Output, String> {
    Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("git is not available: {e}"))
}

#[tauri::command]
pub fn git_snapshot(path: String, message: String) -> Result<String, String> {
    if !Path::new(&path).join(".git").exists() {
        let init = run_git(&path, &["init"])?;
        if !init.status.success() {
            return Err(String::from_utf8_lossy(&init.stderr).to_string());
        }
    }

    let add = run_git(&path, &["add", "-A"])?;
    if !add.status.success() {
        return Err(String::from_utf8_lossy(&add.stderr).to_string());
    }

    let msg = if message.trim().is_empty() {
        "Snapshot".to_string()
    } else {
        message
    };
    let commit = run_git(&path, &["commit", "-m", &msg])?;
    if commit.status.success() {
        Ok("Snapshot saved".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&commit.stderr);
        let stdout = String::from_utf8_lossy(&commit.stdout);
        if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") {
            Ok("No changes to snapshot".to_string())
        } else if stderr.trim().is_empty() {
            Err(stdout.to_string())
        } else {
            Err(stderr.to_string())
        }
    }
}

#[derive(Serialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub date: String,
    pub message: String,
}

#[tauri::command]
pub fn git_file_history(
    repo_path: String,
    relative_path: String,
) -> Result<Vec<GitLogEntry>, String> {
    let output = run_git(
        &repo_path,
        &[
            "log",
            "--follow",
            "--date=short",
            "--format=%H|%ad|%s",
            "--",
            &relative_path,
        ],
    )?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let entries = text
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(3, '|');
            let hash = parts.next()?.to_string();
            let date = parts.next()?.to_string();
            let message = parts.next().unwrap_or("").to_string();
            Some(GitLogEntry {
                hash,
                date,
                message,
            })
        })
        .collect();
    Ok(entries)
}

#[tauri::command]
pub fn git_show_file(
    repo_path: String,
    commit: String,
    relative_path: String,
) -> Result<String, String> {
    let output = run_git(&repo_path, &["show", &format!("{commit}:{relative_path}")])?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn configured_test_repo() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("resume-studio-git-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.to_string_lossy().to_string();
        // A fresh CI/sandbox environment may have no git identity configured;
        // set a local one so `git commit` doesn't fail for an unrelated reason.
        run_git(&path, &["init"]).unwrap();
        run_git(&path, &["config", "user.email", "test@example.com"]).unwrap();
        run_git(&path, &["config", "user.name", "Test"]).unwrap();
        dir
    }

    #[test]
    fn snapshot_init_commit_history_and_show_roundtrip() {
        let dir = configured_test_repo();
        let path = dir.to_string_lossy().to_string();

        fs::write(dir.join("resume.md"), "# Version 1\n").unwrap();
        let first = git_snapshot(path.clone(), "First version".to_string()).unwrap();
        assert_eq!(first, "Snapshot saved");

        // No changes since last snapshot must be reported, not treated as an error.
        let noop = git_snapshot(path.clone(), "Nothing changed".to_string()).unwrap();
        assert_eq!(noop, "No changes to snapshot");

        fs::write(dir.join("resume.md"), "# Version 2\n").unwrap();
        let second = git_snapshot(path.clone(), "Second version".to_string()).unwrap();
        assert_eq!(second, "Snapshot saved");

        let history = git_file_history(path.clone(), "resume.md".to_string()).unwrap();
        assert_eq!(history.len(), 2, "expected two commits touching resume.md");
        assert_eq!(history[0].message, "Second version");
        assert_eq!(history[1].message, "First version");

        let old_content =
            git_show_file(path.clone(), history[1].hash.clone(), "resume.md".to_string()).unwrap();
        assert_eq!(old_content, "# Version 1\n");

        let new_content =
            git_show_file(path, history[0].hash.clone(), "resume.md".to_string()).unwrap();
        assert_eq!(new_content, "# Version 2\n");

        fs::remove_dir_all(&dir).unwrap();
    }
}
