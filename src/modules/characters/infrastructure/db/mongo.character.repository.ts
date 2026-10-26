/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CharacterRepository } from '../../application/ports/character-repository.port.js';
import { Character } from '../../domain/aggregates/character.js';
import { type CharacterDocument, CharacterModel } from '../persistence/models/character.model.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { CharacterStat, STAT_KEYS, type StatKey } from '../../domain/value-objects/character-stat.vo.js';
import { CharacterTrait } from '../../domain/value-objects/character-trait.vo.js';
import { CharacterXP } from '../../domain/value-objects/character-xp.vo.js';
import { CharacterSkill } from '../../domain/value-objects/character-skill.vo.js';

@Injectable()
export class MongoCharacterRepository extends MongoBaseRepository<Character, CharacterDocument> implements CharacterRepository {
  constructor(@InjectModel(CharacterModel.name) characterModel: Model<CharacterDocument>, rsqlParser: RsqlParser) {
    super(characterModel, rsqlParser);
  }

  async findById(id: string): Promise<Character | null> {
    const doc = await this.model.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const characters = await this.model.find({ gameId });
    return characters.map(doc => this.toEntity(doc));
  }

  async findIdsByOwner(owner: string): Promise<string[]> {
    const docs = await this.model.find({ owner }, { _id: 1 }).lean<{ _id: string }[]>();
    return docs.map(doc => String(doc._id));
  }

  async findByRaceId(raceId: string): Promise<Character[]> {
    const characters = await this.model.find({ 'info.race.id': raceId });
    return characters.map(doc => this.toEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
  }

  protected mapToEntity(doc: CharacterDocument): Character {
    const statistics = this.mapStatDtoToVo(doc);
    return Character.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      faction: new NamedEntity(doc.faction.id, doc.faction.name),
      name: doc.name,
      info: doc.info,
      roleplay: doc.roleplay,
      experience: this.mapExperience(doc),
      statistics: statistics,
      movement: doc.movement,
      defense: doc.defense,
      resistances: doc.resistances,
      hp: doc.hp,
      endurance: doc.endurance,
      power: doc.power,
      initiative: doc.initiative,
      skills: this.mapSkills(doc),
      equipment: doc.equipment,
      attacks: doc.attacks,
      traits: this.mapTraits(doc),
      status: doc.status,
      injuries: (doc.injuries || []).map(i => ({ ...i, treatments: i.treatments || [] })),
      conditions: doc.conditions || [],
      appliedTacticalGames: doc.appliedTacticalGames || [],
      description: doc.description,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      importId: doc.importId,
    });
  }

  // Documents stored before spec 009 use availableRaceDevPoints and have no bonus point tracking
  private mapExperience(doc: CharacterDocument): CharacterXP {
    const e = doc.experience;
    if (!e) return e;
    return new CharacterXP(
      e.level,
      e.availableLevel,
      e.xp,
      e.devPoints,
      e.availableDevPoints,
      e.availableBonusDevPoints ?? e.availableRaceDevPoints ?? 0,
      e.availableStatLevelUp ?? 0,
      e.developedStatLevelUp ?? 0,
      e.weaponDevelopment,
      e.bonusDevPointsSpentThisLevel ?? 0,
      e.flawDevPoints ?? 0,
    );
  }

  private mapSkills(doc: CharacterDocument): CharacterSkill[] {
    return (doc.skills || []).map(s => {
      const spent = s.devPointsSpent;
      return new CharacterSkill(
        s.skillId,
        s.specialization ?? null,
        s.statistics,
        s.development,
        s.professional ?? null,
        s.ranks,
        s.ranksDeveloped,
        s.statBonus,
        s.racialBonus,
        s.developmentBonus,
        s.professionalBonus,
        s.customBonus,
        s.totalBonus,
        s.traitBonus ?? 0,
        s.cultureRanks ?? 0,
        { normal: spent?.normal ?? 0, bonus: spent?.bonus ?? 0 },
        s.knackBonus ?? undefined,
        s.missingReference || undefined,
        s.styleAbilities?.length ? s.styleAbilities.map(a => ({ abilityId: a.abilityId, times: a.times, cost: a.cost })) : undefined,
      );
    });
  }

  // Documents stored before race traits were synced have no source
  private mapTraits(doc: CharacterDocument): CharacterTrait[] {
    return (doc.traits || []).map(
      t =>
        new CharacterTrait(
          t.traitId,
          t.traitName,
          t.isTalent,
          t.tier ?? undefined,
          t.cost ?? 0,
          t.specialization ?? undefined,
          t.source === 'race' ? 'race' : 'character',
          t.paidWith ?? undefined,
          t.missingReference || undefined,
        ),
    );
  }

  private mapStatDtoToVo(doc: CharacterDocument): Record<StatKey, CharacterStat> {
    const statistics: Record<StatKey, CharacterStat> = {} as Record<StatKey, CharacterStat>;
    // Normalize mongoose Map / MongooseMap / POJO to a plain object so we can index by key reliably
    const statsSource: any = (() => {
      const s = (doc && (doc as any).statistics) || {};
      if (!s) return {};
      // If it's a Mongoose Map with entries()
      if (typeof s.entries === 'function') {
        try {
          return Object.fromEntries(Array.from(s.entries() as Iterable<readonly [string, any]>));
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (ignore) {
          // fallthrough
        }
      }
      // If it provides toObject / toJSON, use it
      if (typeof s.toObject === 'function') return s.toObject();
      if (typeof s.toJSON === 'function') return s.toJSON();
      // Otherwise assume it's already a plain object
      return s;
    })();
    for (const key of STAT_KEYS) {
      const statRaw = (statsSource && (statsSource[key] ?? (typeof statsSource.get === 'function' ? statsSource.get(key) : undefined))) as
        undefined | { potential?: number; temporary?: number; modifiers?: Record<string, number>; totalBonus?: number };

      if (statRaw) {
        statistics[key] = new CharacterStat(
          statRaw.potential ?? 0,
          statRaw.temporary ?? 0,
          statRaw.modifiers ?? {},
          statRaw.totalBonus ?? 0,
        );
      } else {
        // Provide a sensible default so all STAT_KEYS are present
        statistics[key] = new CharacterStat(0, 0, {} as Record<string, number>, 0);
      }
    }
    return statistics;
  }
}
