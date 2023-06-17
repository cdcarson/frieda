<script lang="ts">
    import { UniqueId } from '../unique-id.js';
    import { ariaDescribes } from './actions.js';
  export let touched: boolean|undefined;
  export let error: string | undefined | null;
  export let ariaDescribesId: string;
  const id = UniqueId.create();
  $: show = touched === true && typeof error === 'string' && error.trim().length > 0;

</script>
{#if show}
  <div class="invalid-feedback d-block" {id} use:ariaDescribes={ariaDescribesId}>
    {error}
  </div>
{/if}
