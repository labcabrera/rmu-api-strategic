import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { SkillClientPort, SkillResponse } from '../../application/ports/skill-client.port';
import { Page } from '../../../shared/application/pagination/page';

@Injectable()
export class ApiSkillClientAdapter implements SkillClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getAllSkills(): Promise<Page<SkillResponse>> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills?page=0&size=1000`;
    return this.httpClient.get<Page<SkillResponse>>(uri, { token });
  }

  async getSkillById(skillId: string): Promise<SkillResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills/${skillId}`;
    return this.httpClient.get<SkillResponse>(uri, { token });
  }
}
