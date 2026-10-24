import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { BadGatewayError } from '../../../shared/domain/errors/errors';
import { AbsoluteManeuverResponse, ManeuverClientPort } from '../../application/ports/maneuver-client.port';

@Injectable()
export class ApiManeuverClientAdapter implements ManeuverClientPort {
  private readonly logger = new Logger(ApiManeuverClientAdapter.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async absolute(roll: number, table: string): Promise<AbsoluteManeuverResponse> {
    const params = new URLSearchParams({ roll: String(roll), table });
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/maneuvers/absolute?${params.toString()}`;
    try {
      const token = await this.tokenService.getToken();
      const data = await this.httpClient.get<AbsoluteManeuverResponse>(uri, { token });
      return { result: data.result, message: data.message, effects: data.effects ?? [] };
    } catch (e) {
      this.logger.error(`Unable to resolve the maneuver ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Maneuver resolution is not available', 'err-maneuver-unavailable');
    }
  }
}
