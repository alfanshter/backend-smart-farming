/**
 * USE CASE - GetSensorDataUseCase
 *
 * Penjelasan:
 * Use case untuk mendapatkan data sensor.
 * Bisa ambil data terbaru atau histori.
 */

import { Injectable } from '@nestjs/common';
import { Sensor } from '../entities/Sensor';
import { InMemorySensorRepository } from '../../infrastructure/repositories/InMemorySensorRepository';

@Injectable()
export class GetSensorDataUseCase {
  constructor(private readonly sensorRepository: InMemorySensorRepository) {}

  // Ambil data sensor terbaru dari device tertentu
  async getLatest(deviceId: string): Promise<Sensor | null> {
    return await this.sensorRepository.findLatestByDeviceId(deviceId);
  }

  // Ambil semua histori sensor dari device tertentu
  async getHistory(deviceId: string): Promise<Sensor[]> {
    return await this.sensorRepository.findByDeviceId(deviceId);
  }

  // Ambil semua data sensor
  async getAll(): Promise<Sensor[]> {
    return await this.sensorRepository.findAll();
  }
}
