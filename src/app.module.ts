import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.schema.js';
import { AuthModule } from './modules/shared/infrastructure/security/auth.module.js';
import { SharedModule } from './modules/shared/shared.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { GamesModule } from './modules/games/games.module.js';
import { CharactersModule } from './modules/characters/characters.module.js';
import { FactionsModule } from './modules/factions/factions.module.js';
import { ExportsModule } from './modules/exports/exports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('RMU_MONGO_STRATEGIC_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    SharedModule,
    StatsModule,
    GamesModule,
    FactionsModule,
    CharactersModule,
    ExportsModule,
  ],
})
export class AppModule {}
