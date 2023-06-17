<script lang="ts">
  import { page } from '$app/stores';
  import type { ParsedField, ParsedModel } from '$lib/app/shared.js';
  import { getWebAppStores } from '$lib/web/stores.js';
  import { derived, type Readable } from 'svelte/store';
  import { setContext, getContext } from 'svelte';
  const { models } = getWebAppStores();
  const model: Readable<ParsedModel | undefined> = getContext('model');
  const field: Readable<ParsedField | undefined> = derived(
    [page, model],
    (r) => {
      const [p, m] = r;
      if (!m) {
        return undefined;
      }
      return m.fields.find((f) => f.fieldName === p.params.fieldName);
    }
  );
  setContext('field', field);
</script>

{#if !$model}
  <section class="container-fluid py-3" id="not-found">
    Model <strong>{$page.params.modelName}</strong> not found.
    <a href="/models">Back</a>
  </section>
{:else if !$field}
  <section class="container-fluid py-3" id="not-found">
    Field <strong>{$page.params.fieldName}</strong> not found.
    <a href="/models/{$model.modelName}">Back</a>
  </section>
{:else}
  <slot />
{/if}
