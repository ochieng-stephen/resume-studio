use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const HIDDEN_NAMES: [&str; 3] = [".git", ".DS_Store", "node_modules"];
const SEARCH_EXCLUDED_DIRS: [&str; 3] = [".git", "node_modules", "target"];
const SEARCH_MAX_RESULTS: usize = 300;
const SEARCH_MAX_FILE_SIZE: u64 = 2 * 1024 * 1024;

#[derive(Serialize, Clone)]
pub struct DirEntryInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut items: Vec<DirEntryInfo> = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if HIDDEN_NAMES.contains(&file_name.as_str()) {
                return None;
            }
            let metadata = entry.metadata().ok()?;
            Some(DirEntryInfo {
                name: file_name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
            })
        })
        .collect();
    items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(items)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("A file or folder with that name already exists".into());
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("A file or folder with that name already exists".into());
    }
    fs::create_dir(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_entry(from: String, to: String) -> Result<(), String> {
    if Path::new(&to).exists() {
        return Err("A file or folder with that name already exists".into());
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn copy_file_into(source: String, dest_dir: String) -> Result<String, String> {
    let source_path = Path::new(&source);
    let file_name = source_path
        .file_name()
        .ok_or_else(|| "Source has no file name".to_string())?;
    let dest_dir_path = Path::new(&dest_dir);
    if !dest_dir_path.exists() {
        fs::create_dir_all(dest_dir_path).map_err(|e| e.to_string())?;
    }

    let stem = source_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = source_path
        .extension()
        .map(|e| e.to_string_lossy().to_string());

    let mut dest_path = dest_dir_path.join(file_name);
    let mut counter = 1;
    while dest_path.exists() {
        let candidate_name = match &ext {
            Some(e) => format!("{} ({}).{}", stem, counter, e),
            None => format!("{} ({})", stem, counter),
        };
        dest_path = dest_dir_path.join(candidate_name);
        counter += 1;
    }

    fs::copy(&source, &dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct SearchMatch {
    pub path: String,
    pub line_number: usize,
    pub line_text: String,
}

#[tauri::command]
pub fn search_workspace(root: String, query: String) -> Result<Vec<SearchMatch>, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(vec![]);
    }
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    let mut stack: Vec<PathBuf> = vec![PathBuf::from(&root)];

    while let Some(dir) = stack.pop() {
        if results.len() >= SEARCH_MAX_RESULTS {
            break;
        }
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            if metadata.is_dir() {
                if !SEARCH_EXCLUDED_DIRS.contains(&name.as_str()) {
                    stack.push(path);
                }
                continue;
            }
            if metadata.len() > SEARCH_MAX_FILE_SIZE {
                continue;
            }
            let contents = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            for (idx, line) in contents.lines().enumerate() {
                if line.to_lowercase().contains(&query_lower) {
                    results.push(SearchMatch {
                        path: path.to_string_lossy().to_string(),
                        line_number: idx + 1,
                        line_text: line.trim().chars().take(200).collect(),
                    });
                    if results.len() >= SEARCH_MAX_RESULTS {
                        break;
                    }
                }
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_finds_matches_case_insensitively_and_skips_excluded_dirs() {
        let dir = std::env::temp_dir().join(format!("resume-studio-search-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("tracker")).unwrap();
        fs::create_dir_all(dir.join("node_modules/some-pkg")).unwrap();
        fs::create_dir_all(dir.join(".git")).unwrap();

        fs::write(
            dir.join("tracker/dashboard.md"),
            "# Dashboard\nResponse Rate: 40%\nPython roles performed best\n",
        )
        .unwrap();
        fs::write(
            dir.join("node_modules/some-pkg/index.js"),
            "PYTHON PYTHON PYTHON should never be found",
        )
        .unwrap();
        fs::write(dir.join(".git/HEAD"), "python").unwrap();

        let results = search_workspace(dir.to_string_lossy().to_string(), "python".to_string())
            .unwrap();

        assert_eq!(results.len(), 1, "expected exactly one match outside excluded dirs");
        assert!(results[0].path.ends_with("tracker/dashboard.md"));
        assert_eq!(results[0].line_number, 3);
        assert_eq!(results[0].line_text, "Python roles performed best");

        // Case-insensitive query must still match a differently-cased query string.
        let results_upper =
            search_workspace(dir.to_string_lossy().to_string(), "PYTHON".to_string()).unwrap();
        assert_eq!(results_upper.len(), 1);

        // Empty query must return no results, not an error or a dump of every line.
        let empty = search_workspace(dir.to_string_lossy().to_string(), "  ".to_string()).unwrap();
        assert!(empty.is_empty());

        fs::remove_dir_all(&dir).unwrap();
    }
}
