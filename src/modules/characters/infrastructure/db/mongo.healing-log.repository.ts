import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page } from 'src/modules/shared/domain/entities/page';
import { HealingLogRepository } from '../../application/ports/healing-log.repository';
import { HealingLogEntry } from '../../domain/value-objects/healing-log-entry.vo';
import { CharacterHealingLogDocument, CharacterHealingLogModel } from '../persistence/models/character-healing-log.model';

@Injectable()
export class MongoHealingLogRepository implements HealingLogRepository {
  constructor(@InjectModel(CharacterHealingLogModel.name) private readonly model: Model<CharacterHealingLogDocument>) {}

  async saveAll(characterId: string, gameId: string, entries: HealingLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.model.insertMany(entries.map(({ id: entryId, ...rest }) => ({ ...rest, _id: entryId, characterId, gameId })));
  }

  async findByCharacterId(characterId: string, page: number, size: number): Promise<Page<HealingLogEntry>> {
    const filter = { characterId };
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ at: -1, _id: 1 })
        .skip(page * size)
        .limit(size)
        .lean<CharacterHealingLogModel[]>(),
      this.model.countDocuments(filter),
    ]);
    return new Page(
      docs.map(doc => MongoHealingLogRepository.mapToEntry(doc)),
      page,
      size,
      total,
    );
  }

  async deleteByCharacterId(characterId: string): Promise<void> {
    await this.model.deleteMany({ characterId });
  }

  static mapToEntry(doc: CharacterHealingLogModel): HealingLogEntry {
    return {
      id: doc._id,
      at: doc.at,
      kind: doc.kind,
      injuryId: doc.injuryId ?? undefined,
      tacticalGameId: doc.tacticalGameId ?? undefined,
      healerName: doc.healerName ?? undefined,
      summary: doc.summary || {},
    };
  }
}
