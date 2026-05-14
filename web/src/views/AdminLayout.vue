<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  Archive,
  Gauge,
  KeyRound,
  Layers3,
  LogOut,
  ServerCog,
  Settings,
  Users,
} from 'lucide-vue-next'
import BrandIcon from '@/components/BrandIcon.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { label: '仪表盘', path: '/admin/dashboard', icon: Gauge },
  { label: '用户', path: '/admin/users', icon: Users },
  { label: 'API Key', path: '/admin/api-keys', icon: KeyRound },
  { label: '分组', path: '/admin/groups', icon: Layers3 },
  { label: '上游账号', path: '/admin/upstream-accounts', icon: ServerCog },
  { label: '用量记录', path: '/admin/usage-logs', icon: Activity },
  { label: '系统设置', path: '/admin/settings', icon: Settings },
  { label: '备份', path: '/admin/backups', icon: Archive },
]

const currentTitle = computed(() => navItems.find((item) => route.path.startsWith(item.path))?.label || '控制台')

function logout() {
  auth.clear()
  router.push('/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo">
          <BrandIcon />
        </div>
        <div>
          <strong>OMPROXY</strong>
          <span>Private AI Gateway</span>
        </div>
      </div>
      <nav>
        <RouterLink v-for="item in navItems" :key="item.path" :to="item.path">
          <component :is="item.icon" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="topbar-title">
          <span>CONTROL PANEL</span>
          <strong>{{ currentTitle }}</strong>
        </div>
        <div class="actions">
          <span class="muted">{{ auth.user?.display_name || auth.user?.email || 'Admin' }}</span>
          <button class="btn btn--secondary btn--sm" type="button" @click="logout">
            <LogOut />
            退出
          </button>
        </div>
      </header>
      <section class="content">
        <RouterView />
      </section>
    </main>
  </div>
</template>
