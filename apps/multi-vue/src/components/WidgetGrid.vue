<script setup lang="ts">
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { WidgetBlock } from '../composables/useAgent';
import WidgetCell from './WidgetCell.vue';

defineProps<{
  widgets: WidgetBlock[];
  servers: WebMcpServer[];
}>();

const emit = defineEmits<{
  remove: [id: string];
  clear: [];
}>();
</script>

<template>
  <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden">
    <div v-if="widgets.length" class="widget-grid">
      <WidgetCell
        v-for="w in widgets"
        :key="w.id"
        :type="w.type"
        :data="w.data"
        :servers="servers"
        @remove="emit('remove', w.id)"
      />
    </div>
    <div v-else class="empty-state">
      No widgets yet. Send a message to generate visualizations.
    </div>

    <div
      v-if="widgets.length"
      style="padding: 8px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end"
    >
      <button class="btn btn-sm btn-danger" @click="emit('clear')">Clear all</button>
    </div>
  </div>
</template>
