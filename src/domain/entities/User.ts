export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  FARMER = 'farmer',
}

export class User {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
