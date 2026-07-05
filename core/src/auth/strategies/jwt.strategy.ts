import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'chave_jwt_zeus_pro_super_secreta_2026',
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, tenantId: payload.tenantId, role: payload.role };
  }
}