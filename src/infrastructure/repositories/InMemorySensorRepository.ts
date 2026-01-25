/**
 * INFRASTRUCTURE - InMemorySensorRepository
 */

import { Injectable } from '@nestjs/common';
import { ISensorRepository } from '../../domain/interfaces/ISensorRepository';
import { Sensor } from '../../domain/entities/Sensor';

@Injectable()
export class InMemorySensorRepository implements ISensorRepository {
  private sensors: Map<string, Sensor> = new Map();

  create(sensor: Sensor): Promise<Sensor> {
    this.sensors.set(sensor.id, sensor);
    return Promise.resolve(sensor);
  }

  findById(id: string): Promise<Sensor | null> {
    return Promise.resolve(this.sensors.get(id) || null);
  }

  findAll(): Promise<Sensor[]> {
    return Promise.resolve(Array.from(this.sensors.values()));
  }

  findByDeviceId(deviceId: string): Promise<Sensor[]> {
    return Promise.resolve(
      Array.from(this.sensors.values()).filter((s) => s.deviceId === deviceId),
    );
  }

  async findLatestByDeviceId(deviceId: string): Promise<Sensor | null> {
    const sensors = await this.findByDeviceId(deviceId);
    if (sensors.length === 0) return null;

    return sensors.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    )[0];
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.sensors.delete(id));
  }
}
