<script lang="ts">
  import type { MysqlBaseType } from '$lib/index.js';
  import type { Writable } from 'svelte/store';
    import { UniqueId } from '../../unique-id.js';
  type Fd = {
    mysqlType: MysqlBaseType;
    typeTinyIntAsBoolean: boolean;
    isUnsigned: boolean;
  };
  const id = UniqueId.create()
  
  export let formData: Writable<Fd>;
  $: {
    if ($formData.typeTinyIntAsBoolean && $formData.mysqlType === 'tinyint' && $formData.isUnsigned === false) {
      $formData.isUnsigned = true;
    }
    
  }
</script>

<div class="form-check">
  <input
    class="form-check-input"
    type="checkbox"
    bind:checked={$formData.isUnsigned}
    disabled={$formData.mysqlType === 'tinyint' &&
      $formData.typeTinyIntAsBoolean}
    id={id + 'isUnsigned'}
  />
  <label class="form-check-label" for={id + 'isUnsigned'}>
    <code>UNSIGNED</code>
  </label>
</div>
