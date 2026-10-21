import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from 'src/modules/auth/token.service';
import { BadGatewayError } from 'src/modules/shared/domain/errors/errors';
import { AbsoluteManeuverResponse, ManeuverClientPort } from '../../application/ports/maneuver-client.port';

@Injectable()
export class ApiManeuverClientAdapter implements ManeuverClientPort {
  private readonly logger = new Logger(ApiManeuverClientAdapter.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async absolute(roll: number, table: string): Promise<AbsoluteManeuverResponse> {
    const params = new URLSearchParams({ roll: String(roll), table });
    const uri = `${this.configService.get('RMU_API_CORE_URI') as string}/maneuvers/absolute?${params.toString()}`;
    try {
      const token = await this.tokenService.getToken();
      const response = await axios.get<AbsoluteManeuverResponse>(uri, { headers: { Authorization: `Bearer ${token}` } });
      const data = response.data;
      return { result: data.result, message: data.message, effects: data.effects ?? [] };
    } catch (e) {
      this.logger.error(`Unable to resolve the maneuver ${uri}: ${(e as Error).message}`);
      throw new BadGatewayError('Maneuver resolution is not available', 'err-maneuver-unavailable');
    }
  }
}
