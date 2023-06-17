<script lang="ts">
  import { enhance } from '$app/forms';
  import { getAppMessage } from '$lib/web/stores.js';

  import type { ParsedModel, WebData } from '$lib/app/shared.js';
  import { bt } from '$lib/index.js';
  import FormError from '$lib/web/components/FormError.svelte';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';
  import type { FormErrors, FormTouched } from '$lib/web/form-types.js';
  import { UniqueId } from '$lib/web/unique-id.js';
  import type { SubmitFunction } from '@sveltejs/kit';
  import sql from 'sql-template-tag';
  import {
    type Readable,
    type Writable,
    writable,
    derived
  } from 'svelte/store';
    import { getModelName } from '$lib/app/parsers.js';
    import FormHelp from '$lib/web/components/FormHelp.svelte';

  export let models: ParsedModel[];
  export let model: ParsedModel;
  const msg = getAppMessage();
  const id = UniqueId.create();
  type Fd = {
    tableName: string;
  };
  const formData: Writable<Fd> = writable({
    tableName: model.tableName
  });
  const touched: Writable<FormTouched<Fd>> = writable({});
    const nameRx = /^\w+$/;
  const formErrors: Readable<FormErrors<Fd>> = derived(
    [formData],
    (r) => {
      const [data] = r;
      const errors: FormErrors<Fd> = {};
      if (data.tableName.trim().length === 0) {
        errors.tableName = 'Required.';
      } else if (!nameRx.test(data.tableName.trim())) {
        errors.tableName = 'Invalid (must match /^w+$/).';
      } else {
        const conflict = models.find(
          (m) =>
            m.tableName === data.tableName.trim() ||
            m.modelName === getModelName(data.tableName.trim())
        );
        if (conflict) {
          errors.tableName = `Naming conflict. The table name or model name would conflict with the existing ${conflict.modelName} model.`;
        }
      }
     
      return errors;
    }
    
  );
  const changeSql = derived(formData, (data) => {
    const tbl = data.tableName.trim() || 'Unnamed';

    const statement = sql`RENAME TABLE ${bt(model.tableName)} TO ${bt(tbl)}`;
    return statement.sql;
  });

  let sqlError: string | null = null;
  const submit: SubmitFunction = (input) => {
    sqlError = null;
    msg.wait('Renaming model...')
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        msg.success('Model renamed.');
        update();
        return;
      }
      if (result.type === 'failure') {
        sqlError = result.data?.formErrors.sql as string || 'Sql error';
        msg.hide();
        return
      }
      msg.hide();
      update();
     
    };
  }
</script>
<form method="post" use:enhance={submit}>
  <input name="sql" bind:value={$changeSql} type="hidden" />
  <div class="row">
    <div class="col-md-6">
      <div class="mb-3">
        <label class="form-label" for={id + 'tableName'}>Table Name</label>
        <input
          type="text"
          id={id + 'tableName'}
          name="tableName"
          bind:value={$formData.tableName}
          class="form-control"
          on:input={() => ($touched.tableName = true)}
          class:is-invalid={$formErrors.tableName && $touched.tableName}
        />

        <FormError
          ariaDescribesId={id + 'tableName'}
          error={$formErrors.tableName}
          touched={$touched.tableName}
        />
        <FormHelp ariaDescribesId={id + 'tableName'}>
          Use your usual table naming convention.
        </FormHelp>
      </div>
    
      <div class="d-flex justify-content-end">
        <button type="submit" class="btn btn-primary">Rename Model</button>
      </div>
    </div>
    <div class="col-md-6">
      <div class="sticky-md-top">
        <div class="py-4">
          <SqlPreview sql={$changeSql} />
          {#if sqlError}
            <FormError error={sqlError} touched={true} ariaDescribesId='a'></FormError>
          {/if}
        </div>
      </div>
    </div>
  </div>
</form>