import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/views/AdminLayout.vue'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import UsersView from '@/views/UsersView.vue'
import ApiKeysView from '@/views/ApiKeysView.vue'
import GroupsView from '@/views/GroupsView.vue'
import UpstreamAccountsView from '@/views/UpstreamAccountsView.vue'
import UsageLogsView from '@/views/UsageLogsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import BackupsView from '@/views/BackupsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/dashboard',
      children: [
        { path: 'dashboard', component: DashboardView },
        { path: 'users', component: UsersView },
        { path: 'api-keys', component: ApiKeysView },
        { path: 'groups', component: GroupsView },
        { path: 'upstream-accounts', component: UpstreamAccountsView },
        { path: 'usage-logs', component: UsageLogsView },
        { path: 'settings', component: SettingsView },
        { path: 'backups', component: BackupsView },
      ],
    },
    { path: '/', redirect: '/admin/dashboard' },
    { path: '/:pathMatch(.*)*', redirect: '/admin/dashboard' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.path === '/login') {
    if (auth.token) return '/admin/dashboard'
    return true
  }
  if (!auth.token) return '/login'
  if (!auth.user) {
    try {
      await auth.loadMe()
    } catch {
      return '/login'
    }
  }
  return true
})

export default router

