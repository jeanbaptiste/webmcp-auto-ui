<svelte:options customElement={{ tag: 'auto-js-sandbox', shadow: 'none' }} />

<script lang="ts">
  export interface JsSandboxData {
    title?: string;
    code?: string;
    html?: string;
    css?: string;
    height?: string;
  }

  interface Props { data?: JsSandboxData | null; }
  let { data = {} }: Props = $props();

  /**
   * Tolerate two shapes (fix f620091):
   *   - bare spec: data = { code, html, css, title, height }
   *   - wrapped:   data = { spec: { code, ... } }
   * The cast handles the legacy wrapped shape defensively.
   */
  const resolved: JsSandboxData = $derived.by(() => {
    const d = data as Record<string, unknown> | null | undefined;
    if (d && typeof d === 'object' && 'spec' in d && d.spec && typeof d.spec === 'object') {
      return d.spec as JsSandboxData;
    }
    return (d as JsSandboxData) ?? {};
  });

  const srcdoc = $derived(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:8px;font-family:system-ui,sans-serif;font-size:13px;}
${resolved.css ?? ''}
</style>
</head>
<body>
<div id="root">${resolved.html ?? ''}</div>
<script>
(function(){
try{
${resolved.code ?? '// no code provided'}
}catch(e){
document.getElementById('root').innerHTML='<pre style="color:red;white-space:pre-wrap">'+e+'<\/pre>';
}
})();
<\/script>
</body>
</html>`);
</script>

<div class="bg-surface border border-border rounded-lg overflow-hidden font-sans">
  {#if resolved.title}
    <div class="px-3 py-2 border-b border-border text-sm font-semibold text-text1 flex items-center gap-2">
      <span class="text-xs opacity-50">JS</span>
      {resolved.title}
    </div>
  {/if}
  <iframe
    {srcdoc}
    sandbox="allow-scripts"
    title={resolved.title ?? 'JS Sandbox'}
    style="width:100%;height:{resolved.height ?? '300px'};border:none;display:block;"
  ></iframe>
</div>
