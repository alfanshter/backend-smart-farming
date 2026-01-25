/**
 * INFRASTRUCTURE - InMemoryDeviceRepository
 *
 * Penjelasan:
 * Ini implementasi Repository menggunakan in-memory storage (Map).
 * Untuk production, ganti dengan database nyata (MongoDB, PostgreSQL, dll).
 *
 * Repository pattern ini memudahkan kita ganti database tanpa ubah use case!
 */

import { Injectable } from '@nestjs/common';
import { IDeviceRepository } from '../../domain/interfaces/IDeviceRepository';
import { Device, DeviceType } from '../../domain/entities/Device';

@Injectable()
export class InMemoryDeviceRepository implements IDeviceRepository {
  private devices: Map<string, Device> = new Map();

  create(device: Device): Promise<Device> {
    this.devices.set(device.id, device);
    return Promise.resolve(device);
  }

  findById(id: string): Promise<Device | null> {
    return Promise.resolve(this.devices.get(id) || null);
  }

  findAll(): Promise<Device[]> {
    return Promise.resolve(Array.from(this.devices.values()));
  }

  findByType(type: string): Promise<Device[]> {
    return Promise.resolve(
      Array.from(this.devices.values()).filter(
        (d) => d.type === (type as DeviceType),
      ),
    );
  }

  update(id: string, updates: Partial<Device>): Promise<Device | null> {
    const device = this.devices.get(id);
    if (!device) return Promise.resolve(null);

    const updated = Object.assign(device, updates);
    this.devices.set(id, updated);
    return Promise.resolve(updated);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.devices.delete(id));
  }

  findByMqttTopic(topic: string): Promise<Device | null> {
    const device =
      Array.from(this.devices.values()).find((d) => d.mqttTopic === topic) ||
      null;
    return Promise.resolve(device);
  }
}
