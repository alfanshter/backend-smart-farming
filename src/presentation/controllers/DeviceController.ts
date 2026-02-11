/**
 * PRESENTATION - DeviceController
 *
 * Penjelasan:
 * Controller adalah pintu masuk REST API.
 * Menerima HTTP request dan memanggil use case yang sesuai.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Device, DeviceStatus } from '../../domain/entities/Device';
import { CreateDeviceDto } from '../../application/dtos/CreateDeviceDto';
import { TimescaleDeviceRepository } from '../../infrastructure/repositories/TimescaleDeviceRepository';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../../domain/entities/User';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceRepository: TimescaleDeviceRepository) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async createDevice(@Body() dto: CreateDeviceDto) {
    const device = new Device(
      crypto.randomUUID(),
      dto.name,
      dto.type,
      dto.mqttTopic,
      DeviceStatus.OFFLINE,
      dto.isActive ?? true,
      undefined,
      dto.metadata,
    );

    return await this.deviceRepository.create(device);
  }

  @Get()
  async getAllDevices() {
    return await this.deviceRepository.findAll();
  }

  @Get(':id')
  async getDeviceById(@Param('id') id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  @Put(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async activateDevice(@Param('id') id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    device.activate();
    return await this.deviceRepository.update(id, device);
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async deactivateDevice(@Param('id') id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    device.deactivate();
    return await this.deviceRepository.update(id, device);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDevice(@Param('id') id: string) {
    const deleted = await this.deviceRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
  }
}
