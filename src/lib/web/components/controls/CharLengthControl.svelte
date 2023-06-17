<script lang="ts">
  import {
    type Writable,
    type Readable,
    type Unsubscriber,
    derived,
  } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { UniqueId } from '../../unique-id.js';
  import FormLabel from '../FormLabel.svelte';
  import type { FormErrors, FormTouched } from '../../form-types.js';
  import FormError from '../FormError.svelte';
  import FormHelp from '../FormHelp.svelte';
    import type { MysqlBaseType } from '$lib/index.js';
    import { CHAR_MAX_LENGTH, STRING_TYPES_WITH_LENGTH, VARCHAR_MAX_LENGTH } from '../shared.js';
  type Fd = {
    mysqlType: MysqlBaseType
    charLength: number;
  };

  export let formData: Writable<Fd>;
  export let formErrors: Writable<FormErrors<Fd>>;
  const id = UniqueId.create();
  const unsubs: Unsubscriber[] = [];
  const fmt = Intl.NumberFormat()
  const max = derived([formData], r => {
    const [d] = r;
    return d.mysqlType === 'varchar' || d.mysqlType === 'varbinary'
      ? VARCHAR_MAX_LENGTH
      : CHAR_MAX_LENGTH
  })
  const error: Readable<string | undefined> = derived([formData, max], (r) => {
    const [d, m] = r;
    if (!STRING_TYPES_WITH_LENGTH.includes(d.mysqlType)) {
      return;
    }
    const charLength = parseInt(d.charLength + '');
    if (Number.isNaN(charLength)) {
      return 'Required.'
    }
    if (! Number.isInteger(charLength)) {
      return 'Invalid integer value.'
    }
    if (charLength < 1) {
      return `Minimum: 1.`
    }
    if (charLength > m) {
      return `Maximum: ${fmt.format(m)}.`
    }
  });

  onMount(() => {
    unsubs.push(
      
      error.subscribe((v) =>
        formErrors.update((o) => {
          const c = { ...o };
          if (v) {
            c.charLength = v;
          } else {
            delete c.charLength;
          }

          return c;
        })
      )
    );
  });
  onDestroy(() => unsubs.forEach((u) => u()));
</script>

<div>
  <FormLabel forId={id}>Length</FormLabel>
  <input
    type="number"
    bind:value={$formData.charLength}
    name="charLength"
    step="1"
    min="1"
    max={$max}
    class="form-control"
    class:is-invalid={$formErrors.charLength}
    id={id}
  />
  <FormError
    touched={true}
    error={$formErrors.charLength}
    ariaDescribesId={id}
  />
  <FormHelp ariaDescribesId={id}>
    Range: 1 to {fmt.format($max)}
  </FormHelp>
</div>