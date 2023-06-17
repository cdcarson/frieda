<script lang="ts">
  import { type Readable, derived, writable } from 'svelte/store';
  import { getContext } from 'svelte';
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import DashboardSection from '$lib/web/components/DashboardSection.svelte';
  import type { ParsedField, ParsedModel } from '$lib/app/shared.js';
  import { getWebAppStores } from '$lib/web/stores.js';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';

  import { getFieldColumnDefinition } from '$lib/app/utils.js';
  import DropFieldForm from '$lib/web/components/DropFieldForm.svelte';

  const { schema, models } = getWebAppStores();
  const model: Readable<ParsedModel> = getContext('model');
  const field: Readable<ParsedField> = getContext('field');
  const columnDefinition = derived([model, field], (r) => {
    const [m, f] = r;
    if (!f || !m) {
      return '';
    }
    return getFieldColumnDefinition(m, f);
  });
</script>

<svelte:head>
  <title>{$field ? $field.fieldName : 'Not Found'}</title>
</svelte:head>
<RouteHeader
  breadcrumbs={[
    {
      href: '/',
      label: $schema.databaseName
    },
    {
      href: '/models',
      label: `Models (${$models.length})`
    },
    {
      href: `/models/${$model.modelName}`,
      label: $model.modelName
    },
    {
      href: `/models/${$model.modelName}#fields`,
      label: `Fields (${$model.fields.length})`
    },
    {
      href: `/models/${$model.modelName}/fields/${$field.fieldName}`,
      label: $field.fieldName
    }
  ]}
>
  <div class="d-flex align-items-start">
    <h1>Field</h1>
    <span class="badge bg-primary ms-2">{$field.fieldName}</span>
  </div>
</RouteHeader>



<section class="container-fluid my-5">
  <div class="row">
    <div class="col-6">
      <dl>
        <dt>Field Name</dt>
        <dd>{$field.fieldName}</dd>
        <dt>Column Name</dt>
        <dd>{$field.columnName}</dd>
        <dt>Column Definition</dt>
        <dd>
          <SqlPreview sql={$columnDefinition} />
        </dd>
      </dl>
    </div>
    <div class="col-6">
      <a href={`/models/${$model.modelName}/fields/${$field.fieldName}/edit`}
        >Edit</a
      >
      <a
        href={`/models/${$model.modelName}/fields/${$field.fieldName}/drop-field`}
        >Drop</a
      >
    </div>
  </div>
</section>
