import adapter from '@sveltejs/adapter-static';
export default {
  compilerOptions: { customElement: true },
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    paths: { base: '/todo' }
  }
};
