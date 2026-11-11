import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesModule } from '../games/games.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { CreateChronicleChapterHandler } from './application/cqrs/handlers/create-chronicle-chapter.handler.js';
import { DeleteChaptersByGameHandler } from './application/cqrs/handlers/delete-chapters-by-game.handler.js';
import { DeleteChronicleChapterHandler } from './application/cqrs/handlers/delete-chronicle-chapter.handler.js';
import { GetChronicleChapterHandler } from './application/cqrs/handlers/get-chronicle-chapter.handler.js';
import { GetChronicleChaptersHandler } from './application/cqrs/handlers/get-chronicle-chapters.handler.js';
import { ReorderChronicleChaptersHandler } from './application/cqrs/handlers/reorder-chronicle-chapters.handler.js';
import { UpdateChronicleChapterHandler } from './application/cqrs/handlers/update-chronicle-chapter.handler.js';
import { CHRONICLE_CHAPTER_REPOSITORY } from './application/ports/chronicle-chapter-repository.port.js';
import { MEDIA_CLIENT } from './application/ports/media-client.port.js';
import { ChronicleAccess } from './application/services/chronicle-access.service.js';
import { ApiMediaClientAdapter } from './infrastructure/api-clients/api.media-client.adapter.js';
import { MongoChronicleChapterRepository } from './infrastructure/db/mongo.chronicle-chapter.repository.js';
import { ChronicleChapterModel, ChronicleChapterSchema } from './infrastructure/persistence/models/chronicle-chapter.model.js';
import { ChronicleChapterController } from './interfaces/http/chronicle-chapter.controller.js';
import { KafkaChronicleGameEventConsumer } from './interfaces/messaging/kafka.game-event-consumer.js';

/** The chronicle of a strategic game (workspace spec 102): not part of the game, nor of its exports. */
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: ChronicleChapterModel.name, schema: ChronicleChapterSchema }]),
    SharedModule,
    GamesModule,
  ],
  controllers: [ChronicleChapterController, KafkaChronicleGameEventConsumer],
  providers: [
    CreateChronicleChapterHandler,
    UpdateChronicleChapterHandler,
    DeleteChronicleChapterHandler,
    ReorderChronicleChaptersHandler,
    DeleteChaptersByGameHandler,
    GetChronicleChaptersHandler,
    GetChronicleChapterHandler,
    ChronicleAccess,
    { provide: CHRONICLE_CHAPTER_REPOSITORY, useClass: MongoChronicleChapterRepository },
    { provide: MEDIA_CLIENT, useClass: ApiMediaClientAdapter },
  ],
})
export class ChronicleModule {}
