/**
 * INFRASTRUCTURE - TimescaleDB Zone Repository
 *
 * Penjelasan:
 * Implementation repository untuk zone dengan TimescaleDB
 */

import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IZoneRepository } from '../../domain/interfaces/IZoneRepository';
import { Zone } from '../../domain/entities/Zone';
import { ZoneEntity } from '../database/entities/ZoneEntity.js';

@Injectable()
export class TimescaleZoneRepository implements IZoneRepository {
  constructor(
    @InjectRepository(ZoneEntity)
    private readonly zoneRepository: Repository<ZoneEntity>,
  ) {}

  async create(zone: Zone): Promise<Zone> {
    const entity = this.zoneRepository.create({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      deviceId: zone.deviceId,
      isActive: zone.isActive,
      durationMinutes: zone.durationMinutes,
      durationSeconds: zone.durationSeconds,
      startedAt: zone.startedAt,
      remainingSeconds: zone.remainingSeconds,
      userId: zone.userId,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
    });

    const saved = await this.zoneRepository.save(entity);
    return this.toModel(saved);
  }

  async findById(id: string): Promise<Zone | null> {
    const entity = await this.zoneRepository.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async findAll(): Promise<Zone[]> {
    const entities = await this.zoneRepository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toModel(e));
  }

  async findByUserId(userId: string): Promise<Zone[]> {
    const entities = await this.zoneRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toModel(e));
  }

  async findActiveZones(): Promise<Zone[]> {
    const entities = await this.zoneRepository.find({
      where: { isActive: true },
      order: { startedAt: 'ASC' },
    });
    return entities.map((e) => this.toModel(e));
  }

  async update(id: string, updates: Partial<Zone>): Promise<Zone> {
    await this.zoneRepository.update(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const updated = await this.zoneRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Zone ${id} not found after update`);
    }

    return this.toModel(updated);
  }

  async delete(id: string): Promise<void> {
    await this.zoneRepository.delete(id);
  }

  private toModel(entity: ZoneEntity): Zone {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      deviceId: entity.deviceId,
      isActive: entity.isActive,
      durationMinutes: entity.durationMinutes,
      durationSeconds: entity.durationSeconds,
      startedAt: entity.startedAt,
      remainingSeconds: entity.remainingSeconds,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
