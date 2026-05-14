# 接口名称：OpenAI Responses 网关

## 1. 基本信息
- **路径 (Path)**：`/v1/responses`
- **方法 (Method)**：`POST`
- **功能描述**：兼容 OpenAI Responses API，调度 OpenAI 上游账号并转发请求。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`
- `Content-Type`: `application/json`

**Body (JSON):**
- 按 OpenAI Responses API 原始请求体透传。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key、用户和分组状态。
2. 根据 endpoint 确定平台为 `openai`。
3. 调度分组下可用 OpenAI 账号。
4. 转发到 `{base_url}/v1/responses`。
5. 支持流式响应。
6. 解析响应 usage，写入 `usage_logs`。
7. 失败时执行简单账号切换。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "output": [],
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20
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
