# 接口名称：创建上游账号

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts`
- **方法 (Method)**：`POST`
- **功能描述**：新增一个上游账号并绑定分组。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `name` (String, 必填)
- `platform` (String, 必填): `anthropic` / `openai` / `gemini`
- `auth_type` (String, 必填): 第一版固定 `api_key`
- `credential` (String, 必填): 上游 API Key 明文，仅用于本次保存
- `base_url` (String, 选填)
- `priority` (Integer, 选填)
- `group_ids` (Array<Integer>, 选填): 绑定分组

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验平台、认证类型、名称和凭证。
3. 校验 `group_ids` 对应分组存在且可用。
4. 使用 Worker secret 加密 `credential`。
5. 在事务中插入 `upstream_accounts` 和 `account_groups`。
6. 记录 `audit_logs`：`upstream_account.create`，不得记录明文凭证。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "OpenAI Main",
    "platform": "openai",
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "上游凭证不能为空"
}
```
