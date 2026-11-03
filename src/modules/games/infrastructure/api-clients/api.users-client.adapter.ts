import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import type { Friend, UsersClientPort } from '../../application/ports/users-client.port.js';

/** The fields of the FriendshipDto of users that strategic reads. */
interface UsersFriendship {
  requesterId: string;
  requesterName: string;
  addresseeId: string;
  addresseeName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
}

/**
 * rmu-api-users with the service token (spec 071): `GET /friendships/between/:a/:b` and `GET /users/:id`. A 404 is no
 * friendship or no user; any other failure is the HttpClient's error (502/504), so nobody joins a game on a guess.
 */
@Injectable()
export class ApiUsersClientAdapter implements UsersClientPort {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async findAcceptedFriend(userA: string, userB: string): Promise<Friend | null> {
    const uri = `${this.base()}/friendships/between/${encodeURIComponent(userA)}/${encodeURIComponent(userB)}`;
    const friendship = await this.getOrNull<UsersFriendship>(uri);
    if (!friendship || friendship.status !== 'accepted') return null;
    if (friendship.requesterId === userB) return { userId: userB, userName: friendship.requesterName };
    if (friendship.addresseeId === userB) return { userId: userB, userName: friendship.addresseeName };
    return null;
  }

  async findUserName(userId: string): Promise<string | null> {
    const user = await this.getOrNull<{ name: string }>(`${this.base()}/users/${encodeURIComponent(userId)}`);
    return user?.name ?? null;
  }

  private base(): string {
    return this.configService.get<string>('RMU_API_USERS_URI') as string;
  }

  private async getOrNull<T>(uri: string): Promise<T | null> {
    const token = await this.tokenService.getToken();
    try {
      return await this.httpClient.get<T>(uri, { token });
    } catch (err) {
      if (isUpstreamHttpError(err) && err.status === 404) return null;
      throw err;
    }
  }
}
