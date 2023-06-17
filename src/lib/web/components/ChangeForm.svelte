<script lang="ts">
  import type { WebData } from '$lib/app/shared.js';
  import { getAppMessage, getWebAppStores } from '$lib/web/stores.js';
  import type { ChangeError, ChangeRequest } from '$lib/app/shared.js';
  import { writable, type Readable } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  export let sql: string;
  export let label = 'Execute Schema Change';
  export let endpoint: string;
  export let enabled: boolean;
  let error: ChangeError | null = null;
  const messageSvc = getAppMessage();
  const submitting = writable<boolean>(false);
  const dispatchSuccess = createEventDispatcher<{ success: WebData }>();
  const dispatchCancel = createEventDispatcher();
  const submit = async () => {
    error = null;
    submitting.set(true);
    messageSvc.wait('Executing schema change...');
    const req: ChangeRequest = { sql };
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(req)
    });
    const errOrData: WebData | ChangeError = await response.json();
    submitting.set(false);
    if (response.ok) {
      messageSvc.success('Change made.');
      dispatchSuccess('success', errOrData as WebData);
      return;
    }
    messageSvc.hide();
    error = errOrData as ChangeError;
  };
</script>

<div class=" d-flex justify-content-between">
  <button
    type="button"
    class="btn btn-light"
    on:click={() => dispatchCancel('cancel')}>Cancel</button
  >
  <button
    type="button"
    class="btn btn-primary"
    disabled={$submitting || !enabled}
    on:click={submit}>{label}</button
  >
</div>
{#if error}
  <div class="mt-3">
    <div class="alert alert-danger">Schema change failed:</div>
    <div class="font-monospace">
      ${error.error}
    </div>
  </div>
{/if}
