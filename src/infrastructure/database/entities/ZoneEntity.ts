/**
 * INFRASTRUCTURE - Zone TypeORM Entity
 *
 * Penjelasan:
 * TypeORM entity untuk zones table
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('zones')
@Index('idx_zones_user_id', ['userId'])
@Index('idx_zones_device_id', ['deviceId'])
@Index('idx_zones_is_active', ['isActive'])
export class ZoneEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'int', name: 'duration_minutes', default: 0 })
  durationMinutes: number;

  @Column({ type: 'int', name: 'duration_seconds', default: 0 })
  durationSeconds: number;

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ type: 'int', name: 'remaining_seconds', nullable: true })
  remainingSeconds?: number;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
