# 接口名称：刷新 Codex 账号额度

> **给 AI 的指令**：
> 本接口用于管理员主动刷新某个 Codex Session 上游账号的当前额度快照。

## 1. 接口基本信息

- 方法：`POST`
- 路径：`/api/v1/admin/upstream-accounts/{id}/codex-usage`
- 鉴权：管理员 JWT

## 2. 请求参数

路径参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 上游账号 ID，必须是 `auth_type = codex_session` 的 OpenAI 账号 |

请求体：空对象 `{}`。

## 3. 处理逻辑

1. 读取并解密 Codex Session 凭证。
2. 如果 `access_token` 即将过期且存在 `refresh_token`，先刷新 token 并加密写回。
3. 请求 `https://chatgpt.com/backend-api/wham/usage` 获取 Codex 额度。
4. 解析 `rate_limit.primary_window` 和 `rate_limit.secondary_window`。
5. 将额度快照写入 `upstream_accounts.credential_meta_json.codex_usage`。

## 4. 响应示例

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "credential_meta": {
      "email": "user@example.com",
      "refreshable": true,
      "codex_usage": {
        "updated_at": "2026-05-14T08:30:00.000Z",
        "plan_type": "team",
        "five_hour": {
          "used_percent": 27,
          "available_percent": 73,
          "reset_at": "2026-05-14T12:00:00.000Z"
        },
        "seven_day": {
          "used_percent": 41,
          "available_percent": 59,
          "reset_at": "2026-05-20T12:00:00.000Z"
        }
      }
    }
  }
}
```

## 5. 错误情况

- `404`：账号不存在或不是 Codex Session 账号。
- `409`：access token 已过期且没有 refresh token。
- `500`：Cloudflare Worker 未配置 `CREDENTIAL_SECRET`，或 Codex 额度查询失败。
