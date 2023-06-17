<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { UniqueId } from '../../unique-id.js';
  import FormHelp from '../FormHelp.svelte';
  import type { MysqlBaseType } from '$lib/index.js';
  type Fd = {
    mysqlType: MysqlBaseType;
    isUnsigned: boolean;
    typeTinyIntAsBoolean: boolean;
  };

  export let formData: Writable<Fd>;

  const id = UniqueId.create();

  const handleUnsigned = () => {
    if (
      $formData.mysqlType === 'tinyint' &&
      $formData.typeTinyIntAsBoolean &&
      !$formData.isUnsigned
    ) {
      formData.update((f) => {
        const c = { ...f };
        c.isUnsigned = true;
        return c;
      });
    }
  };
</script>

<div>
  <fieldset id={id + 'typeTinyIntAsBoolean'}>
    <div class="form-label">Javascript Type</div>
    <div>
      <div class="form-check form-check-inline">
        <input
          class="form-check-input"
          type="radio"
          name="typeTinyIntAsBoolean"
          id={id + 'typeTinyIntAsBoolean' + 'true'}
          bind:group={$formData.typeTinyIntAsBoolean}
          on:input={handleUnsigned}
          value={true}
        />
        <label
          class="form-check-label"
          for={id + 'typeTinyIntAsBoolean' + 'true'}
        >
          <code>boolean</code>
        </label>
      </div>
      <div class="form-check form-check-inline">
        <input
          class="form-check-input"
          type="radio"
          name="typeTinyIntAsBoolean"
          id={id + 'typeTinyIntAsBoolean' + 'false'}
          bind:group={$formData.typeTinyIntAsBoolean}
          on:input={handleUnsigned}
          value={false}
        />
        <label
          class="form-check-label"
          for={id + 'typeTinyIntAsBoolean' + 'false'}
        >
          <code>number</code>
        </label>
      </div>
    </div>
  </fieldset>
  <FormHelp ariaDescribesId={id + 'typeTinyIntAsBoolean'}>
    By convention, columns with the exact MySQL type <code> tinyint(1) </code>
    are typed as and cast to javascript <code>boolean</code>. Otherwise
    <code>tinyint</code> columns
    are typed and cast as javascript <code>number</code>.
  </FormHelp>
</div>
