import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { SkillClientPort, SkillResponse } from '../../application/ports/skill-client.port';
import { Page } from 'src/modules/shared/domain/entities/page.entity';

@Injectable()
export class ApiSkillClientAdapter implements SkillClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getAllSkills(): Promise<Page<SkillResponse>> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills?page=0&size=1000`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as Page<SkillResponse>;
  }

  async getSkillById(skillId: string): Promise<SkillResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills/${skillId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillResponse;
  }
}
