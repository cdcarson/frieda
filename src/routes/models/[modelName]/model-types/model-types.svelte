<script lang="ts">
  import { marked } from 'marked';
  import type {
    CodeFiles,
    ModelTypeData,
    ParsedModel,
    TypeCodeInfo
  } from '$lib/app/shared.js';
  import TypescriptPreview from '$lib/web/components/TypescriptPreview.svelte';
  import { getWebAppStores } from '$lib/web/stores.js';
  import { derived, type Readable } from 'svelte/store';

  export let model: Readable<ParsedModel>;
  type Entry = { info: TypeCodeInfo; data: ModelTypeData; name: string };
  const { modelTypes, codeFiles } = getWebAppStores();
  const typesDUrl = derived(codeFiles, (cf) => {
    const fp = cf.files['types.d'][0].relativePath;
    return `${fp}`;
  });
  const types: Readable<Entry[]> = derived([model, modelTypes], (r) => {
    const [m, t] = r;
    return [
      m.modelType,
      m.selectAllType,
      m.primaryKeyType,
      m.createType,
      m.updateType,
      m.findUniqueType
    ].map((info) => {
      return {
        name: info.typeName,
        info,
        data: t.find((o) => o.name === info.typeName) as ModelTypeData
      };
    });
  });
</script>

{#each $types as t (t.name)}
  <section class="container my-5">
    <h3>Type: <code>{t.name}</code></h3>
    <div class="row">
      <div class="col-md-6">
        {@html marked(t.info.description, { headerIds: false })}
        {#if t.info.notes}
          {@const md = t.info.notes.map((n) => `- ${n.note}`).join('\n')}
          {@const h = marked(md)}
          {@html h}
        {/if}
      </div>
      <div class="col-md-6">
        
        <TypescriptPreview code={t.data.text} />
        <div class="small">
          Line {t.data.pos.line + 1} in {$typesDUrl}
        </div>
      </div>
    </div>
  </section>
{/each}

