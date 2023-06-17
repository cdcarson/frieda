<script lang="ts">
    import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { getAppMessage } from '$lib/web/stores.js';

  import type { ParsedModel, WebData } from '$lib/app/shared.js';
  import { bt } from '$lib/index.js';
  import ChangeForm from '$lib/web/components/ChangeForm.svelte';
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

  export let model: ParsedModel;
  const msg = getAppMessage()
  const id = UniqueId.create();
  type Fd = {
    confirmModelName: string;
  };
  const formData: Writable<Fd> = writable({
    confirmModelName: ''
  });
  const touched: Writable<FormTouched<Fd>> = writable({});
  const formErrors: Readable<FormErrors<Fd>> = derived(
    [formData],
    (r) => {
      const [ d] = r;
      
      const errors: FormErrors<Fd> = {};
      if (d.confirmModelName.trim() !== model.modelName) {
        errors.confirmModelName = `That's not the model name.`
      }
      return errors;
    }
  );

  const changeSql = sql`DROP TABLE ${bt(model.tableName)}`.sql
  let sqlError: string|null = null;
  const submit: SubmitFunction = (input) => {
    sqlError = null;
    msg.wait('Dropping model...')
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        msg.success('Model dropped.');
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
  };
 
</script>

<form method="post" use:enhance={submit}>
  <input name="sql" value={changeSql} type="hidden"/>
  <div class="row">
    <div class="col-md-6">
      <div class="mb-3">
        <label class="form-label" for={id + 'confirmModelName'}>Model Name</label>
        <input
          type="text"
          name="confirmModelName"
          id={id + 'confirmModelName'}
          bind:value={$formData.confirmModelName}
          class="form-control"
          class:is-invalid={$touched.confirmModelName && $formErrors.confirmModelName}
          on:input={() => ($touched.confirmModelName = true)}
          on:blur={() => ($touched.confirmModelName = true)}
        />
        <FormError ariaDescribesId={id + 'confirmModelName'} touched={$touched.confirmModelName} error={$formErrors.confirmModelName}/>
        <div class="small text-muted form-text" id={id + 'confirmModelNameHelp'}>
          Type the name of the model above to confirm.
        </div>
      </div>
      <div class="d-flex justify-content-end">
        <button type="submit" class="btn btn-danger">Drop Model</button>
      </div>
     
    </div>
    <div class="col-md-6">
      <div class="sticky-md-top">
        <div class="py-4">
          <SqlPreview sql={changeSql} />
        </div>
      </div>
    </div>
  </div>

</form>

