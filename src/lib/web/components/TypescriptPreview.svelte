<script lang="ts">
  import { typescript } from 'svelte-highlight/languages/typescript';
  import { Highlight } from 'svelte-highlight';
  import type {Readable} from 'svelte/store'
  export let code: string;
</script>
<Highlight language={typescript} code={code} />