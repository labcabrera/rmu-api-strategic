import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { TreasureTablesClientPort } from '../../application/ports/treasure-tables-client.port.js';
import type { TreasureTables } from '../../domain/value-objects/treasure-tables.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Treasure tables of rmu-api-core (workspace spec 067), read with the service token and kept in process for a while,
 * like the alchemy tables of workspace spec 064.
 */
@Injectable()
export class ApiTreasureTablesClientAdapter implements TreasureTablesClientPort {
  private cache: { value: TreasureTables | null; expiresAt: number } | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getTreasureTables(): Promise<TreasureTables | null> {
    if (this.cache && Date.now() < this.cache.expiresAt) return this.cache.value;
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/treasure-tables`;
    let value: TreasureTables | null;
    try {
      value = await this.httpClient.get<TreasureTables>(uri, { token: await this.tokenService.getToken() });
    } catch (err) {
      // 404 treasure-tables-not-found: not imported
      if (!(isUpstreamHttpError(err) && err.status === 404)) throw err;
      value = null;
    }
    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }
}
