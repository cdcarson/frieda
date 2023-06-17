<script lang="ts">
  import { goto } from '$app/navigation';
  import type { ParsedField, ParsedModel, WebData } from '$lib/app/shared.js';
  import { bt } from '$lib/index.js';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';
  import sql, { raw } from 'sql-template-tag';
  import {
    type Readable,
    type Writable,
    derived,
    writable
  } from 'svelte/store';

  import { formatSql } from '$lib/app/utils.js';
  import TinyintColumnForm from '$lib/web/components/column-type-forms/tinyint-column-form.svelte';
  import SetColumnForm from '$lib/web/components/column-type-forms/set-column-form.svelte';
  import ChangeForm from '$lib/web/components/ChangeForm.svelte';
  import EnumColumnForm from '$lib/web/components/column-type-forms/enum-column-form.svelte';
  import BigintColumnForm from '$lib/web/components/column-type-forms/bigint-column-form.svelte';
  import DecimalColumnForm from '$lib/web/components/column-type-forms/decimal-column-form.svelte';

  export let model: ParsedModel;
  export let field: ParsedField;

  const columnDefinition: Writable<string> = writable('');
  const changeSql = derived(columnDefinition, (def) => {
    // console.log('in derived' , def)
    const statement = sql`
      ALTER TABLE ${bt(model.tableName)} 
      MODIFY COLUMN ${bt(field.columnName)} ${raw(def)}
    `;
    return formatSql(statement.sql);
  });
  const onSuccess = (event: CustomEvent<WebData>) => {
    const newModel = event.detail.schema.models.find(
      (m) => m.modelName === model.modelName
    );
    if (!newModel) {
      return goto('/models');
    }
    const newField = newModel.fields.find(
      (f) => f.columnName === field.columnName
    );
    if (!newField) {
      return goto(`/models/${newModel.modelName}`);
    }
    goto(`/models/${newModel.modelName}/fields/${newField.fieldName}`);
  };
</script>

<div class="row">
  <div class="col-md-6">
    <div class="card card-body">
      {#if 'set' === field.mysqlBaseType}
        <SetColumnForm {field} {columnDefinition} />
      {:else if 'enum' === field.mysqlBaseType}
        <EnumColumnForm {field} {columnDefinition} />
      {:else if 'bigint' === field.mysqlBaseType}
        <BigintColumnForm {field} {columnDefinition} />
      {:else if 'tinyint' === field.mysqlBaseType}
        <TinyintColumnForm {field} {columnDefinition} />
      {:else if 'decimal' === field.mysqlBaseType || 'numeric' === field.mysqlBaseType}
        <DecimalColumnForm {field} {columnDefinition} />
      {/if}
      <hr />
      <div class="mt-4">
        <ChangeForm
          on:success={onSuccess}
          enabled={writable(true)}
          endpoint="/change"
          label="Modify Field"
          sql={$changeSql}
        />
      </div>
    </div>
  </div>
  <div class="col-md-6">
    <div class="sticky-md-top">
      <div class="py-4">
        <SqlPreview sql={$changeSql} />
      </div>
    </div>
  </div>
</div>
