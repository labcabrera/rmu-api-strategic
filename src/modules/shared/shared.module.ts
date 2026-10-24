import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { DOMAIN_EVENT_PUBLISHER } from './application/ports/domain-event-publisher.port.js';
import { RsqlParser } from './infrastructure/db/rsql-parser.js';
import { HttpClient } from './infrastructure/http/http-client.js';
import { KafkaDomainEventPublisher } from './infrastructure/messaging/kafka.domain-event.publisher.js';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service.js';
import { TokenService } from './infrastructure/security/token.service.js';
import { HealthController } from './interfaces/http/health.controller.js';

@Module({
  imports: [TerminusModule, CqrsModule, ConfigModule],
  controllers: [HealthController],
  providers: [
    RsqlParser,
    KafkaProducerService,
    HttpClient,
    TokenService,
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: KafkaDomainEventPublisher },
  ],
  exports: [RsqlParser, KafkaProducerService, HttpClient, TokenService, DOMAIN_EVENT_PUBLISHER],
})
export class SharedModule {}
