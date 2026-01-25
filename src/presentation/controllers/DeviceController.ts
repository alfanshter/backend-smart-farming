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
} from '@nestjs/common';
import { Device, DeviceStatus } from '../../domain/entities/Device';
import { CreateDeviceDto } from '../../application/dtos/CreateDeviceDto';
import { InMemoryDeviceRepository } from '../../infrastructure/repositories/InMemoryDeviceRepository';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceRepository: InMemoryDeviceRepository) {}

  @Post()
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
    return await this.deviceRepository.findById(id);
  }

  @Put(':id/activate')
  async activateDevice(@Param('id') id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      return { error: 'Device not found' };
    }

    device.activate();
    return await this.deviceRepository.update(id, device);
  }

  @Put(':id/deactivate')
  async deactivateDevice(@Param('id') id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      return { error: 'Device not found' };
    }

    device.deactivate();
    return await this.deviceRepository.update(id, device);
  }

  @Delete(':id')
  async deleteDevice(@Param('id') id: string) {
    return await this.deviceRepository.delete(id);
  }
}
