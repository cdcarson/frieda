<script lang="ts">
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import AddModelForm from './add-model-form.svelte';
  import DashboardSection from '$lib/web/components/DashboardSection.svelte';
    import type { PageData } from './$types.js';
  export let data: PageData
  $: schema = data.schema;
  $: models = schema.models;
</script>

<svelte:head>
  <title>Add Model</title>
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
      href: '/models/add-model',
      label: `Add Model`
    }
  ]}
>
  <div class="d-flex align-items-start">
    <h1>Add Model</h1>
  </div>
</RouteHeader>
<DashboardSection>
  <AddModelForm {models} />
</DashboardSection>
