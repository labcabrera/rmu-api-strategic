import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { TradingTablesClientPort } from '../../application/ports/trading-tables-client.port.js';
import type { TradingTables } from '../../domain/value-objects/trading-tables.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Trading tables of rmu-api-core (workspace spec 048), read with the service token and kept for a while. */
@Injectable()
export class ApiTradingTablesClientAdapter implements TradingTablesClientPort {
  private cache: { value: TradingTables | null; expiresAt: number } | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getTradingTables(): Promise<TradingTables | null> {
    if (this.cache && Date.now() < this.cache.expiresAt) return this.cache.value;
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/trading-tables`;
    let value: TradingTables | null;
    try {
      const data = await this.httpClient.get<Partial<TradingTables>>(uri, { token: await this.tokenService.getToken() });
      value =
        Array.isArray(data?.negotiation) && data.negotiation.length > 0
          ? { negotiation: data.negotiation, priceFactors: data.priceFactors ?? [] }
          : null;
    } catch (err) {
      // Not imported: the Trading rule of Core Law
      if (!(isUpstreamHttpError(err) && err.status === 404)) throw err;
      value = null;
    }
    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }
}
