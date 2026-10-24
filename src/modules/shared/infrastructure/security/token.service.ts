import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readBody, sendRequest, upstreamError } from '../http/http-client.js';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * The service token of this API (client credentials of RMU_IAM_CLIENT_ID), cached until 10 s before it expires.
 * Callers of other APIs send it when the request is not on behalf of a user.
 */
@Injectable()
export class TokenService {
  private token: string | null = null;
  private expiresAt = 0;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = Number(configService.get<number>('RMU_HTTP_TIMEOUT_MS') ?? 10_000);
  }

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.expiresAt) return this.token;

    const uri = this.configService.get<string>('RMU_IAM_TOKEN_URI')!;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.configService.get<string>('RMU_IAM_CLIENT_ID')!,
      client_secret: this.configService.get<string>('RMU_IAM_CLIENT_SECRET')!,
    });
    // A form (fetch sets application/x-www-form-urlencoded); a failure reports Keycloak's answer.
    const response = await sendRequest(uri, { method: 'POST', headers: { Accept: 'application/json' }, body }, this.timeoutMs);
    const data = await readBody(response);
    if (!response.ok) throw upstreamError(uri, response.status, response.statusText, data);
    const { access_token, expires_in } = data as TokenResponse;

    this.token = access_token;
    this.expiresAt = now + expires_in * 1000 - 10_000; // 10s offset
    return this.token;
  }
}
