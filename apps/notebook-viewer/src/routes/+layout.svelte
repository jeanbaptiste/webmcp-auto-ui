<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="nb-viewer-root">
  {@render children()}
  <footer class="nb-viewer-footer">
    <a href="/">nb.hyperskills.net</a> — public notebook viewer
  </footer>
</div>
