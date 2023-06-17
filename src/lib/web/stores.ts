import type {
  AppOptions,
  CodeFiles,
  CurrentSchemaFilesResult,
  ModelTypeData,
  ParsedModel,
  ParsedSchema,
  WebData
} from '$lib/app/shared.js';
import { writable, derived, type Readable, type Writable } from 'svelte/store';
import { setContext, getContext } from 'svelte';
type WebAppStores = {
  data: Writable<WebData>;
  schema: Readable<ParsedSchema>;
  options: Readable<AppOptions>;
  schemaFiles: Readable<CurrentSchemaFilesResult>;
  codeFiles: Readable<CodeFiles>;
  models: Readable<ParsedModel[]>;
  modelTypes: Readable<ModelTypeData[]>
};

let stores: WebAppStores | undefined;

export const initStores = ( init: WebData) => {
  // if (stores) {
  //   throw new Error('stores already initialized')
  // }
  const data: Writable<WebData> = writable(init);
  const schema: Readable<ParsedSchema> = derived(data, (d) => d.schema);
  const options: Readable<AppOptions> = derived(data, (d) => d.options);
  const schemaFiles: Readable<CurrentSchemaFilesResult> = derived(data, (d) => d.schemaFiles);
  const codeFiles: Readable<CodeFiles> = derived(data, (d) => d.codeFiles);
  const models: Readable<ParsedModel[]> = derived(schema, (s) => s.models);
  const modelTypes: Readable<ModelTypeData[]> = derived(data, (s) => s.modelTypes);
  stores = {
    data,
    schema,
    options,
    schemaFiles,
    codeFiles,
    models,
    modelTypes
  }
  setContext('__appStores', stores);
  
};

export const getWebAppStores = (): WebAppStores => {
  if (!stores) {
    throw new Error('stores not initialized')
  }
  return getContext('__appStores');
}

export type AppMessage = {
  message: string;
  context: 'wait' | 'success'
}
export type AppMessageService = {
  wait: (message: string) => void;
  success: (message: string) => void;
  hide: () => void,
  message: Readable<AppMessage|null>
}
const _appMessage = writable<AppMessage|null>(null);
const appMessage: AppMessageService = {
  wait: (message: string) => {
    _appMessage.set({
      context: 'wait',
      message
    })
  },
  success: (message: string) => {
    _appMessage.set({
      context: 'success',
      message
    });
   
  },
  hide: () => {
    _appMessage.set(null);
  },
  message: {subscribe: _appMessage.subscribe}
}

export const initAppMessage = () => {
  setContext('__appMessage', appMessage)
}
export const getAppMessage = (): AppMessageService => {
  return getContext('__appMessage')
}

