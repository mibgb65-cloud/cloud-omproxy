<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Pencil, RefreshCw, Save } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'

interface SettingsShape {
  site: { name: string }
  gateway: { default_group_id: number }
  backup: { r2_enabled: boolean }
}

const settings = reactive<SettingsShape>({
  site: { name: 'Cloud OMProxy' },
  gateway: { default_group_id: 1 },
  backup: { r2_enabled: true },
})
const prices = ref<Record<string, any>[]>([])
const editingPrice = ref<Record<string, any> | null>(null)
const priceForm = reactive({
  input_price_micro_usd_per_token: 0,
  output_price_micro_usd_per_token: 0,
  cache_read_price_micro_usd_per_token: 0,
  cache_write_price_micro_usd_per_token: 0,
  status: 'active',
})
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const remote = await api.get<Partial<SettingsShape>>('/api/v1/admin/settings')
    Object.assign(settings.site, remote.site || {})
    Object.assign(settings.gateway, remote.gateway || {})
    Object.assign(settings.backup, remote.backup || {})
    prices.value = await api.get<Record<string, any>[]>('/api/v1/admin/model-prices')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载设置失败'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await api.put('/api/v1/admin/settings', settings)
    message.value = '设置已保存'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存设置失败'
  } finally {
    saving.value = false
  }
}

function openPrice(row: Record<string, any>) {
  editingPrice.value = row
  Object.assign(priceForm, {
    input_price_micro_usd_per_token: row.input_price_micro_usd_per_token,
    output_price_micro_usd_per_token: row.output_price_micro_usd_per_token,
    cache_read_price_micro_usd_per_token: row.cache_read_price_micro_usd_per_token,
    cache_write_price_micro_usd_per_token: row.cache_write_price_micro_usd_per_token,
    status: row.status,
  })
}

async function savePrice() {
  if (!editingPrice.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await api.put(`/api/v1/admin/model-prices/${editingPrice.value.id}`, { ...editingPrice.value, ...priceForm })
    editingPrice.value = null
    message.value = '模型价格已保存'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存模型价格失败'
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
        <p class="eyebrow">SETTINGS</p>
        <h1>系统设置</h1>
        <p class="muted">调整控制台展示、默认分组和模型计费估算。</p>
      </div>
      <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="message" class="notice">{{ message }}</div>

    <section class="panel">
      <header class="panel-head">
        <div>
          <p class="eyebrow">BASIC</p>
          <h2>基础设置</h2>
        </div>
      </header>
      <div class="panel-body">
        <form class="form-grid" @submit.prevent="saveSettings">
          <div class="field">
            <span>站点名称</span>
            <input v-model.trim="settings.site.name" />
          </div>
          <div class="field">
            <span>默认分组 ID</span>
            <input v-model.number="settings.gateway.default_group_id" type="number" />
          </div>
          <label class="checkbox">
            <input v-model="settings.backup.r2_enabled" type="checkbox" />
            启用 R2 备份
          </label>
          <div class="field">
            <span>&nbsp;</span>
            <button class="primary" :disabled="saving"><Save />保存设置</button>
          </div>
        </form>
      </div>
    </section>

    <section class="panel">
      <header class="panel-head">
        <div>
          <p class="eyebrow">PRICING</p>
          <h2>模型价格</h2>
        </div>
      </header>
      <div class="table-wrap" style="border: 0">
        <table>
          <thead>
            <tr>
              <th>平台</th>
              <th>模型</th>
              <th>输入</th>
              <th>输出</th>
              <th>缓存读</th>
              <th>缓存写</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in prices" :key="row.id">
              <td class="mono">{{ row.platform }}</td>
              <td>{{ row.model }}</td>
              <td class="mono">{{ row.input_price_micro_usd_per_token }}</td>
              <td class="mono">{{ row.output_price_micro_usd_per_token }}</td>
              <td class="mono">{{ row.cache_read_price_micro_usd_per_token }}</td>
              <td class="mono">{{ row.cache_write_price_micro_usd_per_token }}</td>
              <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
              <td><button class="ghost" type="button" @click="openPrice(row)"><Pencil />编辑</button></td>
            </tr>
            <tr v-if="!loading && prices.length === 0"><td colspan="8" class="muted">暂无模型价格</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <AppModal :open="Boolean(editingPrice)" title="编辑模型价格" eyebrow="MODEL PRICE" @close="editingPrice = null">
      <form id="price-form" class="form-grid" @submit.prevent="savePrice">
        <div class="field">
          <span>平台</span>
          <input :value="editingPrice?.platform" disabled />
        </div>
        <div class="field">
          <span>模型</span>
          <input :value="editingPrice?.model" disabled />
        </div>
        <div class="field">
          <span>输入 micro USD / token</span>
          <input v-model.number="priceForm.input_price_micro_usd_per_token" type="number" />
        </div>
        <div class="field">
          <span>输出 micro USD / token</span>
          <input v-model.number="priceForm.output_price_micro_usd_per_token" type="number" />
        </div>
        <div class="field">
          <span>缓存读</span>
          <input v-model.number="priceForm.cache_read_price_micro_usd_per_token" type="number" />
        </div>
        <div class="field">
          <span>缓存写</span>
          <input v-model.number="priceForm.cache_write_price_micro_usd_per_token" type="number" />
        </div>
        <div class="field">
          <span>状态</span>
          <select v-model="priceForm.status">
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button class="ghost" type="button" @click="editingPrice = null">取消</button>
        <button class="primary" form="price-form" :disabled="saving">保存</button>
      </template>
    </AppModal>
  </div>
</template>
