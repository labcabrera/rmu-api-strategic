import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, upstreamStatus } from '../../../shared/infrastructure/http/http-client';

import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { RealmClientPort, RealmResponse } from '../../application/ports/realm-client.port';

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
      if (upstreamStatus(err) === 404) return undefined;
      throw err;
    }
  }
}
