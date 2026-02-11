import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { IFlushingRepository } from '../interfaces/IFlushingRepository';
import type { IMqttClient } from '../interfaces/IMqttClient';
import {
  FlushingSession,
  FlushingStatus,
  FlushingEventType,
  type FlushingStatistics,
} from '../entities/FlushingSession';

@Injectable()
export class FlushingUseCase {
  constructor(
    @Inject('IFlushingRepository')
    private readonly flushingRepository: IFlushingRepository,
    @Inject('IMqttClient')
    private readonly mqttClient: IMqttClient,
  ) {}

  // ===== START FLUSHING =====
  async startFlushing(
    userId: string,
    durationMinutes: number,
    notes?: string,
  ): Promise<FlushingSession> {
    // Check jika ada flushing yang sedang running
    const runningSession = await this.flushingRepository.findRunningSession(userId);

    if (runningSession) {
      throw new BadRequestException(
        'Flushing sedang berjalan. Stop flushing yang aktif terlebih dahulu.',
      );
    }

    // Create session baru
    const session = await this.flushingRepository.create({
      userId,
      durationMinutes,
      status: FlushingStatus.RUNNING,
      startedAt: new Date(),
      notes,
    });

    // Send MQTT command ke semua zone/valve untuk buka valve
    await this.mqttClient.publish(
      'smartfarm/flushing/control',
      JSON.stringify({
        command: 'FLUSHING_START',
        sessionId: session.id,
        durationMinutes,
      }),
    );

    // Create log
    await this.flushingRepository.createLog({
      sessionId: session.id,
      eventType: FlushingEventType.STARTED,
      message: `Flushing dimulai dengan durasi ${durationMinutes} menit`,
      metadata: { durationMinutes },
    });

    return session;
  }

  // ===== STOP FLUSHING =====
  async stopFlushing(userId: string, notes?: string): Promise<FlushingSession> {
    // Find running session
    const session = await this.flushingRepository.findRunningSession(userId);

    if (!session) {
      throw new NotFoundException('Tidak ada flushing yang sedang berjalan');
    }

    // Calculate actual duration (dalam menit)
    const startTime = new Date(session.startedAt).getTime();
    const endTime = Date.now();
    const actualDurationMinutes = Math.floor((endTime - startTime) / 60000);

    // Update session
    const updatedSession = await this.flushingRepository.update(session.id, {
      status: FlushingStatus.STOPPED,
      completedAt: new Date(),
      totalDurationMinutes: actualDurationMinutes,
      notes: notes || session.notes,
    });

    // Send MQTT command untuk stop semua valve
    await this.mqttClient.publish(
      'smartfarm/flushing/control',
      JSON.stringify({
        command: 'FLUSHING_STOP',
        sessionId: session.id,
      }),
    );

    // Create log
    await this.flushingRepository.createLog({
      sessionId: session.id,
      eventType: FlushingEventType.STOPPED,
      message: `Flushing dihentikan manual setelah ${actualDurationMinutes} menit`,
      metadata: { actualDurationMinutes },
    });

    return updatedSession;
  }

  // ===== COMPLETE FLUSHING (Called by ESP32 via MQTT) =====
  async completeFlushing(sessionId: string): Promise<FlushingSession> {
    const session = await this.flushingRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException(`Flushing session ${sessionId} tidak ditemukan`);
    }

    if (session.status !== FlushingStatus.RUNNING) {
      return session; // Already completed/stopped
    }

    // Calculate actual duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = Date.now();
    const actualDurationMinutes = Math.floor((endTime - startTime) / 60000);

    // Update session
    const updatedSession = await this.flushingRepository.update(session.id, {
      status: FlushingStatus.COMPLETED,
      completedAt: new Date(),
      totalDurationMinutes: actualDurationMinutes,
    });

    // Create log
    await this.flushingRepository.createLog({
      sessionId: session.id,
      eventType: FlushingEventType.COMPLETED,
      message: `Flushing selesai normal setelah ${actualDurationMinutes} menit`,
      metadata: { actualDurationMinutes, plannedDuration: session.durationMinutes },
    });

    return updatedSession;
  }

  // ===== GET HISTORY =====
  async getHistory(userId: string, limit: number = 10): Promise<FlushingSession[]> {
    return this.flushingRepository.findByUserId(userId, limit);
  }

  // ===== GET STATISTICS =====
  async getStatistics(userId: string): Promise<FlushingStatistics> {
    return this.flushingRepository.getStatistics(userId);
  }

  // ===== GET CURRENT SESSION =====
  async getCurrentSession(userId: string): Promise<FlushingSession | null> {
    return this.flushingRepository.findRunningSession(userId);
  }
}
