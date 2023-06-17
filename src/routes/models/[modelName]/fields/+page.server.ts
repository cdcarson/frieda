import { redirect } from "@sveltejs/kit"
import type { PageServerLoadEvent } from "./$types.js"

export const load = (event: PageServerLoadEvent) => {
  throw redirect(300, `/models/${event.params.modelName}#fields`)
}