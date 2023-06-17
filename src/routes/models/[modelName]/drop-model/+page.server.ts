import { executeSchemaChange, getWebData } from '$lib/app/web.server.js';
import { error } from '@sveltejs/kit';
import type {
  Actions,
  PageServerLoad,
  PageServerLoadEvent,
  RequestEvent
} from './$types.js';
import {
  wrapAction,
  Redirect,
  FormValidationError
} from '$lib/app/actions.server.js';
export const load: PageServerLoad = async (event: PageServerLoadEvent) => {
  const data = await getWebData();
  const model = data.schema.models.find(
    (m) => m.modelName === event.params.modelName
  );
  if (!model) {
    throw error(404, `Model ${event.params.modelName} not found.`);
  }
  return { ...data, model };
};

export const _action = async (event: RequestEvent): Promise<Redirect> => {
  const fd = await event.request.formData();
  const sql = fd.get('sql')?.toString() || '';
  try {
    await executeSchemaChange(sql);
    return new Redirect('/models', 303);
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
