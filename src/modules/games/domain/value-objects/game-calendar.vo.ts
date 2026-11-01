import { ValidationError } from '../../../shared/domain/errors/errors.js';

export const START_DATE_MAX_LENGTH = 100;
export const MAX_PASS_DAYS = 365;
export const HOURS_PER_DAY = 24;

/**
 * Calendar of a campaign (workspace spec 065): fantasy worlds have no common calendar, so the start is free text and
 * the time is a counter of days since then, plus the loose hours of the steps that did not complete a day.
 */
export class GameCalendar {
  constructor(
    /** Free text, '' when there is no start date */
    public readonly startDate: string,
    /** Whole days since the start: the current day is elapsedDays + 1 */
    public readonly elapsedDays: number,
    /** Loose hours of the current day, 0–23 */
    public readonly elapsedHours: number,
  ) {}

  static empty(): GameCalendar {
    return new GameCalendar('', 0, 0);
  }

  get currentDay(): number {
    return this.elapsedDays + 1;
  }

  /** Adds days and hours, carrying the whole days out of the hours. */
  advance(days: number, hours: number): GameCalendar {
    if (!Number.isInteger(days) || !Number.isInteger(hours) || days < 0 || hours < 0) {
      throw new ValidationError('Days and hours must be integers of 0 or more', 'err-pass-time-invalid');
    }
    const totalHours = this.elapsedHours + hours;
    return new GameCalendar(this.startDate, this.elapsedDays + days + Math.floor(totalHours / HOURS_PER_DAY), totalHours % HOURS_PER_DAY);
  }

  /** A correction by hand (decision 6): no effects on the characters. */
  adjust(startDate: string | undefined, elapsedDays: number | undefined): GameCalendar {
    const start = startDate === undefined ? this.startDate : startDate.trim();
    if (start.length > START_DATE_MAX_LENGTH) {
      throw new ValidationError(`The start date has more than ${START_DATE_MAX_LENGTH} characters`, 'err-calendar-start-date-too-long');
    }
    if (elapsedDays !== undefined && (!Number.isInteger(elapsedDays) || elapsedDays < 0)) {
      throw new ValidationError('The elapsed days must be an integer of 0 or more', 'err-calendar-elapsed-days-invalid');
    }
    return new GameCalendar(start, elapsedDays ?? this.elapsedDays, this.elapsedHours);
  }

  equals(other: GameCalendar): boolean {
    return this.startDate === other.startDate && this.elapsedDays === other.elapsedDays && this.elapsedHours === other.elapsedHours;
  }
}

/** Games stored before spec 065 have no calendar: day 1 without a start date, with no migration. */
export const resolveCalendar = (calendar?: Partial<GameCalendar> | null): GameCalendar =>
  new GameCalendar(calendar?.startDate ?? '', calendar?.elapsedDays ?? 0, calendar?.elapsedHours ?? 0);
