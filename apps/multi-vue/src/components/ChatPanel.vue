<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

const props = defineProps<{
  messages: { id: string; role: 'user' | 'assistant' | 'system'; text: string }[];
  generating: boolean;
}>();

const emit = defineEmits<{
  send: [msg: string];
  stop: [];
}>();

const input = ref('');
const scrollEl = ref<HTMLElement>();

function onSend() {
  if (!input.value.trim()) return;
  emit('send', input.value.trim());
  input.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
}

// Auto-scroll on new messages
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
    }
  },
);
</script>

<template>
  <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden">
    <div ref="scrollEl" class="chat-messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-msg"
        :class="msg.role"
      >
        {{ msg.text }}
      </div>
      <div v-if="!messages.length" class="empty-state" style="flex: 1">
        Type a message to start generating widgets.
      </div>
    </div>

    <div class="chat-input-row">
      <input
        v-model="input"
        type="text"
        :placeholder="generating ? 'Generating...' : 'Ask for a widget...'"
        :disabled="generating"
        @keydown="onKeydown"
      />
      <button
        v-if="generating"
        class="btn btn-danger btn-sm"
        @click="emit('stop')"
      >
        Stop
      </button>
      <button
        v-else
        class="btn btn-accent btn-sm"
        :disabled="!input.trim()"
        @click="onSend"
      >
        Send
      </button>
    </div>
  </div>
</template>
