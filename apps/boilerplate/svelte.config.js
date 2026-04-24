import adapter from '@sveltejs/adapter-node';
export default {
  compilerOptions: { customElement: true },
  kit: {
    adapter: adapter(),
    paths: { base: '/boilerplate' }
  }
};
