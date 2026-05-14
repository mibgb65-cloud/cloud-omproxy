<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
  <div class="login-page">
    <form class="login-panel" @submit.prevent="submit">
      <h1>Private Family Gateway</h1>
      <p>家庭私用 AI API 网关</p>
      <label>
        邮箱
        <input v-model="form.email" type="email" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="form.password" type="password" autocomplete="current-password" />
      </label>
      <div v-if="error" class="error">{{ error }}</div>
      <button class="primary" :disabled="loading">{{ loading ? '登录中' : '登录' }}</button>
    </form>
  </div>
</template>

