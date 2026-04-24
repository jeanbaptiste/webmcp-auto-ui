<!-- Backward-compat shim for Track F rename. Remove after index.ts is updated to MCPserversList. -->
<script lang="ts">
  import MCPserversList from './MCPserversList.svelte';

  interface Server {
    id: string;
    name: string;
    description: string;
    url: string;
    tags?: string[];
  }

  interface Props {
    servers: Server[];
    connectedUrls?: string[];
    loading?: string[];
    onconnect?: (url: string) => void;
    onconnectall?: () => void;
    ondisconnect?: (url: string) => void;
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (url: string) => void;
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (url: string) => void;
  }

  let props: Props = $props();
</script>

<MCPserversList {...props} />
