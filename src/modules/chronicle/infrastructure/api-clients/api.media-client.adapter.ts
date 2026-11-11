import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { MediaClientPort } from '../../application/ports/media-client.port.js';

/** rmu-api-media with the service token, which carries rmu-admin: only it deletes by scope (spec 102, decision 4). */
@Injectable()
export class ApiMediaClientAdapter implements MediaClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async deleteImagesByScope(scope: string): Promise<number> {
    const token = await this.tokenService.getToken();
    const apiMediaUri = this.configService.get<string>('RMU_API_MEDIA_URI')!;
    const response = await this.httpClient.delete<{ deleted?: number } | undefined>(
      `${apiMediaUri}/images?scope=${encodeURIComponent(scope)}`,
      { token },
    );
    return response?.deleted ?? 0;
  }
}
