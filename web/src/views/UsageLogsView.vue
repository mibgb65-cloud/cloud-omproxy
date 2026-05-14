<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RefreshCw, Search } from 'lucide-vue-next'
import { api } from '@/api/client'
import type { PageResult, UsageLogItem } from '@/types'
import { compactNumber, dateTime, moneyFromMicroUsd } from '@/utils/format'

const loading = ref(false)
const error = ref('')
const logs = ref<UsageLogItem[]>([])
const stats = ref<Record<string, any>[]>([])
const filter = reactive({ platform: '', model: '', start_time: '', end_time: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    logs.value = (await api.get<PageResult<UsageLogItem>>('/api/v1/admin/usage-logs', filter)).items
    const today = new Date().toISOString().slice(0, 10)
    const stat = await api.get<{ items: Record<string, any>[] }>('/api/v1/admin/usage-stats', { start_date: today, end_date: today, dimension: 'day' })
    stats.value = stat.items
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载用量失败'
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
        <p class="eyebrow">USAGE</p>
        <h1>用量记录</h1>
        <p class="muted">按平台、模型和时间追踪网关请求。</p>
      </div>
      <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>今日请求</span><strong>{{ compactNumber(stats[0]?.request_count || 0) }}</strong></div>
      <div class="metric"><span>今日 Token</span><strong>{{ compactNumber(stats[0]?.total_tokens || 0) }}</strong></div>
      <div class="metric"><span>今日成本</span><strong>{{ moneyFromMicroUsd(stats[0]?.estimated_cost_micro_usd || 0) }}</strong></div>
    </div>

    <form class="toolbar" @submit.prevent="load">
      <div class="toolbar-form">
        <select v-model="filter.platform">
          <option value="">全部平台</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
        </select>
        <input v-model.trim="filter.model" placeholder="模型" />
        <input v-model="filter.start_time" placeholder="开始时间" />
        <input v-model="filter.end_time" placeholder="结束时间" />
        <button class="primary" :disabled="loading"><Search />查询</button>
      </div>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>用户</th>
            <th>平台</th>
            <th>模型</th>
            <th>Endpoint</th>
            <th>Token</th>
            <th>成本</th>
            <th>状态</th>
            <th>耗时</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in logs" :key="row.id">
            <td>{{ dateTime(row.created_at) }}</td>
            <td class="mono">{{ row.user_id }}</td>
            <td class="mono">{{ row.platform }}</td>
            <td>{{ row.model || '-' }}</td>
            <td class="mono">{{ row.endpoint }}</td>
            <td class="mono">{{ row.input_tokens + row.output_tokens + row.cache_read_tokens + row.cache_write_tokens }}</td>
            <td class="mono">{{ moneyFromMicroUsd(row.estimated_cost_micro_usd) }}</td>
            <td><span class="status" :class="row.status_code >= 400 ? 'status--failed' : 'status--active'">{{ row.status_code }}</span></td>
            <td class="mono">{{ row.duration_ms || '-' }}ms</td>
            <td>{{ row.error_message || '-' }}</td>
          </tr>
          <tr v-if="!loading && logs.length === 0"><td colspan="10" class="muted">暂无记录</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
