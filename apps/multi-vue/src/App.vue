<script setup lang="ts">
import { useServers } from './composables/useServers';
import { useAgent } from './composables/useAgent';
import ServerSelector from './components/ServerSelector.vue';
import McpConnector from './components/McpConnector.vue';
import ChatPanel from './components/ChatPanel.vue';
import WidgetGrid from './components/WidgetGrid.vue';

const { serverOptions, activeServers, layers, toggle, enableAll, disableAll } = useServers();
const {
  messages, widgets, generating, elapsed, toolCount, lastTool, llm,
  connectedMcpUrls,
  send, stop, connectMcp, disconnectMcp, clearWidgets,
} = useAgent();

const LLM_OPTIONS: { value: string; label: string }[] = [
  { value: 'haiku', label: 'Haiku' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
];

function onSend(msg: string) {
  send(msg, layers.value);
}

function onRemoveWidget(id: string) {
  widgets.value = widgets.value.filter(w => w.id !== id);
}
</script>

<template>
  <div class="app-shell">
    <!-- Topbar -->
    <header class="topbar">
      <span class="topbar-title">Auto-UI <span>multi-vue</span></span>
      <div class="topbar-spacer" />

      <!-- LLM selector -->
      <select v-model="llm" style="width: auto; max-width: 140px">
        <option v-for="opt in LLM_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- Agent progress -->
      <template v-if="generating">
        <div class="progress-bar" style="border: none; padding: 0; gap: 6px">
          <div class="spinner" />
          <span>{{ elapsed }}s</span>
          <span v-if="toolCount">&middot; {{ toolCount }} tools</span>
          <span v-if="lastTool">&middot; {{ lastTool }}</span>
        </div>
      </template>
    </header>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-scroll">
        <ServerSelector
          :servers="serverOptions"
          @toggle="toggle"
          @enable-all="enableAll"
          @disable-all="disableAll"
        />

        <McpConnector
          :connected-urls="connectedMcpUrls"
          @connect="connectMcp"
          @disconnect="disconnectMcp"
        />
      </div>

      <ChatPanel
        :messages="messages"
        :generating="generating"
        @send="onSend"
        @stop="stop"
      />
    </aside>

    <!-- Main widget area -->
    <main class="main-area">
      <WidgetGrid
        :widgets="widgets"
        :servers="activeServers"
        @remove="onRemoveWidget"
        @clear="clearWidgets"
      />
    </main>
  </div>
</template>
