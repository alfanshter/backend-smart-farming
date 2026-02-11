import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ITankRepository } from '../../domain/interfaces/ITankRepository';
import { Tank } from '../../domain/entities/Tank';
import { TankStatistics } from '../../domain/entities/TankStatistics';
import { TankLog } from '../../domain/entities/TankLog';

@Injectable()
export class TankRepository implements ITankRepository {
  constructor(private readonly pool: Pool) {}

  // ===== TANK CRUD =====
  async create(tank: Partial<Tank>): Promise<Tank> {
    const query = `
      INSERT INTO tanks (
        name, description, device_id, sensor_device_id, capacity, current_level, is_active,
        auto_fill_enabled, auto_fill_min_level, auto_fill_max_level,
        manual_fill_max_level, manual_fill_duration, agitator_enabled, agitator_status, user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      tank.name,
      tank.description || null,
      tank.deviceId,
      tank.sensorDeviceId || null,
      tank.capacity,
      tank.currentLevel || 0,
      tank.isActive !== false,
      tank.autoFillEnabled || false,
      tank.autoFillMinLevel || 30,
      tank.autoFillMaxLevel || 90,
      tank.manualFillMaxLevel || 95,
      tank.manualFillDuration || null,
      tank.agitatorEnabled || false,
      tank.agitatorStatus || false,
      tank.userId,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToTank(result.rows[0]);
  }

  async findAll(userId?: string): Promise<Tank[]> {
    let query = 'SELECT * FROM tanks WHERE is_active = true';
    const values: any[] = [];

    if (userId) {
      query += ' AND user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRowToTank(row));
  }

  async findById(id: string): Promise<Tank | null> {
    const query = 'SELECT * FROM tanks WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTank(result.rows[0]);
  }

  async findByDeviceId(deviceId: string): Promise<Tank | null> {
    const query = 'SELECT * FROM tanks WHERE device_id = $1';
    const result = await this.pool.query(query, [deviceId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTank(result.rows[0]);
  }

  async update(id: string, data: Partial<Tank>): Promise<Tank> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.capacity !== undefined) {
      updates.push(`capacity = $${paramIndex++}`);
      values.push(data.capacity);
    }
    if (data.autoFillEnabled !== undefined) {
      updates.push(`auto_fill_enabled = $${paramIndex++}`);
      values.push(data.autoFillEnabled);
    }
    if (data.autoFillMinLevel !== undefined) {
      updates.push(`auto_fill_min_level = $${paramIndex++}`);
      values.push(data.autoFillMinLevel);
    }
    if (data.autoFillMaxLevel !== undefined) {
      updates.push(`auto_fill_max_level = $${paramIndex++}`);
      values.push(data.autoFillMaxLevel);
    }
    if (data.manualFillMaxLevel !== undefined) {
      updates.push(`manual_fill_max_level = $${paramIndex++}`);
      values.push(data.manualFillMaxLevel);
    }
    if (data.agitatorEnabled !== undefined) {
      updates.push(`agitator_enabled = $${paramIndex++}`);
      values.push(data.agitatorEnabled);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tanks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapRowToTank(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'UPDATE tanks SET is_active = false, updated_at = NOW() WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  // ===== TANK STATUS & CONTROL =====
  async updateLevel(tankId: string, newLevel: number): Promise<Tank> {
    const query = `
      UPDATE tanks
      SET current_level = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [newLevel, tankId]);
    return this.mapRowToTank(result.rows[0]);
  }

  async toggleAgitator(tankId: string, status: boolean): Promise<Tank> {
    const query = `
      UPDATE tanks
      SET agitator_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [status, tankId]);
    return this.mapRowToTank(result.rows[0]);
  }

  // ===== STATISTICS =====
  async getStatistics(
    tankId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TankStatistics[]> {
    let query = 'SELECT * FROM tank_statistics WHERE tank_id = $1';
    const values: any[] = [tankId];

    if (startDate) {
      query += ' AND date >= $2';
      values.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= $${values.length + 1}`;
      values.push(endDate);
    }

    query += ' ORDER BY date DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRowToStatistics(row));
  }

  async getTodayStatistics(tankId: string): Promise<TankStatistics | null> {
    const query = `
      SELECT * FROM tank_statistics
      WHERE tank_id = $1 AND date = CURRENT_DATE
    `;

    const result = await this.pool.query(query, [tankId]);

    if (result.rows.length === 0) {
      // Create new statistics for today
      return this.createOrUpdateStatistics(tankId, {
        totalUsage: 0,
        totalFilled: 0,
        averageLevel: 0,
        minLevel: 100,
        maxLevel: 0,
        autoFillCount: 0,
        manualFillCount: 0,
      });
    }

    return this.mapRowToStatistics(result.rows[0]);
  }

  async createOrUpdateStatistics(
    tankId: string,
    data: Partial<TankStatistics>,
  ): Promise<TankStatistics> {
    const query = `
      INSERT INTO tank_statistics (
        tank_id, date, total_usage, total_filled, average_level,
        min_level, max_level, auto_fill_count, manual_fill_count
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tank_id, date)
      DO UPDATE SET
        total_usage = tank_statistics.total_usage + EXCLUDED.total_usage,
        total_filled = tank_statistics.total_filled + EXCLUDED.total_filled,
        average_level = (tank_statistics.average_level + EXCLUDED.average_level) / 2,
        min_level = LEAST(tank_statistics.min_level, EXCLUDED.min_level),
        max_level = GREATEST(tank_statistics.max_level, EXCLUDED.max_level),
        auto_fill_count = tank_statistics.auto_fill_count + EXCLUDED.auto_fill_count,
        manual_fill_count = tank_statistics.manual_fill_count + EXCLUDED.manual_fill_count,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      tankId,
      data.totalUsage || 0,
      data.totalFilled || 0,
      data.averageLevel || 0,
      data.minLevel || 100,
      data.maxLevel || 0,
      data.autoFillCount || 0,
      data.manualFillCount || 0,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToStatistics(result.rows[0]);
  }

  // ===== LOGGING =====
  async createLog(log: Partial<TankLog>): Promise<TankLog> {
    const query = `
      INSERT INTO tank_logs (tank_id, type, level_before, level_after, message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      log.tankId,
      log.type,
      log.levelBefore || 0,
      log.levelAfter || 0,
      log.message,
      log.metadata ? JSON.stringify(log.metadata) : null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToLog(result.rows[0]);
  }

  async getLogs(tankId: string, limit = 50): Promise<TankLog[]> {
    const query = `
      SELECT * FROM tank_logs
      WHERE tank_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [tankId, limit]);
    return result.rows.map((row) => this.mapRowToLog(row));
  }

  // ===== WATER USAGE TRACKING =====
  async incrementUsage(tankId: string, liters: number): Promise<void> {
    const query = `
      INSERT INTO tank_statistics (tank_id, date, total_usage)
      VALUES ($1, CURRENT_DATE, $2)
      ON CONFLICT (tank_id, date)
      DO UPDATE SET
        total_usage = tank_statistics.total_usage + $2,
        updated_at = NOW()
    `;

    await this.pool.query(query, [tankId, liters]);
  }

  async incrementFilled(tankId: string, liters: number): Promise<void> {
    const query = `
      INSERT INTO tank_statistics (tank_id, date, total_filled)
      VALUES ($1, CURRENT_DATE, $2)
      ON CONFLICT (tank_id, date)
      DO UPDATE SET
        total_filled = tank_statistics.total_filled + $2,
        updated_at = NOW()
    `;

    await this.pool.query(query, [tankId, liters]);
  }

  async incrementAutoFillCount(tankId: string): Promise<void> {
    const query = `
      INSERT INTO tank_statistics (tank_id, date, auto_fill_count)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (tank_id, date)
      DO UPDATE SET
        auto_fill_count = tank_statistics.auto_fill_count + 1,
        updated_at = NOW()
    `;

    await this.pool.query(query, [tankId]);
  }

  async incrementManualFillCount(tankId: string): Promise<void> {
    const query = `
      INSERT INTO tank_statistics (tank_id, date, manual_fill_count)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (tank_id, date)
      DO UPDATE SET
        manual_fill_count = tank_statistics.manual_fill_count + 1,
        updated_at = NOW()
    `;

    await this.pool.query(query, [tankId]);
  }

  // ===== MAPPERS =====
  private mapRowToTank(row: any): Tank {
    return new Tank({
      id: row.id,
      name: row.name,
      description: row.description,
      deviceId: row.device_id,
      sensorDeviceId: row.sensor_device_id,
      capacity: row.capacity,
      currentLevel: row.current_level,
      isActive: row.is_active,
      autoFillEnabled: row.auto_fill_enabled,
      autoFillMinLevel: row.auto_fill_min_level,
      autoFillMaxLevel: row.auto_fill_max_level,
      manualFillMaxLevel: row.manual_fill_max_level,
      manualFillDuration: row.manual_fill_duration,
      agitatorEnabled: row.agitator_enabled,
      agitatorStatus: row.agitator_status,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapRowToStatistics(row: any): TankStatistics {
    return new TankStatistics({
      id: row.id,
      tankId: row.tank_id,
      date: row.date,
      totalUsage: row.total_usage,
      totalFilled: row.total_filled,
      averageLevel: row.average_level,
      minLevel: row.min_level,
      maxLevel: row.max_level,
      autoFillCount: row.auto_fill_count,
      manualFillCount: row.manual_fill_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapRowToLog(row: any): TankLog {
    return new TankLog({
      id: row.id,
      tankId: row.tank_id,
      type: row.type,
      levelBefore: row.level_before,
      levelAfter: row.level_after,
      message: row.message,
      metadata: row.metadata,
      createdAt: row.created_at,
    });
  }
}
