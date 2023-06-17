<script lang="ts">
  import { UniqueId } from '../unique-id.js';

  export let id = 'section-' +  UniqueId.create();
</script>

<section {id}>
  <div class="container py-5">
    <slot/>
  </div>
</section>
