export interface ManeuverEffect {
  status: string;
  value?: number;
}

export interface AbsoluteManeuverResponse {
  result: 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';
  message: string;
  effects: ManeuverEffect[];
  /** Text of the unusual event of the table, when it was asked for and the table has one. */
  unusualEvent?: string;
}

export interface PercentManeuverResponse {
  percent: number;
  message: string;
}

/** Maneuver resolution of rmu-api-core (GET /v1/maneuvers/absolute), the same API that rmu-api-tactical uses. */
export interface ManeuverClientPort {
  absolute(roll: number, table: string, unusualEvent?: boolean): Promise<AbsoluteManeuverResponse>;

  /** GET /v1/maneuvers/percent: the Trading price of workspace spec 023 (decision 12). */
  percent(roll: number): Promise<PercentManeuverResponse>;
}

export const MANEUVER_CLIENT = Symbol('ManeuverClientPort');
