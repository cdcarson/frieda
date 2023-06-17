import { getWebData } from '$lib/app/web.server.js';

export const load = async () => {
  const data = await getWebData();
  return data;
};