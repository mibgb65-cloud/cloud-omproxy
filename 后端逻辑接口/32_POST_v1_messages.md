# 接口名称：Claude Messages 网关

## 1. 基本信息
- **路径 (Path)**：`/v1/messages`
- **方法 (Method)**：`POST`
- **功能描述**：兼容 Claude Messages API，按 API Key 调度 Anthropic 上游账号并转发请求。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`
- `Content-Type`: `application/json`
- `anthropic-version` (选填): 透传给上游

**Body (JSON):**
- 按 Anthropic Messages API 原始请求体透传。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 Bearer API Key，优先查 `API_KEY_CACHE`，未命中查 D1。
2. 校验用户、API Key、分组状态均为 `active`。
3. 根据 endpoint 确定平台为 `anthropic`。
4. 从 `account_groups` + `upstream_accounts` 中选择可用账号。
5. 解密上游凭证，构造 Anthropic 请求。
6. 如果请求为流式，透明转发 SSE。
7. 如果上游失败，标记账号短期错误并尝试下一个账号。
8. 从响应中解析 token usage，写入 `usage_logs` 和 `daily_usage_stats`。
9. 返回上游响应给客户端。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [],
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20
  }
}
```

**错误响应 (示例):**
```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key"
  }
}
```
