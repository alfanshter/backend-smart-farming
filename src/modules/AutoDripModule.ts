/**
 * MODULE - AutoDripModule
 *
 * Penjelasan:
 * Module untuk Auto Drip Irrigation Scheduling.
 * Menggabungkan semua komponen terkait auto drip.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AutoDripScheduleEntity } from '../infrastructure/database/entities/AutoDripScheduleEntity';
import { ZoneEntity } from '../infrastructure/database/entities/ZoneEntity';
import { DeviceEntity } from '../infrastructure/database/entities/DeviceEntity';

// Repositories
import { TimescaleAutoDripScheduleRepository } from '../infrastructure/repositories/TimescaleAutoDripScheduleRepository';
import { TimescaleZoneRepository } from '../infrastructure/repositories/TimescaleZoneRepository';
import { TimescaleDeviceRepository } from '../infrastructure/repositories/TimescaleDeviceRepository';

// Use Cases
import { CreateAutoDripScheduleUseCase } from '../domain/use-cases/CreateAutoDripScheduleUseCase';
import { GetAutoDripScheduleUseCase } from '../domain/use-cases/GetAutoDripScheduleUseCase';
import { UpdateAutoDripScheduleUseCase } from '../domain/use-cases/UpdateAutoDripScheduleUseCase';
import { DeleteAutoDripScheduleUseCase } from '../domain/use-cases/DeleteAutoDripScheduleUseCase';
import { ZoneControlUseCase } from '../domain/use-cases/ZoneControlUseCase';

// Services
import { AutoDripSchedulerService } from '../infrastructure/services/AutoDripSchedulerService';
import { MqttClient } from '../infrastructure/mqtt/MqttClient';

// Controller
import { AutoDripController } from '../presentation/controllers/AutoDripController';

@Module({
  imports: [TypeOrmModule.forFeature([AutoDripScheduleEntity, ZoneEntity, DeviceEntity])],
  controllers: [AutoDripController],
  providers: [
    // Repositories
    {
      provide: 'IAutoDripScheduleRepository',
      useClass: TimescaleAutoDripScheduleRepository,
    },
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

    // Use Cases
    CreateAutoDripScheduleUseCase,
    GetAutoDripScheduleUseCase,
    UpdateAutoDripScheduleUseCase,
    DeleteAutoDripScheduleUseCase,
    ZoneControlUseCase,

    // Services
    AutoDripSchedulerService,
  ],
  exports: [
    GetAutoDripScheduleUseCase,
    AutoDripSchedulerService,
  ],
})
export class AutoDripModule {}
