<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Copy, KeyRound, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { ApiKeyItem, GroupItem, PageResult, UserItem } from '@/types'
import { dateTime } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const keys = ref<ApiKeyItem[]>([])
const users = ref<UserItem[]>([])
const groups = ref<GroupItem[]>([])
const createdKey = ref('')
const modalOpen = ref(false)
const editing = ref<ApiKeyItem | null>(null)
const removing = ref<ApiKeyItem | null>(null)
const form = reactive({ user_id: '', group_id: '', name: '', status: 'active' })

const activeCount = computed(() => keys.value.filter((key) => key.status === 'active').length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [keyResult, userResult, groupResult] = await Promise.all([
      api.get<PageResult<ApiKeyItem>>('/api/v1/admin/api-keys'),
      api.get<PageResult<UserItem>>('/api/v1/admin/users', { page_size: 100 }),
      api.get<GroupItem[]>('/api/v1/admin/groups'),
    ])
    keys.value = keyResult.items
    users.value = userResult.items
    groups.value = groupResult
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载 API Key 失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { user_id: users.value[0]?.id ? String(users.value[0].id) : '', group_id: '', name: '', status: 'active' })
  modalOpen.value = true
}

function openEdit(row: ApiKeyItem) {
  editing.value = row
  Object.assign(form, {
    user_id: String(row.user_id),
    group_id: row.group_id == null ? '' : String(row.group_id),
    name: row.name,
    status: row.status,
  })
  modalOpen.value = true
}

function payload() {
  return {
    user_id: Number(form.user_id),
    group_id: form.group_id === '' ? null : Number(form.group_id),
    name: form.name,
    status: form.status,
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (editing.value) await api.put(`/api/v1/admin/api-keys/${editing.value.id}`, payload())
    else {
      const data = await api.post<{ api_key: string }>('/api/v1/admin/api-keys', payload())
      createdKey.value = data.api_key
    }
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存 API Key 失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  error.value = ''
  try {
    await api.delete(`/api/v1/admin/api-keys/${removing.value.id}`)
    removing.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除 API Key 失败'
  } finally {
    saving.value = false
  }
}

async function copyKey() {
  await navigator.clipboard.writeText(createdKey.value)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <p class="eyebrow">API KEYS</p>
        <h1>API Key 管理</h1>
        <p class="muted">给客户端分发访问密钥，并按用户和分组记录用量。</p>
      </div>
      <div class="actions">
        <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
        <button class="primary" type="button" :disabled="users.length === 0" @click="openCreate"><Plus />新建 Key</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>Key 总数</span><strong>{{ keys.length }}</strong></div>
      <div class="metric"><span>启用中</span><strong>{{ activeCount }}</strong></div>
      <div class="metric"><span>用户数</span><strong>{{ users.length }}</strong></div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>用户</th>
            <th>分组</th>
            <th>前缀</th>
            <th>状态</th>
            <th>最近使用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in keys" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.user_name }}</td>
            <td>{{ row.group_name || '-' }}</td>
            <td class="mono">{{ row.key_prefix }}</td>
            <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
            <td>{{ dateTime(row.last_used_at) }}</td>
            <td>
              <div class="actions">
                <button class="ghost" type="button" @click="openEdit(row)"><Pencil />编辑</button>
                <button class="danger" type="button" @click="removing = row"><Trash2 />删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && keys.length === 0"><td colspan="8" class="muted">暂无 API Key</td></tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="modalOpen" :title="editing ? '编辑 API Key' : '新建 API Key'" eyebrow="KEY FORM" @close="modalOpen = false">
      <form id="api-key-form" class="form-grid" @submit.prevent="save">
        <div class="field">
          <span>用户</span>
          <select v-model="form.user_id" :disabled="Boolean(editing)" required>
            <option value="">选择用户</option>
            <option v-for="user in users" :key="user.id" :value="String(user.id)">{{ user.display_name }} / {{ user.email }}</option>
          </select>
        </div>
        <div class="field">
          <span>分组</span>
          <select v-model="form.group_id">
            <option value="">不绑定分组</option>
            <option v-for="group in groups" :key="group.id" :value="String(group.id)">{{ group.name }}</option>
          </select>
        </div>
        <div class="field">
          <span>名称</span>
          <input v-model.trim="form.name" required placeholder="例如：desktop-client" />
        </div>
        <div class="field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button class="ghost" type="button" @click="modalOpen = false">取消</button>
        <button class="primary" form="api-key-form" :disabled="saving || !form.user_id">{{ saving ? '保存中' : '保存' }}</button>
      </template>
    </AppModal>

    <AppModal :open="Boolean(createdKey)" title="新 API Key" eyebrow="COPY ONCE" size="lg" @close="createdKey = ''">
      <p class="muted">这个明文 Key 只显示一次，关闭后只能重新创建。</p>
      <div class="copy-box">{{ createdKey }}</div>
      <template #footer>
        <button class="ghost" type="button" @click="copyKey"><Copy />复制</button>
        <button class="primary" type="button" @click="createdKey = ''"><KeyRound />完成</button>
      </template>
    </AppModal>

    <AppModal :open="Boolean(removing)" title="删除 API Key" eyebrow="CONFIRM" size="sm" @close="removing = null">
      <p>确认删除 <strong>{{ removing?.name }}</strong>？这个 Key 会立即失效。</p>
      <template #footer>
        <button class="ghost" type="button" @click="removing = null">取消</button>
        <button class="danger" type="button" :disabled="saving" @click="remove">删除</button>
      </template>
    </AppModal>
  </div>
</template>
