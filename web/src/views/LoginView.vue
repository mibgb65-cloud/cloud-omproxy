<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandIcon from '@/components/BrandIcon.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.email || !form.password) {
    error.value = '请输入邮箱和密码'
    return
  }
  loading.value = true
  try {
    await auth.login(form.email, form.password)
    router.push('/admin/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-panel" @submit.prevent="submit">
      <div class="login-brand">
        <div class="brand-logo">
          <BrandIcon />
        </div>
        <p class="eyebrow">PRIVATE AI GATEWAY</p>
        <h1>Cloud OMProxy</h1>
        <p class="muted">管理上游账号、密钥和使用记录。</p>
      </div>
      <label>
        邮箱
        <input v-model.trim="form.email" type="email" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="form.password" type="password" autocomplete="current-password" />
      </label>
      <div v-if="error" class="error">{{ error }}</div>
      <button class="primary" :disabled="loading">
        {{ loading ? '登录中' : '登录' }}
      </button>
    </form>
  </main>
</template>
