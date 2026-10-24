import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../shared/infrastructure/http/http-client';
import { TokenService } from '../../../shared/infrastructure/security/token.service';
import { SkillCategoryClientPort, SkillCategoryResponse } from '../../application/ports/skill-category-client.port';

@Injectable()
export class ApiSkillCategoryClientAdapter implements SkillCategoryClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skill-categories/${categoryId}`;
    return this.httpClient.get<SkillCategoryResponse>(uri, { token });
  }

  async getAllSkillCategories(): Promise<SkillCategoryResponse[]> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skill-categories?page=0&size=100`;
    const page = await this.httpClient.get<{ content: SkillCategoryResponse[] }>(uri, { token });
    return page.content;
  }
}
