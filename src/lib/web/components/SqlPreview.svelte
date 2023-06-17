<script lang="ts">
  import { sql as hlSql } from 'svelte-highlight/languages/sql';
  import { Highlight, LineNumbers } from 'svelte-highlight';
  import { formatSql } from '$lib/app/utils.js';
  export let sql: string;
  $: formatted = formatSql(sql);
</script>


<Highlight language={hlSql} code={formatted} let:highlighted>
  <LineNumbers {highlighted} hideBorder wrapLines />
</Highlight>