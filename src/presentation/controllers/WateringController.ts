/**
 * PRESENTATION - WateringController
 *
 * Penjelasan:
 * Controller untuk kontrol penyiraman dan jadwal.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ControlWateringUseCase } from '../../domain/use-cases/ControlWateringUseCase';
import { GetSensorDataUseCase } from '../../domain/use-cases/GetSensorDataUseCase';
import { ControlWateringDto } from '../../application/dtos/ControlWateringDto';
import { CreateScheduleDto } from '../../application/dtos/CreateScheduleDto';
import { WateringSchedule } from '../../domain/entities/WateringSchedule';
import { InMemoryWateringScheduleRepository } from '../../infrastructure/repositories/InMemoryWateringScheduleRepository';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../../domain/entities/User';

@Controller('watering')
@UseGuards(JwtAuthGuard)
export class WateringController {
  constructor(
    private readonly controlWateringUseCase: ControlWateringUseCase,
    private readonly getSensorDataUseCase: GetSensorDataUseCase,
    private readonly scheduleRepository: InMemoryWateringScheduleRepository,
  ) {}

  @Post('control')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async controlWatering(@Body() dto: ControlWateringDto) {
    return await this.controlWateringUseCase.execute({
      deviceId: dto.deviceId,
      action: dto.action,
      duration: dto.duration,
    });
  }

  @Get('sensor/:deviceId')
  async getSensorData(@Param('deviceId') deviceId: string) {
    const latest = await this.getSensorDataUseCase.getLatest(deviceId);
    const history = await this.getSensorDataUseCase.getHistory(deviceId);

    return {
      latest,
      history: history.slice(-10),
    };
  }

  @Post('schedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async createSchedule(@Body() dto: CreateScheduleDto) {
    const schedule = new WateringSchedule(
      crypto.randomUUID(),
      dto.name,
      dto.deviceId,
      dto.type,
      dto.isActive ?? true,
      dto.startTime,
      dto.duration,
      dto.moistureThreshold,
      dto.daysOfWeek,
      new Date(),
      new Date(),
    );

    return await this.scheduleRepository.create(schedule);
  }

  @Get('schedule')
  async getAllSchedules() {
    return await this.scheduleRepository.findAll();
  }

  @Get('schedule/:id')
  async getScheduleById(@Param('id') id: string) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }
    return schedule;
  }
}
