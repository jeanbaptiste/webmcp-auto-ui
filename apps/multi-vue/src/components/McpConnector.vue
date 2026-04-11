<script setup lang="ts">
import { ref } from 'vue';
import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';

defineProps<{
  connectedUrls: string[];
}>();

const emit = defineEmits<{
  connect: [url: string];
  disconnect: [url: string];
}>();

const url = ref('');

function onConnect() {
  if (!url.value.trim()) return;
  emit('connect', url.value.trim());
  url.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') onConnect();
}

function connectDemo(demoUrl: string) {
  emit('connect', demoUrl);
}
</script>

<template>
  <div class="section">
    <div class="section-title">MCP Servers</div>

    <div style="display: flex; gap: 6px">
      <input
        v-model="url"
        type="url"
        placeholder="wss:// or https://"
        @keydown="onKeydown"
      />
      <button class="btn btn-sm btn-accent" @click="onConnect">+</button>
    </div>

    <!-- Connected servers -->
    <div v-if="connectedUrls.length" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px">
      <span
        v-for="u in connectedUrls"
        :key="u"
        class="server-tag"
      >
        <span class="status-dot connected" />
        {{ u.replace(/https?:\/\//, '').split('/')[0] }}
        <span class="close" @click="emit('disconnect', u)">&times;</span>
      </span>
    </div>

    <!-- Demo servers -->
    <div class="section-title" style="margin-top: 8px">Demo Servers</div>
    <div style="display: flex; flex-direction: column; gap: 4px">
      <button
        v-for="demo in MCP_DEMO_SERVERS"
        :key="demo.id"
        class="btn btn-sm"
        :disabled="connectedUrls.includes(demo.url)"
        @click="connectDemo(demo.url)"
      >
        {{ demo.name }}
      </button>
    </div>
  </div>
</template>
