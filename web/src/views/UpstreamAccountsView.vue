<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { KeyRound, Pencil, RefreshCw, TestTube2, Trash2, Upload } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { CodexImportResult, GroupItem, PageResult, UpstreamAccountItem } from '@/types'
import { dateTime } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const accounts = ref<UpstreamAccountItem[]>([])
const groups = ref<GroupItem[]>([])
const modalOpen = ref(false)
const editing = ref<UpstreamAccountItem | null>(null)
const removing = ref<UpstreamAccountItem | null>(null)
const quotaRefreshingId = ref<number | null>(null)
const form = reactive({
  name: '',
  platform: 'openai',
  auth_type: 'api_key',
  credential: '',
  codex_content: '',
  base_url: '',
  priority: 100,
  status: 'active',
  group_ids: [] as number[],
})

const activeCount = computed(() => accounts.value.filter((account) => account.status === 'active').length)
const codexCount = computed(() => accounts.value.filter((account) => account.auth_type === 'codex_session').length)
const modalTitle = computed(() => {
  if (editing.value) return '编辑上游账号'
  return form.auth_type === 'codex_session' ? '导入 Codex 账号' : '新增 API Key 账号'
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [accountResult, groupResult] = await Promise.all([
      api.get<PageResult<UpstreamAccountItem>>('/api/v1/admin/upstream-accounts'),
      api.get<GroupItem[]>('/api/v1/admin/groups'),
    ])
    accounts.value = accountResult.items
    groups.value = groupResult
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载上游账号失败'
  } finally {
    loading.value = false
  }
}

function openCreateApiKey() {
  editing.value = null
  Object.assign(form, {
    name: '',
    platform: 'openai',
    auth_type: 'api_key',
    credential: '',
    codex_content: '',
    base_url: '',
    priority: 100,
    status: 'active',
    group_ids: groups.value.map((group) => group.id),
  })
  modalOpen.value = true
}

function openImportCodex() {
  editing.value = null
  Object.assign(form, {
    name: '',
    platform: 'openai',
    auth_type: 'codex_session',
    credential: '',
    codex_content: '',
    base_url: '',
    priority: 50,
    status: 'active',
    group_ids: groups.value.map((group) => group.id),
  })
  modalOpen.value = true
}

function openEdit(row: UpstreamAccountItem) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    platform: row.platform,
    auth_type: row.auth_type,
    credential: '',
    codex_content: '',
    base_url: row.base_url || '',
    priority: row.priority,
    status: row.status,
    group_ids: row.group_ids || [],
  })
  modalOpen.value = true
}

function toggleGroup(groupId: number) {
  form.group_ids = form.group_ids.includes(groupId)
    ? form.group_ids.filter((id) => id !== groupId)
    : [...form.group_ids, groupId]
}

function codexImportSummary(result: CodexImportResult) {
  const warnings = (result.warnings || []).map((item) => `#${item.index}${item.name ? ` ${item.name}` : ''}: ${item.message}`)
  const errors = (result.errors || []).map((item) => `#${item.index}${item.name ? ` ${item.name}` : ''}: ${item.message}`)
  return [
    `Codex 导入完成：新增 ${result.created}，更新 ${result.updated}，跳过 ${result.skipped}，失败 ${result.failed}`,
    ...errors,
    ...warnings,
  ].join('\n')
}

function percentText(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${Math.round(value)}%`
}

function codexWindows(row: UpstreamAccountItem) {
  const usage = row.credential_meta?.codex_usage
  if (!usage) return []
  return [
    { label: '5h', window: usage.five_hour || usage.primary },
    { label: '7d', window: usage.seven_day || usage.secondary },
  ].filter((item) => item.window)
}

function quotaBarStyle(available?: number) {
  const value = typeof available === 'number' ? Math.min(Math.max(available, 0), 100) : 0
  return { width: `${value}%` }
}

async function refreshCodexUsage(row: UpstreamAccountItem) {
  quotaRefreshingId.value = row.id
  error.value = ''
  try {
    const data = await api.post<{ credential_meta: UpstreamAccountItem['credential_meta'] }>(`/api/v1/admin/upstream-accounts/${row.id}/codex-usage`, {})
    row.credential_meta = data.credential_meta
    row.last_error_message = null
    notice.value = `${row.name} 的 Codex 额度已刷新`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '刷新 Codex 额度失败'
  } finally {
    quotaRefreshingId.value = null
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (form.auth_type === 'codex_session' && form.codex_content.trim()) {
      const result = await api.post<CodexImportResult>('/api/v1/admin/upstream-accounts/import/codex-session', {
        content: form.codex_content.trim(),
        name: form.name,
        group_ids: form.group_ids,
        priority: form.priority,
        status: form.status,
        update_existing: true,
      })
      notice.value = codexImportSummary(result)
    } else {
      const payload = {
        name: form.name,
        platform: form.platform,
        credential: form.credential || undefined,
        base_url: form.base_url || null,
        priority: form.priority,
        status: form.status,
        group_ids: form.group_ids,
      }
      if (editing.value) await api.put(`/api/v1/admin/upstream-accounts/${editing.value.id}`, payload)
      else await api.post('/api/v1/admin/upstream-accounts', payload)
      notice.value = '上游账号已保存'
    }
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存上游账号失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  error.value = ''
  try {
    await api.delete(`/api/v1/admin/upstream-accounts/${removing.value.id}`)
    removing.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除上游账号失败'
  } finally {
    saving.value = false
  }
}

async function test(row: UpstreamAccountItem) {
  error.value = ''
  try {
    const data = await api.post<{ message: string }>(`/api/v1/admin/upstream-accounts/${row.id}/test`, {})
    notice.value = data.message
  } catch (err) {
    error.value = err instanceof Error ? err.message : '测试失败'
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <p class="eyebrow">UPSTREAM</p>
        <h1>上游账号</h1>
        <p class="muted">维护 OpenAI、Anthropic、Gemini 等上游凭证和调度分组。</p>
      </div>
      <div class="actions">
        <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
        <button class="ghost" type="button" @click="openCreateApiKey"><KeyRound />新增 API Key</button>
        <button class="primary" type="button" @click="openImportCodex"><Upload />导入 Codex</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>账号总数</span><strong>{{ accounts.length }}</strong></div>
      <div class="metric"><span>启用中</span><strong>{{ activeCount }}</strong></div>
      <div class="metric"><span>Codex Session</span><strong>{{ codexCount }}</strong></div>
      <div class="metric"><span>可用分组</span><strong>{{ groups.length }}</strong></div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="notice" class="notice">{{ notice }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>平台</th>
            <th>凭证</th>
            <th>额度</th>
            <th>优先级</th>
            <th>分组</th>
            <th>状态</th>
            <th>冷却</th>
            <th>最近使用</th>
            <th>错误</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in accounts" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td>
              <strong>{{ row.name }}</strong>
              <div v-if="row.credential_meta?.email" class="subline">{{ row.credential_meta.email }}</div>
              <div v-if="row.credential_meta?.expires_at" class="subline">到期 {{ dateTime(row.credential_meta.expires_at) }}</div>
            </td>
            <td class="mono">{{ row.platform }}</td>
            <td>
              <span class="status">{{ row.auth_type === 'codex_session' ? 'codex' : row.auth_type }}</span>
              <div v-if="row.auth_type === 'codex_session'" class="subline">{{ row.credential_meta?.refreshable ? '可刷新' : '不可刷新' }}</div>
            </td>
            <td>
              <div v-if="row.auth_type === 'codex_session'" class="quota-stack">
                <div v-if="codexWindows(row).length === 0" class="subline">未刷新额度</div>
                <div v-for="item in codexWindows(row)" :key="item.label" class="quota-window">
                  <div class="quota-window__head">
                    <span>{{ item.label }}</span>
                    <strong>{{ percentText(item.window?.available_percent) }} 可用</strong>
                  </div>
                  <div class="quota-track"><span :style="quotaBarStyle(item.window?.available_percent)"></span></div>
                  <div class="quota-window__meta">
                    已用 {{ percentText(item.window?.used_percent) }}
                    <template v-if="item.window?.reset_at"> · 重置 {{ dateTime(item.window.reset_at) }}</template>
                  </div>
                </div>
                <div v-if="row.credential_meta?.codex_usage?.updated_at" class="subline">更新 {{ dateTime(row.credential_meta.codex_usage.updated_at) }}</div>
                <button class="ghost btn--sm" type="button" :disabled="quotaRefreshingId === row.id" @click="refreshCodexUsage(row)">
                  <RefreshCw />{{ quotaRefreshingId === row.id ? '刷新中' : '刷新额度' }}
                </button>
              </div>
              <span v-else>-</span>
            </td>
            <td class="mono">{{ row.priority }}</td>
            <td>{{ row.group_names?.join(', ') || '-' }}</td>
            <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
            <td>{{ dateTime(row.cooldown_until) }}</td>
            <td>{{ dateTime(row.last_used_at) }}</td>
            <td>{{ row.last_error_message || '-' }}</td>
            <td>
              <div class="actions">
                <button class="ghost" type="button" @click="test(row)"><TestTube2 />测试</button>
                <button class="ghost" type="button" @click="openEdit(row)"><Pencil />编辑</button>
                <button class="danger" type="button" @click="removing = row"><Trash2 />删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && accounts.length === 0"><td colspan="12" class="muted">暂无上游账号</td></tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="modalOpen" :title="modalTitle" eyebrow="UPSTREAM FORM" size="lg" @close="modalOpen = false">
      <form id="upstream-form" class="form-grid" @submit.prevent="save">
        <div class="field">
          <span>名称</span>
          <input v-model.trim="form.name" required placeholder="例如：openai-main" />
        </div>
        <div class="field">
          <span>凭证类型</span>
          <input :value="form.auth_type === 'codex_session' ? 'Codex auth.json / accessToken' : 'API Key'" disabled />
        </div>
        <div class="field">
          <span>平台</span>
          <select v-model="form.platform" :disabled="form.auth_type === 'codex_session'">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div v-if="form.auth_type === 'api_key'" class="field">
          <span>凭证</span>
          <input v-model="form.credential" type="password" :placeholder="editing ? '留空则不替换凭证' : '上游 API Key'" :required="!editing && form.auth_type === 'api_key'" />
        </div>
        <div v-if="form.auth_type === 'api_key'" class="field">
          <span>Base URL</span>
          <input v-model.trim="form.base_url" placeholder="留空使用默认地址，例如 https://api.openai.com" />
        </div>
        <div v-if="form.auth_type === 'api_key'" class="field field--full">
          <div class="hint-box">
            OpenAI API Key 走 OpenAI 官方或兼容接口；官方接口 Base URL 留空，第三方兼容接口填写域名根地址，不要重复写 /v1。Codex 账号请使用右上角“导入 Codex”。
          </div>
        </div>
        <div v-if="form.auth_type === 'codex_session'" class="field field--full">
          <span>Codex JSON / accessToken</span>
          <textarea v-model="form.codex_content" rows="8" :required="!editing" placeholder="支持多行，每行一个 accessToken 或 JSON；含 refresh_token 时可自动刷新。" spellcheck="false"></textarea>
          <div class="hint-box">
            这会创建 OpenAI Codex OAuth 上游账号。sessionToken 会被忽略；没有 refresh_token 时只能用到 accessToken 过期。
          </div>
        </div>
        <div class="field">
          <span>优先级</span>
          <input v-model.number="form.priority" type="number" />
        </div>
        <div class="field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <div class="field field--full">
          <span>可用分组</span>
          <div class="checkbox-list">
            <label v-for="group in groups" :key="group.id" class="checkbox">
              <input type="checkbox" :checked="form.group_ids.includes(group.id)" @change="toggleGroup(group.id)" />
              {{ group.name }}
            </label>
            <span v-if="groups.length === 0" class="muted">暂无分组</span>
          </div>
        </div>
      </form>
      <template #footer>
        <button class="ghost" type="button" @click="modalOpen = false">取消</button>
        <button class="primary" form="upstream-form" :disabled="saving">保存</button>
      </template>
    </AppModal>

    <AppModal :open="Boolean(removing)" title="删除上游账号" eyebrow="CONFIRM" size="sm" @close="removing = null">
      <p>确认删除 <strong>{{ removing?.name }}</strong>？该账号不会再参与调度。</p>
      <template #footer>
        <button class="ghost" type="button" @click="removing = null">取消</button>
        <button class="danger" type="button" :disabled="saving" @click="remove">删除</button>
      </template>
    </AppModal>
  </div>
</template>
