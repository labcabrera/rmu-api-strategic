export type UserRole = 'rmu-admin' | 'rmu-user' | 'rmu-service';

export const RMU_ADMIN: UserRole = 'rmu-admin';
export const RMU_USER: UserRole = 'rmu-user';
/** Internal role of the tokens issued to the API client (service to service calls), not a Keycloak group. */
export const RMU_SERVICE: UserRole = 'rmu-service';
