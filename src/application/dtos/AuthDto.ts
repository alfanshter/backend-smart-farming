import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '../../domain/entities/User';

export class RegisterDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  @IsNotEmpty({ message: 'Email harus diisi' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password harus diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password harus mengandung huruf besar, huruf kecil, dan angka/simbol',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap harus diisi' })
  fullName: string;

  @IsEnum(UserRole, { message: 'Role tidak valid' })
  @IsOptional()
  role?: UserRole;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  @IsNotEmpty({ message: 'Email harus diisi' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password harus diisi' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token harus diisi' })
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password lama harus diisi' })
  oldPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Password baru harus diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password harus mengandung huruf besar, huruf kecil, dan angka/simbol',
  })
  newPassword: string;
}
