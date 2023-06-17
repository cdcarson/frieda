<script lang="ts">
    import { UniqueId } from '../unique-id.js';
    import { ariaDescribes } from './actions.js';
  export let ariaDescribesId: string;
  const id = UniqueId.create();
</script>

<div class="form-text small text-muted" {id} use:ariaDescribes={ariaDescribesId}>
  <slot />
</div>
