# 接口名称：测试上游账号

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts/:id/test`
- **方法 (Method)**：`POST`
- **功能描述**：使用指定上游账号发送轻量测试请求，验证凭证是否可用。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): 上游账号 ID

**Body (JSON):**
- `model` (String, 选填): 测试模型

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询账号，解密凭证。
3. 按平台构造最小测试请求。
4. 调用上游，设置合理超时。
5. 成功则清空 `last_error_message`、`failure_count`、`cooldown_until`。
6. 失败则记录错误摘要，但不自动删除账号。
7. 记录 `audit_logs`：`upstream_account.test`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "success": true,
    "latency_ms": 860,
    "message": "ok"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 5020,
  "message": "上游账号测试失败"
}
```
