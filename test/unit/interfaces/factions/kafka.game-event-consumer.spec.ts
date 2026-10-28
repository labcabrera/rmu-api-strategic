import type { CommandBus } from '@nestjs/cqrs';
import type { KafkaContext } from '@nestjs/microservices';
import { DeleteFactionsByGameCommand } from '../../../../src/modules/factions/application/cqrs/commands/delete-factions-by-game.command.js';
import { KafkaFactionGameEventConsumer } from '../../../../src/modules/factions/interfaces/messaging/kafka.game-event-consumer.js';

const TOPIC = 'internal.rmu-strategic.game.deleted.v1';
const context = { getTopic: () => TOPIC } as unknown as KafkaContext;

const setup = (execute = vi.fn(() => Promise.resolve())) => {
  const consumer = new KafkaFactionGameEventConsumer({ execute } as unknown as CommandBus);
  const logger = (consumer as unknown as { logger: { error: (...args: unknown[]) => void; log: () => void } }).logger;
  const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  vi.spyOn(logger, 'log').mockImplementation(() => undefined);
  return { consumer, execute, error };
};

describe('KafkaFactionGameEventConsumer', () => {
  it('waits for the system command that deletes the factions of the game', async () => {
    const { consumer, execute } = setup();

    await consumer.onGameDeleted({ data: { id: 'g1' } }, context);

    expect(execute).toHaveBeenCalledWith(new DeleteFactionsByGameCommand('g1'));
  });

  it('logs a payload without game id and runs nothing', async () => {
    const { consumer, execute, error } = setup();

    await consumer.onGameDeleted({ data: {} }, context);

    expect(execute).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining(TOPIC));
  });

  it('logs a failing command with the game id and the topic, without rethrowing', async () => {
    const { consumer, error } = setup(vi.fn(() => Promise.reject(new Error('mongo down'))));

    await expect(consumer.onGameDeleted({ data: { id: 'g1' } }, context)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/g1.*game\.deleted.*mongo down/), expect.any(String));
  });
});
