import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Patch,
} from '@nestjs/common';
import {
  AuthUseCase,
  AuthResponse,
  AuthTokens,
} from '../../domain/use-cases/AuthUseCase';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
} from '../../application/dtos/AuthDto';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../infrastructure/auth/guards/jwt-refresh.guard';
import { CurrentUser } from '../../infrastructure/auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../infrastructure/auth/decorators/current-user.decorator';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { UserRole } from '../../domain/entities/User';

@Controller('auth')
export class AuthController {
  constructor(private readonly authUseCase: AuthUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authUseCase.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authUseCase.login(dto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: CurrentUserData): Promise<AuthTokens> {
    if (!user.refreshToken) {
      throw new Error('Refresh token tidak ditemukan');
    }
    return this.authUseCase.refreshTokens(user.userId, user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('userId') userId: string): Promise<{
    message: string;
  }> {
    await this.authUseCase.logout(userId);
    return { message: 'Logout berhasil' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: CurrentUserData) {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authUseCase.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return { message: 'Password berhasil diubah' };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { message: 'Hanya admin yang bisa mengakses endpoint ini' };
  }
}
