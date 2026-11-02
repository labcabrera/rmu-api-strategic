import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { ItemClientPort, ItemResponse } from '../../application/ports/item-client.port.js';

@Injectable()
export class ApiItemClientAdapter implements ItemClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getItemById(itemId: string): Promise<ItemResponse | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_ITEMS_URI') as string;
    const uri = `${apiCoreUri}/items/${encodeURIComponent(itemId)}`;
    try {
      return await this.httpClient.get<ItemResponse>(uri, { token });
    } catch (err) {
      // An unknown item type is the client's mistake: the handler answers 400 (F-strategic-19).
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
