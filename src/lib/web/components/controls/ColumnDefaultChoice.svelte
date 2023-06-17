<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { UniqueId } from '../../unique-id.js';
  import FormHelp from '../FormHelp.svelte';
  import type { MysqlBaseType } from '$lib/index.js';
  type Fd = {
    columnDefault: 'none' | 'default' | 'null';
  };

  export let formData: Writable<Fd>;

  const id = UniqueId.create();
</script>
<div>
  <fieldset id={id + 'columnDefault'}>
    <div class="form-label">Default Value / Null</div>

    <div class="form-check">
      <input
        type="radio"
        name="columnDefault"
        value="none"
        class="form-check-input"
        id={id + 'columnDefault' + 'none'}
        bind:group={$formData.columnDefault}
      />
      <label class="form-check-label" for={id + 'columnDefault' + 'none'}>
        <code>NOT NULL</code>
        <small class="text-muted">(No default value)</small>
      </label>
    </div>
    <div class="form-check">
      <input
        type="radio"
        name="columnDefault"
        value="null"
        class="form-check-input"
        id={id + 'columnDefault' + 'null'}
        bind:group={$formData.columnDefault}
      />
      <label class="form-check-label" for={id + 'columnDefault' + 'null'}>
        <code>NULL</code>
      </label>
    </div>
    <div class="form-check">
      <input
        type="radio"
        name="columnDefault"
        value="default"
        class="form-check-input"
        id={id + 'columnDefault' + 'default'}
        bind:group={$formData.columnDefault}
      />
      <label class="form-check-label" for={id + 'columnDefault' + 'default'}>
        Provide a default value
      </label>
    </div>
  </fieldset>
  <FormHelp ariaDescribesId={id + 'columnDefault'}>
    Whether the underlying column can be <code>NULL</code>, and if not,
    whether to provide a default value.
  </FormHelp>
</div>