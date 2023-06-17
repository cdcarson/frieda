<script lang="ts">
  import {
    type Writable,
    type Readable,
    type Unsubscriber,
    derived,
    writable
  } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { UniqueId } from '../../unique-id.js';
  import FormLabel from '../FormLabel.svelte';
  import type { FormErrors, FormTouched } from '../../form-types.js';
  import FormError from '../FormError.svelte';
  import FormHelp from '../FormHelp.svelte';
  type Fd = {
    columnName: string;
  };

  export let formData: Writable<Fd>;
  export let formErrors: Writable<FormErrors<Fd>>;
  export let touched: Writable<FormTouched<Fd>>;
  export let otherColumnNames: string[];
  const id = UniqueId.create();
  const unsubs: Unsubscriber[] = [];
  

  const error: Readable<string | undefined> = derived([formData], (r) => {
    const [d] = r;
    const columnName = d.columnName.trim();
    if (columnName.length === 0) {
      return 'Required.';
    }
    if (!/^\w+$/.test(columnName)) {
      return 'Invalid column name.';
    }
    if (otherColumnNames.includes(columnName)) {
      return 'There is another column with that name.';
    }
  });

  onMount(() => {
    unsubs.push(
      
      error.subscribe((v) =>
        formErrors.update((o) => {
          const c = { ...o };
          if (v) {
            c.columnName = v;
          } else {
            delete c.columnName;
          }

          return c;
        })
      )
    );
  });
  onDestroy(() => unsubs.forEach((u) => u()));
</script>

<div>
  <FormLabel forId={id}>Column Name</FormLabel>
  <input
    type="text"
    name="columnName"
    {id}
    bind:value={$formData.columnName}
    class="form-control"
    on:input={() => $touched.columnName = true}
    class:is-invalid={$formErrors.columnName && $touched.columnName}
  />
  <FormError
    error={$formErrors.columnName}
    touched={$touched.columnName}
    ariaDescribesId={id}
  />
  <FormHelp ariaDescribesId={id}>
    Use your usual column naming convention.
  </FormHelp>
</div>
