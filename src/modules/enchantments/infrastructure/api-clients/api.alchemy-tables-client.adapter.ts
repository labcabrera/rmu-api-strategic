import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { AlchemyTablesClientPort } from '../../application/ports/alchemy-tables-client.port.js';
import type { AlchemyTables } from '../../domain/value-objects/alchemy.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Alchemy tables of rmu-api-spells (workspace specs 064 and 096), read with the service token and kept in process for a while. */
@Injectable()
export class ApiAlchemyTablesClientAdapter implements AlchemyTablesClientPort {
  private cache: { value: AlchemyTables | null; expiresAt: number } | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getAlchemyTables(): Promise<AlchemyTables | null> {
    if (this.cache && Date.now() < this.cache.expiresAt) return this.cache.value;
    const uri = `${this.configService.get('RMU_API_SPELLS_URI') as string}/alchemy-tables`;
    let value: AlchemyTables | null;
    try {
      const data = await this.httpClient.get<Partial<AlchemyTables>>(uri, { token: await this.tokenService.getToken() });
      value = { failureTables: data?.failureTables ?? {}, powerLevels: data?.powerLevels ?? {} };
    } catch (err) {
      // 404 alchemy-tables-not-found: not imported
      if (!(isUpstreamHttpError(err) && err.status === 404)) throw err;
      value = null;
    }
    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }
}
