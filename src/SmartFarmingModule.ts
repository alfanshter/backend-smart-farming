/**
 * MODULE - SmartFarmingModule
 *
 * Penjelasan:
 * Module NestJS yang menggabungkan semua komponen.
 * Di sini kita setup Dependency Injection (DI).
 *
 * Untuk DI, kita gunakan class langsung tanpa token.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain
import { ControlWateringUseCase } from './domain/use-cases/ControlWateringUseCase';
import { GetSensorDataUseCase } from './domain/use-cases/GetSensorDataUseCase';
import { ProcessSensorDataUseCase } from './domain/use-cases/ProcessSensorDataUseCase';

// Infrastructure
import { MqttClient } from './infrastructure/mqtt/MqttClient';
import { MqttService } from './infrastructure/mqtt/MqttService';
import { InMemoryDeviceRepository } from './infrastructure/repositories/InMemoryDeviceRepository';
import { InMemorySensorRepository } from './infrastructure/repositories/InMemorySensorRepository';
import { InMemoryWateringScheduleRepository } from './infrastructure/repositories/InMemoryWateringScheduleRepository';

// Presentation
import { DeviceController } from './presentation/controllers/DeviceController';
import { WateringController } from './presentation/controllers/WateringController';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [DeviceController, WateringController],
  providers: [
    // MQTT
    MqttClient,
    MqttService,

    // Repositories
    InMemoryDeviceRepository,
    InMemorySensorRepository,
    InMemoryWateringScheduleRepository,

    // Use Cases
    ControlWateringUseCase,
    GetSensorDataUseCase,
    ProcessSensorDataUseCase,
  ],
})
export class SmartFarmingModule {}
