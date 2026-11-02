import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  providers: [JwtStrategy],
})
export class AuthModule {}
