import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TacticalItemOutcomeDto, TacticalOutcomeDto } from '../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto.js';
import { ValidationError } from '../../../src/modules/shared/domain/errors/errors.js';

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

/** Spec 044, decision 3: the spent coating is named by its appliedAt; `true` still comes from an older tactical. */
describe('TacticalOutcomeDto coatingSpent', () => {
  const coatingSpent = (value: unknown) =>
    TacticalOutcomeDto.toCommand('patient', dto([{ itemId: 'sword', modifiers: [], coatingSpent: value }]), 'sa', []).outcome.items?.[0];
  const errors = (value: unknown) =>
    validateSync(plainToInstance(TacticalItemOutcomeDto, { itemId: 'sword', modifiers: [], coatingSpent: value })).map(e => e.property);

  it('keeps the appliedAt of the spent coating, and the legacy true', () => {
    expect(coatingSpent({ appliedAt: '2026-10-27T10:00:00.000Z', extra: 1 })).toEqual({
      itemId: 'sword',
      modifiers: [],
      coatingSpent: { appliedAt: '2026-10-27T10:00:00.000Z' },
    });
    expect(coatingSpent(true)).toMatchObject({ coatingSpent: true });
    expect(coatingSpent(false)).not.toHaveProperty('coatingSpent');
  });

  it('accepts a boolean or an object with appliedAt, and rejects anything else', () => {
    expect(errors(true)).toEqual([]);
    expect(errors(false)).toEqual([]);
    expect(errors(undefined)).toEqual([]);
    expect(errors({ appliedAt: '2026-10-27T10:00:00.000Z' })).toEqual([]);
    expect(errors({})).toEqual(['coatingSpent']);
    expect(errors({ appliedAt: '' })).toEqual(['coatingSpent']);
    expect(errors('yes')).toEqual(['coatingSpent']);
    expect(errors([{ appliedAt: 'x' }])).toEqual(['coatingSpent']);
  });
});
