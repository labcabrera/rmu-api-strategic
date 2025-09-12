import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from 'src/modules/auth/token.service';
import { ProfessionClientPort, ProfessionResponse } from '../../application/ports/profession-client.port';

@Injectable()
export class ApiProfessionClientAdapter implements ProfessionClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getProfessionById(professionId: string): Promise<ProfessionResponse | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/professions/${professionId}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as ProfessionResponse;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
}
