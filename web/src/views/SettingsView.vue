<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'

const settings = reactive({ site: { name: 'Private Family Gateway' }, gateway: { default_group_id: 1 }, backup: { r2_enabled: true } })
const prices = ref<Record<string, any>[]>([])
const message = ref('')

async function load() {
  Object.assign(settings, await api.get<Record<string, any>>('/api/v1/admin/settings'))
  prices.value = await api.get<Record<string, any>[]>('/api/v1/admin/model-prices')
}

async function saveSettings() {
  await api.put('/api/v1/admin/settings', settings)
  message.value = '设置已保存'
}

async function savePrice(row: Record<string, any>) {
  await api.put(`/api/v1/admin/model-prices/${row.id}`, row)
  message.value = '价格已保存'
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-head"><h1>设置</h1><button class="ghost" @click="load">刷新</button></div>
    <div v-if="message" class="notice">{{ message }}</div>
    <section class="panel">
      <h2>基础设置</h2>
      <form class="inline-form" @submit.prevent="saveSettings">
        <input v-model="settings.site.name" placeholder="站点名称" />
        <input v-model.number="settings.gateway.default_group_id" type="number" placeholder="默认分组 ID" />
        <label class="checkbox"><input v-model="settings.backup.r2_enabled" type="checkbox" />启用 R2 备份</label>
        <button class="primary">保存设置</button>
      </form>
    </section>
    <section class="panel">
      <h2>模型价格</h2>
      <table>
        <thead><tr><th>平台</th><th>模型</th><th>输入</th><th>输出</th><th>缓存读</th><th>缓存写</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in prices" :key="row.id">
            <td>{{ row.platform }}</td><td>{{ row.model }}</td>
            <td><input v-model.number="row.input_price_micro_usd_per_token" type="number" /></td>
            <td><input v-model.number="row.output_price_micro_usd_per_token" type="number" /></td>
            <td><input v-model.number="row.cache_read_price_micro_usd_per_token" type="number" /></td>
            <td><input v-model.number="row.cache_write_price_micro_usd_per_token" type="number" /></td>
            <td><select v-model="row.status"><option value="active">启用</option><option value="disabled">禁用</option></select></td>
            <td><button class="ghost" @click="savePrice(row)">保存</button></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

