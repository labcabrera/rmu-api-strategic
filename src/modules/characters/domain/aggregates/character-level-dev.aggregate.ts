import { AggregateRoot } from '@nestjs/cqrs';

export class CharacterLevelDev extends AggregateRoot {
  constructor(
    public id: string,
    public characterId: string,
    public level: number,
    public skills: Map<string, number[]>,
    public owner: string,
    public createdAt: Date,
    public updatedAt?: Date,
  ) {
    super();
  }
}
