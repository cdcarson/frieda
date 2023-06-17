<script lang="ts">
  import { type Readable, derived, writable } from 'svelte/store';
  import {getContext} from 'svelte'
  import RouteHeader from '$lib/web/components/RouteHeader.svelte';
  import type { ParsedField, ParsedModel } from '$lib/app/shared.js';
  import { getWebAppStores } from '$lib/web/stores.js';
  import SqlPreview from '$lib/web/components/SqlPreview.svelte';

  import { getFieldColumnDefinition } from '$lib/app/utils.js';
    import DashboardSection from '$lib/web/components/DashboardSection.svelte';
    import DropFieldForm from '$lib/web/components/DropFieldForm.svelte';


  const { schema, models } = getWebAppStores();
  const model: Readable<ParsedModel> = getContext('model')
  const field: Readable<ParsedField> = getContext('field')
  const columnDefinition = derived([model, field], (r) => {
    const [m, f] = r;
    if (!f || !m) {
      return '';
    }
    return getFieldColumnDefinition(m, f);
  });

  
</script>

<svelte:head>
  <title>Drop Field: {$field.fieldName}</title>
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
  },
  {
    href: `/models/${$model.modelName}/fields/${$field.fieldName}/drop-field`,
    label: 'Drop'
  }
]}
>
<div class="d-flex align-items-start">
  <h1>Drop Field</h1>
  <span class="badge bg-primary ms-2">{$field.fieldName}</span>
</div>
</RouteHeader>


<DashboardSection>
  <DropFieldForm model={$model} field={$field} />
</DashboardSection>