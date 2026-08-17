/**
 * Capacity-label rule for truck matching.
 *
 * The truck's stored capacity_tonnes is treated as a *label* that maps to the
 * maximum cargo weight it can actually carry:
 *   - 26 t (and below)         -> carries cargo of 20 t and below
 *   - 28 t                     -> carries cargo of 28 t and below
 *   - above 28 t (e.g. 40 t)   -> can carry ANY cargo (no upper limit)
 *
 * Returns null when the truck has no declared capacity (such a truck should
 * never be considered a candidate).
 */
export function maxCargoForTruck(
  capacityTonnes: unknown
): number | null {
  if (capacityTonnes == null) return null;

  const cap = Number(capacityTonnes);

  if (Number.isNaN(cap) || cap <= 0) return null;

  if (cap <= 26) return 20; // "26 t" label -> carries <= 20 t
  if (cap <= 28) return 28; // "28 t" label -> carries <= 28 t

  // Anything above 28 t (e.g. 40 t) can carry any cargo.
  return Infinity;
}
