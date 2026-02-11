/**
 * DOMAIN - IZoneRepository Interface
 *
 * Penjelasan:
 * Interface untuk zone repository operations
 */

import { Zone } from '../entities/Zone';

export interface IZoneRepository {
  create(zone: Zone): Promise<Zone>;
  findById(id: string): Promise<Zone | null>;
  findAll(): Promise<Zone[]>;
  findByUserId(userId: string): Promise<Zone[]>;
  findActiveZones(): Promise<Zone[]>;
  update(id: string, zone: Partial<Zone>): Promise<Zone>;
  delete(id: string): Promise<void>;
}
