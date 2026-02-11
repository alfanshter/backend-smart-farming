import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FlushingUseCase } from '../../domain/use-cases/FlushingUseCase';
import {
  StartFlushingDto,
  StopFlushingDto,
} from '../../application/dtos/FlushingDto';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../../domain/entities/User';

@Controller('flushing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FlushingController {
  constructor(private readonly flushingUseCase: FlushingUseCase) {}

  // ===== START FLUSHING =====
  @Post('start')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async startFlushing(@Request() req: any, @Body() dto: StartFlushingDto) {
    const session = await this.flushingUseCase.startFlushing(
      req.user.userId,
      dto.durationMinutes,
      dto.notes,
    );

    return {
      success: true,
      message: `Flushing dimulai untuk ${dto.durationMinutes} menit`,
      data: session,
    };
  }

  // ===== STOP FLUSHING =====
  @Post('stop')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async stopFlushing(@Request() req: any, @Body() dto: StopFlushingDto) {
    const session = await this.flushingUseCase.stopFlushing(
      req.user.userId,
      dto.notes,
    );

    return {
      success: true,
      message: 'Flushing dihentikan',
      data: session,
    };
  }

  // ===== GET CURRENT SESSION =====
  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getCurrentSession(@Request() req: any) {
    const session = await this.flushingUseCase.getCurrentSession(req.user.userId);

    if (!session) {
      return {
        success: true,
        message: 'Tidak ada flushing yang sedang berjalan',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Flushing sedang berjalan',
      data: session,
    };
  }

  // ===== GET HISTORY =====
  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getHistory(@Request() req: any, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    const history = await this.flushingUseCase.getHistory(
      req.user.userId,
      limitNumber,
    );

    return {
      success: true,
      message: 'Riwayat flushing berhasil diambil',
      data: history,
      count: history.length,
    };
  }

  // ===== GET STATISTICS =====
  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getStatistics(@Request() req: any) {
    const stats = await this.flushingUseCase.getStatistics(req.user.userId);

    return {
      success: true,
      message: 'Statistik flushing berhasil diambil',
      data: stats,
    };
  }
}
