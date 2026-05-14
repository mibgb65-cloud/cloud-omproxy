# 接口名称：模型价格列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/model-prices`
- **方法 (Method)**：`GET`
- **功能描述**：查询模型价格配置，用于估算内部使用成本。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `platform` (String, 选填): `anthropic` / `openai` / `gemini`
- `status` (String, 选填): `active` / `disabled`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `model_prices`。
3. 按 `platform ASC, model ASC` 排序。
4. 返回所有价格字段，单位为 micro USD/token。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "platform": "openai",
      "model": "gpt-4.1",
      "input_price_micro_usd_per_token": 2,
      "output_price_micro_usd_per_token": 8,
      "status": "active"
    }
  ]
}
```

**错误响应 (示例):**
```json
{
  "code": 4011,
  "message": "登录已失效"
}
```
