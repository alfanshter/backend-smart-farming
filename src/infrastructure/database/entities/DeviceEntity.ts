/**
 * INFRASTRUCTURE - DeviceEntity (TypeORM)
 *
 * Penjelasan:
 * Entity ini adalah representasi tabel 'devices' di database.
 * Digunakan oleh TypeORM untuk mapping antara database dan aplikasi.
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
export class DeviceEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ name: 'mqtt_topic', type: 'varchar', length: 255 })
  mqttTopic: string;

  @Column({ type: 'varchar', length: 20, default: 'OFFLINE' })
  status: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
  lastSeen: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
