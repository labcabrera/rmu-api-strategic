/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import type { CharacterRepository } from '../../application/ports/character.repository';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { UpdateCharacterRaceCommandProps } from '../../application/cqrs/commands/update-character-race.command';
import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';

export class CharacterRaceUpdatedEvent extends DomainEvent<UpdateCharacterRaceCommandProps> {
  constructor(data: UpdateCharacterRaceCommandProps) {
    super('race-updated', data);
  }
}

@Controller()
export class KafkaRaceEventConsumer {
  private readonly logger = new Logger(KafkaRaceEventConsumer.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @EventPattern('internal.rmu-core.race.updated.v1')
  async handleRaceUpdated(@Payload() event: any, @Ctx() context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}: ${JSON.stringify(event)}`);
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
      } as UpdateCharacterRaceCommandProps;
      const event = new CharacterRaceUpdatedEvent(commandProps);
      await this.kafkaProducerService.emit('internal.rmu-strategic.character.race-updated.v1', event);
    }
  }
}
