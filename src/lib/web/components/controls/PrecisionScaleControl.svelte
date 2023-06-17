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
  import { DECIMAL_MAX_DIGITS } from '../shared.js';
    import type { MysqlBaseType } from '$lib/index.js';
  type Fd = {
    precision: number;
    scale: number;
    mysqlType: MysqlBaseType;
  };

  export let formData: Writable<Fd>;
  export let formErrors: Writable<FormErrors<Fd>>;
  const id = UniqueId.create();
  const unsubs: Unsubscriber[] = [];

  const errors: Readable<FormErrors<Fd>> = derived([formData], (r) => {
    const [d] = r;
    if (d.mysqlType !== 'decimal') {
      return {};
    }
    let precision: number = parseInt(d.precision + '');
    if (Number.isNaN(precision)) {
      return { precision: 'Required.' };
    }
    if (!Number.isSafeInteger(precision)) {
      return { precision: 'Invalid.' };
    }

    let scale: number = parseInt(d.scale + '');
    if (Number.isNaN(scale)) {
      return { scale: 'Required.' };
    }

    if (!Number.isSafeInteger(scale)) {
      return { scale: 'Invalid.' };
    }
    if (scale < 0 || scale > DECIMAL_MAX_DIGITS) {
      return { scale: `Must be between 0 and ${DECIMAL_MAX_DIGITS}.` };
    }

    const min = Math.max(1, scale);

    if (precision < min || precision > DECIMAL_MAX_DIGITS) {
      return {
        precision: `Must be between ${min} and ${DECIMAL_MAX_DIGITS}.`
      };
    }

    return {};
  });

  

  onMount(() => {
    unsubs.push(
      errors.subscribe((v) =>
        formErrors.update((o) => {
          const c = { ...o };
          if (v.precision) {
            c.precision = v.precision;
          } else {
            delete c.precision;
          }
          if (v.scale) {
            c.scale = v.scale;
          } else {
            delete c.scale;
          }

          return c;
        })
      )
    );
  });
  onDestroy(() => unsubs.forEach((u) => u()));
</script>
<div class="row">
  <div class="col-6">
    <FormLabel forId={id + 'precision'}>Precision</FormLabel>
    <input
      id={id + 'precision'}
      min="1"
      max={DECIMAL_MAX_DIGITS}
      step="1"
      name="precision"
      type="number"
      class="form-control"
      class:is-invalid={$formErrors.precision}
      bind:value={$formData.precision}
    />
    <FormError
      touched={true}
      ariaDescribesId={id + 'precision'}
      error={$formErrors.precision}
    />
    <FormHelp ariaDescribesId={id + 'precision'}>
      The total number of digits.
    </FormHelp>
  </div>
  <div class="col-6">
    <FormLabel forId={id + 'scale'}>Scale</FormLabel>
    <input
      id={id + 'scale'}
      min="0"
      max={DECIMAL_MAX_DIGITS}
      step="1"
      type="number"
      class:is-invalid={$formErrors.scale}
      bind:value={$formData.scale}
      class="form-control"
    />
    <FormError
      touched={true}
      ariaDescribesId={id + 'scale'}
      error={$formErrors.scale}
    />
    <FormHelp ariaDescribesId={id + 'scale'}>Fractional digits.</FormHelp>
  </div>
</div>