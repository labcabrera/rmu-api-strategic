import type { TransformFnParams } from 'class-transformer';

/**
 * A boolean that comes as text, in the query or the route (spec 044): `true` and `false` become booleans and an empty
 * value is absent. Anything else is left as it came for `@IsBoolean` to reject, so `?force=yes` is a 400 and not a
 * silent `false`.
 */
export const toStrictBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '') return undefined;
  return value;
};
