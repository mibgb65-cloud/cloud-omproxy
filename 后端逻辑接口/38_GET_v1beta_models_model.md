# 接口名称：Gemini 单模型详情

## 1. 基本信息
- **路径 (Path)**：`/v1beta/models/:model`
- **方法 (Method)**：`GET`
- **功能描述**：兼容 Gemini 获取单个模型详情接口。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`

**Path:**
- `model` (String, 必填): Gemini 模型名称片段

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key、用户和分组状态。
2. 调度 Gemini 上游账号。
3. 将 path 参数原样拼接到上游 `/v1beta/models/:model`。
4. 转发上游响应。
5. 记录轻量用量日志。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "name": "models/gemini-2.5-pro",
  "displayName": "Gemini 2.5 Pro"
}
```

**错误响应 (示例):**
```json
{
  "error": {
    "code": 404,
    "message": "Model not found"
  }
}
```
