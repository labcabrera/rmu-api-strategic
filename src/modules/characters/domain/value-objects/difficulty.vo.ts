export type Difficulty = 'c' | 's' | 'r' | 'e' | 'l' | 'm' | 'h' | 'vh' | 'xh' | 'sf' | 'a' | 'ni';

/** Maneuver difficulties from the easiest to the hardest. */
export const DIFFICULTIES: Difficulty[] = ['c', 's', 'r', 'e', 'l', 'm', 'h', 'vh', 'xh', 'sf', 'a', 'ni'];

/** Modifier of each maneuver difficulty (same values as rmu-api-tactical). */
export const DIFFICULTY_MODIFIERS: Record<Difficulty, number> = {
  c: 70,
  s: 50,
  r: 30,
  e: 20,
  l: 10,
  m: 0,
  h: -10,
  vh: -20,
  xh: -30,
  sf: -50,
  a: -70,
  ni: -100,
};

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as string[]).includes(value);
