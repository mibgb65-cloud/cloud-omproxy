<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { ApiKeyItem, GroupItem, PageResult, UserItem } from '@/types'

const keys = ref<ApiKeyItem[]>([])
const users = ref<UserItem[]>([])
const groups = ref<GroupItem[]>([])
const createdKey = ref('')
const editing = ref<ApiKeyItem | null>(null)
const form = reactive({ user_id: 0, group_id: null as number | null, name: '', status: 'active' })

async function load() {
  keys.value = (await api.get<PageResult<ApiKeyItem>>('/api/v1/admin/api-keys')).items
  users.value = (await api.get<PageResult<UserItem>>('/api/v1/admin/users', { page_size: 100 })).items
  groups.value = await api.get<GroupItem[]>('/api/v1/admin/groups')
}

function reset() {
  editing.value = null
  Object.assign(form, { user_id: 0, group_id: null, name: '', status: 'active' })
}

function edit(row: ApiKeyItem) {
  editing.value = row
  Object.assign(form, { user_id: row.user_id, group_id: row.group_id, name: row.name, status: row.status })
}

async function save() {
  if (editing.value) {
    await api.put(`/api/v1/admin/api-keys/${editing.value.id}`, form)
  } else {
    const data = await api.post<{ api_key: string }>('/api/v1/admin/api-keys', form)
    createdKey.value = data.api_key
  }
  reset()
  await load()
}

async function remove(row: ApiKeyItem) {
  if (!confirm(`删除 API Key ${row.name}？`)) return
  await api.delete(`/api/v1/admin/api-keys/${row.id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>API Key 管理</h1></div>
    <div v-if="createdKey" class="notice">
      <strong>新 Key 只显示一次：</strong><code>{{ createdKey }}</code>
      <button class="ghost" @click="navigator.clipboard.writeText(createdKey)">复制</button>
      <button class="ghost" @click="createdKey = ''">关闭</button>
    </div>
    <form class="inline-form" @submit.prevent="save">
      <select v-model.number="form.user_id"><option :value="0">选择用户</option><option v-for="u in users" :key="u.id" :value="u.id">{{ u.display_name }}</option></select>
      <select v-model="form.group_id"><option :value="null">无分组</option><option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option></select>
      <input v-model="form.name" placeholder="Key 名称" />
      <select v-model="form.status"><option value="active">启用</option><option value="disabled">禁用</option></select>
      <button class="primary">{{ editing ? '保存' : '新增' }}</button><button type="button" class="ghost" @click="reset">清空</button>
    </form>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>用户</th><th>分组</th><th>前缀</th><th>状态</th><th>最近使用</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in keys" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.name }}</td><td>{{ row.user_name }}</td><td>{{ row.group_name || '-' }}</td><td>{{ row.key_prefix }}</td><td>{{ row.status }}</td><td>{{ row.last_used_at || '-' }}</td>
          <td><button class="ghost" @click="edit(row)">编辑</button><button class="danger" @click="remove(row)">删除</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

