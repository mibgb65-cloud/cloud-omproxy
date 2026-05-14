# 页面名称：API Key 管理页

> **给 AI 的指令**：
>
> 请根据《项目全局技术栈与开发规范》以及下方的页面需求文档，为我编写 Vue 3 + Vite + TypeScript 前端代码。要求逻辑清晰、组件拆分合理，并使用严格的 TypeScript 类型。

## 1. 页面基本信息

- **页面路由 (Route)**：`/admin/api-keys`
- **页面角色权限**：仅管理员访问
- **核心目标**：为家庭成员创建、禁用、删除 API Key，并在创建时只展示一次明文 Key。

## 2. 页面布局与视觉结构 (Layout & Visuals)

1. **顶部操作区**：
   - 用户筛选、分组筛选、状态筛选。
   - “新增 API Key”按钮。
2. **数据表格区**：
   - 列：ID、名称、用户、分组、Key 前缀、状态、最近使用、过期时间、操作。
3. **新增/编辑弹窗**：
   - 表单项：用户、分组、名称、过期时间、状态。
4. **创建成功弹窗**：
   - 显示一次明文 API Key。
   - 提供复制按钮。
   - 明确提示关闭后无法再次查看。

## 3. 数据状态定义 (State Management)

- `tableData` (Array<ApiKeyItem>)
- `users` (Array<UserOption>)
- `groups` (Array<GroupOption>)
- `isLoading` (Boolean)
- `searchParams` (Object)
- `modalVisible` (Boolean)
- `createdApiKey` (String | null): 创建后一次性展示的明文 key

## 4. 交互逻辑与事件 (Interactions & Events)

1. 页面挂载时加载 API Key、用户选项、分组选项。
2. 新增调用 `POST /api/v1/admin/api-keys`。
3. 创建成功后弹出明文 Key 弹窗，用户可复制。
4. 编辑调用 `PUT /api/v1/admin/api-keys/:id`。
5. 删除调用 `DELETE /api/v1/admin/api-keys/:id`。
6. 禁用后列表状态立即刷新。

## 5. Mock 数据与接口结构 (Data Interface)

```ts
interface ApiKeyItem {
  id: number
  user_id: number
  user_name: string
  group_id: number | null
  group_name: string | null
  name: string
  key_prefix: string
  status: 'active' | 'disabled'
  last_used_at: string | null
  expires_at: string | null
}
```

## 6. 组件拆分要求 (Component Splitting Rules)

1. 页面主入口：`views/admin/ApiKeysView.vue`
2. 筛选区：`components/api-keys/ApiKeyToolbar.vue`
3. 表格：`components/api-keys/ApiKeyTable.vue`
4. 表单弹窗：`components/api-keys/ApiKeyFormModal.vue`
5. 一次性 Key 展示弹窗：`components/api-keys/ApiKeySecretModal.vue`
