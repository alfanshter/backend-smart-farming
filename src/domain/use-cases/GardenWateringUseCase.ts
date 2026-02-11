// ===================================================================
// GARDEN WATERING USE CASE
// ===================================================================
// Purpose: Business logic for garden watering operations
// Author: Smart Farming Team
// Date: February 11, 2026

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { IGardenWateringRepository } from '../../domain/interfaces/IGardenWateringRepository';
import {
  GardenWateringSession,
  GardenWateringStatus,
  GardenWateringEventType,
  GardenWateringStatistics,
} from '../../domain/entities/GardenWateringSession';
import type { IMqttClient } from '../../domain/interfaces/IMqttClient';

@Injectable()
export class GardenWateringUseCase {
  constructor(
    @Inject('IGardenWateringRepository')
    private readonly gardenWateringRepository: IGardenWateringRepository,
    @Inject('IMqttClient')
    private readonly mqttClient: IMqttClient,
  ) {}

  /**
   * Start a new garden watering session
   */
  async startGardenWatering(
    userId: string,
    durationMinutes: number,
    notes?: string,
  ): Promise<GardenWateringSession> {
    // Check if there's already a running session
    const runningSession =
      await this.gardenWateringRepository.findRunningSession(userId);

    if (runningSession) {
      throw new BadRequestException(
        'Ada sesi penyiraman kebun yang sedang berjalan. Hentikan terlebih dahulu sebelum memulai yang baru.',
      );
    }

    // Create new session
    const session = await this.gardenWateringRepository.create(
      userId,
      durationMinutes,
      notes,
    );

    // Log event
    await this.gardenWateringRepository.createLog(
      session.id,
      GardenWateringEventType.SESSION_STARTED,
      `Penyiraman kebun dimulai untuk ${durationMinutes} menit`,
    );

    // Publish MQTT command to ESP32
    await this.publishStartCommand(session);

    return session;
  }

  /**
   * Stop the current garden watering session
   */
  async stopGardenWatering(
    userId: string,
    notes?: string,
  ): Promise<GardenWateringSession> {
    // Find running session
    const session =
      await this.gardenWateringRepository.findRunningSession(userId);

    if (!session) {
      throw new NotFoundException('Tidak ada sesi penyiraman kebun yang sedang berjalan');
    }

    // Calculate actual duration
    const actualDuration = Math.floor(
      (new Date().getTime() - session.startedAt.getTime()) / 60000,
    );

    // Update session
    const updatedSession = await this.gardenWateringRepository.update(
      session.id,
      {
        status: GardenWateringStatus.STOPPED,
        completedAt: new Date(),
        totalDurationMinutes: actualDuration,
        notes: notes || session.notes,
      },
    );

    // Log event
    await this.gardenWateringRepository.createLog(
      session.id,
      GardenWateringEventType.SESSION_STOPPED,
      `Penyiraman kebun dihentikan setelah ${actualDuration} menit`,
    );

    // Publish MQTT command to ESP32
    await this.publishStopCommand(session.id);

    return updatedSession;
  }

  /**
   * Complete garden watering (called by ESP32 via MQTT)
   */
  async completeGardenWatering(
    sessionId: string,
    actualDuration: number,
  ): Promise<GardenWateringSession> {
    const session = await this.gardenWateringRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session tidak ditemukan');
    }

    // Update session
    const updatedSession = await this.gardenWateringRepository.update(
      sessionId,
      {
        status: GardenWateringStatus.COMPLETED,
        completedAt: new Date(),
        totalDurationMinutes: actualDuration,
      },
    );

    // Log event
    await this.gardenWateringRepository.createLog(
      sessionId,
      GardenWateringEventType.SESSION_COMPLETED,
      `Penyiraman kebun selesai. Durasi: ${actualDuration} menit`,
    );

    return updatedSession;
  }

  /**
   * Get current running session
   */
  async getCurrentSession(
    userId: string,
  ): Promise<GardenWateringSession | null> {
    return this.gardenWateringRepository.findRunningSession(userId);
  }

  /**
   * Get watering history
   */
  async getHistory(
    userId: string,
    limit: number = 10,
  ): Promise<GardenWateringSession[]> {
    return this.gardenWateringRepository.findByUserId(userId, limit);
  }

  /**
   * Get statistics
   */
  async getStatistics(userId: string): Promise<GardenWateringStatistics> {
    return this.gardenWateringRepository.getStatistics(userId);
  }

  /**
   * Publish START command to MQTT
   */
  private async publishStartCommand(
    session: GardenWateringSession,
  ): Promise<void> {
    const topic = 'smartfarm/garden/control';
    const payload = {
      command: 'START_GARDEN_WATERING',
      duration: session.durationMinutes * 60, // Convert to seconds
      sessionId: session.id,
    };

    await this.mqttClient.publish(topic, JSON.stringify(payload));

    console.log('📤 MQTT Command Published:', topic, payload);
  }

  /**
   * Publish STOP command to MQTT
   */
  private async publishStopCommand(sessionId: string): Promise<void> {
    const topic = 'smartfarm/garden/control';
    const payload = {
      command: 'STOP_GARDEN_WATERING',
      sessionId,
    };

    await this.mqttClient.publish(topic, JSON.stringify(payload));

    console.log('📤 MQTT Command Published:', topic, payload);
  }
}
