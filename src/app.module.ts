import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { AuthModule } from './modules/shared/infrastructure/security/auth.module';
import { SharedModule } from './modules/shared/shared.module';
import { GamesModule } from './modules/games/games.module';
import { CharactersModule } from './modules/characters/characters.module';
import { FactionsModule } from './modules/factions/factions.module';

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
