import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { SkillCategoryClientPort, SkillCategoryResponse } from '../../application/ports/skill-category-client.port';

@Injectable()
export class ApiSkillCategoryClientAdapter implements SkillCategoryClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skill-categories/${categoryId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillCategoryResponse;
  }

  async getAllSkillCategories(): Promise<SkillCategoryResponse[]> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skill-categories?page=0&size=100`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.content as SkillCategoryResponse[];
  }
}
