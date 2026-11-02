import { randomUUID } from 'crypto';
import { FactionCreatedEvent, FactionUpdatedEvent } from '../events/faction.events.js';
import { FactionManagement } from '../value-objects/faction-management.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { FACTION_NPC_MAX_COUNT, FACTION_NPC_MIN_COUNT, type FactionNpc, MAX_FACTION_NPCS } from '../value-objects/faction-npc.vo.js';
import type { CreateFactionProps, FactionProps, UpdateFactionProps } from './faction-props.js';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';

export class Faction extends BaseAggregateRoot<FactionProps> {
  public importId: string | undefined = undefined;

  private constructor(
    id: string,
    public readonly gameId: string,
    public name: string,
    public management: FactionManagement,
    public shortDescription: string | undefined,
    public description: string | undefined,
    public imageUrl: string | undefined,
    public owner: string,
    public npcs: FactionNpc[],
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super(id);
  }

  static create(props: CreateFactionProps): Faction {
    const faction = new Faction(
      randomUUID(),
      props.gameId,
      props.name,
      props.management,
      props.shortDescription,
      props.description,
      props.imageUrl,
      props.owner,
      Faction.checkNpcs(props.npcs ?? []),
      new Date(),
      undefined,
    );
    faction.importId = props.importId;
    faction.apply(new FactionCreatedEvent(faction));
    return faction;
  }

  static fromProps(props: FactionProps) {
    const faction = new Faction(
      props.id,
      props.gameId,
      props.name,
      props.management,
      props.shortDescription,
      props.description,
      props.imageUrl,
      props.owner,
      props.npcs ?? [],
      props.createdAt,
      props.updatedAt,
    );
    faction.importId = props.importId;
    return faction;
  }

  update(props: UpdateFactionProps) {
    const { name, shortDescription, description, imageUrl, npcs } = props;
    if (name && name.trim() === '') {
      throw new ValidationError('Name can not be empty');
    }
    if (name) this.name = name;
    if (shortDescription) this.shortDescription = shortDescription;
    if (description) this.description = description;
    if (imageUrl) this.imageUrl = imageUrl;
    // Spec 055: the whole list, already resolved (ids and names) by the handler
    if (npcs) this.npcs = Faction.checkNpcs(npcs);
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

  /** Spec 055: between 1 and 50 specimens per entry, a name and no repeated entry id. Returns copies. */
  static checkNpcs(npcs: FactionNpc[]): FactionNpc[] {
    if (npcs.length > MAX_FACTION_NPCS) throw new ValidationError(`A faction has at most ${MAX_FACTION_NPCS} NPC entries`);
    const ids = new Set<string>();
    return npcs.map(npc => {
      if (!Number.isInteger(npc.count) || npc.count < FACTION_NPC_MIN_COUNT || npc.count > FACTION_NPC_MAX_COUNT) {
        throw new ValidationError(`The count of NPC ${npc.npcId} must be between ${FACTION_NPC_MIN_COUNT} and ${FACTION_NPC_MAX_COUNT}`);
      }
      if (!npc.name || npc.name.trim() === '') throw new ValidationError(`NPC entry ${npc.id} has no name`);
      if (ids.has(npc.id)) throw new ValidationError(`NPC entry ${npc.id} is repeated`);
      ids.add(npc.id);
      return { id: npc.id, npcId: npc.npcId, name: npc.name, count: npc.count, notes: npc.notes ?? null };
    });
  }

  getProps(): FactionProps {
    return {
      id: this.id,
      gameId: this.gameId,
      name: this.name,
      management: this.management,
      shortDescription: this.shortDescription,
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      npcs: this.npcs.map(npc => ({ ...npc })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.importId ? { importId: this.importId } : {}),
    };
  }
}
