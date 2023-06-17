<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { UniqueId } from '$lib/web/unique-id.js';

  const id = UniqueId.create();
  export let formData: Writable<{ defaultBooleanValue: boolean }>;
</script>

<fieldset>
  <div class="form-label">Default Boolean Value</div>
  <div class="form-check form-check-inline">
    <input
      type="radio"
      name="defaultBooleanValue"
      value={false}
      class="form-check-input"
      id={id + 'defaultBooleanValue' + 'false'}
      bind:group={$formData.defaultBooleanValue}
    />
    <label class="form-check-label" for={id + 'defaultBooleanValue' + 'false'}>
      <code>false</code>
    </label>
  </div>
  <div class="form-check form-check-inline">
    <input
      type="radio"
      name="defaultBooleanValue"
      value={true}
      class="form-check-input"
      id={id + 'defaultBooleanValue' + 'true'}
      bind:group={$formData.defaultBooleanValue}
    />
    <label class="form-check-label" for={id + 'defaultBooleanValue' + 'true'}>
      <code>true</code>
    </label>
  </div>
</fieldset>
