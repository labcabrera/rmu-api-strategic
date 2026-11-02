import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { SpellListClientPort, SpellResponse } from '../../application/ports/spell-list-client.port.js';
import type { SpellListInfo } from '../../domain/services/spells/spell-list-rules.js';

// A list has 25 levels at most (Spell Law): one page is enough
const MAX_SPELLS_PER_LIST = 100;

@Injectable()
export class ApiSpellListClientAdapter implements SpellListClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getSpellListByCode(code: string): Promise<SpellListInfo | undefined> {
    const query = encodeURIComponent(`code==${code}`);
    const page = await this.get<{ content: SpellListInfo[] }>(`/spell-lists?q=${query}&page=0&size=1`);
    return page.content[0];
  }

  async getSpellsByListId(spellListId: string): Promise<SpellResponse[]> {
    const query = encodeURIComponent(`spellListId==${spellListId}`);
    const page = await this.get<{ content: SpellResponse[] }>(`/spells?q=${query}&page=0&size=${MAX_SPELLS_PER_LIST}`);
    return [...page.content].sort((a, b) => a.level - b.level);
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.tokenService.getToken();
    const apiSpellsUri = this.configService.get('RMU_API_SPELLS_URI') as string;
    return this.httpClient.get<T>(`${apiSpellsUri}${path}`, { token });
  }
}
