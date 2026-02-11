// ===================================================================
// GARDEN WATERING REPOSITORY IMPLEMENTATION
// ===================================================================
// Purpose: PostgreSQL implementation for garden watering repository
// Author: Smart Farming Team
// Date: February 11, 2026

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  GardenWateringSession,
  GardenWateringStatus,
  GardenWateringLog,
  GardenWateringStatistics,
  GardenWateringEventType,
} from '../../domain/entities/GardenWateringSession';
import { IGardenWateringRepository } from '../../domain/interfaces/IGardenWateringRepository';

@Injectable()
export class GardenWateringRepository implements IGardenWateringRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(
    userId: string,
    durationMinutes: number,
    notes?: string,
  ): Promise<GardenWateringSession> {
    const query = `
      INSERT INTO garden_watering_sessions (user_id, duration_minutes, status, started_at, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.dataSource.query(query, [
      userId,
      durationMinutes,
      GardenWateringStatus.RUNNING,
      new Date(),
      notes || null,
    ]);

    return this.mapToEntity(result[0]);
  }

  async findById(sessionId: string): Promise<GardenWateringSession | null> {
    const query = `
      SELECT * FROM garden_watering_sessions
      WHERE id = $1
    `;

    const result = await this.dataSource.query(query, [sessionId]);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findRunningSession(
    userId: string,
  ): Promise<GardenWateringSession | null> {
    const query = `
      SELECT * FROM garden_watering_sessions
      WHERE user_id = $1 AND status = $2
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const result = await this.dataSource.query(query, [
      userId,
      GardenWateringStatus.RUNNING,
    ]);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByUserId(
    userId: string,
    limit: number = 10,
  ): Promise<GardenWateringSession[]> {
    const query = `
      SELECT * FROM garden_watering_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;

    const result = await this.dataSource.query(query, [userId, limit]);

    return result.map((row) => this.mapToEntity(row));
  }

  async update(
    sessionId: string,
    updates: Partial<GardenWateringSession>,
  ): Promise<GardenWateringSession> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.completedAt !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }

    if (updates.totalDurationMinutes !== undefined) {
      setClauses.push(`total_duration_minutes = $${paramIndex++}`);
      values.push(updates.totalDurationMinutes);
    }

    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(updates.notes);
    }

    values.push(sessionId);

    const query = `
      UPDATE garden_watering_sessions
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.dataSource.query(query, values);

    return this.mapToEntity(result[0]);
  }

  async createLog(
    sessionId: string,
    eventType: string,
    message?: string,
  ): Promise<GardenWateringLog> {
    const query = `
      INSERT INTO garden_watering_logs (session_id, event_type, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await this.dataSource.query(query, [
      sessionId,
      eventType,
      message || null,
    ]);

    return this.mapToLog(result[0]);
  }

  async getStatistics(userId: string): Promise<GardenWateringStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped_sessions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
        COALESCE(SUM(total_duration_minutes), 0) as total_duration,
        COALESCE(AVG(total_duration_minutes), 0) as average_duration,
        MAX(started_at) as last_watering_date
      FROM garden_watering_sessions
      WHERE user_id = $1
    `;

    const result = await this.dataSource.query(query, [userId]);
    const row = result[0];

    return {
      totalSessions: parseInt(row.total_sessions),
      completedSessions: parseInt(row.completed_sessions),
      stoppedSessions: parseInt(row.stopped_sessions),
      failedSessions: parseInt(row.failed_sessions),
      totalDurationMinutes: parseFloat(row.total_duration),
      averageDurationMinutes: parseFloat(row.average_duration),
      lastWateringDate: row.last_watering_date || undefined,
    };
  }

  private mapToEntity(row: any): GardenWateringSession {
    return new GardenWateringSession({
      id: row.id,
      userId: row.user_id,
      durationMinutes: row.duration_minutes,
      status: row.status as GardenWateringStatus,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      totalDurationMinutes: row.total_duration_minutes || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapToLog(row: any): GardenWateringLog {
    return new GardenWateringLog({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type as GardenWateringEventType,
      message: row.message || undefined,
      createdAt: row.created_at,
    });
  }
}
