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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain
import { ControlWateringUseCase } from './domain/use-cases/ControlWateringUseCase';
import { GetSensorDataUseCase } from './domain/use-cases/GetSensorDataUseCase';
import { ProcessSensorDataUseCase } from './domain/use-cases/ProcessSensorDataUseCase';

// Infrastructure - Database
import { DeviceEntity } from './infrastructure/database/entities/DeviceEntity';
import { UserEntity } from './infrastructure/database/entities/UserEntity';
import { ZoneEntity } from './infrastructure/database/entities/ZoneEntity';
import { AutoDripScheduleEntity } from './infrastructure/database/entities/AutoDripScheduleEntity';
import { TimescaleDeviceRepository } from './infrastructure/repositories/TimescaleDeviceRepository';

// Infrastructure - MQTT
import { MqttClient } from './infrastructure/mqtt/MqttClient';
import { MqttService } from './infrastructure/mqtt/MqttService';

// Infrastructure - Repositories (In-Memory untuk Sensor & Schedule)
import { InMemorySensorRepository } from './infrastructure/repositories/InMemorySensorRepository';
import { InMemoryWateringScheduleRepository } from './infrastructure/repositories/InMemoryWateringScheduleRepository';

// Presentation
import { DeviceController } from './presentation/controllers/DeviceController';
import { WateringController } from './presentation/controllers/WateringController';

// Modules
import { TankModule } from './modules/TankModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'smartfarming'),
        password: configService.get('DATABASE_PASSWORD', 'smartfarming123'),
        database: configService.get('DATABASE_NAME', 'smartfarming'),
        entities: [DeviceEntity, UserEntity, ZoneEntity, AutoDripScheduleEntity],
        synchronize: false, // ❌ Jangan auto-sync di production!
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([DeviceEntity, UserEntity, ZoneEntity, AutoDripScheduleEntity]),
    TankModule, // Import TankModule untuk akses TankControlUseCase
  ],
  controllers: [DeviceController, WateringController],
  providers: [
    // MQTT
    MqttClient,
    MqttService,

    // Repositories - TimescaleDB
    TimescaleDeviceRepository,

    // Repositories - In-Memory (temporary untuk sensor & schedule)
    InMemorySensorRepository,
    InMemoryWateringScheduleRepository,

    // Use Cases
    ControlWateringUseCase,
    GetSensorDataUseCase,
    ProcessSensorDataUseCase,
  ],
})
export class SmartFarmingModule {}
