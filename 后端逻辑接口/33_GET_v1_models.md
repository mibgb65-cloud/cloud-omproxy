# 接口名称：Claude 模型列表

## 1. 基本信息
- **路径 (Path)**：`/v1/models`
- **方法 (Method)**：`GET`
- **功能描述**：返回当前 API Key 可用的 Anthropic/Claude 模型列表。
- **前置条件**：携带有效内部用户 API Key。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <api_key>`

**Query:** 无

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 API Key 和分组状态。
2. 查询分组下是否存在 `anthropic` 平台可用账号。
3. 优先从 `model_prices` 中读取 `platform = anthropic` 且 `status = active` 的模型。
4. 如果本地没有配置模型，可返回默认模型列表。
5. 返回 Anthropic 风格模型列表。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "data": [
    {
      "id": "claude-3-5-sonnet-latest",
      "type": "model"
    }
  ]
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
