<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { UniqueId } from '$lib/web/unique-id.js';
  import FormHelp from '../FormHelp.svelte';
  const id = UniqueId.create();
  export let formData: Writable<{ isInvisible: boolean }>;
</script>

<div>
  <div class="form-check">
    <input
      class="form-check-input"
      type="checkbox"
      bind:checked={$formData.isInvisible}
      id={id + 'isInvisible'}
      name="isInvisible"
    />
    <label class="form-check-label" for={id + 'isInvisible'}>
      Mark column <code>INVISIBLE</code>
    </label>
  </div>
  <FormHelp ariaDescribesId={id + 'isInvisible'}>
    Fields where the underlying column is marked <code>INVISIBLE</code>
    are optional in the model's javascript type, since they are not included when
    the model is selected with <code>SELECT *</code>.
  </FormHelp>
</div>
