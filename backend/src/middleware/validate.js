import { ApiError } from '../utils/http.js';

/**
 * Validates request data with a Zod schema.
 *
 * `source` is one of 'body' | 'query' | 'params'. The parsed (and coerced)
 * value replaces the raw input so controllers always work with trusted data.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '_',
      message: issue.message,
    }));
    return next(ApiError.badRequest('Please check the highlighted fields', details));
  }

  if (source === 'query') req.validatedQuery = result.data;
  else if (source === 'params') req.validatedParams = result.data;
  else req.body = result.data;

  return next();
};

export const validateQuery = (schema) => validate(schema, 'query');
export const validateParams = (schema) => validate(schema, 'params');

/** Reads parsed query data when present, falling back to the raw query. */
export const queryOf = (req) => req.validatedQuery ?? req.query;
export const paramsOf = (req) => req.validatedParams ?? req.params;

export default validate;
