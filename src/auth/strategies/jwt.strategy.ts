import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    tokenVersion?: number;
    sessionId?: string | null;
  }) {
    const user = await this.userService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    if (payload.sessionId) {
      const session = await this.userService.findActiveSession(payload.sessionId);
      if (!session) {
        throw new UnauthorizedException('Session expired, please log in again');
      }
      // fire-and-forget — don't block the request
      void this.userService.touchSession(payload.sessionId);
      user.currentSessionId = payload.sessionId;
    }

    return user;
  }
}
