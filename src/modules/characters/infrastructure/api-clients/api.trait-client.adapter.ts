import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { TraitClientPort, TraitResponse } from '../../application/ports/trait-client.port';

@Injectable()
export class ApiTraitClientAdapter implements TraitClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getTraitById(traitId: string): Promise<TraitResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/traits/${traitId}`;
    return this.httpClient.get<TraitResponse>(uri, { token });
  }
}
