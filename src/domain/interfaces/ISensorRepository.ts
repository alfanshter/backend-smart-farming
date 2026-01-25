/**
 * DOMAIN INTERFACE - ISensorRepository
 *
 * Penjelasan:
 * Repository untuk data sensor.
 */

import { Sensor } from '../entities/Sensor';

export interface ISensorRepository {
  create(sensor: Sensor): Promise<Sensor>;
  findById(id: string): Promise<Sensor | null>;
  findAll(): Promise<Sensor[]>;
  findByDeviceId(deviceId: string): Promise<Sensor[]>;
  findLatestByDeviceId(deviceId: string): Promise<Sensor | null>;
  delete(id: string): Promise<boolean>;
}
