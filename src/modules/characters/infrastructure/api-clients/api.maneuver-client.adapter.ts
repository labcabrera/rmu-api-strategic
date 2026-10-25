import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { BadGatewayError } from '../../../shared/domain/errors/errors.js';
import type {
  AbsoluteManeuverResponse,
  ManeuverClientPort,
  PercentManeuverResponse,
} from '../../application/ports/maneuver-client.port.js';

@Injectable()
export class ApiManeuverClientAdapter implements ManeuverClientPort {
  private readonly logger = new Logger(ApiManeuverClientAdapter.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async absolute(roll: number, table: string, unusualEvent = false): Promise<AbsoluteManeuverResponse> {
    const params = new URLSearchParams({ roll: String(roll), table, ...(unusualEvent ? { unusualEvent: 'true' } : {}) });
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/maneuvers/absolute?${params.toString()}`;
    try {
      const token = await this.tokenService.getToken();
      const data = await this.httpClient.get<AbsoluteManeuverResponse>(uri, { token });
      return {
        result: data.result,
        message: data.message,
        effects: data.effects ?? [],
        ...(data.unusualEvent ? { unusualEvent: data.unusualEvent } : {}),
      };
    } catch (e) {
      this.logger.error(`Unable to resolve the maneuver ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Maneuver resolution is not available', 'err-maneuver-unavailable');
    }
  }

  async percent(roll: number): Promise<PercentManeuverResponse> {
    const params = new URLSearchParams({ roll: String(roll) });
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/maneuvers/percent?${params.toString()}`;
    try {
      const token = await this.tokenService.getToken();
      const data = await this.httpClient.get<PercentManeuverResponse>(uri, { token });
      return { percent: data.percent ?? 0, message: data.message };
    } catch (e) {
      this.logger.error(`Unable to resolve the maneuver ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Maneuver resolution is not available', 'err-maneuver-unavailable');
    }
  }
}
