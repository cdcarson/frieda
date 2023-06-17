<script lang="ts">
  import CodeMirror from 'svelte-codemirror-editor';
  import { json } from '@codemirror/lang-json';
  import type { ParsedField } from '$lib/app/shared.js';
  import { UniqueId } from '$lib/web/unique-id.js';
  import {
    writable,
    derived,
    type Writable,
    type Readable,
    type Unsubscriber
  } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import FormHelp from '../FormHelp.svelte';
  import FormLabel from '../FormLabel.svelte';
  import type { FormErrors, FormTouched } from '$lib/web/form-types.js';
  import FormError from '../FormError.svelte';
  import ColumnDefaultChoice from '../controls/ColumnDefaultChoice.svelte';
  import InvisibleControl from '../controls/InvisibleControl.svelte';
  import sql, { raw } from 'sql-template-tag';
  import { bt } from '$lib/index.js';
  import { removeCommentAnnotationsByType } from '$lib/app/utils.js';
  import { error } from '@sveltejs/kit';
  export let field: ParsedField | undefined;
  export let columnName: Readable<string>;
  export let columnDefinition: Writable<string>;
  export let childFormValid: Writable<boolean>;
  type Fd = {
    includeJsonAnnotation: boolean;
    jsonType: string;
    columnDefault: 'none' | 'default' | 'null';
    defaultString: string;
    isInvisible: boolean;
  };

  const id = UniqueId.create();

  const formData = writable<Fd>({
    includeJsonAnnotation: field ? field.jsonAnnotation !== undefined : true,
    jsonType:
      field && field.jsonAnnotation ? field.jsonAnnotation.typeArgument : '',
    columnDefault: field
      ? field.isNullable
        ? 'null'
        : field.hasDefault
        ? 'default'
        : 'none'
      : 'none',
    defaultString: field ? field.defaultValue || '{\n}' : '{\n}',
    isInvisible: field ? field.isInvisible : false
  });
  const formErrors: Readable<FormErrors<Fd>> = derived([formData], (r) => {
    const [d] = r;
    const errors: FormErrors<Fd> = {};
    if (d.includeJsonAnnotation && d.jsonType.trim().length === 0) {
      errors.jsonType = 'Required.';
    }
    if (d.columnDefault === 'default') {
      const defaultStr = d.defaultString.trim();
      if (defaultStr.length === 0) {
        errors.defaultString = 'Required.';
      } else {
        try {
          JSON.parse(defaultStr);
        } catch (error) {
          errors.defaultString =
            'Invalid JSON.';
        }
      }
    }

    return errors;
  });
  const defaultJSONString = derived(formData, (d) => {
    try {
      const o = JSON.parse(d.defaultString);
      return JSON.stringify(o);
    } catch (error) {
      return '';
    }
  });
  const touched: Writable<FormTouched<Fd>> = writable({});

  const colDef: Readable<string> = derived(
    [columnName, formData, defaultJSONString],
    (r) => {
      const [n, d, defaultStr] = r;

      const notNullStr =
        d.columnDefault === 'none'
          ? 'NOT NULL'
          : d.columnDefault === 'default'
          ? `DEFAULT '${defaultStr.replaceAll(`'`, `''`)}'`
          : '';
      let comment = field ? removeCommentAnnotationsByType(field, 'json') : '';

      if (d.includeJsonAnnotation && d.jsonType.trim().length > 0) {
        comment = [comment, `@json(${d.jsonType.trim()})`].join(' ').trim();
      }
      const invisibleStr = d.isInvisible ? 'INVISIBLE' : '';
      const commentStr =
        comment.length > 0 ? ` COMMENT '${comment.replaceAll(`'`, `''`)}'` : '';
      const statement = sql`${bt(n)} json ${raw(notNullStr)} ${raw(
        invisibleStr
      )} ${raw(commentStr)}`;
      return statement.sql;
    }
  );
  const unsubs: Unsubscriber[] = [];

  onMount(() => {
    unsubs.push(
      colDef.subscribe((cd) => columnDefinition.set(cd)),
      formErrors.subscribe((e) =>
        childFormValid.set(Object.keys(e).length === 0)
      )
    );
  });
</script>

<fieldset class="mb-5">
  <legend>JSON Type Annotation</legend>
  <div class="mb-0">
    <div class="form-check">
      <input
        class="form-check-input"
        type="checkbox"
        bind:checked={$formData.includeJsonAnnotation}
        id={id + 'includeJsonAnnotation'}
        name="includeJsonAnnotation"
      />
      <label class="form-check-label" for={id + 'includeJsonAnnotation'}>
        Include <code>@json</code> type annotation
      </label>
    </div>
    <FormHelp ariaDescribesId={id + 'includeJsonAnnotation'}>
      Add a <code>@json</code> type annotation to the column's comment. Without
      this annotation, the field will be typed as javascript
      <code>unknown</code>.
    </FormHelp>
  </div>
  {#if $formData.includeJsonAnnotation}
    <div class="mt-3">
      <FormLabel forId={id + 'jsonType'}>Javascript Type</FormLabel>
      <input
        class:is-invalid={$formErrors.jsonType && $touched.jsonType}
        id={id + 'jsonType'}
        name="jsonType"
        type="text"
        class="form-control"
        on:input={() => ($touched.jsonType = true)}
        bind:value={$formData.jsonType}
      />
      <FormError
        error={$formErrors.jsonType}
        touched={$touched.jsonType}
        ariaDescribesId={id + 'jsonType'}
      />
      <FormHelp ariaDescribesId={id + 'jsonType'}>
        Enter an inline type or an import statement. Examples:
        <ul>
          <li>
            Import type from a library:
            <code>import('stripe').Customer</code>
          </li>
          <li>
            Import type from a file:
            <code>import('../../api.js').ImageSources</code>
          </li>
          <li>
            Partial type:
            <code>Partial&lt;import('../../api.js').ImageSources&gt;</code>
          </li>
          <li>
            Inline type:
            <code>{'{foo: number; bar: string}'}</code>
          </li>
        </ul>
      </FormHelp>
      <FormHelp ariaDescribesId={id + 'jsonType'}>
        Note that neither imports nor inline types will be validated. It's up to
        you to make sure the import statements resolve from the generated code
        directory. Any path aliases you have set up should work fine.
      </FormHelp>
    </div>
  {/if}
</fieldset>

<fieldset class="mb-5">
  <legend>Default Value</legend>
  <div class="mb-3"><ColumnDefaultChoice {formData} /></div>
  {#if $formData.columnDefault === 'default'}
    <div class="mt-3">
      <FormLabel forId={id + 'defaultString'}>Default Value</FormLabel>
      <CodeMirror bind:value={$formData.defaultString} lang={json()} />
    </div>
    <FormError
      ariaDescribesId={id + 'defaultString'}
      touched={true}
      error={$formErrors.defaultString}
    />
    <FormHelp ariaDescribesId={id + 'defaultString'}>Enter valid JSON</FormHelp>
  {/if}
</fieldset>
<fieldset class="mb-5">
  <legend>Invisible</legend>
  <InvisibleControl {formData} />
</fieldset>
