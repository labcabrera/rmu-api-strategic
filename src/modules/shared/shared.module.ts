import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/modules/auth/auth.module';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service';
import { HealthController } from './interfaces/http/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { RsqlParser } from './infrastructure/persistence/repositories/rsql-parser';

@Module({
  imports: [TerminusModule, CqrsModule, ConfigModule, AuthModule],
  controllers: [HealthController],
  providers: [RsqlParser, KafkaProducerService],
  exports: [RsqlParser, KafkaProducerService],
})
export class SharedModule {}
