use std::process::{Command, Output};

pub fn whoami() -> String {
    let output: Output = Command::new("whoami")
        .output()
        .expect("failed to execute process");

    if cfg!(windows) {
        let info: String = String::from_utf8(output.stdout).unwrap();
        let username: &str = info.split("\\").collect::<Vec<&str>>()[1];
        return String::from(username);
    } else if cfg!(linux) {
        let username: String = String::from_utf8(output.stdout).unwrap();
        return username;
    } else if cfg!(macos) {
        let username: String = String::from_utf8(output.stdout).unwrap();
        return username;
    } else {
        panic!("Error");
    }
}
