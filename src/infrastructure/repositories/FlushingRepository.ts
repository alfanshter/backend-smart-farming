import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { IFlushingRepository } from '../../domain/interfaces/IFlushingRepository';
import {
  FlushingSession,
  FlushingStatus,
  type FlushingStatistics,
} from '../../domain/entities/FlushingSession';

@Injectable()
export class FlushingRepository implements IFlushingRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: Partial<FlushingSession>): Promise<FlushingSession> {
    const query = `
      INSERT INTO flushing_sessions (
        user_id, duration_minutes, status, started_at, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.userId,
      data.durationMinutes,
      data.status || FlushingStatus.RUNNING,
      data.startedAt || new Date(),
      data.notes || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSession(result.rows[0]);
  }

  async findById(id: string): Promise<FlushingSession | null> {
    const query = 'SELECT * FROM flushing_sessions WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  }

  async findRunningSession(userId: string): Promise<FlushingSession | null> {
    const query = `
      SELECT * FROM flushing_sessions 
      WHERE user_id = $1 AND status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  }

  async findByUserId(
    userId: string,
    limit: number = 10,
  ): Promise<FlushingSession[]> {
    const query = `
      SELECT * FROM flushing_sessions 
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map((row) => this.mapRowToSession(row));
  }

  async update(
    id: string,
    data: Partial<FlushingSession>,
  ): Promise<FlushingSession> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.completedAt !== undefined) {
      fields.push(`completed_at = $${paramCount++}`);
      values.push(data.completedAt);
    }

    if (data.totalDurationMinutes !== undefined) {
      fields.push(`total_duration_minutes = $${paramCount++}`);
      values.push(data.totalDurationMinutes);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }

    values.push(id);

    const query = `
      UPDATE flushing_sessions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapRowToSession(result.rows[0]);
  }

  async createLog(log: {
    sessionId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const query = `
      INSERT INTO flushing_logs (session_id, event_type, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await this.pool.query(query, [
      log.sessionId,
      log.eventType,
      log.message,
      log.metadata ? JSON.stringify(log.metadata) : null,
    ]);
  }

  async getStatistics(userId: string): Promise<FlushingStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'stopped') as stopped_sessions,
        COALESCE(SUM(total_duration_minutes), 0) as total_duration,
        COALESCE(AVG(total_duration_minutes), 0) as avg_duration,
        MAX(started_at) as last_flushing
      FROM flushing_sessions
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalSessions: parseInt(row.total_sessions),
      completedSessions: parseInt(row.completed_sessions),
      stoppedSessions: parseInt(row.stopped_sessions),
      totalDurationMinutes: parseInt(row.total_duration),
      averageDurationMinutes: parseFloat(row.avg_duration),
      lastFlushingDate: row.last_flushing ? new Date(row.last_flushing) : undefined,
    };
  }

  private mapRowToSession(row: any): FlushingSession {
    return new FlushingSession(
      row.id,
      row.user_id,
      row.duration_minutes,
      row.status as FlushingStatus,
      new Date(row.started_at),
      row.completed_at ? new Date(row.completed_at) : undefined,
      row.total_duration_minutes,
      row.notes,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
