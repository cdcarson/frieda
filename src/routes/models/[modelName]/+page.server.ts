import { getWebData } from '$lib/app/web.server.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad,  PageServerLoadEvent } from './$types.js';

export const load: PageServerLoad = async (event: PageServerLoadEvent) => {
  const data = await getWebData();
  const model = data.schema.models.find(m => m.modelName === event.params.modelName);
  if (! model) {
    throw error(404, `Model ${event.params.modelName} not found.`)
  }
  return {...data, model}
};