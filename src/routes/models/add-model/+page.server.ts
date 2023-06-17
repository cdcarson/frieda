import type { WebData } from '$lib/app/shared.js';
import { getWebData, executeSchemaChange } from '$lib/app/web.server.js';
import type { PageServerLoad, Actions, RequestEvent } from './$types.js';
import {
  wrapAction,
  Redirect,
  FormValidationError
} from '$lib/app/actions.server.js';

export const load: PageServerLoad = async () => {
  const data = await getWebData();
  return data;
};

const _action = async (event: RequestEvent) => {
  const fd = await event.request.formData();
  const sql = fd.get('sql')?.toString() || '';
  const tableName = fd.get('tableName')?.toString() || '';
  let data: WebData;
  try {
    data = await executeSchemaChange(sql);
    const model = data.schema.models.find(
      (m) => m.tableName === tableName.trim()
    );
    if (model) {
      return new Redirect(`/models/${model.modelName}`);
    } else {
      return new Redirect(`/models`);
    }
  } catch (e) {
    if (e instanceof Error) {
      throw new FormValidationError({ sql }, { sql: e.message });
    }
    throw e;
  }

  
};

export const actions: Actions = {
  default: wrapAction(_action)
};
