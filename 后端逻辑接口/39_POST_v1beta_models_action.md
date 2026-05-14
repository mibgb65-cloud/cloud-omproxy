# 接口名称：Gemini 模型动作网关

## 1. 基本信息
- **路径 (Path)**：`/v1beta/models/*modelAction`
- **方法 (Method)**：`POST`
- **功能描述**：兼容 Gemini `generateContent`、`streamGenerateContent` 等模型动作接口。
- **前置条件**：携带有效家庭成员 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`
- `Content-Type`: `application/json`

**Path:**
- `modelAction` (String, 必填): 例如 `gemini-2.5-pro:generateContent`

**Body (JSON):**
- Gemini 原始请求体，原样透传。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key、用户和分组状态。
2. 根据 endpoint 确定平台为 `gemini`。
3. 调度分组下可用 Gemini 账号。
4. 转发请求到 Gemini 上游。
5. 如果 action 是流式生成，透明转发流式响应。
6. 从响应或 metadata 中解析 token usage。
7. 估算成本并写入 `usage_logs` 和 `daily_usage_stats`。
8. 失败时尝试下一个可用 Gemini 账号。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "candidates": [],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

**错误响应 (示例):**
```json
{
  "error": {
    "code": 401,
    "message": "Invalid API key"
  }
}
```
