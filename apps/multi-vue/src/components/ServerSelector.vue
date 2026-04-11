<script setup lang="ts">
import type { ServerOption } from '../composables/useServers';

defineProps<{
  servers: ServerOption[];
}>();

const emit = defineEmits<{
  toggle: [id: string];
  enableAll: [];
  disableAll: [];
}>();
</script>

<template>
  <div class="section">
    <div class="section-title">Widget Servers</div>
    <label
      v-for="s in servers"
      :key="s.id"
      class="checkbox-row"
    >
      <input
        type="checkbox"
        :checked="s.enabled"
        @change="emit('toggle', s.id)"
      />
      {{ s.label }}
    </label>
    <div style="display: flex; gap: 6px">
      <button class="btn btn-sm" @click="emit('enableAll')">All</button>
      <button class="btn btn-sm" @click="emit('disableAll')">None</button>
    </div>
  </div>
</template>
