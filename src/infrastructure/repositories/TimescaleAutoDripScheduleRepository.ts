/**
 * INFRASTRUCTURE - TimescaleAutoDripScheduleRepository
 *
 * Penjelasan:
 * Implementasi repository untuk Auto Drip Schedule menggunakan TypeORM + TimescaleDB.
 * Menyimpan dan mengquery jadwal otomatis dengan JSONB columns.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoDripSchedule } from '../../domain/entities/AutoDripSchedule';
import { IAutoDripScheduleRepository } from '../../domain/interfaces/IAutoDripScheduleRepository';
import { AutoDripScheduleEntity } from '../database/entities/AutoDripScheduleEntity';

@Injectable()
export class TimescaleAutoDripScheduleRepository implements IAutoDripScheduleRepository {
  constructor(
    @InjectRepository(AutoDripScheduleEntity)
    private readonly repository: Repository<AutoDripScheduleEntity>,
  ) {}

  /**
   * Convert Entity to Domain model
   */
  private toDomain(entity: AutoDripScheduleEntity): AutoDripSchedule {
    return new AutoDripSchedule(
      entity.id,
      entity.zoneId,
      entity.isActive,
      entity.timeSlots,
      entity.activeDays,
      entity.userId,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  /**
   * Convert Domain model to Entity
   */
  private toEntity(domain: AutoDripSchedule): AutoDripScheduleEntity {
    const entity = new AutoDripScheduleEntity();
    if (domain.id) entity.id = domain.id;
    entity.zoneId = domain.zoneId;
    entity.isActive = domain.isActive;
    entity.timeSlots = domain.timeSlots;
    entity.activeDays = domain.activeDays;
    entity.userId = domain.userId;
    return entity;
  }

  async create(schedule: AutoDripSchedule): Promise<AutoDripSchedule> {
    const entity = this.toEntity(schedule);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findAll(userId?: string, zoneId?: string): Promise<AutoDripSchedule[]> {
    const queryBuilder = this.repository.createQueryBuilder('schedule');

    if (userId) {
      queryBuilder.where('schedule.user_id = :userId', { userId });
    }

    if (zoneId) {
      queryBuilder.andWhere('schedule.zone_id = :zoneId', { zoneId });
    }

    queryBuilder.orderBy('schedule.created_at', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<AutoDripSchedule | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByZoneId(zoneId: string): Promise<AutoDripSchedule | null> {
    const entity = await this.repository.findOne({ where: { zoneId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAllActive(): Promise<AutoDripSchedule[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async update(id: string, scheduleData: Partial<AutoDripSchedule>): Promise<AutoDripSchedule | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) return null;

    // Update fields
    if (scheduleData.zoneId !== undefined) existing.zoneId = scheduleData.zoneId;
    if (scheduleData.isActive !== undefined) existing.isActive = scheduleData.isActive;
    if (scheduleData.timeSlots !== undefined) existing.timeSlots = scheduleData.timeSlots;
    if (scheduleData.activeDays !== undefined) existing.activeDays = scheduleData.activeDays;
    if (scheduleData.userId !== undefined) existing.userId = scheduleData.userId;

    const updated = await this.repository.save(existing);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async toggleActive(id: string): Promise<AutoDripSchedule | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) return null;

    existing.isActive = !existing.isActive;
    const updated = await this.repository.save(existing);
    return this.toDomain(updated);
  }
}
