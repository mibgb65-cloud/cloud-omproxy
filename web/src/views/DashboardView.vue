<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'

interface Summary {
  request_count: number
  total_tokens: number
  estimated_cost_micro_usd: number
  active_users: number
  active_api_keys: number
  active_upstream_accounts: number
  recent_logs: Record<string, any>[]
}

const loading = ref(false)
const summary = ref<Summary | null>(null)

function money(value: number) {
  return `$${(value / 1_000_000).toFixed(4)}`
}

async function load() {
  loading.value = true
  try {
    summary.value = await api.get<Summary>('/api/v1/admin/dashboard/summary')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head">
      <h1>仪表盘</h1>
      <button class="ghost" @click="load">刷新</button>
    </div>
    <div v-if="loading" class="muted">加载中...</div>
    <div v-if="summary" class="metric-grid">
      <div class="metric"><span>今日请求</span><strong>{{ summary.request_count }}</strong></div>
      <div class="metric"><span>今日 Token</span><strong>{{ summary.total_tokens }}</strong></div>
      <div class="metric"><span>估算成本</span><strong>{{ money(summary.estimated_cost_micro_usd) }}</strong></div>
      <div class="metric"><span>活跃用户</span><strong>{{ summary.active_users }}</strong></div>
      <div class="metric"><span>API Key</span><strong>{{ summary.active_api_keys }}</strong></div>
      <div class="metric"><span>上游账号</span><strong>{{ summary.active_upstream_accounts }}</strong></div>
    </div>
    <h2>最近请求</h2>
    <table>
      <thead>
        <tr><th>时间</th><th>平台</th><th>模型</th><th>Token</th><th>状态</th><th>耗时</th></tr>
      </thead>
      <tbody>
        <tr v-for="log in summary?.recent_logs || []" :key="log.id">
          <td>{{ log.created_at }}</td>
          <td>{{ log.platform }}</td>
          <td>{{ log.model || '-' }}</td>
          <td>{{ Number(log.input_tokens || 0) + Number(log.output_tokens || 0) }}</td>
          <td>{{ log.status_code }}</td>
          <td>{{ log.duration_ms || '-' }}ms</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

