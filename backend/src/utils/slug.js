/** Slug helpers used for store URLs and category identification. */

export function slugify(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'store';
}

/**
 * Builds a slug that is unique for the given delegate.
 * `excludeId` allows keeping the current slug when updating an existing record.
 */
export async function uniqueSlug(delegate, name, excludeId = null) {
  const base = slugify(name);
  let candidate = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (true) {
    const existing = await delegate.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
