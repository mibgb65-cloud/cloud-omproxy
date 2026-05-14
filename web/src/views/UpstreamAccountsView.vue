<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { GroupItem, PageResult, UpstreamAccountItem } from '@/types'

const accounts = ref<UpstreamAccountItem[]>([])
const groups = ref<GroupItem[]>([])
const editing = ref<UpstreamAccountItem | null>(null)
const testMessage = ref('')
const form = reactive({
  name: '',
  platform: 'openai',
  credential: '',
  base_url: '',
  priority: 100,
  status: 'active',
  group_ids: [] as number[],
})

async function load() {
  accounts.value = (await api.get<PageResult<UpstreamAccountItem>>('/api/v1/admin/upstream-accounts')).items
  groups.value = await api.get<GroupItem[]>('/api/v1/admin/groups')
}

function reset() {
  editing.value = null
  Object.assign(form, { name: '', platform: 'openai', credential: '', base_url: '', priority: 100, status: 'active', group_ids: [] })
}

function edit(row: UpstreamAccountItem) {
  editing.value = row
  Object.assign(form, { name: row.name, platform: row.platform, credential: '', base_url: '', priority: row.priority, status: row.status, group_ids: [] })
}

async function save() {
  const payload = { ...form, base_url: form.base_url || null }
  if (editing.value) await api.put(`/api/v1/admin/upstream-accounts/${editing.value.id}`, payload)
  else await api.post('/api/v1/admin/upstream-accounts', payload)
  reset()
  await load()
}

async function remove(row: UpstreamAccountItem) {
  if (!confirm(`删除上游账号 ${row.name}？`)) return
  await api.delete(`/api/v1/admin/upstream-accounts/${row.id}`)
  await load()
}

async function test(row: UpstreamAccountItem) {
  const data = await api.post<{ message: string }>(`/api/v1/admin/upstream-accounts/${row.id}/test`, {})
  testMessage.value = data.message
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>上游账号</h1></div>
    <div v-if="testMessage" class="notice">{{ testMessage }}</div>
    <form class="inline-form" @submit.prevent="save">
      <input v-model="form.name" placeholder="账号名称" />
      <select v-model="form.platform"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select>
      <input v-model="form.credential" type="password" :placeholder="editing ? '留空则不替换凭证' : '上游 API Key'" />
      <input v-model="form.base_url" placeholder="Base URL 可选" />
      <input v-model.number="form.priority" type="number" placeholder="优先级" />
      <select v-model="form.status"><option value="active">启用</option><option value="disabled">禁用</option></select>
      <select v-model="form.group_ids" multiple>
        <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <button class="primary">{{ editing ? '保存' : '新增' }}</button><button type="button" class="ghost" @click="reset">清空</button>
    </form>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>平台</th><th>优先级</th><th>状态</th><th>错误</th><th>最近使用</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in accounts" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.name }}</td><td>{{ row.platform }}</td><td>{{ row.priority }}</td><td>{{ row.status }}</td><td>{{ row.last_error_message || '-' }}</td><td>{{ row.last_used_at || '-' }}</td>
          <td><button class="ghost" @click="test(row)">测试</button><button class="ghost" @click="edit(row)">编辑</button><button class="danger" @click="remove(row)">删除</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

