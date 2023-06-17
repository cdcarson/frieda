<script lang="ts">
  import { type Readable, derived, writable } from 'svelte/store';

  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import type { ParsedField, ParsedModel } from '$lib/app/shared.js';
  import { getWebAppStores } from '$lib/web/stores.js';
  import { page } from '$app/stores';
    import FormEdit from './form-edit.svelte';

  const { schema, models } = getWebAppStores();
  const model: Readable<ParsedModel | undefined> = derived(
    [page, models],
    (r) => {
      return r[1].find((m) => m.modelName === r[0].params.modelName);
    }
  );
  const field: Readable<ParsedField | undefined> = derived(
    [page, model],
    (r) => {
      if (!r[1]) {
        return undefined;
      }
      return r[1].fields.find((f) => f.fieldName === r[0].params.fieldName);
    }
  );
 </script>

<svelte:head>
  <title>{$field ? `Edit Field: ${$field.fieldName}` : 'Not Found'}</title>
</svelte:head>
{#if !$model || !$field}
  <section class="container-fluid py-3" id="overview">
    Field <strong>{$page.params.field}</strong> not found.
    <a href="/models">Back</a>
  </section>
{:else}
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
      },
      {
        href: `/models/${$model.modelName}/fields/${$field.fieldName}/edit`,
        label: 'Edit'
      }
    ]}
  >
    <div class="d-flex align-items-start">
      <h1>Edit Field</h1>
      <span class="badge bg-primary ms-2">{$field.fieldName}</span>
    </div>
  </RouteHeader>



  <section class="container-fluid my-5">
    <FormEdit model={$model} field={$field} />
  </section>
{/if}

