import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CharactersModule } from '../characters/characters.module.js';
import { ItemsModule } from '../items/items.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { AwardTreasureHandler, RollTreasureHandler } from './application/cqrs/handlers/treasure.handlers.js';
import { DICE, RandomDice } from './domain/services/dice.js';
import { TreasureController } from './interfaces/http/treasure.controller.js';

/** Random treasure (workspace spec 067): rolls on the tables of core and awards of the lines to a holder. */
@Module({
  imports: [CqrsModule, SharedModule, CharactersModule, ItemsModule],
  controllers: [TreasureController],
  providers: [RollTreasureHandler, AwardTreasureHandler, { provide: DICE, useValue: RandomDice }],
})
export class TreasureModule {}
