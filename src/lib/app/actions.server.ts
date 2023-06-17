import {
  error,
  fail,
  redirect,
  type Action,
  type ActionFailure,
  type RequestEvent
} from '@sveltejs/kit';


export class Redirect {
  constructor(
    public readonly location: string,
    public readonly status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308 = 303
  ) {}
}

/**
 * This is an error that we (1) know can happen and (2) give a shit about 
 * providing useful user feedback for. 
 */
export class ExpectedError {
  constructor(
    public readonly message: string,
    public readonly status: number
  ) {}
}
export class FormValidationError<
  T extends Record<string, unknown> = Record<string, unknown>,
  E extends Record<string, unknown> = { [K in keyof T]?: string }
> {
  constructor(
    public readonly formData: T,
    public readonly formErrors: E,
    public readonly status = 400
  ) {}
}

/**
 * Explicitly redeclare the somewhat opaque generics from the definition of 
 * the `Action` type for readability... 
 */

/**
 * Record<string,string> is equal to Partial<Record<string, string>>, but whatevs, there
 * is probably some downstream reason for this.
 */
type RouteParams = Partial<Record<string, string>>

/**
 * This apparently is both what the action function would "successfully" return
 * (i.e. without validation failure,) and at the same time the union of that and 
 * ActionFailure<T>. We don't need the union, we just need the shape of the "success" case.
 */
type OutputData = Record<string, unknown> | void;

/**
 * Is this at all relevant to userland code?
 */
type MaybeUselessRouteId = string | null;

export const wrapAction = <
  Success extends OutputData = OutputData,
  Params extends RouteParams = RouteParams,
  RouteId extends MaybeUselessRouteId = MaybeUselessRouteId
>(
  fn: (event: RequestEvent<Params,RouteId>) => Promise<Success|Redirect>
): Action<
  Params,
  | Success
  | ActionFailure<{
      formData: Record<string, unknown>;
      formErrors: Record<string, unknown>;
    }>,
  RouteId
> => {
  const action: Action<
    Params,
    | Success
    | ActionFailure<{
        formData: Record<string, unknown>;
        formErrors: Record<string, unknown>;
      }>,
    RouteId
  > = async (event:  RequestEvent<Params,RouteId>) => {
    try {
      const result = await fn(event);
      if (result instanceof Redirect) {
        // caught below
        throw result;
      }
      return result;
    } catch (e) {
      if (e instanceof Redirect) {
        throw redirect(e.status, e.location);
      }
      if (e instanceof ExpectedError) {
        throw error(e.status, e.message);
      }
      if (e instanceof FormValidationError) {
        return fail(e.status, {
          formData: e.formData,
          formErrors: e.formErrors
        });
      }
      throw error(427, 'I am a teapot');
    }
  };
  return action;
};