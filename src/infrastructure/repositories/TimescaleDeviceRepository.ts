/**
 * INFRASTRUCTURE - TimescaleDeviceRepository
 *
 * Penjelasan:
 * Repository ini mengimplementasikan IDeviceRepository
 * dan menggunakan TypeORM untuk akses database TimescaleDB.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from '../../domain/entities/Device';
import { IDeviceRepository } from '../../domain/interfaces/IDeviceRepository';
import { DeviceEntity } from '../database/entities/DeviceEntity';

@Injectable()
export class TimescaleDeviceRepository implements IDeviceRepository {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly repository: Repository<DeviceEntity>,
  ) {}

  async create(device: Device): Promise<Device> {
    const entity = this.toEntity(device);
    const saved = await this.repository.save(entity);
    console.log(`✅ Device saved to TimescaleDB: ${saved.name} (${saved.id})`);
    return this.toDomain(saved);
  }

  async update(id: string, device: Device): Promise<Device> {
    const entity = this.toEntity(device);
    await this.repository.update(id, entity);
    const updated = await this.repository.findOne({ where: { id } });

    if (!updated) {
      throw new Error(`Device with id ${id} not found`);
    }

    console.log(`✅ Device updated in TimescaleDB: ${updated.name}`);
    return this.toDomain(updated);
  }

  async findById(id: string): Promise<Device | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Device[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByStatus(status: DeviceStatus): Promise<Device[]> {
    const entities = await this.repository.find({
      where: { status },
      order: { lastSeen: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByType(type: string): Promise<Device[]> {
    const entities = await this.repository.find({
      where: { type },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByMqttTopic(topic: string): Promise<Device | null> {
    const entity = await this.repository.findOne({
      where: { mqttTopic: topic },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);

    if (result.affected === 0) {
      return false;
    }

    console.log(`✅ Device deleted from TimescaleDB: ${id}`);
    return true;
  }

  // Mapper: Domain Entity → Database Entity
  private toEntity(device: Device): DeviceEntity {
    const entity = new DeviceEntity();
    entity.id = device.id;
    entity.name = device.name;
    entity.type = device.type;
    entity.mqttTopic = device.mqttTopic;
    entity.status = device.status;
    entity.isActive = device.isActive;
    entity.lastSeen = device.lastSeen || null;
    entity.metadata = device.metadata || null;
    return entity;
  }

  // Mapper: Database Entity → Domain Entity
  private toDomain(entity: DeviceEntity): Device {
    return new Device(
      entity.id,
      entity.name,
      entity.type as DeviceType,
      entity.mqttTopic,
      entity.status as DeviceStatus,
      entity.isActive,
      entity.lastSeen || undefined,
      entity.metadata || undefined,
    );
  }
}
