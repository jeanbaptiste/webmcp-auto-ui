<!--
  BlockRenderer — legacy alias for WidgetRenderer.
  Kept for backward compatibility (used in ChatPanel, etc.).
-->
<script lang="ts">
  import WidgetRenderer from './WidgetRenderer.svelte';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';

  interface Props {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    servers?: WebMcpServer[];
    oninteract?: (type: string, action: string, payload: unknown) => void;
  }
  let { id, type, data, servers, oninteract }: Props = $props();
</script>

<WidgetRenderer {id} {type} {data} {servers} {oninteract} />
