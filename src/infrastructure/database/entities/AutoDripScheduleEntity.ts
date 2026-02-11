/**
 * INFRASTRUCTURE - AutoDripScheduleEntity (TypeORM)
 *
 * Penjelasan:
 * Entity TypeORM untuk auto_drip_schedules table.
 * Menggunakan JSONB untuk menyimpan time_slots dan active_days.
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TimeSlot, DayOfWeek } from '../../../domain/entities/AutoDripSchedule';

@Entity('auto_drip_schedules')
export class AutoDripScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'zone_id' })
  zoneId!: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', name: 'time_slots' })
  timeSlots!: TimeSlot[];

  @Column({ type: 'jsonb', name: 'active_days' })
  activeDays!: DayOfWeek[];

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
