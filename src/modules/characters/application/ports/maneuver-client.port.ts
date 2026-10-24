export interface ManeuverEffect {
  status: string;
  value?: number;
}

export interface AbsoluteManeuverResponse {
  result: 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';
  message: string;
  effects: ManeuverEffect[];
}

/** Maneuver resolution of rmu-api-core (GET /v1/maneuvers/absolute), the same API that rmu-api-tactical uses. */
export interface ManeuverClientPort {
  absolute(roll: number, table: string): Promise<AbsoluteManeuverResponse>;
}

export const MANEUVER_CLIENT = Symbol('ManeuverClientPort');
