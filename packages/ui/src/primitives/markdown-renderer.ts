import { marked, Renderer, type Tokens } from 'marked';
import hljs from 'highlight.js';

export function createMarkdownRenderer(): Renderer {
  const renderer = new Renderer();
  renderer.code = function (this: Renderer, { text, lang }: Tokens.Code): string {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
    return `<pre class="hljs-pre"><code class="hljs language-${language}">${highlighted}</code></pre>`;
  };
  return renderer;
}

const defaultRenderer = createMarkdownRenderer();
marked.use({ renderer: defaultRenderer, gfm: true, breaks: false });

export function renderMarkdown(source: string): string {
  return marked.parse(source ?? '', { async: false }) as string;
}

export function highlightCode(source: string, lang: string = 'plaintext'): string {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  return hljs.highlight(source ?? '', { language, ignoreIllegals: true }).value;
}
