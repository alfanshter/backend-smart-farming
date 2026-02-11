/**
 * DOMAIN - Auth Types
 *
 * Penjelasan:
 * Type definitions untuk authentication
 */

export namespace Auth {
  export interface JwtPayload {
    sub: string; // User ID
    email: string;
    role: string;
    iat?: number; // Issued at
    exp?: number; // Expiration
  }
}
