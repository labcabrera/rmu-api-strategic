import { ChronicleChapter } from '../../../../src/modules/chronicle/domain/aggregates/chronicle-chapter.js';
import {
  canReadVisibility,
  canWriteChronicle,
  MAX_CHRONICLE_CHAPTERS,
} from '../../../../src/modules/chronicle/domain/value-objects/chronicle-chapter-visibility.vo.js';
import type { GameAccessLevel } from '../../../../src/modules/games/domain/value-objects/game-member.vo.js';

const create = (overrides: Partial<Parameters<typeof ChronicleChapter.create>[0]> = {}) =>
  ChronicleChapter.create({ gameId: 'g1', title: 'Lore', order: 0, owner: 'u1', ...overrides });

describe('ChronicleChapter (workspace spec 102)', () => {
  it('creates a public chapter with empty content, audited by its owner', () => {
    const chapter = create({ title: '  Lore  ' });
    expect(chapter.getProps()).toMatchObject({
      gameId: 'g1',
      title: 'Lore',
      content: '',
      visibility: 'public',
      order: 0,
      campaignDate: undefined,
      owner: 'u1',
      updatedBy: 'u1',
    });
    expect(chapter.updatedAt).toEqual(chapter.createdAt);
  });

  it.each([
    ['an empty title', { title: '  ' }, 'validation'],
    ['a title of 201 characters', { title: 'x'.repeat(201) }, 'validation'],
    ['content of 200001 characters', { content: 'x'.repeat(200_001) }, 'chapter-content-too-long'],
    ['an unknown visibility', { visibility: 'friends' as never }, 'validation'],
    ['campaign day 0', { campaignDate: 0 }, 'validation'],
    ['a fractional campaign day', { campaignDate: 2.5 }, 'validation'],
  ])('rejects %s', (_, overrides, code) => {
    expect(() => create(overrides)).toThrow(expect.objectContaining({ code }));
  });

  it('accepts the limits', () => {
    expect(create({ title: 'x'.repeat(200), content: 'x'.repeat(200_000), campaignDate: 1 }).content).toHaveLength(200_000);
  });

  it('changes only the given fields, and the audit fields only on a change', () => {
    const chapter = ChronicleChapter.fromProps({ ...create({ campaignDate: 4 }).getProps() }).restoreVersion(3);
    const before = chapter.updatedAt;

    chapter.update({ title: 'Lore' }, 'u2');
    expect(chapter.hasChanges()).toBe(false);
    expect(chapter.updatedBy).toBe('u1');
    expect(chapter.updatedAt).toBe(before);

    chapter.update({ content: 'Text', visibility: 'master', campaignDate: null }, 'u2');
    expect(chapter.getProps()).toMatchObject({ title: 'Lore', content: 'Text', visibility: 'master', campaignDate: undefined });
    expect(chapter.updatedBy).toBe('u2');
    expect(chapter.hasChanges()).toBe(true);
  });

  it('reads older documents without visibility or audit fields', () => {
    const createdAt = new Date('2026-01-01');
    const chapter = ChronicleChapter.fromProps({
      id: 'c1',
      gameId: 'g1',
      title: 'T',
      order: 2,
      owner: 'u1',
      createdAt,
    } as never);
    expect(chapter.getProps()).toMatchObject({ content: '', visibility: 'public', updatedAt: createdAt, updatedBy: 'u1' });
  });

  it('allows up to 200 chapters per game', () => {
    expect(() => ChronicleChapter.checkCanAdd(MAX_CHRONICLE_CHAPTERS - 1)).not.toThrow();
    expect(() => ChronicleChapter.checkCanAdd(MAX_CHRONICLE_CHAPTERS)).toThrow(
      expect.objectContaining({ code: 'chronicle-chapter-limit' }),
    );
  });

  it.each([
    ['a missing chapter', ['a'], /missing/],
    ['an extra chapter', ['a', 'b', 'c'], /not in the chronicle/],
    ['a repeated chapter', ['a', 'a', 'b'], /repeats/],
  ])('rejects an order with %s', (_, ids, message) => {
    expect(() => ChronicleChapter.checkOrder(['a', 'b'], ids)).toThrow(
      expect.objectContaining({ code: 'chronicle-order-invalid', message: expect.stringMatching(message) as string }),
    );
  });

  it('accepts any permutation of the chapters', () => {
    expect(() => ChronicleChapter.checkOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).not.toThrow();
    expect(() => ChronicleChapter.checkOrder([], [])).not.toThrow();
  });

  it.each<[GameAccessLevel, boolean, boolean, boolean]>([
    ['none', false, false, false],
    ['cover', false, false, false],
    ['spectator', true, false, false],
    ['player', true, false, false],
    ['master', true, true, true],
    ['owner', true, true, true],
  ])('a %s reads public %s, private %s, and writes %s', (level, publicRead, privateRead, write) => {
    expect(canReadVisibility(level, 'public')).toBe(publicRead);
    expect(canReadVisibility(level, 'master')).toBe(privateRead);
    expect(create({ visibility: 'master' }).isReadableAt(level)).toBe(privateRead);
    expect(canWriteChronicle(level)).toBe(write);
  });
});
