import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { ItemClientPort, ItemResponse } from '../../application/ports/item-client.port';
import { BadGatewayError, NotFoundError } from 'src/modules/shared/domain/errors';

@Injectable()
export class ItemApiClient implements ItemClientPort {
  private readonly logger = new Logger(ItemApiClient.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getItemById(itemId: string): Promise<ItemResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_ITEMS_URI') as string;
    const uri = `${apiCoreUri}/items/${itemId}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as ItemResponse;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          this.logger.error(`Item API is not available at ${uri}. Error code: ${err.code}`);
          throw new BadGatewayError('Item API is not available');
        } else if (err.response && err.response.status) {
          this.logger.error(`Item API return status ${err.response.status} at ${uri}. Error code: ${err.code}`);
          switch (err.response.status) {
            case 404:
              throw new NotFoundError('Item', itemId);
            default:
              break;
          }
        }
      }
      throw err;
    }
  }
}
