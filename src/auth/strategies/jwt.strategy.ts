// src/auth/strategies/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // async validate(payload: JwtPayload) {
  //   await Promise.resolve(); // tránh eslint warning
  //   return { userId: payload.sub, username: payload.username };
  // }

  async validate(payload: JwtPayload) {
    console.log("JWT Payload:", payload); // Để kiểm tra payload
    return { userId: payload.sub};
  }
}
