<script lang="ts">
  import type { MysqlBaseType } from '$lib/index.js';
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
  import type { FormErrors } from '../../form-types.js';
  import { INTEGER_TYPES, getBoundsByIntType } from '../shared.js';
  import FormError from '../FormError.svelte';
  import FormHelp from '../FormHelp.svelte';
  type Fd = {
    mysqlType: MysqlBaseType;
    isUnsigned: boolean;
    defaultIntegerValue: bigint;
    typeTinyIntAsBoolean: boolean;
  };

  export let formData: Writable<Fd>;
  export let formErrors: Writable<FormErrors<Fd>>;
  const id = UniqueId.create();
  const fmt = new Intl.NumberFormat();
  const unsubs: Unsubscriber[] = [];
  const data = writable({
    defaultIntegerValue: fmt.format($formData.defaultIntegerValue)
  });
  const minMax = derived(formData, (fd) =>
    getBoundsByIntType(fd.mysqlType, fd.isUnsigned)
  );
  const bigIntValue: Readable<bigint> = derived(data, (d) => {
    const str = d.defaultIntegerValue.replaceAll(/\D/g, '');
    if (str.length === 0) {
      return 0n;
    }
    let n = BigInt(str);
    if (d.defaultIntegerValue.trim().indexOf('-') === 0) {
      n = n * -1n;
    }
    return n;
  });
  const error: Readable<string | undefined> = derived(
    [data, bigIntValue, minMax, formData],
    (r) => {
      const [d, v, m, fd] = r;
      if (!INTEGER_TYPES.includes(fd.mysqlType) || (fd.mysqlType === 'tinyint' && fd.typeTinyIntAsBoolean)) {
        return;
      }
      const str = d.defaultIntegerValue.replaceAll(/\D/g, '');
      if (str.trim().length === 0) {
        return 'Required.';
      }
      const { min, max } = m;
      if (v < min){
        return `Minimum value: ${fmt.format(min)}.`
      }
      if (v > max){
        return `Maximum value: ${fmt.format(max)}.`
      }
     
    }
  );

  onMount(() => {
    unsubs.push(
      bigIntValue.subscribe((v) =>
        formData.update((o) => {
          const c = { ...o };
          c.defaultIntegerValue = v;
          return c;
        })
      ),
      error.subscribe((v) =>
        formErrors.update((o) => {
          const c = { ...o };
          if (v) {
            c.defaultIntegerValue = v;
          } else {
            delete c.defaultIntegerValue;
          }

          return c;
        })
      )
    );
  });
  onDestroy(() => unsubs.forEach((u) => u()));
</script>

<div>
  <FormLabel forId={id}>Default Integer Value</FormLabel>
  <input
    type="text"
    name="defaultIntegerValue"
    {id}
    bind:value={$data.defaultIntegerValue}
    class="form-control"
    class:is-invalid={$formErrors.defaultIntegerValue}
  />
  <FormError
    error={$formErrors.defaultIntegerValue}
    touched={true}
    ariaDescribesId={id}
  />
  <FormHelp ariaDescribesId={id}>
    <code>{$formData.mysqlType}{$formData.isUnsigned ? ' UNSIGNED' : ''}</code>
    range: {fmt.format($minMax.min)} to {fmt.format($minMax.max)}.
  </FormHelp>
</div>
