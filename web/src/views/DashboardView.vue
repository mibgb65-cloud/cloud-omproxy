<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { api } from '@/api/client'
import { compactNumber, dateTime, moneyFromMicroUsd } from '@/utils/format'

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
const error = ref('')
const summary = ref<Summary | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await api.get<Summary>('/api/v1/admin/dashboard/summary')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载仪表盘失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <p class="eyebrow">OVERVIEW</p>
        <h1>仪表盘</h1>
        <p class="muted">查看今日请求、成本和最近的网关调用。</p>
      </div>
      <button class="btn btn--secondary" type="button" :disabled="loading" @click="load">
        <RefreshCw />
        刷新
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="notice">加载中</div>

    <div v-if="summary" class="metric-grid">
      <div class="metric"><span>今日请求</span><strong>{{ compactNumber(summary.request_count) }}</strong></div>
      <div class="metric"><span>今日 Token</span><strong>{{ compactNumber(summary.total_tokens) }}</strong></div>
      <div class="metric"><span>估算成本</span><strong>{{ moneyFromMicroUsd(summary.estimated_cost_micro_usd) }}</strong></div>
      <div class="metric"><span>启用用户</span><strong>{{ summary.active_users }}</strong></div>
      <div class="metric"><span>API Key</span><strong>{{ summary.active_api_keys }}</strong></div>
      <div class="metric"><span>上游账号</span><strong>{{ summary.active_upstream_accounts }}</strong></div>
    </div>

    <section class="panel">
      <header class="panel-head">
        <div>
          <p class="eyebrow">RECENT</p>
          <h2>最近请求</h2>
        </div>
      </header>
      <div class="table-wrap" style="border: 0">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>平台</th>
              <th>模型</th>
              <th>Token</th>
              <th>状态</th>
              <th>耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in summary?.recent_logs || []" :key="log.id">
              <td>{{ dateTime(log.created_at) }}</td>
              <td class="mono">{{ log.platform }}</td>
              <td>{{ log.model || '-' }}</td>
              <td class="mono">{{ Number(log.input_tokens || 0) + Number(log.output_tokens || 0) }}</td>
              <td><span class="status" :class="Number(log.status_code) >= 400 ? 'status--failed' : 'status--active'">{{ log.status_code }}</span></td>
              <td class="mono">{{ log.duration_ms || '-' }}ms</td>
            </tr>
            <tr v-if="!loading && (summary?.recent_logs || []).length === 0">
              <td colspan="6" class="muted">暂无请求记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
