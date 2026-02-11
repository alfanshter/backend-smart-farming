/**
 * MODULE - Zone Module
 *
 * Penjelasan:
 * Module configuration untuk zone management dengan manual control
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneController } from '../presentation/controllers/ZoneController';
import { ZoneControlUseCase } from '../domain/use-cases/ZoneControlUseCase';
import { TimescaleZoneRepository } from '../infrastructure/repositories/TimescaleZoneRepository';
import { ZoneEntity } from '../infrastructure/database/entities/ZoneEntity';
import { DeviceEntity } from '../infrastructure/database/entities/DeviceEntity';
import { TimescaleDeviceRepository } from '../infrastructure/repositories/TimescaleDeviceRepository';
import { MqttClient } from '../infrastructure/mqtt/MqttClient';

@Module({
  imports: [TypeOrmModule.forFeature([ZoneEntity, DeviceEntity])],
  controllers: [ZoneController],
  providers: [
    ZoneControlUseCase,
    {
      provide: 'IZoneRepository',
      useClass: TimescaleZoneRepository,
    },
    {
      provide: 'IDeviceRepository',
      useClass: TimescaleDeviceRepository,
    },
    {
      provide: 'IMqttClient',
      useClass: MqttClient,
    },
  ],
  exports: [ZoneControlUseCase, 'IZoneRepository'],
})
export class ZoneModule {}
