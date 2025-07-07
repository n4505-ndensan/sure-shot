use axum::{routing, Json};
use crate::{AppState, GetNicknameResponse, UpdateNicknameRequest, UpdateNicknameResponse};

pub fn external_get_nickname(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/nickname", {
        let state = app_state.clone();
        routing::get(move || {
            let state = state.clone();
            async move {
                let config = state.config.lock().await;
                let response = GetNicknameResponse {
                    nickname: config.nickname.clone(),
                };
                Json(response)
            }
        })
    })
}

pub fn external_update_nickname(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/update-nickname", {
        let state = app_state.clone();
        routing::post(move |Json(request): Json<UpdateNicknameRequest>| {
            let state = state.clone();
            async move {
                let mut config = state.config.lock().await;
                let old_nickname = config.nickname.clone();

                // ニックネームを更新
                config.nickname = request.nickname.clone();

                // 設定をファイルに保存
                let save_result = config.save();

                let response = match save_result {
                    Ok(()) => UpdateNicknameResponse {
                        success: true,
                        message: "Nickname updated successfully".to_string(),
                        old_nickname,
                        new_nickname: request.nickname,
                    },
                    Err(err) => UpdateNicknameResponse {
                        success: false,
                        message: format!("Failed to save nickname: {}", err),
                        old_nickname: old_nickname.clone(),
                        new_nickname: old_nickname,
                    },
                };

                Json(response)
            }
        })
    })
}
