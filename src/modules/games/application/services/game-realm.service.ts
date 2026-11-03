import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { GameAccess } from './game-access.service.js';
import { type RealmClientPort, type RealmResponse, REALM_CLIENT } from '../ports/realm-client.port.js';

/** The realm of a game must be one its owner reads (spec 071, decisions 1 and 3). */
@Injectable()
export class GameRealmService {
  constructor(@Inject(REALM_CLIENT) private readonly realmClient: RealmClientPort) {}

  /** The realm, when it exists and the user reads it (an admin reads every realm). */
  async checkReadable(realmId: string, userId: string, roles: string[]): Promise<RealmResponse> {
    const realm = await this.realmClient.getRealmById(realmId);
    if (!realm) throw new ValidationError('Realm not found');
    if (!(await this.isReadable(realmId, userId, roles))) {
      throw new ValidationError('You cannot read the realm of the game', 'realm-not-readable');
    }
    return realm;
  }

  async isReadable(realmId: string, userId: string, roles: string[]): Promise<boolean> {
    if (GameAccess.isAdmin(roles)) return true;
    const level = await this.realmClient.getUserAccess(realmId, userId);
    return !!level && level !== 'none';
  }
}
