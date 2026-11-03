import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { RealmAccessLevel, RealmClientPort, RealmResponse } from '../../application/ports/realm-client.port.js';

@Injectable()
export class ApiRealmClientAdapter implements RealmClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getRealmById(realmId: string): Promise<RealmResponse | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/realms/${realmId}`;
    try {
      return await this.httpClient.get<RealmResponse>(uri, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }

  /** `GET /realms/:id/access/:userId` of core with the service token (spec 071). */
  async getUserAccess(realmId: string, userId: string): Promise<RealmAccessLevel | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/realms/${encodeURIComponent(realmId)}/access/${encodeURIComponent(userId)}`;
    try {
      return (await this.httpClient.get<{ level: RealmAccessLevel }>(uri, { token })).level;
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
