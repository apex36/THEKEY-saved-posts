import { z } from 'zod';

/**
 * Request validation (Zod, plugged straight into Elysia 1.4 via Standard Schema).
 * Note: query params arrive as strings — z.coerce is mandatory for numbers.
 */
export const pageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type PageQuery = z.infer<typeof pageQuery>;
