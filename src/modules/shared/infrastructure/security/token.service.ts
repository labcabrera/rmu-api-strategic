import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../http/http-client';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.expiresAt) return this.token;

    const uri = this.configService.get<string>('RMU_IAM_TOKEN_URI')!;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.configService.get<string>('RMU_IAM_CLIENT_ID')!,
      client_secret: this.configService.get<string>('RMU_IAM_CLIENT_SECRET')!,
    });
    const data = await this.httpClient.post<TokenResponse>(uri, body);

    this.token = data.access_token;
    this.expiresAt = now + data.expires_in * 1000 - 10_000; // 10s offset
    return this.token;
  }
}
