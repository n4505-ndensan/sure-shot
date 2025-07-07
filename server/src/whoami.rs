use std::process::{Command, Output};

pub fn whoami() -> Result<String, Box<dyn std::error::Error>> {
    let output: Output = Command::new("whoami")
        .output()
        .map_err(|e| format!("Failed to execute whoami command: {}", e))?;

    if cfg!(target_os = "windows") {
        let info: String = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse whoami output: {}", e))?;
        let username: &str = info.split("\\").collect::<Vec<&str>>()[1];
        return Ok(String::from(username));
    } else if cfg!(target_os = "linux") {
        let username: String = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse whoami output: {}", e))?;
        return Ok(username.trim().to_string());
    } else if cfg!(target_os = "macos") {
        let username: String = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse whoami output: {}", e))?;
        return Ok(username.trim().to_string());
    } else {
        return Err("Unsupported operating system".into());
    }
}
