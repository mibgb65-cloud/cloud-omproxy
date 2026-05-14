# 接口名称：Gemini 模型列表

## 1. 基本信息
- **路径 (Path)**：`/v1beta/models`
- **方法 (Method)**：`GET`
- **功能描述**：兼容 Gemini 原生模型列表接口。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`

**Query:** 原样透传 Gemini 相关 query。

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key、用户和分组状态。
2. 根据 endpoint 确定平台为 `gemini`。
3. 调度分组下可用 Gemini 账号。
4. 转发到 Gemini 上游 `/v1beta/models`。
5. 上游失败时尝试下一个 Gemini 账号。
6. 模型列表请求也记录轻量 `usage_logs`，token 为 0。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "models": [
    {
      "name": "models/gemini-2.5-pro",
      "displayName": "Gemini 2.5 Pro"
    }
  ]
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
