import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { MaterialClientPort, MaterialResponse } from '../../application/ports/material-client.port.js';

/** Superior materials of rmu-api-core (workspace spec 043). */
@Injectable()
export class ApiMaterialClientAdapter implements MaterialClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getMaterial(id: string): Promise<MaterialResponse | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/materials/${encodeURIComponent(id)}`;
    try {
      return await this.httpClient.get<MaterialResponse>(uri, { token });
    } catch (err) {
      // An unknown material is the client's mistake: the handler answers 400.
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
