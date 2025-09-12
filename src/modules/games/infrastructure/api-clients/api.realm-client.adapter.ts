import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { RealmClientPort, RealmResponse } from '../../application/ports/realm-client.port';

@Injectable()
export class ApiRealmClientAdapter implements RealmClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getRealmById(realmId: string): Promise<RealmResponse | undefined> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/realms/${realmId}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as RealmResponse;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          return undefined;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
}
