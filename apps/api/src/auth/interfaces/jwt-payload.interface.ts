import type { Role } from '../../common/enums/role.enum';

/**
 * Claims carried by a PeopleLens access token.
 *
 * Produced at sign-in (Phase 2) and consumed by `JwtStrategy.validate`.
 * Keep claims minimal and non-sensitive — anything beyond identity + roles is
 * looked up from the database per request.
 */
export interface JwtPayload {
  /** Subject — the user's stable identifier. */
  sub: string;
  email: string;
  roles: Role[];
}
