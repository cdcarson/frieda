<script lang="ts">
  import { page } from '$app/stores';
  import DashboardSection from '$lib/web/components/DashboardSection.svelte';
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';

    import type { PageData } from './$types.js';
  export let data: PageData;
  $: schema = data.schema;
  $: models = schema.models;
  $: model = data.model
  $: createSql = model.table.createSql;
</script>

<svelte:head>
  <title>Model: {model.modelName}</title>
</svelte:head>
<RouteHeader
  breadcrumbs={[
    {
      href: '/',
      label: schema.databaseName
    },
    {
      href: '/models',
      label: `Models (${models.length})`
    },
    {
      href: $page.url.pathname,
      label: model.modelName 
    }
  ]}
>
  <div class="d-flex align-items-start">
    <h1>Model</h1>
    <span class="badge bg-primary ms-2">{model.modelName}</span>
  </div>
</RouteHeader>

<DashboardSection id="overview">
  <div class="row">
    <div class="col-6">
      <dl>
        <dt>Model Name</dt>
        <dd>{model.modelName}</dd>
        <dt>Table Name</dt>
        <dd>{model.tableName}</dd>
      </dl>
    </div>
    <div class="col-6">
      <ul>
        <li>
          <a href={`/models/${model.modelName}/model-types`}>Model Types</a>
        </li>
        <li>
          <a href={`/models/${model.modelName}/add-field`}>Add Field</a>
        </li>
        <li>
          <a href={`/models/${model.modelName}/rename-model`}>Rename Model</a>
        </li>
        <li>
          <a href={`/models/${model.modelName}/drop-model`}>Drop Model</a>
        </li>
      </ul>
    </div>
  </div>
</DashboardSection>

<DashboardSection id="fields">
  <h2>Fields</h2>
  <div class="table-responsive">
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Field</th>
          <th>Javascript Type</th>
          <th>Column Name</th>
          <th>Column Type</th>
        </tr>
      </thead>
      <tbody>
        {#each model.fields as field}
          <tr>
            <th>
              <a href={`/models/${model.modelName}/fields/${field.fieldName}`}
                >{field.fieldName}</a
              >
            </th>

            <td>
              <code>{field.javascriptType}</code>
            </td>
            <td>
              <div class="font-monospace text-muted">{field.columnName}</div>
            </td>
            <td>
              <div class="font-monospace text-muted">{field.column.Type}</div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</DashboardSection>
<DashboardSection id="indexes">
  <h2>Indexes</h2>
</DashboardSection>

<DashboardSection id="create-table">
  <h2>Create Table</h2>
  <SqlPreview sql={createSql} />
</DashboardSection>
