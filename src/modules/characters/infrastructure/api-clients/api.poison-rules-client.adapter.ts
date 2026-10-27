import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadGatewayError, UnprocessableError } from '../../../shared/domain/errors/errors.js';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { PoisonRulesClientPort } from '../../application/ports/poison-rules-client.port.js';
import type { PoisonRrRules } from '../../domain/services/healing/poison-rr.js';
import type { PoisonSeverity, PoisonTables } from '../../domain/value-objects/poison.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

interface PsychologyTablesResponse {
  resistance?: { min: number | null; max: number | null; severity: PoisonSeverity }[];
  resistanceRoll?: { requiredTotal: number; attackLevelMultiplier: number };
}

/** Reads the psychology and poison tables of rmu-api-core with the service token and keeps them for a while. */
@Injectable()
export class ApiPoisonRulesClientAdapter implements PoisonRulesClientPort {
  private readonly logger = new Logger(ApiPoisonRulesClientAdapter.name);
  private rules: { value: PoisonRrRules; expiresAt: number } | null = null;
  private tables: { value: PoisonTables; expiresAt: number } | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getRrRules(): Promise<PoisonRrRules> {
    if (this.rules && Date.now() < this.rules.expiresAt) return this.rules.value;
    const data = await this.get<PsychologyTablesResponse>('psychology-tables');
    if (!data?.resistanceRoll || !Array.isArray(data.resistance)) {
      throw new UnprocessableError('Core has no psychology tables imported', 'err-psychology-tables-missing');
    }
    const value: PoisonRrRules = {
      requiredTotal: data.resistanceRoll.requiredTotal,
      attackLevelMultiplier: data.resistanceRoll.attackLevelMultiplier,
      bands: data.resistance.map(band => ({ min: band.min, max: band.max, severity: band.severity })),
    };
    this.rules = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  async getPoisonTables(): Promise<PoisonTables> {
    if (this.tables && Date.now() < this.tables.expiresAt) return this.tables.value;
    const data = await this.get<Partial<PoisonTables>>('poison-tables');
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (rows.length === 0) throw new UnprocessableError('Core has no poison tables imported', 'err-poison-tables-missing');
    this.tables = { value: { rows }, expiresAt: Date.now() + CACHE_TTL_MS };
    return this.tables.value;
  }

  private async get<T>(path: string): Promise<T> {
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/${path}`;
    try {
      return await this.httpClient.get<T>(uri, { token: await this.tokenService.getToken() });
    } catch (e) {
      this.logger.error(`Unable to read ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError(`The ${path} of core are not available`, 'err-core-tables-unavailable');
    }
  }
}
