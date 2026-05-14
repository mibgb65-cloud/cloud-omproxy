<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { PageResult, UsageLogItem } from '@/types'

const logs = ref<UsageLogItem[]>([])
const stats = ref<Record<string, any>[]>([])
const filter = reactive({ platform: '', model: '', start_time: '', end_time: '' })

function cost(value: number) {
  return `$${(value / 1_000_000).toFixed(4)}`
}

async function load() {
  logs.value = (await api.get<PageResult<UsageLogItem>>('/api/v1/admin/usage-logs', filter)).items
  const today = new Date().toISOString().slice(0, 10)
  const stat = await api.get<{ items: Record<string, any>[] }>('/api/v1/admin/usage-stats', { start_date: today, end_date: today, dimension: 'day' })
  stats.value = stat.items
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>用量记录</h1><button class="ghost" @click="load">刷新</button></div>
    <div class="metric-grid">
      <div class="metric"><span>今日请求</span><strong>{{ stats[0]?.request_count || 0 }}</strong></div>
      <div class="metric"><span>今日 Token</span><strong>{{ stats[0]?.total_tokens || 0 }}</strong></div>
      <div class="metric"><span>今日成本</span><strong>{{ cost(stats[0]?.estimated_cost_micro_usd || 0) }}</strong></div>
    </div>
    <form class="inline-form" @submit.prevent="load">
      <select v-model="filter.platform"><option value="">全部平台</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select>
      <input v-model="filter.model" placeholder="模型" />
      <input v-model="filter.start_time" placeholder="开始时间" />
      <input v-model="filter.end_time" placeholder="结束时间" />
      <button class="primary">查询</button>
    </form>
    <table>
      <thead><tr><th>时间</th><th>用户</th><th>平台</th><th>模型</th><th>Endpoint</th><th>Token</th><th>成本</th><th>状态</th><th>耗时</th><th>错误</th></tr></thead>
      <tbody>
        <tr v-for="row in logs" :key="row.id">
          <td>{{ row.created_at }}</td><td>{{ row.user_id }}</td><td>{{ row.platform }}</td><td>{{ row.model || '-' }}</td><td>{{ row.endpoint }}</td>
          <td>{{ row.input_tokens + row.output_tokens + row.cache_read_tokens + row.cache_write_tokens }}</td><td>{{ cost(row.estimated_cost_micro_usd) }}</td><td>{{ row.status_code }}</td><td>{{ row.duration_ms || '-' }}ms</td><td>{{ row.error_message || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

