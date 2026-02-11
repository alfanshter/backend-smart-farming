/**
 * PRESENTATION - Zone Controller
 *
 * Penjelasan:
 * REST API endpoints untuk kontrol manual zona penyiraman
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ZoneControlUseCase } from '../../domain/use-cases/ZoneControlUseCase';
import type { IZoneRepository } from '../../domain/interfaces/IZoneRepository';
import {
  CreateZoneDto,
  UpdateZoneDto,
  ControlZoneDto,
  ZoneStatusResponseDto,
} from '../../application/dtos/ZoneDto';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/decorators/current-user.decorator';
import { UserRole } from '../../domain/entities/User';
import { Zone } from '../../domain/entities/Zone';
import { v4 as uuidv4 } from 'uuid';

@Controller('zones')
@UseGuards(JwtAuthGuard)
export class ZoneController {
  constructor(
    private readonly zoneControlUseCase: ZoneControlUseCase,
    @Inject('IZoneRepository')
    private readonly zoneRepository: IZoneRepository,
  ) {}

  /**
   * POST /zones - Create new zone
   * Required: Admin or Farmer
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async createZone(
    @Body() dto: CreateZoneDto,
    @CurrentUser() user: any, // JWT payload dengan user.sub (userId)
  ): Promise<Zone> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId: string = user.sub;

    const zone: Zone = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      deviceId: dto.deviceId,
      isActive: false,
      durationMinutes: dto.durationMinutes,
      durationSeconds: dto.durationSeconds,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.zoneRepository.create(zone);
  }

  /**
   * GET /zones - Get all zones
   * Required: Any authenticated user
   */
  @Get()
  async getAllZones(): Promise<Zone[]> {
    return await this.zoneRepository.findAll();
  }

  /**
   * GET /zones/my - Get user's zones
   * Required: Any authenticated user
   */
  @Get('my')
  async getMyZones(
    @CurrentUser() user: any, // JWT payload
  ): Promise<Zone[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId: string = user.sub;
    return await this.zoneRepository.findByUserId(userId);
  }

  /**
   * GET /zones/active - Get all active zones
   * Required: Any authenticated user
   */
  @Get('active')
  async getActiveZones(): Promise<ZoneStatusResponseDto[]> {
    const statuses = await this.zoneControlUseCase.getActiveZones();

    return statuses.map((status) => ({
      zoneId: status.zoneId,
      name: status.name,
      isActive: status.isActive,
      totalDurationSeconds: status.totalDurationSeconds,
      remainingSeconds: status.remainingSeconds,
      elapsedSeconds: status.elapsedSeconds,
      startedAt: status.startedAt,
      estimatedEndTime: status.estimatedEndTime,
      message: `Zone is active with ${status.remainingSeconds}s remaining`,
    }));
  }

  /**
   * GET /zones/:id - Get zone by ID
   * Required: Any authenticated user
   */
  @Get(':id')
  async getZoneById(@Param('id') id: string): Promise<Zone> {
    const zone = await this.zoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    return zone;
  }

  /**
   * GET /zones/:id/status - Get zone status with countdown
   * Required: Any authenticated user
   */
  @Get(':id/status')
  async getZoneStatus(@Param('id') id: string): Promise<ZoneStatusResponseDto> {
    const status = await this.zoneControlUseCase.getZoneStatus(id);

    return {
      zoneId: status.zoneId,
      name: status.name,
      isActive: status.isActive,
      totalDurationSeconds: status.totalDurationSeconds,
      remainingSeconds: status.remainingSeconds,
      elapsedSeconds: status.elapsedSeconds,
      startedAt: status.startedAt,
      estimatedEndTime: status.estimatedEndTime,
      message: status.isActive
        ? `Zone is active. Remaining: ${Math.floor(status.remainingSeconds / 60)}m ${status.remainingSeconds % 60}s`
        : 'Zone is not active',
    };
  }

  /**
   * PUT /zones/:id - Update zone configuration
   * Required: Admin or Farmer
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
  ): Promise<Zone> {
    const zone = await this.zoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return await this.zoneRepository.update(id, {
      ...dto,
      updatedAt: new Date(),
    });
  }

  /**
   * POST /zones/control - Control zone (start/stop watering)
   * Required: Admin or Farmer
   */
  @Post('control')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async controlZone(
    @Body() dto: ControlZoneDto,
    @CurrentUser() user: any, // JWT payload dengan user.sub
  ): Promise<ZoneStatusResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId: string = user.sub;

    const status = await this.zoneControlUseCase.controlZone(
      dto.zoneId,
      dto.isActive,
      userId,
      dto.durationMinutes,
      dto.durationSeconds,
    );

    return {
      zoneId: status.zoneId,
      name: status.name,
      isActive: status.isActive,
      totalDurationSeconds: status.totalDurationSeconds,
      remainingSeconds: status.remainingSeconds,
      elapsedSeconds: status.elapsedSeconds,
      startedAt: status.startedAt,
      estimatedEndTime: status.estimatedEndTime,
      message: status.isActive
        ? `Zone ${status.name} activated for ${Math.floor(status.totalDurationSeconds / 60)}m ${status.totalDurationSeconds % 60}s`
        : `Zone ${status.name} deactivated`,
    };
  }

  /**
   * POST /zones/emergency-stop - Stop all active zones
   * Required: Admin or Farmer
   */
  @Post('emergency-stop')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async emergencyStop(): Promise<{
    success: boolean;
    message: string;
    stopped: number;
    zones: string[];
  }> {
    const result = await this.zoneControlUseCase.emergencyStopAll();

    return {
      success: true,
      message: `Emergency stop activated. ${result.stopped} zones stopped.`,
      stopped: result.stopped,
      zones: result.zones,
    };
  }

  /**
   * DELETE /zones/:id - Delete zone
   * Required: Admin only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteZone(@Param('id') id: string): Promise<{ message: string }> {
    const zone = await this.zoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    // Jika zona aktif, stop dulu
    if (zone.isActive) {
      await this.zoneControlUseCase.controlZone(id, false, zone.userId);
    }

    await this.zoneRepository.delete(id);

    return {
      message: `Zone ${zone.name} deleted successfully`,
    };
  }
}
