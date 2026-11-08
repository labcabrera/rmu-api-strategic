import type { CommandBus } from '@nestjs/cqrs';
import type { KafkaContext } from '@nestjs/microservices';
import { RenameGameUserCommand } from '../../../../src/modules/games/application/cqrs/commands/rename-game-user.command.js';
import { KafkaUserEventConsumer } from '../../../../src/modules/games/interfaces/messaging/kafka.user-event-consumer.js';

const TOPIC = 'internal.rmu-users.user.updated.v1';
const context = { getTopic: () => TOPIC } as unknown as KafkaContext;

const setup = (execute = vi.fn(() => Promise.resolve())) => {
  const consumer = new KafkaUserEventConsumer({ execute } as unknown as CommandBus);
  const logger = (consumer as unknown as { logger: { error: (...args: unknown[]) => void } }).logger;
  const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  return { consumer, execute, error };
};

describe('KafkaUserEventConsumer', () => {
  it('sends the name of the event to the command', async () => {
    const { consumer, execute } = setup();
    await consumer.handleUserUpdated({ data: { id: 'user-1', name: 'Nuevo' } }, context);
    expect(execute).toHaveBeenCalledWith(new RenameGameUserCommand('user-1', 'Nuevo'));
  });

  it('logs a payload without id or name and runs nothing', async () => {
    const { consumer, execute, error } = setup();
    await consumer.handleUserUpdated({ data: { id: 'user-1' } }, context);
    expect(execute).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining(TOPIC));
  });

  it('logs a failing command without rethrowing', async () => {
    const { consumer, error } = setup(vi.fn(() => Promise.reject(new Error('mongo down'))));
    await expect(consumer.handleUserUpdated({ data: { id: 'user-1', name: 'Nuevo' } }, context)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('user-1'));
  });
});
