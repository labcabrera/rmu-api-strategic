import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.schema.js';
import { AuthModule } from './modules/shared/infrastructure/security/auth.module.js';
import { SharedModule } from './modules/shared/shared.module.js';
import { GamesModule } from './modules/games/games.module.js';
import { CharactersModule } from './modules/characters/characters.module.js';
import { FactionsModule } from './modules/factions/factions.module.js';

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
    GamesModule,
    FactionsModule,
    CharactersModule,
  ],
})
export class AppModule {}
