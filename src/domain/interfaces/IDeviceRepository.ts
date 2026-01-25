/**
 * DOMAIN INTERFACE - IDeviceRepository
 *
 * Penjelasan:
 * Repository adalah pattern untuk akses data.
 * Interface ini mendefinisikan operasi CRUD untuk Device,
 * tapi tidak peduli apakah datanya di MongoDB, PostgreSQL, atau memory.
 */

import { Device } from '../entities/Device';

export interface IDeviceRepository {
  // Buat device baru
  create(device: Device): Promise<Device>;

  // Cari device berdasarkan ID
  findById(id: string): Promise<Device | null>;

  // Cari semua device
  findAll(): Promise<Device[]>;

  // Cari device berdasarkan tipe
  findByType(type: string): Promise<Device[]>;

  // Update device
  update(id: string, device: Partial<Device>): Promise<Device | null>;

  // Hapus device
  delete(id: string): Promise<boolean>;

  // Cari device berdasarkan MQTT topic
  findByMqttTopic(topic: string): Promise<Device | null>;
}
