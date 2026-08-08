import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../user/user.entity';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Authenticate first so request.user is populated.
    await super.canActivate(context);

    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: User }>();
    // Invited admins hold a temporary password — nothing else opens until they
    // replace it, so a shared invite password can't be used to work the dashboard.
    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'You must change your temporary password before using this account',
      );
    }

    return true;
  }
}
