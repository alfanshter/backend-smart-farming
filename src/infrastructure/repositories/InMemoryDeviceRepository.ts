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

  async create(device: Device): Promise<Device> {
    this.devices.set(device.id, device);
    return device;
  }

  async findById(id: string): Promise<Device | null> {
    return this.devices.get(id) || null;
  }

  async findAll(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async findByType(type: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((d) => d.type === type);
  }

  async update(id: string, updates: Partial<Device>): Promise<Device | null> {
    const device = this.devices.get(id);
    if (!device) return null;

    const updated = Object.assign(device, updates);
    this.devices.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.devices.delete(id);
  }

  async findByMqttTopic(topic: string): Promise<Device | null> {
    return (
      Array.from(this.devices.values()).find((d) => d.mqttTopic === topic) ||
      null
    );
  }
}
