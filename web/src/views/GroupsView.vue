<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { GroupItem } from '@/types'

const groups = ref<GroupItem[]>([])
const editing = ref<GroupItem | null>(null)
const form = reactive({ name: '', description: '', default_platform: '', status: 'active', sort_order: 100 })

async function load() {
  groups.value = await api.get<GroupItem[]>('/api/v1/admin/groups')
}

function reset() {
  editing.value = null
  Object.assign(form, { name: '', description: '', default_platform: '', status: 'active', sort_order: 100 })
}

function edit(row: GroupItem) {
  editing.value = row
  Object.assign(form, row)
}

async function save() {
  const payload = { ...form, default_platform: form.default_platform || null }
  if (editing.value) await api.put(`/api/v1/admin/groups/${editing.value.id}`, payload)
  else await api.post('/api/v1/admin/groups', payload)
  reset()
  await load()
}

async function remove(row: GroupItem) {
  if (!confirm(`删除分组 ${row.name}？`)) return
  await api.delete(`/api/v1/admin/groups/${row.id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>分组管理</h1></div>
    <form class="inline-form" @submit.prevent="save">
      <input v-model="form.name" placeholder="名称" />
      <input v-model="form.description" placeholder="描述" />
      <select v-model="form.default_platform">
        <option value="">自动</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="gemini">Gemini</option>
      </select>
      <input v-model.number="form.sort_order" type="number" placeholder="排序" />
      <button class="primary">{{ editing ? '保存' : '新增' }}</button><button type="button" class="ghost" @click="reset">清空</button>
    </form>
    <table>
      <thead><tr><th>ID</th><th>名称</th><th>描述</th><th>默认平台</th><th>状态</th><th>排序</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in groups" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.name }}</td><td>{{ row.description || '-' }}</td><td>{{ row.default_platform || '自动' }}</td><td>{{ row.status }}</td><td>{{ row.sort_order }}</td>
          <td><button class="ghost" @click="edit(row)">编辑</button><button class="danger" @click="remove(row)">删除</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

