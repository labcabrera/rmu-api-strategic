import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { Culture, CultureClientPort } from '../../application/ports/culture-client.port';

@Injectable()
export class ApiCultureClientAdapter implements CultureClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getCultureById(cultureId: string): Promise<Culture> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/cultures/${cultureId}`;
    return this.httpClient.get<Culture>(uri, { token });
  }
}
