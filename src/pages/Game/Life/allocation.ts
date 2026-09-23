import { random, shuffle } from './engine/vitex';
import type { RNG } from './engine/vitex';
import type { Allocation } from './engine/core/state';

// Same bounded allocation strategy as remake/hooks/alloc, for the page's five attributes.
export function randomAllocation(total: number, limit = 10, rng?: RNG): Allocation {
  const result: Allocation = { charm: 0, intelligence: 0, strength: 0, money: 0, spirit: 0 };
  const keys = shuffle(Object.keys(result) as (keyof Allocation)[], rng);
  if (!Number.isInteger(total) || total < 0 || total > keys.length * limit) {
    throw new RangeError('Attribute points exceed allocation capacity');
  }
  let left = total;
  while (keys.length) {
    const key = keys.pop()!;
    const min = Math.max(0, left - keys.length * limit);
    const max = Math.min(limit, left);
    result[key] = random(max, min, rng);
    left -= result[key];
  }
  return result;
}
