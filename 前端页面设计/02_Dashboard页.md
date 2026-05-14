# 页面名称：Dashboard 页

> **给 AI 的指令**：
>
> 请根据《项目全局技术栈与开发规范》以及下方的页面需求文档，为我编写 Vue 3 + Vite + TypeScript 前端代码。要求逻辑清晰、组件拆分合理，并使用严格的 TypeScript 类型。

## 1. 页面基本信息

- **页面路由 (Route)**：`/admin/dashboard`
- **页面角色权限**：仅管理员访问
- **核心目标**：展示今日请求量、token、估算成本、用户和上游账号状态。

## 2. 页面布局与视觉结构 (Layout & Visuals)

本页面分为以下核心区域：

1. **顶部概览卡片**：
   - 今日请求数
   - 今日 token
   - 今日估算成本
   - 活跃用户数
   - 活跃 API Key 数
   - 活跃上游账号数
2. **趋势与排行区**：
   - 简单折线图：近 7 日请求数
   - 用户用量排行
3. **最近请求区**：
   - 表格列：时间、用户、平台、模型、token、状态码、耗时

## 3. 数据状态定义 (State Management)

- `summary` (Object | null): Dashboard 汇总数据
- `recentLogs` (Array): 最近请求日志
- `isLoading` (Boolean): 加载状态
- `selectedDate` (String): 当前统计日期，默认今天

## 4. 交互逻辑与事件 (Interactions & Events)

1. 页面挂载时调用 `GET /api/v1/admin/dashboard/summary`。
2. 切换日期时重新加载统计。
3. 点击最近请求行，跳转到 `/admin/usage-logs` 并带上请求 ID 或筛选条件。
4. 请求失败时显示全局错误提示。

## 5. Mock 数据与接口结构 (Data Interface)

```ts
interface DashboardSummary {
  request_count: number
  total_tokens: number
  estimated_cost_micro_usd: number
  active_users: number
  active_api_keys: number
  active_upstream_accounts: number
  recent_logs: UsageLogItem[]
}
```

## 6. 组件拆分要求 (Component Splitting Rules)

1. 页面主入口：`views/admin/DashboardView.vue`
2. 概览卡片：`components/dashboard/SummaryCards.vue`
3. 最近请求表格：`components/dashboard/RecentUsageTable.vue`
4. 趋势图组件：`components/dashboard/UsageTrendPanel.vue`
