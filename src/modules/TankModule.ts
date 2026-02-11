import { Module } from '@nestjs/common';
import { TankController } from '../presentation/controllers/TankController';
import { TankControlUseCase } from '../domain/use-cases/TankControlUseCase';
import { TankRepository } from '../infrastructure/repositories/TankRepository';
import { MqttClient } from '../infrastructure/mqtt/MqttClient';
import { Pool } from 'pg';

@Module({
  controllers: [TankController],
  providers: [
    TankControlUseCase,
    {
      provide: 'ITankRepository',
      useClass: TankRepository,
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
  exports: [TankControlUseCase],
})
export class TankModule {}
