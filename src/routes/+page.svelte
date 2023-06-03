<script lang="ts">
  import type { PageData } from './$types.js'
  export let data: PageData
</script>
<h1>Welcome to your library project</h1>
<p>
  Create your package using @sveltejs/package and preview/showcase your work
  with SvelteKit
</p>
<p>
  hello <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>

<pre>
  {JSON.stringify(data, null, 1)}
</pre>

