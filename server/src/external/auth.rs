use crate::{AppState, AuthRequest, AuthResponse, AuthorizeDeviceRequest};
use axum::{Json, http::StatusCode, response::IntoResponse, routing};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

// 認証トークンの管理
lazy_static::lazy_static! {
    static ref AUTH_TOKENS: Arc<Mutex<HashMap<String, String>>> = Arc::new(Mutex::new(HashMap::new()));
}

pub fn external_auth(router: routing::Router, app_state: AppState) -> routing::Router {
    let router = router.route("/auth/login", {
        let state = app_state.clone();
        routing::post(move |Json(request): Json<AuthRequest>| {
            let state = state.clone();
            async move { login_handler(state, request).await }
        })
    });

    let router = router.route("/auth/authorize", {
        let state = app_state.clone();
        routing::post(move |Json(request): Json<AuthorizeDeviceRequest>| {
            let state = state.clone();
            async move { authorize_device_handler(state, request).await }
        })
    });

    router
}

async fn login_handler(app_state: AppState, request: AuthRequest) -> impl IntoResponse {
    let config = app_state.config.lock().await;

    println!(
        "Login attempt for device: {} / {}",
        request.device_id, request.password
    );
    if !config.verify_password(&request.password) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                message: "Invalid password".to_string(),
                token: None,
            }),
        );
    }

    if !config.is_device_authorized(&request.device_id) {
        return (
            StatusCode::FORBIDDEN,
            Json(AuthResponse {
                success: false,
                message: "Device not authorized".to_string(),
                token: None,
            }),
        );
    }

    // 認証トークンを生成
    let token = Uuid::new_v4().to_string();
    let mut tokens = AUTH_TOKENS.lock().await;
    tokens.insert(token.clone(), request.device_id.clone());

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            message: "Login successful".to_string(),
            token: Some(token),
        }),
    )
}

async fn authorize_device_handler(
    app_state: AppState,
    request: AuthorizeDeviceRequest,
) -> impl IntoResponse {
    let mut config = app_state.config.lock().await;

    if !config.verify_password(&request.password) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                message: "Invalid password".to_string(),
                token: None,
            }),
        );
    }

    // デバイスを認証済みリストに追加
    config.authorize_device(request.device_id.clone());

    // 設定を保存
    if let Err(e) = config.save() {
        eprintln!("Failed to save config: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(AuthResponse {
                success: false,
                message: "Failed to save authorization".to_string(),
                token: None,
            }),
        );
    }

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            message: "Device authorized successfully".to_string(),
            token: None,
        }),
    )
}

// 認証ミドルウェア用の関数
pub async fn verify_token(token: &str) -> Option<String> {
    let tokens = AUTH_TOKENS.lock().await;
    tokens.get(token).cloned()
}

pub async fn is_device_authorized(app_state: &AppState, device_id: &str) -> bool {
    let config = app_state.config.lock().await;
    config.is_device_authorized(device_id)
}
