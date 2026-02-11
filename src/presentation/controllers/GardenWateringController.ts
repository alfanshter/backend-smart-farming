// ===================================================================
// GARDEN WATERING CONTROLLER
// ===================================================================
// Purpose: REST API endpoints for garden watering system
// Author: Smart Farming Team
// Date: February 11, 2026

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { GardenWateringUseCase } from '../../domain/use-cases/GardenWateringUseCase';
import {
  StartGardenWateringDto,
  StopGardenWateringDto,
} from '../../application/dtos/GardenWateringDto';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../../domain/entities/User';

@Controller('garden-watering')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GardenWateringController {
  constructor(
    private readonly gardenWateringUseCase: GardenWateringUseCase,
  ) {}

  // ===== START GARDEN WATERING =====
  @Post('start')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async startGardenWatering(
    @Request() req: any,
    @Body() dto: StartGardenWateringDto,
  ) {
    const session = await this.gardenWateringUseCase.startGardenWatering(
      req.user.userId,
      dto.durationMinutes,
      dto.notes,
    );

    return {
      success: true,
      message: `Penyiraman kebun dimulai untuk ${dto.durationMinutes} menit`,
      data: session,
    };
  }

  // ===== STOP GARDEN WATERING =====
  @Post('stop')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async stopGardenWatering(
    @Request() req: any,
    @Body() dto: StopGardenWateringDto,
  ) {
    const session = await this.gardenWateringUseCase.stopGardenWatering(
      req.user.userId,
      dto.notes,
    );

    return {
      success: true,
      message: 'Penyiraman kebun dihentikan',
      data: session,
    };
  }

  // ===== GET CURRENT SESSION =====
  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getCurrentSession(@Request() req: any) {
    const session = await this.gardenWateringUseCase.getCurrentSession(
      req.user.userId,
    );

    if (!session) {
      return {
        success: true,
        message: 'Tidak ada penyiraman kebun yang sedang berjalan',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Penyiraman kebun sedang berjalan',
      data: session,
    };
  }

  // ===== GET HISTORY =====
  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getHistory(@Request() req: any, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    const history = await this.gardenWateringUseCase.getHistory(
      req.user.userId,
      limitNumber,
    );

    return {
      success: true,
      message: 'Riwayat penyiraman kebun berhasil diambil',
      data: history,
      count: history.length,
    };
  }

  // ===== GET STATISTICS =====
  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async getStatistics(@Request() req: any) {
    const stats = await this.gardenWateringUseCase.getStatistics(
      req.user.userId,
    );

    return {
      success: true,
      message: 'Statistik penyiraman kebun berhasil diambil',
      data: stats,
    };
  }
}
