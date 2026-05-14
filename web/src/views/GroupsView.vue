<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { GroupItem } from '@/types'

const groups = ref<GroupItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const modalOpen = ref(false)
const editing = ref<GroupItem | null>(null)
const removing = ref<GroupItem | null>(null)
const form = reactive({ name: '', description: '', default_platform: '', status: 'active', sort_order: 100 })

const activeCount = computed(() => groups.value.filter((group) => group.status === 'active').length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    groups.value = await api.get<GroupItem[]>('/api/v1/admin/groups')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载分组失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', description: '', default_platform: '', status: 'active', sort_order: 100 })
  modalOpen.value = true
}

function openEdit(row: GroupItem) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    description: row.description || '',
    default_platform: row.default_platform || '',
    status: row.status,
    sort_order: row.sort_order,
  })
  modalOpen.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form, default_platform: form.default_platform || null }
    if (editing.value) await api.put(`/api/v1/admin/groups/${editing.value.id}`, payload)
    else await api.post('/api/v1/admin/groups', payload)
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存分组失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  error.value = ''
  try {
    await api.delete(`/api/v1/admin/groups/${removing.value.id}`)
    removing.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除分组失败'
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
        <p class="eyebrow">GROUPS</p>
        <h1>分组管理</h1>
        <p class="muted">把用户密钥和上游账号放到同一个调度范围。</p>
      </div>
      <div class="actions">
        <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
        <button class="primary" type="button" @click="openCreate"><Plus />新建分组</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>分组总数</span><strong>{{ groups.length }}</strong></div>
      <div class="metric"><span>启用中</span><strong>{{ activeCount }}</strong></div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>描述</th>
            <th>默认平台</th>
            <th>状态</th>
            <th>排序</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in groups" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.description || '-' }}</td>
            <td class="mono">{{ row.default_platform || 'auto' }}</td>
            <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
            <td class="mono">{{ row.sort_order }}</td>
            <td>
              <div class="actions">
                <button class="ghost" type="button" @click="openEdit(row)"><Pencil />编辑</button>
                <button class="danger" type="button" @click="removing = row"><Trash2 />删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && groups.length === 0"><td colspan="7" class="muted">暂无分组</td></tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="modalOpen" :title="editing ? '编辑分组' : '新建分组'" eyebrow="GROUP FORM" @close="modalOpen = false">
      <form id="group-form" class="form-grid" @submit.prevent="save">
        <div class="field">
          <span>名称</span>
          <input v-model.trim="form.name" required />
        </div>
        <div class="field">
          <span>默认平台</span>
          <select v-model="form.default_platform">
            <option value="">自动</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
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
          <span>排序</span>
          <input v-model.number="form.sort_order" type="number" />
        </div>
        <div class="field field--full">
          <span>描述</span>
          <textarea v-model.trim="form.description" />
        </div>
      </form>
      <template #footer>
        <button class="ghost" type="button" @click="modalOpen = false">取消</button>
        <button class="primary" form="group-form" :disabled="saving">保存</button>
      </template>
    </AppModal>

    <AppModal :open="Boolean(removing)" title="删除分组" eyebrow="CONFIRM" size="sm" @close="removing = null">
      <p>确认删除分组 <strong>{{ removing?.name }}</strong>？仍被 API Key 或上游账号使用时会被拒绝。</p>
      <template #footer>
        <button class="ghost" type="button" @click="removing = null">取消</button>
        <button class="danger" type="button" :disabled="saving" @click="remove">删除</button>
      </template>
    </AppModal>
  </div>
</template>
