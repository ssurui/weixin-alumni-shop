import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'xq-secret-2026'),
    });
  }

  async validate(payload: { sub: string; openid: string }) {
    const user = await this.authService.findUserById(BigInt(payload.sub));
    if (!user || user.status === 0) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return user;
  }
}
