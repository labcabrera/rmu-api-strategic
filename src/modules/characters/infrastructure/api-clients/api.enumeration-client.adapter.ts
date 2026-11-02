import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { EnumerationClientPort } from '../../application/ports/enumeration-client.port.js';

@Injectable()
export class ApiEnumerationClientAdapter implements EnumerationClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getKeys(category: string, realmId: string | null): Promise<string[]> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const scope = realmId ? `(realmId==${realmId},realmId==null)` : 'realmId==null';
    const q = encodeURIComponent(`category==${category};${scope}`);
    // Catalogs are loaded whole: up to 1000 per page
    const page = await this.httpClient.get<{ content: { key: string }[] }>(`${apiCoreUri}/enumerations?q=${q}&page=0&size=1000`, {
      token,
    });
    return page.content.map(enumeration => enumeration.key);
  }
}
