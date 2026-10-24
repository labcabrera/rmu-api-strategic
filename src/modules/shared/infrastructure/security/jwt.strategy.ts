/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { RMU_SERVICE } from '../../domain/entities/user-roles';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly serviceClientId: string | undefined;

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get<string>('RMU_IAM_JWK_URI')!,
      }),
      issuer: configService.get<string>('RMU_IAM_ISSUER_URI')!,
      audience: configService.get<string>('RMU_IAM_AUDIENCE')!,
      algorithms: ['RS256'],
    });
    this.serviceClientId = configService.get<string>('RMU_IAM_CLIENT_ID');
  }

  validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.preferred_username,
      given_name: payload.given_name,
      family_name: payload.family_name,
      roles: this.resolveRoles(payload),
    };
  }

  // Tokens issued to the confidential client of the APIs (client credentials) belong to another service:
  // they get the internal role rmu-service on top of the groups of the service account
  private resolveRoles(payload: any): string[] {
    const groups: string[] = payload.groups || [];
    const isService = !!this.serviceClientId && payload.azp === this.serviceClientId;
    return isService && !groups.includes(RMU_SERVICE) ? [...groups, RMU_SERVICE] : groups;
  }
}
