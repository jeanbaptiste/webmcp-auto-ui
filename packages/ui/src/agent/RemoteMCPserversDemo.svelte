<!-- Backward-compat shim for Track F rename. Remove after index.ts is updated to MCPserversList. -->
<script lang="ts">
  import MCPserversList from './MCPserversList.svelte';

  interface Server {
    id: string;
    label: string;
    description: string;
    url: string;
    tags?: string[];
  }

  interface Props {
    servers: Server[];
    enabledServers?: Set<string>;
    loading?: Set<string>;
    onconnect?: (id: string) => void;
    onconnectall?: () => void;
    ondisconnect?: (id: string) => void;
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (id: string) => void;
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (id: string) => void;
  }

  let props: Props = $props();
</script>

<MCPserversList {...props} />
