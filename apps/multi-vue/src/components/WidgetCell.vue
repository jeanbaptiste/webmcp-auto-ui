<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { mountWidget } from '@webmcp-auto-ui/core';
import type { WebMcpServer } from '@webmcp-auto-ui/core';

const props = defineProps<{
  type: string;
  data: Record<string, unknown>;
  servers: WebMcpServer[];
}>();

const emit = defineEmits<{
  remove: [];
}>();

const container = ref<HTMLElement>();
let cleanup: (() => void) | void;

watch(
  [() => props.type, () => props.data, () => props.servers],
  () => {
    if (!container.value) return;
    if (typeof cleanup === 'function') cleanup();
    container.value.innerHTML = '';
    cleanup = mountWidget(container.value, props.type, props.data, props.servers);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof cleanup === 'function') cleanup();
});
</script>

<template>
  <div class="widget-cell">
    <div class="widget-cell-header">
      <span>{{ type }}</span>
      <button class="btn btn-sm btn-danger" @click="emit('remove')">&times;</button>
    </div>
    <div ref="container" class="widget-cell-body" />
  </div>
</template>
