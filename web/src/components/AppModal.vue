<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    eyebrow?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    eyebrow: '',
    size: 'md',
  },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @mousedown.self="emit('close')">
      <section class="modal-panel" :class="`modal-panel--${size}`" role="dialog" aria-modal="true" :aria-label="title">
        <header class="modal-head">
          <div>
            <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
            <h2>{{ title }}</h2>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" aria-label="关闭" @click="emit('close')">
            <X />
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>
