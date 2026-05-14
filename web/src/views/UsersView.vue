<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { PageResult, UserItem } from '@/types'

const loading = ref(false)
const users = ref<UserItem[]>([])
const total = ref(0)
const editing = ref<UserItem | null>(null)
const form = reactive({
  email: '',
  display_name: '',
  role: 'member',
  password: '',
  status: 'active',
  daily_request_limit: null as number | null,
  daily_cost_limit_micro_usd: null as number | null,
})

async function load() {
  loading.value = true
  try {
    const data = await api.get<PageResult<UserItem>>('/api/v1/admin/users')
    users.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function reset() {
  editing.value = null
  Object.assign(form, {
    email: '',
    display_name: '',
    role: 'member',
    password: '',
    status: 'active',
    daily_request_limit: null,
    daily_cost_limit_micro_usd: null,
  })
}

function edit(row: UserItem) {
  editing.value = row
  Object.assign(form, { ...row, password: '' })
}

async function save() {
  if (editing.value) {
    await api.put(`/api/v1/admin/users/${editing.value.id}`, form)
  } else {
    await api.post('/api/v1/admin/users', form)
  }
  reset()
  await load()
}

async function remove(row: UserItem) {
  if (!confirm(`删除用户 ${row.display_name}？`)) return
  await api.delete(`/api/v1/admin/users/${row.id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>用户管理</h1><span class="muted">共 {{ total }} 人</span></div>
    <form class="inline-form" @submit.prevent="save">
      <input v-model="form.email" :disabled="Boolean(editing)" placeholder="邮箱" />
      <input v-model="form.display_name" placeholder="昵称" />
      <select v-model="form.role"><option value="member">成员</option><option value="admin">管理员</option></select>
      <select v-model="form.status"><option value="active">启用</option><option value="disabled">禁用</option></select>
      <input v-model="form.password" type="password" placeholder="密码" />
      <button class="primary">{{ editing ? '保存' : '新增' }}</button>
      <button type="button" class="ghost" @click="reset">清空</button>
    </form>
    <div v-if="loading" class="muted">加载中...</div>
    <table>
      <thead><tr><th>ID</th><th>邮箱</th><th>昵称</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in users" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.email }}</td><td>{{ row.display_name }}</td><td>{{ row.role }}</td><td><span class="tag">{{ row.status }}</span></td>
          <td><button class="ghost" @click="edit(row)">编辑</button><button class="danger" @click="remove(row)">删除</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

