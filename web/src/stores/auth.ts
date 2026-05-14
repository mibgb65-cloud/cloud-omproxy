import { defineStore } from 'pinia'
import { apiRequest } from '@/api/client'

interface AdminUser {
  id: number
  email: string
  display_name: string
  role: 'admin'
}

interface LoginResponse {
  token: string
  user: AdminUser
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    user: null as AdminUser | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(email: string, password: string) {
      const data = await apiRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('admin_token', data.token)
    },
    async loadMe() {
      if (!this.token) return
      this.user = await apiRequest<AdminUser>('/api/v1/auth/me')
    },
    clear() {
      this.token = ''
      this.user = null
      localStorage.removeItem('admin_token')
    },
  },
})

