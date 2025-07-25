use crate::{AppState, AuthRequest, AuthResponse};
use axum::{Json, http::HeaderMap, http::StatusCode, response::IntoResponse, routing};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

// 認証トークンの管理
lazy_static::lazy_static! {
    static ref AUTH_TOKENS: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
}

pub fn external_auth(router: routing::Router, app_state: AppState) -> routing::Router {
    let router = router.route("/auth/login", {
        let state = app_state.clone();
        routing::post(move |Json(request): Json<AuthRequest>| {
            let state = state.clone();
            async move { login_handler(state, request).await }
        })
    });

    let router = router.route("/auth/verify", {
        routing::get(move |headers: HeaderMap| async move { verify_token_handler(headers).await })
    });

    router
}

async fn login_handler(app_state: AppState, request: AuthRequest) -> impl IntoResponse {
    let config = app_state.config.lock().await;

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

    // 認証トークンを生成
    let token = Uuid::new_v4().to_string();
    let mut tokens = AUTH_TOKENS.lock().await;
    tokens.push(token.clone());

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            message: "Login successful".to_string(),
            token: Some(token),
        }),
    )
}

// 認証ミドルウェア用の関数
pub async fn verify_token(token: &str) -> Option<String> {
    let tokens = AUTH_TOKENS.lock().await;
    tokens.iter().cloned().find(|t| t == token)
}

async fn verify_token_handler(headers: HeaderMap) -> impl IntoResponse {
    // Authorizationヘッダーからトークンを取得
    let token = headers
        .get("authorization")
        .and_then(|header| header.to_str().ok())
        .and_then(|auth_str| {
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..])
            } else {
                None
            }
        });

    match token {
        Some(token) => {
            // トークンの検証
            match verify_token(token).await {
                Some(_) => (
                    StatusCode::OK,
                    Json(AuthResponse {
                        success: true,
                        message: "Token is valid".to_string(),
                        token: None,
                    }),
                ),
                None => (
                    StatusCode::UNAUTHORIZED,
                    Json(AuthResponse {
                        success: false,
                        message: "Invalid token".to_string(),
                        token: None,
                    }),
                ),
            }
        }
        None => (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                message: "No token provided".to_string(),
                token: None,
            }),
        ),
    }
}
