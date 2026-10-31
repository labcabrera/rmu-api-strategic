import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { NpcClientPort, NpcResponse } from '../../application/ports/npc-client.port.js';

/** Reads NPCs with the service token, which reads the private ones too (workspace spec 055). */
@Injectable()
export class ApiNpcClientAdapter implements NpcClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getNpcById(npcId: string): Promise<NpcResponse | undefined> {
    const token = await this.tokenService.getToken();
    const apiNpcsUri = this.configService.get('RMU_API_NPCS_URI') as string;
    const uri = `${apiNpcsUri}/npcs/${encodeURIComponent(npcId)}`;
    try {
      return await this.httpClient.get<NpcResponse>(uri, { token });
    } catch (err) {
      // An unknown NPC is the client's mistake: the faction answers 400.
      if (isUpstreamHttpError(err) && err.status === 404) return undefined;
      throw err;
    }
  }
}
