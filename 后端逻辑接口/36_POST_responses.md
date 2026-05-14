# 接口名称：OpenAI Responses 无前缀别名

## 1. 基本信息
- **路径 (Path)**：`/responses`
- **方法 (Method)**：`POST`
- **功能描述**：为 Codex/Responses 客户端提供无 `/v1` 前缀的别名接口。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`
- `Content-Type`: `application/json`

**Body (JSON):**
- 与 `/v1/responses` 完全一致。

## 3. 核心处理逻辑 (Step-by-Step)
1. 复用 `/v1/responses` 的鉴权、调度、转发、日志逻辑。
2. 入站 endpoint 记录为 `/responses`，上游 endpoint 使用 `/v1/responses`。
3. 其他行为保持 OpenAI Responses 兼容。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "output": []
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
