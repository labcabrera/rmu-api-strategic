import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { BadGatewayError } from '../../../shared/domain/errors/errors.js';
import type { FightingStylesClientPort } from '../../application/ports/fighting-styles-client.port.js';
import type { FightingStyleCatalog } from '../../domain/value-objects/fighting-styles.vo.js';

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Reads the fighting styles from rmu-api-core with the service token and keeps them in memory for a while. */
@Injectable()
export class ApiFightingStylesClientAdapter implements FightingStylesClientPort {
  private readonly logger = new Logger(ApiFightingStylesClientAdapter.name);
  private cached: FightingStyleCatalog | null = null;
  private expiresAt = 0;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getFightingStyles(): Promise<FightingStyleCatalog> {
    const now = Date.now();
    if (this.cached && now < this.expiresAt) return this.cached;
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/fighting-styles`;
    try {
      const token = await this.tokenService.getToken();
      const data = await this.httpClient.get<FightingStyleCatalog>(uri, { token });
      this.cached = data;
      this.expiresAt = now + CACHE_TTL_MS;
      return this.cached;
    } catch (e) {
      this.logger.error(`Unable to read the fighting styles from ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Fighting styles are not available', 'err-fighting-styles-unavailable');
    }
  }
}
