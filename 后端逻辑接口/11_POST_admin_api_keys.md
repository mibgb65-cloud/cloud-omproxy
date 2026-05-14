# 接口名称：创建 API Key

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/api-keys`
- **方法 (Method)**：`POST`
- **功能描述**：为内部用户创建网关 API Key。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `user_id` (Integer, 必填): 内部用户 ID
- `group_id` (Integer, 选填): 分组 ID
- `name` (String, 必填): Key 名称
- `expires_at` (String, 选填): 过期时间

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验用户存在且状态为 `active`。
3. 如果传入 `group_id`，校验分组存在且状态为 `active`。
4. 生成明文 API Key，格式建议 `sk-pfg-{random}`。
5. 计算 `key_hash`，保存 `key_prefix`。
6. 插入 `api_keys`。
7. 记录 `audit_logs`：`api_key.create`。
8. 返回明文 API Key；后续接口不能再次返回明文。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "api_key": "sk-pfg-full-secret-only-once",
    "key_prefix": "sk-pfg-abc123"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "用户不存在"
}
```
