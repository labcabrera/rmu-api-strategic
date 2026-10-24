import { TacticalOutcomeDto } from '../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto';
import { ValidationError } from '../../../src/modules/shared/domain/errors/errors';

const dto = (items: unknown): TacticalOutcomeDto =>
  ({
    tacticalGameId: 'tactical-001',
    actorId: 'actor-001',
    characterId: 'patient',
    name: 'Patient',
    hp: { start: 30, end: 30, delta: 0 },
    injuries: [],
    items,
  }) as unknown as TacticalOutcomeDto;

describe('TacticalOutcomeDto items', () => {
  it('maps the item modifiers, dropping the temporary ones', () => {
    const command = TacticalOutcomeDto.toCommand(
      'patient',
      dto([
        {
          itemId: 'item-001',
          modifiers: [
            { id: 'm-1', type: 'breakage', value: -20, appliesTo: 'all', createdAt: '2026-10-24T10:00:00.000Z', extra: 'x' },
            { id: 'm-2', type: 'breakage', value: -20, appliesTo: 'all', temporary: true, createdAt: '2026-10-24T10:00:00.000Z' },
          ],
        },
      ]),
      'sa',
      ['rmu-service'],
    );
    expect(command.outcome.items).toEqual([
      {
        itemId: 'item-001',
        modifiers: [{ id: 'm-1', type: 'breakage', value: -20, appliesTo: 'all', createdAt: '2026-10-24T10:00:00.000Z' }],
      },
    ]);
  });

  it('rejects an invalid modifier', () => {
    expect(() =>
      TacticalOutcomeDto.toCommand(
        'patient',
        dto([{ itemId: 'item-001', modifiers: [{ id: 'm-1', type: 'magic', value: 1, appliesTo: 'all' }] }]),
        'sa',
        [],
      ),
    ).toThrow(ValidationError);
  });

  it('keeps outcomes without items as they were', () => {
    expect(TacticalOutcomeDto.toCommand('patient', dto(undefined), 'sa', []).outcome.items).toBeUndefined();
  });
});
