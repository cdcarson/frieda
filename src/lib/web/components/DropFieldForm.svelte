<script lang="ts">
  import type { ParsedModel, ParsedField, WebData } from '$lib/app/shared.js';
  import { bt } from '$lib/index.js';
  import sql from 'sql-template-tag';
  import SqlPreview from './SqlPreview.svelte';
  import ChangeForm from './ChangeForm.svelte';
  import { goto } from '$app/navigation';
  import { getWebAppStores } from '../stores.js';
  export let model: ParsedModel;
  export let field: ParsedField;

  const statement = sql`ALTER TABLE ${bt(model.tableName)} 
      DROP COLUMN ${bt(field.columnName)}`;
  const onSuccess = async (event: CustomEvent<WebData>) => {
    await goto(`/models/${model.modelName}`);
    const { data } = getWebAppStores();
    data.set(event.detail);
  };
</script>

<div class="mb-4">
  <SqlPreview sql={statement.sql} />
</div>

<div class="mb-4">
  <ChangeForm
    endpoint="/change"
    sql={statement.sql}
    label="Drop Field"
    enabled={true}
    on:success={onSuccess}
    on:cancel={() => goto(`/models/${model.modelName}`)}
  />
</div>
