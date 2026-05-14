<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, Plus, RefreshCw } from 'lucide-vue-next'
import { api } from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import type { BackupItem, PageResult } from '@/types'
import { dateTime, fileSize } from '@/utils/format'

const backups = ref<BackupItem[]>([])
const creating = ref(false)
const loading = ref(false)
const error = ref('')
const confirmOpen = ref(false)

const completedCount = computed(() => backups.value.filter((item) => item.status === 'completed').length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    backups.value = (await api.get<PageResult<BackupItem>>('/api/v1/admin/backups')).items
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载备份失败'
  } finally {
    loading.value = false
  }
}

async function createBackup() {
  creating.value = true
  error.value = ''
  try {
    await api.post('/api/v1/admin/backups', { include_usage_logs: false })
    confirmOpen.value = false
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建备份失败'
  } finally {
    creating.value = false
  }
}

async function download(row: BackupItem) {
  const data = await api.get<{ download_url: string }>(`/api/v1/admin/backups/${row.id}/download-url`)
  window.open(data.download_url, '_blank')
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <p class="eyebrow">BACKUPS</p>
        <h1>备份</h1>
        <p class="muted">手动导出配置数据到 R2，凭证保持加密状态。</p>
      </div>
      <div class="actions">
        <button class="btn btn--secondary" type="button" :disabled="loading" @click="load"><RefreshCw />刷新</button>
        <button class="primary" type="button" :disabled="creating" @click="confirmOpen = true"><Plus />创建备份</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric"><span>备份总数</span><strong>{{ backups.length }}</strong></div>
      <div class="metric"><span>已完成</span><strong>{{ completedCount }}</strong></div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>文件名</th>
            <th>类型</th>
            <th>大小</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>完成时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in backups" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td class="mono">{{ row.file_name }}</td>
            <td>{{ row.backup_type }}</td>
            <td>{{ fileSize(row.file_size) }}</td>
            <td><span class="status" :class="`status--${row.status}`">{{ row.status }}</span></td>
            <td>{{ dateTime(row.created_at) }}</td>
            <td>{{ dateTime(row.completed_at) }}</td>
            <td>
              <button class="ghost" type="button" :disabled="row.status !== 'completed'" @click="download(row)">
                <Download />
                下载
              </button>
            </td>
          </tr>
          <tr v-if="!loading && backups.length === 0"><td colspan="8" class="muted">暂无备份</td></tr>
        </tbody>
      </table>
    </div>

    <AppModal :open="confirmOpen" title="创建手动备份" eyebrow="CONFIRM" size="sm" @close="confirmOpen = false">
      <p>确认创建一份当前配置备份？备份会写入 R2。</p>
      <template #footer>
        <button class="ghost" type="button" @click="confirmOpen = false">取消</button>
        <button class="primary" type="button" :disabled="creating" @click="createBackup">{{ creating ? '创建中' : '创建' }}</button>
      </template>
    </AppModal>
  </div>
</template>
