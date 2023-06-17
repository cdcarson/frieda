<script lang="ts">
  import type { ParsedModel, WebData } from '$lib/app/shared.js';
  import { writable, derived, type Readable } from 'svelte/store';
  import type { FormErrors, FormTouched } from '../form-types.js';
  import { bt, type MysqlBaseType } from '$lib/index.js';
  import FormLabel from './FormLabel.svelte';
  import { UniqueId } from '../unique-id.js';
  import FormError from './FormError.svelte';
  import FormHelp from './FormHelp.svelte';
  import {
    CHAR_MAX_LENGTH,
    INTEGER_TYPES,
    STRING_TYPES_WITH_LENGTH,
    VARCHAR_MAX_LENGTH
  } from './shared.js';
  import UnsignedControl from './controls/UnsignedControl.svelte';
  import DefaultIntegerControl from './controls/DefaultIntegerControl.svelte';
  import ColumnNameControl from './controls/ColumnNameControl.svelte';
  import PrecisionScaleControl from './controls/PrecisionScaleControl.svelte';
  import TypeTinyIntAsBooleanControl from './controls/TypeTinyIntAsBooleanControl.svelte';
  import CharLengthControl from './controls/CharLengthControl.svelte';
  import TypeBigIntAsBigIntControl from './controls/TypeBigIntAsBigIntControl.svelte';
  import ColumnDefaultChoice from './controls/ColumnDefaultChoice.svelte';
  import DefaultBooleanControl from './controls/DefaultBooleanControl.svelte';
  import InvisibleControl from './controls/InvisibleControl.svelte';
    import JsonColumnForm from './column-type-forms/JsonColumnForm.svelte';
    import SqlPreview from './SqlPreview.svelte';
    import sql, { raw } from 'sql-template-tag';
    import ChangeForm from './ChangeForm.svelte';
    import { goto } from '$app/navigation';
    import { getWebAppStores } from '../stores.js';
  type Fd = {
    columnName: string;
    mysqlType: MysqlBaseType;
    isInvisible: boolean;
    columnDefault: 'none' | 'default' | 'null';
    charLength: number;
    precision: number;
    scale: number;
    typeTinyIntAsBoolean: boolean;
    defaultBooleanValue: boolean;
    defaultIntegerValue: bigint;
    isUnsigned: boolean;
    typeBigIntAsBigInt: boolean;
  };
  export let model: ParsedModel;
  const id = UniqueId.create();

  const formData = writable<Fd>({
    columnName: `foo`,
    mysqlType: 'json',
    isInvisible: false,
    columnDefault: 'none',
    charLength: 100,
    precision: 10,
    scale: 2,
    typeTinyIntAsBoolean: true,
    defaultBooleanValue: false,
    defaultIntegerValue: 0n,
    isUnsigned: true,
    typeBigIntAsBigInt: false
  });

  const columnDefinition = writable<string>('')
    const childFormValid = writable<boolean>(false)
  const columnName = derived(formData, d => d.columnName)
  const touched = writable<FormTouched<Fd>>({});
  const formErrors = writable<FormErrors<Fd>>({});
  const onTypeChanged = () => {};

  const colType: Readable<string> = derived([formData], (r) => {
    const [d] = r;
    const { mysqlType } = d;
    if (mysqlType === 'tinyint' && d.typeTinyIntAsBoolean) {
      return `tinyint(1)`;
    }
    if (STRING_TYPES_WITH_LENGTH.includes(mysqlType)) {
      return `${mysqlType}(${d.charLength})`;
    }
    if (mysqlType === 'decimal') {
      return `${mysqlType}(${d.precision},${d.scale})`;
    }
    return mysqlType;
  });

  const changeSql = derived([columnDefinition], r => {
    const [cd] = r;
    return sql`ALTER TABLE ${bt(model.tableName)} ADD COLUMN ${raw(cd)}`.sql
  })

  const onSuccess = async (event: CustomEvent<WebData>) => {
    await goto(`/models/${model.modelName}/fields/${$formData.columnName}`);
    const { data } = getWebAppStores();
    data.set(event.detail);
  };
  
</script>

<div class="row">
  <div class="col-lg-6">
    <div class="mb-5">
      <ColumnNameControl
        {formData}
        {formErrors}
        {touched}
        otherColumnNames={model.fields.map((f) => f.columnName)}
      />
    </div>
    
    <div class="mb-5">
      <div>
        <FormLabel forId={id + 'mysqlType'}>Column Type</FormLabel>
        <select
          id={id + 'mysqlType'}
          name="mysqlType"
          bind:value={$formData.mysqlType}
          class="form-select"
          on:input={() => ($touched.mysqlType = true)}
          on:change={onTypeChanged}
          class:is-invalid={$formErrors.mysqlType && $touched.mysqlType}
        >
          <option value={undefined}>Please select...</option>
          <optgroup label="Numeric types">
            <option value="tinyint">tinyint, bool, boolean</option>
            <option value="smallint">smallint</option>
            <option value="mediumint">mediumint</option>
            <option value="int">int, integer</option>
            <option value="bigint">bigint</option>
            <option value="decimal">decimal (fixed-point)</option>
            <option value="decimal">float (floating-point)</option>
            <option value="decimal">double (floating-point)</option>
          </optgroup>
          <optgroup label="String types">
            <option value="char">char</option>
            <option value="varchar">varchar</option>
            <option value="tinytext">tinytext</option>
            <option value="text">text</option>
            <option value="mediumtext">mediumtext</option>
            <option value="longtext">longtext</option>
          </optgroup>
          <optgroup label="Other types">
            <option value="json">json</option>
          </optgroup>
        </select>
        <FormError
          ariaDescribesId={id + 'mysqlType'}
          touched={$touched.mysqlType}
          error={$formErrors.mysqlType}
        />
        <FormHelp ariaDescribesId={id + 'mysqlType'}>
          Column type: {$colType}
        </FormHelp>
      </div>
    </div>
    
    {#if 'json' === $formData.mysqlType}
      <JsonColumnForm {columnDefinition} {columnName} {childFormValid} field={undefined} />
    {/if}
    
    <div>
      <ChangeForm on:success={onSuccess} enabled={true} endpoint="/change" sql={$changeSql} label="Add Field" />
    </div>
    
  </div>
  <div class="col-lg-6">
    <div class="sticky-lg-top py-3">
      <SqlPreview sql={$changeSql}></SqlPreview>
    </div>
    
  </div>
</div>

