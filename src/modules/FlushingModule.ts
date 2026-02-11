import { Module } from '@nestjs/common';
import { FlushingController } from '../presentation/controllers/FlushingController';
import { FlushingUseCase } from '../domain/use-cases/FlushingUseCase';
import { FlushingRepository } from '../infrastructure/repositories/FlushingRepository';
import { MqttClient } from '../infrastructure/mqtt/MqttClient';
import { Pool } from 'pg';

@Module({
  controllers: [FlushingController],
  providers: [
    FlushingUseCase,
    {
      provide: 'IFlushingRepository',
      useClass: FlushingRepository,
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
  exports: [FlushingUseCase],
})
export class FlushingModule {}
