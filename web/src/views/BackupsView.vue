<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { BackupItem, PageResult } from '@/types'

const backups = ref<BackupItem[]>([])
const creating = ref(false)

async function load() {
  backups.value = (await api.get<PageResult<BackupItem>>('/api/v1/admin/backups')).items
}

async function createBackup() {
  if (!confirm('创建手动备份？')) return
  creating.value = true
  try {
    await api.post('/api/v1/admin/backups', { include_usage_logs: false })
    await load()
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
  <div>
    <div class="page-head"><h1>备份</h1><button class="primary" :disabled="creating" @click="createBackup">{{ creating ? '创建中' : '创建手动备份' }}</button></div>
    <p class="muted">备份文件存储在 R2。API Key 明文不会写入备份，上游凭证保持加密状态。</p>
    <table>
      <thead><tr><th>ID</th><th>文件名</th><th>类型</th><th>大小</th><th>状态</th><th>创建时间</th><th>完成时间</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in backups" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.file_name }}</td><td>{{ row.backup_type }}</td><td>{{ row.file_size }}</td><td>{{ row.status }}</td><td>{{ row.created_at }}</td><td>{{ row.completed_at || '-' }}</td>
          <td><button class="ghost" :disabled="row.status !== 'completed'" @click="download(row)">下载</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

