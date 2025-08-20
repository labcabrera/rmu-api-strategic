import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';

import { SharedModule } from '../shared/shared.module';
import { FactionController } from './infrastructure/controllers/faction.controller';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    //MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]),
    AuthModule,
    SharedModule,
  ],
  controllers: [FactionController],
  providers: [],
  exports: [],
})
export class FactionsModule {}
