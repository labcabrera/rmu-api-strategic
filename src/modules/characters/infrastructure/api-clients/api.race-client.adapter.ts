import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';

import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { RaceClientPort } from '../../application/ports/race-client.port';

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
