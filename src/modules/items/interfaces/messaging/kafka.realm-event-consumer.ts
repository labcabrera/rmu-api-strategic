/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';

@Controller()
export class KafkaItemEventConsumer {
  private readonly logger = new Logger(KafkaItemEventConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  // @EventPattern('internal.rmu-core.realm.deleted.v1')
  handleRealmDeleted(@Payload() event: any, @Ctx() context: KafkaContext) {
    // this.logger.log(`Received event on topic ${context.getTopic()}: ${JSON.stringify(event)}`);
    // const realmId = event?.data?.id as string;
    // if (realmId) {
    //   this.commandBus.execute(new DeleteItemsByRealmCommand(realmId, 'admin', ['admin'])).catch((error) => {
    //     this.logger.error(`Error deleting games for realm ${realmId}: ${error.message}`, error.stack);
    //   });
    // } else {
    //   this.logger.error('realmId not found in event payload');
    // }
  }
}
