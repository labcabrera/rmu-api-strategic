import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { BadGatewayError } from '../../../shared/domain/errors/errors.js';
import type { HealingTablesClientPort } from '../../application/ports/healing-tables-client.port.js';
import type { HealingTables } from '../../domain/value-objects/healing-tables.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Reads the healing tables from rmu-api-core with the service token and keeps them in memory for a while. */
@Injectable()
export class ApiHealingTablesClientAdapter implements HealingTablesClientPort {
  private readonly logger = new Logger(ApiHealingTablesClientAdapter.name);
  private cached: HealingTables | null = null;
  private expiresAt = 0;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getHealingTables(): Promise<HealingTables> {
    const now = Date.now();
    if (this.cached && now < this.expiresAt) return this.cached;
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/healing-tables`;
    try {
      const token = await this.tokenService.getToken();
      const data = await this.httpClient.get<HealingTables>(uri, { token });
      this.cached = data;
      this.expiresAt = now + CACHE_TTL_MS;
      return this.cached;
    } catch (e) {
      this.logger.error(`Unable to read the healing tables from ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Healing tables are not available', 'err-healing-tables-unavailable');
    }
  }
}
