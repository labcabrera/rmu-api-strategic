import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { RaceClientPort } from '../../application/ports/race-client.port.js';

@Injectable()
export class ApiRaceClientAdapter implements RaceClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getRaceById(raceId: string): Promise<any> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/races/${raceId}`;
    return this.httpClient.get(uri, { token });
  }
}
