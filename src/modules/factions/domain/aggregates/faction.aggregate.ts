import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { FactionCreatedEvent, FactionUpdatedEvent } from '../events/faction.events';
import { FactionManagement } from '../value-objects/faction-management.vo';
import { ValidationError } from 'src/modules/shared/domain/errors';

export class Faction extends AggregateRoot<DomainEvent<Faction>> {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public name: string,
    public management: FactionManagement,
    public description: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    gameId: string,
    name: string,
    management: FactionManagement,
    description: string | undefined,
    owner: string,
  ) {
    const faction = new Faction(randomUUID(), gameId, name, management, description, owner, new Date(), undefined);
    faction.apply(new FactionCreatedEvent(faction));
    return faction;
  }

  update(
    name: string | undefined,
    availableXP: number | undefined,
    availableGold: number | undefined,
    description: string | undefined,
  ) {
    if (name && name.trim() === '') {
      throw new ValidationError('Name can not be empty');
    }
    if (availableXP && availableXP < 0) {
      throw new ValidationError('Available XP can not be negative');
    }
    if (availableGold && availableGold < 0) {
      throw new ValidationError('Available Gold can not be negative');
    }
    if (name) this.name = name;
    if (availableXP) this.management.availableXP = availableXP;
    if (availableGold) this.management.availableGold = availableGold;
    if (description) this.description = description;
    this.updatedAt = new Date();
    this.apply(new FactionUpdatedEvent(this));
  }

  addXp(amount: number) {
    if (amount <= 0 && -amount > this.management.availableXP) {
      throw new ValidationError('Can not remove more XP than available');
    }
    this.management.availableXP += amount;
    this.updatedAt = new Date();
    this.apply(new FactionUpdatedEvent(this));
  }

  addGold(amount: number) {
    if (amount <= 0 && -amount > this.management.availableGold) {
      throw new ValidationError('Can not remove more gold than available');
    }
    this.management.availableGold += amount;
    this.updatedAt = new Date();
    this.apply(new FactionUpdatedEvent(this));
  }
}
