import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { Race, RaceClientPort } from '../../application/ports/race-client.port.js';
import { toOptionalKey } from '../../../shared/domain/services/key.js';

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
    const race = await this.httpClient.get<Race>(uri, { token });
    // Core stores normalized keys since spec 050; races saved before keep their spelling until migrated
    return {
      ...race,
      skillBonuses: (race.skillBonuses || []).map(bonus => ({ ...bonus, specialization: toOptionalKey(bonus.specialization) })),
    };
  }
}
