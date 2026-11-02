/** Bonus of a skill without ranks (Core Law table 3-0b). */
export const UNRANKED_RANK_BONUS = -25;

// Ranks per step and bonus per rank of table 3-0b: 1-10 +5, 11-20 +3, 21-30 +2, 31+ +1
const RANK_STEPS: [number, number][] = [
  [10, 5],
  [10, 3],
  [10, 2],
  [Infinity, 1],
];

/** Rank bonus of a skill (Core Law table 3-0b). */
export function rankBonus(ranks: number): number {
  if (ranks <= 0) return UNRANKED_RANK_BONUS;
  let left = ranks;
  let bonus = 0;
  for (const [size, perRank] of RANK_STEPS) {
    const taken = Math.min(left, size);
    bonus += taken * perRank;
    left -= taken;
    if (left === 0) break;
  }
  return bonus;
}
