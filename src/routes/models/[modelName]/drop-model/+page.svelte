<script lang="ts">
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import DashboardSection from '$lib/web/components/DashboardSection.svelte';
  import DropModelForm from './drop-model-form.svelte';
  import type { PageData } from './$types.js';
  export let data: PageData;
  $: schema = data.schema;
  $: models = schema.models;
  $: model = data.model;
</script>

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
      href: `/models/${model.modelName}`,
      label: model.modelName
    },
    {
      href: `/models/${model.modelName}/drop-model`,
      label: 'Drop'
    }
  ]}
>
  <div class="d-flex align-items-start">
    <h1>Drop Model</h1>
    <span class="badge bg-primary ms-2">{model.modelName}</span>
  </div>
</RouteHeader>

<DashboardSection>
  <DropModelForm {model} />
</DashboardSection>
