import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';

import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { ProfessionClientPort, Profession } from '../../application/ports/profession-client.port.js';

@Injectable()
export class ApiProfessionClientAdapter implements ProfessionClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  /** undefined when core has no such profession; any other failure is the HttpClient's error (502/504...). */
  async getProfessionById(professionId: string): Promise<Profession | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/professions/${encodeURIComponent(professionId)}`;
    try {
      return await this.httpClient.get<Profession>(uri, { token });
    } catch (err) {
      // F-strategic-12: only a 404 has a meaning of its own; the rest reaches the client as the HttpClient maps it.
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
