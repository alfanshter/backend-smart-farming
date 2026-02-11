/**
 * DOMAIN - JWT Payload Interface
 *
 * Penjelasan:
 * Interface untuk JWT token payload dengan type-safe user.sub
 */

export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
}
