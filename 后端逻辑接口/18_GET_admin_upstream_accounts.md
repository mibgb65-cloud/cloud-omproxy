# 接口名称：上游账号列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts`
- **方法 (Method)**：`GET`
- **功能描述**：分页查询 Anthropic/OpenAI/Gemini 上游账号。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `page` (Integer, 选填)
- `page_size` (Integer, 选填)
- `platform` (String, 选填)
- `status` (String, 选填)
- `group_id` (Integer, 选填)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `upstream_accounts`，默认 `deleted_at IS NULL`。
3. 如果传入 `group_id`，通过 `account_groups` 过滤。
4. 不返回 `credential_ciphertext`。
5. 返回绑定分组摘要。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "OpenAI Main",
        "platform": "openai",
        "auth_type": "api_key",
        "status": "active",
        "priority": 100,
        "groups": [{"id": 1, "name": "Default"}],
        "last_used_at": null
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4011,
  "message": "登录已失效"
}
```
