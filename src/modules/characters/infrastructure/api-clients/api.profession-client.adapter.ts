import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';

import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { ProfessionClientPort, Profession } from '../../application/ports/profession-client.port';

@Injectable()
export class ApiProfessionClientAdapter implements ProfessionClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getProfessionById(professionId: string): Promise<Profession> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/professions/${professionId}`;
    try {
      return await this.httpClient.get<Profession>(uri, { token });
    } catch (err) {
      // Any failure answers 500 with the upstream error in the text, as with axios (F-strategic-12)
      throw new Error(`Error fetching profession ${professionId}: ${String(err)}`);
    }
  }
}
