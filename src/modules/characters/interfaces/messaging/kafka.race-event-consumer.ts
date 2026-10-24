/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { UpdateCharacterRaceCommandProps } from '../../application/cqrs/commands/update-character-race.command';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../application/ports/character-repository.port';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port';

export class CharacterRaceUpdatedEvent extends DomainEvent<UpdateCharacterRaceCommandProps> {
  constructor(data: UpdateCharacterRaceCommandProps) {
    super('race-updated', data);
  }
}

@Controller()
export class KafkaRaceEventConsumer {
  private readonly logger = new Logger(KafkaRaceEventConsumer.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  @EventPattern<string>('internal.rmu-core.race.updated.v1')
  async handleRaceUpdated(@Payload() event: any, @Ctx() context: KafkaContext) {
    this.logger.log(`Received race updated event on topic ${context.getTopic()}: ${event.data.id}: ${event.data.name}`);
    const data = event.data;
    if (!data || !data.id) {
      this.logger.error(`Event data is missing or does not contain an id: ${JSON.stringify(event)}`);
      return;
    }
    const raceId = data.id;
    const characters = await this.characterRepository.findByRaceId(raceId);
    this.logger.log(`Found ${characters.length} characters with raceId ${raceId}`);
    for (const character of characters) {
      const commandProps = {
        characterId: character.id,
        name: data.name as string | undefined,
        sizeId: data.sizeId as string | undefined,
        stats: data.stats as Map<string, number> | undefined,
        resistances: data.resistances as Map<string, number> | undefined,
        enduranceBonus: data.enduranceBonus as number | undefined,
        strideBonus: data.strideBonus as number | undefined,
        recoveryMultiplier: data.recoveryMultiplier as number | undefined,
        baseHits: data.baseHits as number | undefined,
        baseDevPoints: data.baseDevPoints as number | undefined,
        baseAt: data.baseAt as number | undefined,
        talents: data.talents as string[] | undefined,
        skillBonuses: data.skillBonuses as any[] | undefined,
        traits: data.traits as any[] | undefined,
      } as UpdateCharacterRaceCommandProps;
      const event = new CharacterRaceUpdatedEvent(commandProps);
      // internal.rmu-strategic.character.race-updated.v1, consumed by KafkaCharacterEventConsumer
      await this.events.publish('character', event);
    }
  }
}
