<script lang="ts">
  import { page } from '$app/stores';
  import type { ParsedModel } from '$lib/app/shared.js';
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import { getWebAppStores } from '$lib/web/stores.js';
  import { getContext } from 'svelte'

  import type { Readable } from 'svelte/store';
    import ModelTypes from './model-types.svelte';
  const { schema, models, codeFiles   } = getWebAppStores();
  const model: Readable<ParsedModel> = getContext('model')
  
</script>


<svelte:head>
  <title>{$model ? $model.modelName : 'Not Found'}</title>
</svelte:head>

{#if $model}
  
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
        href:  `/models/${$model.modelName}`,
        label:  $model.modelName 
      },
      {
        href:  `/models/${$model.modelName}/model-types`,
        label:  'Model Types'
      }
    ]}
  >
    <div class="d-flex align-items-start">
      <h1>Model Types</h1>
      <span class="badge bg-primary ms-2">{$model.modelName}</span>
    </div>
  </RouteHeader>

  <ModelTypes {model} />

  {/if}

