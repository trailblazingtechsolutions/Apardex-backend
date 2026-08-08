import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowWhilePasswordChangeRequired';

/**
 * Marks a route as reachable by an account that still has `mustChangePassword`
 * set — i.e. the change-password routes themselves, plus logout. Every other
 * authenticated route is blocked by JwtAuthGuard until the password is changed.
 */
export const AllowWhilePasswordChangeRequired = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);
