<script lang="ts">
  export interface JsSandboxSpec {
    title?: string;
    code: string;
    html?: string;
    css?: string;
    height?: string;
  }

  interface Props { spec: JsSandboxSpec; }
  let { spec }: Props = $props();

  const srcdoc = $derived(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:8px;font-family:system-ui,sans-serif;font-size:13px;background:#fff;color:#111}
${spec.css ?? ''}
</style>
</head>
<body>
<div id="root">${spec.html ?? ''}</div>
<script>
(function(){
try{
${spec.code}
}catch(e){
document.getElementById('root').innerHTML='<pre style="color:red;white-space:pre-wrap">'+e+'</pre>';
}
})();
<\/script>
</body>
</html>`);
</script>

<div class="bg-surface border border-border rounded-lg overflow-hidden font-sans">
  {#if spec.title}
    <div class="px-3 py-2 border-b border-border text-sm font-semibold text-text1 flex items-center gap-2">
      <span class="text-xs opacity-50">JS</span>
      {spec.title}
    </div>
  {/if}
  <iframe
    srcdoc={srcdoc}
    sandbox="allow-scripts"
    title={spec.title ?? 'JS Sandbox'}
    style="width:100%;height:{spec.height ?? '300px'};border:none;display:block;"
  ></iframe>
</div>
