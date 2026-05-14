<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, RefreshCw, TestTube2, Trash2 } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { GroupItem, PageResult, UpstreamAccountItem } from '@/types'
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
const form = reactive({
  name: '',
  platform: 'openai',
  credential: '',
  base_url: '',
  priority: 100,
  status: 'active',
  group_ids: [] as number[],
})

const activeCount = computed(() => accounts.value.filter((account) => account.status === 'active').length)

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

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', platform: 'openai', credential: '', base_url: '', priority: 100, status: 'active', group_ids: groups.value.map((group) => group.id) })
  modalOpen.value = true
}

function openEdit(row: UpstreamAccountItem) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    platform: row.platform,
    credential: '',
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

async function save() {
  saving.value = true
  error.value = ''
  const payload = {
    ...form,
    base_url: form.base_url || null,
    credential: form.credential || undefined,
  }
  try {
    if (editing.value) await api.put(`/api/v1/admin/upstream-accounts/${editing.value.id}`, payload)
    else await api.post('/api/v1/admin/upstream-accounts', payload)
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
        <button class="primary" type="button" @click="openCreate"><Plus />新增账号</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>账号总数</span><strong>{{ accounts.length }}</strong></div>
      <div class="metric"><span>启用中</span><strong>{{ activeCount }}</strong></div>
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
            <td>{{ row.name }}</td>
            <td class="mono">{{ row.platform }}</td>
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
          <tr v-if="!loading && accounts.length === 0"><td colspan="10" class="muted">暂无上游账号</td></tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="modalOpen" :title="editing ? '编辑上游账号' : '新增上游账号'" eyebrow="UPSTREAM FORM" size="lg" @close="modalOpen = false">
      <form id="upstream-form" class="form-grid" @submit.prevent="save">
        <div class="field">
          <span>名称</span>
          <input v-model.trim="form.name" required placeholder="例如：openai-main" />
        </div>
        <div class="field">
          <span>平台</span>
          <select v-model="form.platform">
            <option value="openai">OpenAI / Codex</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div class="field">
          <span>凭证</span>
          <input v-model="form.credential" type="password" :placeholder="editing ? '留空则不替换凭证' : '上游 API Key'" :required="!editing" />
        </div>
        <div class="field">
          <span>Base URL</span>
          <input v-model.trim="form.base_url" placeholder="留空使用默认地址，例如 https://api.openai.com" />
        </div>
        <div class="field field--full">
          <div class="hint-box">
            OpenAI/Codex 选择 OpenAI / Codex；凭证填写 OpenAI API Key。官方接口 Base URL 留空，第三方兼容接口填写域名根地址，不要重复写 /v1。
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
