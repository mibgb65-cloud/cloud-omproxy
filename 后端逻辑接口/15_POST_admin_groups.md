# 接口名称：创建分组

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/groups`
- **方法 (Method)**：`POST`
- **功能描述**：创建账号池分组。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `name` (String, 必填): 分组名称
- `description` (String, 选填)
- `default_platform` (String, 选填): `anthropic` / `openai` / `gemini`
- `sort_order` (Integer, 选填)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验名称非空且不重复。
3. 校验 `default_platform` 枚举。
4. 插入 `groups`。
5. 记录 `audit_logs`：`group.create`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "Default",
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4090,
  "message": "分组名称已存在"
}
```
