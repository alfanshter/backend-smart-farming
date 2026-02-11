import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '../presentation/controllers/AuthController';
import { AuthUseCase } from '../domain/use-cases/AuthUseCase';
import { IUserRepository } from '../domain/interfaces/IUserRepository';
import { TimescaleUserRepository } from '../infrastructure/repositories/TimescaleUserRepository';
import { UserEntity } from '../infrastructure/database/entities/UserEntity';
import { JwtStrategy } from '../infrastructure/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../infrastructure/auth/strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthUseCase,
    {
      provide: IUserRepository,
      useClass: TimescaleUserRepository,
    },
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthUseCase],
})
export class AuthModule {}
