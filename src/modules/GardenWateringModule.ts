// ===================================================================
// GARDEN WATERING MODULE
// ===================================================================
// Purpose: Module configuration for garden watering system
// Author: Smart Farming Team
// Date: February 11, 2026

import { Module } from '@nestjs/common';
import { GardenWateringController } from '../presentation/controllers/GardenWateringController';
import { GardenWateringUseCase } from '../domain/use-cases/GardenWateringUseCase';
import { GardenWateringRepository } from '../infrastructure/repositories/GardenWateringRepository';
import { MqttClient } from '../infrastructure/mqtt/MqttClient';
import { Pool } from 'pg';

@Module({
  controllers: [GardenWateringController],
  providers: [
    GardenWateringUseCase,
    {
      provide: 'IGardenWateringRepository',
      useClass: GardenWateringRepository,
    },
    {
      provide: 'IMqttClient',
      useClass: MqttClient,
    },
    {
      provide: Pool,
      useFactory: () => {
        return new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'smartfarming',
          password: process.env.DB_PASSWORD || 'smartfarming123',
          database: process.env.DB_NAME || 'smartfarming',
        });
      },
    },
  ],
  exports: [GardenWateringUseCase],
})
export class GardenWateringModule {}

