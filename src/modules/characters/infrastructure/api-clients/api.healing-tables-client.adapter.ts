import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { BadGatewayError } from '../../../shared/domain/errors/errors';
import { HealingTablesClientPort } from '../../application/ports/healing-tables-client.port';
import { HealingTables } from '../../domain/value-objects/healing-tables.vo';

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
  ) {}

  async getHealingTables(): Promise<HealingTables> {
    const now = Date.now();
    if (this.cached && now < this.expiresAt) return this.cached;
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/healing-tables`;
    try {
      const token = await this.tokenService.getToken();
      const response = await axios.get<HealingTables>(uri, { headers: { Authorization: `Bearer ${token}` } });
      this.cached = response.data;
      this.expiresAt = now + CACHE_TTL_MS;
      return this.cached;
    } catch (e) {
      this.logger.error(`Unable to read the healing tables from ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Healing tables are not available', 'err-healing-tables-unavailable');
    }
  }
}
