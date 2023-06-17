<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { UniqueId } from '../../unique-id.js';
  import FormHelp from '../FormHelp.svelte';
  import type { MysqlBaseType } from '$lib/index.js';
  type Fd = {
    mysqlType: MysqlBaseType;
    typeBigIntAsBigInt: boolean;
  };

  export let formData: Writable<Fd>;

  const id = UniqueId.create();
</script>
<div>
  <fieldset id={id + 'typeBigIntAsBigInt'}>
    <div class="form-label">Javascript Type</div>
    <div>
      <div class="form-check form-check-inline">
        <input
          class="form-check-input"
          type="radio"
          name="typeBigIntAsBigInt"
          id={id + 'typeBigIntAsBigInt' + 'false'}
          bind:group={$formData.typeBigIntAsBigInt}
          value={false}
        />
        <label class="form-check-label" for={id + 'typeBigIntAsBigInt' + 'false'}>
          <code>string</code>
        </label>
      </div>
      <div class="form-check form-check-inline">
        <input
          class="form-check-input"
          type="radio"
          name="typeBigIntAsBigInt"
          id={id + 'typeBigIntAsBigInt' + 'true'}
          bind:group={$formData.typeBigIntAsBigInt}
          value={true}
        />
        <label class="form-check-label" for={id + 'typeBigIntAsBigInt' + 'true'}>
          <code>bigint</code>
        </label>
      </div>
    </div>
  </fieldset>
  <FormHelp ariaDescribesId={id + 'typeBigIntAsBigInt'}>
    Whether to add a <code>@bigint</code> type annotation. Fields with this type
    annotation are typed as and cast to javascript
    <code>bigint</code>. Without that annotation the field will be typed as
    javascript
    <code>string</code>.
  </FormHelp>
</div>

