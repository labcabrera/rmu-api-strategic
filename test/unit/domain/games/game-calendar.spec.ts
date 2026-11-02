import { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { GameCalendar, resolveCalendar } from '../../../../src/modules/games/domain/value-objects/game-calendar.vo.js';
import { gameProps } from './game.fixture.js';

describe('GameCalendar (spec 065)', () => {
  it('resolves the games stored without a calendar to day 1 without a start date', () => {
    const calendar = resolveCalendar(undefined);
    expect(calendar).toMatchObject({ startDate: '', elapsedDays: 0, elapsedHours: 0 });
    expect(calendar.currentDay).toBe(1);
    expect(Game.fromProps(gameProps()).calendar.currentDay).toBe(1);
  });

  it('carries the whole days out of the hours', () => {
    const start = new GameCalendar('Spring', 0, 0);
    const tenHours = start.advance(0, 10);
    expect(tenHours).toMatchObject({ elapsedDays: 0, elapsedHours: 10 });
    expect(tenHours.currentDay).toBe(1);
    const nextDay = tenHours.advance(0, 14);
    expect(nextDay).toMatchObject({ startDate: 'Spring', elapsedDays: 1, elapsedHours: 0 });
    expect(nextDay.advance(7, 23).advance(0, 3)).toMatchObject({ elapsedDays: 9, elapsedHours: 2 });
  });

  it('rejects negative or fractional time', () => {
    expect(() => GameCalendar.empty().advance(-1, 0)).toThrow(expect.objectContaining({ code: 'err-pass-time-invalid' }));
    expect(() => GameCalendar.empty().advance(0, 1.5)).toThrow(expect.objectContaining({ code: 'err-pass-time-invalid' }));
  });

  it('adjusts the start date and the days by hand, keeping the loose hours', () => {
    const calendar = new GameCalendar('Spring', 4, 6).adjust('  Summer ', 10);
    expect(calendar).toMatchObject({ startDate: 'Summer', elapsedDays: 10, elapsedHours: 6 });
    expect(new GameCalendar('Spring', 4, 6).adjust(undefined, undefined)).toMatchObject({ startDate: 'Spring', elapsedDays: 4 });
    expect(() => GameCalendar.empty().adjust('x'.repeat(101), undefined)).toThrow(
      expect.objectContaining({ code: 'err-calendar-start-date-too-long' }),
    );
    expect(() => GameCalendar.empty().adjust(undefined, -1)).toThrow(
      expect.objectContaining({ code: 'err-calendar-elapsed-days-invalid' }),
    );
  });

  it('starts a new game at day 1 whatever the props say', () => {
    const props = gameProps({ calendar: new GameCalendar('Day of the Thaw', 9, 3) });
    const game = Game.create({ ...props, id: undefined, createdAt: undefined } as unknown as Parameters<typeof Game.create>[0]);
    expect(game.calendar).toMatchObject({ startDate: 'Day of the Thaw', elapsedDays: 0, elapsedHours: 0 });
  });

  it('passes time and tells the days before and after', () => {
    const game = Game.fromProps(gameProps({ calendar: new GameCalendar('', 2, 20) }));
    expect(game.passTime(1, 5)).toEqual({ fromDay: 3, toDay: 5 });
    expect(game.calendar).toMatchObject({ elapsedDays: 4, elapsedHours: 1 });
    expect(game.hasChanges()).toBe(true);
  });

  it('reports a change of the counter only when the days change', () => {
    const game = Game.fromProps(gameProps({ calendar: new GameCalendar('Spring', 2, 0) }));
    expect(game.adjustCalendar('Spring', 2)).toEqual({ changed: false, fromDay: 3, toDay: 3 });
    expect(game.adjustCalendar('Summer', undefined)).toEqual({ changed: false, fromDay: 3, toDay: 3 });
    expect(game.calendar.startDate).toBe('Summer');
    expect(game.adjustCalendar(undefined, 9)).toEqual({ changed: true, fromDay: 3, toDay: 10 });
  });
});
