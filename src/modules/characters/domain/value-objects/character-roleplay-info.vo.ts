export type CharacterGender = 'male' | 'female' | 'other';

export interface CharacterRoleplayInfo {
  gender: CharacterGender | undefined;
  age: number | undefined;
}
