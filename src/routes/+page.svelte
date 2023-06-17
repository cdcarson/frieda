<script lang="ts">
  import type { PageData } from './$types.js';
  export let data: PageData;
</script>

There are {data.schema.models.length} <a href={`/models`}>models</a>.
