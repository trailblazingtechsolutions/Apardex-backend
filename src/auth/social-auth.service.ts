import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { SocialAuthDto } from './dto/social-auth.dto';

@Injectable()
export class SocialAuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async googleAuth(
    dto: SocialAuthDto,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: dto.token,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired Google token');
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return this.authService.validateGoogleUser(
      {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatarUrl: payload.picture,
      },
      meta,
    );
  }
}
