# 接口名称：导入 Codex Session 上游账号

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts/import/codex-session`
- **方法 (Method)**：`POST`
- **功能描述**：导入 Codex JSON 或 accessToken，创建或更新 OpenAI Codex OAuth 上游账号。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `content` (String, 选填): Codex JSON、JSON 数组或多行 accessToken。
- `contents` (Array<String>, 选填): 批量内容。
- `name` (String, 选填): 指定账号名称；批量导入时会追加序号。
- `group_ids` (Array<Integer>, 选填): 绑定分组。
- `priority` (Integer, 选填): 调度优先级，默认 `50`。
- `status` (String, 选填): `active` / `disabled`。
- `update_existing` (Boolean, 选填): 是否按账号身份更新已有账号，默认 `true`。

## 3. 核心处理逻辑 (Step-by-Step)
1. 解析 `content` / `contents`，支持纯 accessToken、JSON 对象和 JSON 数组。
2. 提取 `access_token`、`refresh_token`、`id_token`、邮箱、ChatGPT Account ID、用户 ID、套餐和过期时间。
3. 校验 `access_token` 是否已过期。
4. 将敏感 token 整包加密保存到 `credential_ciphertext`。
5. 将邮箱、账号 ID、过期时间、是否可刷新等非敏感信息保存到 `credential_meta_json`。
6. 根据账号 ID、用户 ID、邮箱或 token 指纹去重；默认更新已有账号。
7. 绑定分组并写入审计日志。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "total": 1,
    "created": 1,
    "updated": 0,
    "skipped": 0,
    "failed": 0,
    "items": [
      {
        "index": 1,
        "name": "user@example.com",
        "action": "created",
        "account_id": 3
      }
    ],
    "warnings": [],
    "errors": []
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "缺少 accessToken/access_token"
}
```
