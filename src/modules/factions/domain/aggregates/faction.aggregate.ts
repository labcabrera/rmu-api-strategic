import { AggregateRoot } from '@nestjs/cqrs';
import { FactionManagement } from '../value-objects/faction-management.vo';

export class Faction extends AggregateRoot {
  constructor(
    public id: string,
    public gameId: string,
    public name: string,
    public management: FactionManagement,
    public description: string | undefined,
    public owner: string,
    public createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }
}
