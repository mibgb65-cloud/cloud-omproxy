# 接口名称：删除 API Key

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/api-keys/:id`
- **方法 (Method)**：`DELETE`
- **功能描述**：软删除内部用户 API Key。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Path:**
- `id` (Integer, 必填): API Key ID

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 API Key 是否存在且未删除。
3. 设置 `deleted_at` 为当前时间，`status` 设置为 `disabled`。
4. 清理 `API_KEY_CACHE`。
5. 记录 `audit_logs`：`api_key.delete`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "success": true
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "API Key 不存在"
}
```
