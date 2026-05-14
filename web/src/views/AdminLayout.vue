<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const navItems = [
  ['仪表盘', '/admin/dashboard'],
  ['用户', '/admin/users'],
  ['API Key', '/admin/api-keys'],
  ['分组', '/admin/groups'],
  ['上游账号', '/admin/upstream-accounts'],
  ['用量', '/admin/usage-logs'],
  ['设置', '/admin/settings'],
  ['备份', '/admin/backups'],
]

function logout() {
  auth.clear()
  router.push('/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <strong>OMProxy</strong>
        <span>Private Gateway</span>
      </div>
      <nav>
        <RouterLink v-for="[label, path] in navItems" :key="path" :to="path">{{ label }}</RouterLink>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <span>{{ auth.user?.display_name || 'Admin' }}</span>
        <button class="ghost" @click="logout">退出</button>
      </header>
      <section class="content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

