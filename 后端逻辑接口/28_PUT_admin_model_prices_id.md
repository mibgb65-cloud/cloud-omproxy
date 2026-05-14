# 接口名称：更新模型价格

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/model-prices/:id`
- **方法 (Method)**：`PUT`
- **功能描述**：更新某个模型的估算价格。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): 模型价格 ID

**Body (JSON):**
- `input_price_micro_usd_per_token` (Integer, 必填)
- `output_price_micro_usd_per_token` (Integer, 必填)
- `cache_read_price_micro_usd_per_token` (Integer, 选填)
- `cache_write_price_micro_usd_per_token` (Integer, 选填)
- `status` (String, 选填): `active` / `disabled`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询模型价格记录是否存在。
3. 校验所有价格不能为负数。
4. 更新 `model_prices`。
5. 清理价格相关缓存。
6. 记录 `audit_logs`：`model_price.update`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "success": true
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "价格不能为负数"
}
```
