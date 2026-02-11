/**
 * CONTROLLER - AutoDripController
 *
 * Penjelasan:
 * REST API Controller untuk CRUD Auto Drip Schedule.
 *
 * Endpoints:
 * - POST   /auto-drip                 : Create new schedule
 * - GET    /auto-drip                 : Get all schedules (with optional filters)
 * - GET    /auto-drip/:id             : Get schedule by ID
 * - GET    /auto-drip/zone/:zoneId    : Get schedule by zone ID
 * - GET    /auto-drip/active          : Get all active schedules
 * - PUT    /auto-drip/:id             : Update schedule
 * - PATCH  /auto-drip/:id/toggle      : Toggle active status
 * - DELETE /auto-drip/:id             : Delete schedule
 */

import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { CreateAutoDripScheduleDto } from '../../application/dtos/CreateAutoDripScheduleDto';
import { UpdateAutoDripScheduleDto } from '../../application/dtos/UpdateAutoDripScheduleDto';
import { CreateAutoDripScheduleUseCase } from '../../domain/use-cases/CreateAutoDripScheduleUseCase';
import { GetAutoDripScheduleUseCase } from '../../domain/use-cases/GetAutoDripScheduleUseCase';
import { UpdateAutoDripScheduleUseCase } from '../../domain/use-cases/UpdateAutoDripScheduleUseCase';
import { DeleteAutoDripScheduleUseCase } from '../../domain/use-cases/DeleteAutoDripScheduleUseCase';
import { DayOfWeek } from '../../domain/entities/AutoDripSchedule';

@Controller('auto-drip')
@UseGuards(JwtAuthGuard)
export class AutoDripController {
  constructor(
    private readonly createUseCase: CreateAutoDripScheduleUseCase,
    private readonly getUseCase: GetAutoDripScheduleUseCase,
    private readonly updateUseCase: UpdateAutoDripScheduleUseCase,
    private readonly deleteUseCase: DeleteAutoDripScheduleUseCase,
  ) {}

  /**
   * POST /auto-drip
   * Create new auto drip schedule
   */
  @Post()
  async create(@Body() dto: CreateAutoDripScheduleDto, @Request() req: any) {
    const schedule = await this.createUseCase.execute({
      zoneId: dto.zoneId,
      isActive: dto.isActive,
      timeSlots: dto.timeSlots,
      activeDays: dto.activeDays as DayOfWeek[],
      userId: req.user.userId,
    });

    return {
      success: true,
      message: 'Auto drip schedule created successfully',
      data: schedule,
    };
  }

  /**
   * GET /auto-drip
   * Get all schedules with optional filters
   */
  @Get()
  async getAll(@Request() req: any, @Query('zoneId') zoneId?: string) {
    const schedules = await this.getUseCase.getAll(req.user.userId, zoneId);

    return {
      success: true,
      message: 'Auto drip schedules retrieved successfully',
      data: schedules,
      count: schedules.length,
    };
  }

  /**
   * GET /auto-drip/active
   * Get all active schedules
   */
  @Get('active')
  async getAllActive() {
    const schedules = await this.getUseCase.getAllActive();

    return {
      success: true,
      message: 'Active schedules retrieved successfully',
      data: schedules,
      count: schedules.length,
    };
  }

  /**
   * GET /auto-drip/:id
   * Get schedule by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const schedule = await this.getUseCase.getById(id);

    return {
      success: true,
      message: 'Auto drip schedule retrieved successfully',
      data: schedule,
    };
  }

  /**
   * GET /auto-drip/zone/:zoneId
   * Get schedule by zone ID
   */
  @Get('zone/:zoneId')
  async getByZoneId(@Param('zoneId') zoneId: string) {
    const schedule = await this.getUseCase.getByZoneId(zoneId);

    return {
      success: true,
      message: schedule ? 'Schedule found' : 'No schedule for this zone',
      data: schedule,
    };
  }

  /**
   * PUT /auto-drip/:id
   * Update schedule
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAutoDripScheduleDto) {
    const schedule = await this.updateUseCase.execute({
      id,
      zoneId: dto.zoneId,
      isActive: dto.isActive,
      timeSlots: dto.timeSlots,
      activeDays: dto.activeDays as DayOfWeek[] | undefined,
    });

    return {
      success: true,
      message: 'Auto drip schedule updated successfully',
      data: schedule,
    };
  }

  /**
   * PATCH /auto-drip/:id/toggle
   * Toggle active status
   */
  @Patch(':id/toggle')
  async toggleActive(@Param('id') id: string) {
    const schedule = await this.updateUseCase.toggleActive(id);

    return {
      success: true,
      message: `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: schedule,
    };
  }

  /**
   * DELETE /auto-drip/:id
   * Delete schedule
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteUseCase.execute(id);

    return {
      success: true,
      message: 'Auto drip schedule deleted successfully',
    };
  }
}
