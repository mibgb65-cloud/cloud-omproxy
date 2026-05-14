# 接口名称：Codex Responses 直连网关

## 1. 基本信息
- **路径 (Path)**：`/backend-api/codex/responses`
- **方法 (Method)**：`POST`
- **功能描述**：兼容 Codex CLI 的 `chatgpt_base_url` 形式，调度 `codex_session` 上游账号并转发到 ChatGPT Codex internal API。
- **前置条件**：携带有效网关 API Key，且 API Key 所属分组绑定了 Codex Session 上游账号。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <gateway_api_key>`
- `Content-Type`: `application/json`

**Body (JSON):**
- 按 Codex / Responses 客户端原始请求体透传。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验网关 API Key。
2. 仅调度 `platform = openai` 且 `auth_type = codex_session` 的上游账号。
3. 若 Codex `access_token` 临近过期且存在 `refresh_token`，先刷新并更新加密凭证。
4. 转发到 `https://chatgpt.com/backend-api/codex/responses`。
5. 注入 `Authorization: Bearer <codex_access_token>`、`chatgpt-account-id`、`OpenAI-Beta`、`originator`、Codex User-Agent 等必要头。
6. 记录用量日志和上游账号状态。

## 4. 响应格式 (Response)
**成功响应：**
- 透传 Codex 上游响应。

**错误响应 (示例):**
```json
{
  "error": {
    "message": "No upstream account available"
  }
}
```
