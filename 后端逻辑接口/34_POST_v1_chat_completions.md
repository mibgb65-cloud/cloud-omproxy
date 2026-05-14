# 接口名称：OpenAI Chat Completions 网关

## 1. 基本信息
- **路径 (Path)**：`/v1/chat/completions`
- **方法 (Method)**：`POST`
- **功能描述**：兼容 OpenAI Chat Completions API，调度 OpenAI 上游账号并转发请求。
- **前置条件**：携带有效家庭成员 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`
- `Content-Type`: `application/json`

**Body (JSON):**
- 按 OpenAI Chat Completions API 原始请求体透传。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key、用户和分组状态。
2. 根据 endpoint 确定平台为 `openai`。
3. 调度分组下可用 OpenAI 账号。
4. 将请求转发到 `{base_url}/v1/chat/completions`。
5. 支持 `stream = true` 的 SSE 透明转发。
6. 上游失败时尝试下一个可用账号。
7. 解析 usage 字段，估算成本并写入用量日志。
8. 返回 OpenAI 兼容响应。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "choices": [],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**错误响应 (示例):**
```json
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key"
  }
}
```
