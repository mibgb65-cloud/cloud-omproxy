<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { PageResult, UserItem } from '@/types'
import { dateTime } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const users = ref<UserItem[]>([])
const total = ref(0)
const modalOpen = ref(false)
const editing = ref<UserItem | null>(null)
const removing = ref<UserItem | null>(null)
const form = reactive({
  email: '',
  display_name: '',
  role: 'member',
  password: '',
  status: 'active',
  daily_request_limit: '',
  daily_cost_limit_micro_usd: '',
})

const activeCount = computed(() => users.value.filter((user) => user.status === 'active').length)
const adminCount = computed(() => users.value.filter((user) => user.role === 'admin').length)

function nullableNumber(value: string) {
  return value === '' ? null : Number(value)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get<PageResult<UserItem>>('/api/v1/admin/users')
    users.value = data.items
    total.value = data.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载用户失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    email: '',
    display_name: '',
    role: 'member',
    password: '',
    status: 'active',
    daily_request_limit: '',
    daily_cost_limit_micro_usd: '',
  })
  modalOpen.value = true
}

function openEdit(row: UserItem) {
  editing.value = row
  Object.assign(form, {
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    password: '',
    status: row.status,
    daily_request_limit: row.daily_request_limit == null ? '' : String(row.daily_request_limit),
    daily_cost_limit_micro_usd: row.daily_cost_limit_micro_usd == null ? '' : String(row.daily_cost_limit_micro_usd),
  })
  modalOpen.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  const payload = {
    email: form.email,
    display_name: form.display_name,
    role: form.role,
    password: form.password || undefined,
    status: form.status,
    daily_request_limit: nullableNumber(form.daily_request_limit),
    daily_cost_limit_micro_usd: nullableNumber(form.daily_cost_limit_micro_usd),
  }
  try {
    if (editing.value) await api.put(`/api/v1/admin/users/${editing.value.id}`, payload)
    else await api.post('/api/v1/admin/users', payload)
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存用户失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  error.value = ''
  try {
    await api.delete(`/api/v1/admin/users/${removing.value.id}`)
    removing.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除用户失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <p class="eyebrow">USERS</p>
        <h1>用户管理</h1>
        <p class="muted">管理后台账号和网关使用成员。</p>
      </div>
      <div class="actions">
        <button class="btn btn--secondary" type="button" :disabled="loading" @click="load">
          <RefreshCw />
          刷新
        </button>
        <button class="primary" type="button" @click="openCreate">
          <Plus />
          新建用户
        </button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>总用户</span><strong>{{ total }}</strong></div>
      <div class="metric"><span>启用中</span><strong>{{ activeCount }}</strong></div>
      <div class="metric"><span>管理员</span><strong>{{ adminCount }}</strong></div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="notice">加载中</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>邮箱</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>日请求限制</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in users" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td class="mono">{{ row.email }}</td>
            <td>{{ row.display_name }}</td>
            <td class="mono">{{ row.role }}</td>
            <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
            <td>{{ row.daily_request_limit ?? '-' }}</td>
            <td>{{ dateTime(row.created_at) }}</td>
            <td>
              <div class="actions">
                <button class="ghost" type="button" @click="openEdit(row)"><Pencil />编辑</button>
                <button class="danger" type="button" @click="removing = row"><Trash2 />删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && users.length === 0">
            <td colspan="8" class="muted">暂无用户</td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="modalOpen" :title="editing ? '编辑用户' : '新建用户'" eyebrow="USER FORM" @close="modalOpen = false">
      <form id="user-form" class="form-grid" @submit.prevent="save">
        <div class="field">
          <span>邮箱</span>
          <input v-model.trim="form.email" type="email" :disabled="Boolean(editing)" required />
        </div>
        <div class="field">
          <span>昵称</span>
          <input v-model.trim="form.display_name" required />
        </div>
        <div class="field">
          <span>角色</span>
          <select v-model="form.role">
            <option value="member">成员</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <div class="field">
          <span>密码</span>
          <input v-model="form.password" type="password" :placeholder="editing ? '留空则不修改' : '登录密码'" :required="!editing" />
        </div>
        <div class="field">
          <span>每日请求限制</span>
          <input v-model="form.daily_request_limit" inputmode="numeric" placeholder="留空不限" />
        </div>
        <div class="field">
          <span>每日成本限制 micro USD</span>
          <input v-model="form.daily_cost_limit_micro_usd" inputmode="numeric" placeholder="留空不限" />
        </div>
      </form>
      <template #footer>
        <button class="ghost" type="button" @click="modalOpen = false">取消</button>
        <button class="primary" form="user-form" :disabled="saving">{{ saving ? '保存中' : '保存' }}</button>
      </template>
    </AppModal>

    <AppModal :open="Boolean(removing)" title="删除用户" eyebrow="CONFIRM" size="sm" @close="removing = null">
      <p>确认删除用户 <strong>{{ removing?.display_name }}</strong>？相关 API Key 会被禁用。</p>
      <template #footer>
        <button class="ghost" type="button" @click="removing = null">取消</button>
        <button class="danger" type="button" :disabled="saving" @click="remove">删除</button>
      </template>
    </AppModal>
  </div>
</template>
