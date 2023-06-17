<script lang="ts">
  import DashboardSection from '$lib/web/components/DashboardSection.svelte';
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import type { PageData } from './$types.js';
  export let data: PageData;
  $: models = data.schema.models;
</script>

<svelte:head>
  <title>Models {models.length}</title>
</svelte:head>

<RouteHeader
  breadcrumbs={[
    {
      href: '/',
      label: data.schema.databaseName
    },
    {
      href: '/models',
      label: `Models (${models.length})`
    }
  ]}
>
  <div class="d-flex align-items-start">
    <h1>Models</h1>
    <span class="badge bg-primary ms-2">{models.length}</span>
  </div>
</RouteHeader>

<DashboardSection>
  <a href="/models/add-model">Add Model</a>
</DashboardSection>

<DashboardSection>
  <table class="table table-striped">
    <thead>
      <tr>
        <th>Model</th>
        <th>Table</th>
        <th>Fields</th>
      </tr>
    </thead>
    <tbody>
      {#each models as model}
        <tr>
          <th>
            <a href={`/models/${model.modelName}`}>{model.modelName}</a>
          </th>
          <td>
            {model.tableName}
          </td>
          <td>
            {model.fields.length}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</DashboardSection>
