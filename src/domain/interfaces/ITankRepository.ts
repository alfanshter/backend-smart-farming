import { Tank } from '../entities/Tank';
import { TankStatistics } from '../entities/TankStatistics';
import { TankLog, TankLogType } from '../entities/TankLog';

export interface ITankRepository {
  // Tank CRUD
  create(tank: Partial<Tank>): Promise<Tank>;
  findAll(userId?: string): Promise<Tank[]>;
  findById(id: string): Promise<Tank | null>;
  findByDeviceId(deviceId: string): Promise<Tank | null>;
  update(id: string, data: Partial<Tank>): Promise<Tank>;
  delete(id: string): Promise<void>;

  // Tank Status & Control
  updateLevel(tankId: string, newLevel: number): Promise<Tank>;
  toggleAgitator(tankId: string, status: boolean): Promise<Tank>;
  
  // Statistics
  getStatistics(tankId: string, startDate?: Date, endDate?: Date): Promise<TankStatistics[]>;
  getTodayStatistics(tankId: string): Promise<TankStatistics | null>;
  createOrUpdateStatistics(tankId: string, data: Partial<TankStatistics>): Promise<TankStatistics>;
  
  // Logging
  createLog(log: Partial<TankLog>): Promise<TankLog>;
  getLogs(tankId: string, limit?: number): Promise<TankLog[]>;
  
  // Water usage tracking
  incrementUsage(tankId: string, liters: number): Promise<void>;
  incrementFilled(tankId: string, liters: number): Promise<void>;
  incrementAutoFillCount(tankId: string): Promise<void>;
  incrementManualFillCount(tankId: string): Promise<void>;
}
