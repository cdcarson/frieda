<script lang="ts">
  import {
    writable,
    derived,
    type Readable,
    type Writable
  } from 'svelte/store';
  import { format } from 'sql-formatter';
  import type { ParsedModel } from '$lib/app/shared.js';
  import { bt } from '$lib/index.js';
  import sql, { join } from 'sql-template-tag';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';
  import type { FormErrors, FormTouched } from '$lib/web/form-types.js';
  import { UniqueId } from '$lib/web/unique-id.js';
  import { getFieldName, getModelName } from '$lib/app/parsers.js';
  import FormError from '$lib/web/components/FormError.svelte';
  import FormHelp from '$lib/web/components/FormHelp.svelte';
  import type { AddModelFormData } from './shared.js';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
    import { getAppMessage } from '$lib/web/stores.js';
  const id = UniqueId.create();
  const msg = getAppMessage();
  const formData = writable<AddModelFormData>({
    tableName: '',
    primaryKeyName: 'id',
    addCreatedAt: true,
    createdAtName: 'createdAt',
    addUpdatedAt: true,
    updatedAtName: 'updatedAt'
  });
  export let models: ParsedModel[];
  export let sqlError: string|null = null;
  const touched: Writable<FormTouched<AddModelFormData>> = writable({});
  const nameRx = /^\w+$/;
  const formErrors: Readable<FormErrors<AddModelFormData>> = derived(
    [formData],
    (r) => {
      const [data] = r;
      const errors: FormErrors<AddModelFormData> = {};
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
      const primaryKeyName = data.primaryKeyName.trim();

      if (primaryKeyName.length === 0) {
        errors.primaryKeyName = 'Required.';
      } else if (!nameRx.test(primaryKeyName)) {
        errors.primaryKeyName = 'Invalid (must match /^w+$/).';
      }
      const createdAtName = data.createdAtName.trim();
      if (data.addCreatedAt) {
        if (createdAtName.length === 0) {
          errors.createdAtName = 'Required.';
        } else if (!nameRx.test(createdAtName)) {
          errors.createdAtName = 'Invalid (must match /^w+$/).';
        } else if (
          getFieldName(createdAtName) === getFieldName(primaryKeyName)
        ) {
          errors.createdAtName =
            'Naming conflict. The column name or field name conflicts with the primary key field above.)';
        }
      }
      const updatedAtName = data.updatedAtName.trim();
      if (data.addUpdatedAt) {
        if (updatedAtName.length === 0) {
          errors.updatedAtName = 'Required.';
        } else if (!nameRx.test(updatedAtName)) {
          errors.updatedAtName = 'Invalid (must match /^w+$/).';
        } else if (
          getFieldName(updatedAtName) === getFieldName(primaryKeyName)
        ) {
          errors.updatedAtName =
            'Naming conflict. The column name or field name conflicts with the primary key field above.';
        } else if (
          getFieldName(updatedAtName) === getFieldName(createdAtName) &&
          data.addCreatedAt
        ) {
          errors.updatedAtName =
            'Naming conflict. The column name or field name conflicts with the created at field above.';
        }
      }
      return errors;
    }
  );
  const changeSql = derived(formData, (data) => {
    const tbl = data.tableName.trim() || 'Unnamed';
    const pk = data.primaryKeyName.trim() || 'id';
    const createdAt = data.createdAtName.trim() || 'createdAt';
    const updatedAt = data.updatedAtName.trim() || 'updatedAt';
    const fields = [sql`${bt(pk)} bigint unsigned NOT NULL AUTO_INCREMENT`];
    if (data.addCreatedAt) {
      fields.push(
        sql`${bt(createdAt)} datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`
      );
    }
    if (data.addUpdatedAt) {
      fields.push(
        sql`${bt(
          updatedAt
        )} datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`
      );
    }
    fields.push(sql`PRIMARY KEY (${bt(pk)})`);
    const statement = sql`CREATE TABLE ${bt(tbl)}(${join(fields)})`;
    return format(statement.sql, { language: 'mysql' });
  });

  const submit: SubmitFunction = (input) => {
    sqlError = null;
    msg.wait('Adding model...')
    return async ({ result, update }) => {
      console.log(result)
      if (result.type === 'redirect') {
        msg.success('Model added.');
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
      <div class="mb-3">
        <label class="form-label" for={id + 'primaryKeyName'}>
          Primary Key Name
        </label>
        <input
          type="text"
          name="primaryKeyName"
          id={id + 'primaryKeyName'}
          bind:value={$formData.primaryKeyName}
          class="form-control"
          class:is-invalid={$formErrors.primaryKeyName}
        />
        <FormError
          error={$formErrors.primaryKeyName}
          touched={true}
          ariaDescribesId={id + 'primaryKeyName'}
        />
      </div>
      <div class="mb-3">
        <label class="form-label" for={id + 'createdAtName'}>
          Optional <code>createdAt</code> Timestamp
        </label>
        <div class="input-group">
          <div class="input-group-text">
            <input
              class="form-check-input mt-0"
              type="checkbox"
              name="addCreatedAt"
              bind:checked={$formData.addCreatedAt}
              aria-label="Add a created at timestamp"
            />
          </div>
          <input
            type="text"
            id={id + 'createdAtName'}
            name="createdAtName"
            bind:value={$formData.createdAtName}
            class="form-control"
            class:is-invalid={$formErrors.createdAtName}
            disabled={!$formData.addCreatedAt}
            aria-label="Column name for the created at timestamp"
          />
        </div>
        <FormError
          error={$formErrors.createdAtName}
          touched={true}
          ariaDescribesId={id + 'createdAtName'}
        />
      </div>
      <div class="mb-3">
        <label class="form-label" for={id + 'updatedAtName'}>
          Optional <code>updatedAt</code> Timestamp
        </label>
        <div class="input-group">
          <div class="input-group-text">
            <input
              class="form-check-input mt-0"
              type="checkbox"
              name="addUpdatedAt"
              bind:checked={$formData.addUpdatedAt}
              aria-label="Add an updated at timestamp"
            />
          </div>
          <input
            type="text"
            id={id + 'updatedAtName'}
            bind:value={$formData.updatedAtName}
            class="form-control"
            name="updatedAtName"
            class:is-invalid={$formErrors.updatedAtName}
            disabled={!$formData.addUpdatedAt}
            aria-label="Column name for the updated at timestamp"
          />
        </div>
        <FormError
          error={$formErrors.updatedAtName}
          touched={true}
          ariaDescribesId={id + 'updatedAtName'}
        />
      </div>
      <div class="d-flex justify-content-end">
        <button type="submit" class="btn btn-primary">Add Model</button>
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
