import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { FactionCreatedEvent, FactionUpdatedEvent } from '../events/faction.events';
import { FactionManagement } from '../value-objects/faction-management.vo';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';

export interface FactionProps {
  id: string;
  gameId: string;
  name: string;
  management: FactionManagement;
  shortDescription: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export class Faction extends AggregateRoot<DomainEvent<Faction>> {
  private constructor(
    public readonly id: string,
    public readonly gameId: string,
    public name: string,
    public management: FactionManagement,
    public shortDescription: string | undefined,
    public description: string | undefined,
    public imageUrl: string | undefined,
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
    shortDescription: string | undefined,
    description: string | undefined,
    owner: string,
  ) {
    const faction = new Faction(
      randomUUID(),
      gameId,
      name,
      management,
      shortDescription,
      description,
      undefined,
      owner,
      new Date(),
      undefined,
    );
    faction.apply(new FactionCreatedEvent(faction));
    return faction;
  }

  static fromProps(props: FactionProps) {
    return new Faction(
      props.id,
      props.gameId,
      props.name,
      props.management,
      props.shortDescription,
      props.description,
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(props: Partial<Omit<FactionProps, 'id' | 'gameId' | 'owner' | 'createdAt' | 'updatedAt'>>) {
    const { name, management, shortDescription, description, imageUrl } = props;
    if (name && name.trim() === '') {
      throw new ValidationError('Name can not be empty');
    }
    if (management) {
      if (management.availableXP && management.availableXP < 0) {
        throw new ValidationError('Available XP can not be negative');
      }
      if (management.availableGold && management.availableGold < 0) {
        throw new ValidationError('Available Gold can not be negative');
      }
    }
    if (name) this.name = name;
    if (management?.availableXP) this.management.availableXP = management.availableXP;
    if (management?.availableGold) this.management.availableGold = management.availableGold;
    if (shortDescription) this.shortDescription = shortDescription;
    if (description) this.description = description;
    if (imageUrl) this.imageUrl = imageUrl;
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
    const newGold = Math.round((this.management.availableGold + amount) * 1e3) / 1e3;
    if (newGold < 0) {
      throw new ValidationError('Can not remove more gold than available');
    }
    this.management.availableGold = newGold;
    this.updatedAt = new Date();
    this.apply(new FactionUpdatedEvent(this));
  }

  toProps(): FactionProps {
    return {
      id: this.id,
      gameId: this.gameId,
      name: this.name,
      management: this.management,
      shortDescription: this.shortDescription,
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
