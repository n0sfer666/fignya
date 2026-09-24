use std::{env, fs, path::PathBuf};
use tauri::{http::Response, WebviewUrl, WebviewWindowBuilder};

fn mime(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn required(name: &str) -> String {
    env::var(name).unwrap_or_else(|_| panic!("{name} env is required"))
}

fn main() {
    let dist = PathBuf::from(required("DIST_DIR"));
    let result_file = required("RESULT_FILE");
    let scenario = required("SCENARIO");

    tauri::Builder::default()
        .register_uri_scheme_protocol("fignya", move |_ctx, request| {
            let path = request.uri().path();
            if path == "/__report" {
                let _ = fs::write(&result_file, request.uri().query().unwrap_or(""));
                return Response::builder().body(b"ok".to_vec()).unwrap();
            }
            match fs::read(dist.join(path.trim_start_matches('/'))) {
                Ok(body) => Response::builder().header("Content-Type", mime(path)).body(body).unwrap(),
                Err(_) => Response::builder().status(404).body(Vec::new()).unwrap(),
            }
        })
        .setup(move |app| {
            let url = format!("fignya://localhost/{scenario}").parse()?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::CustomProtocol(url))
                .title("s1-tauri")
                .inner_size(1440.0, 900.0)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri app failed");
}
