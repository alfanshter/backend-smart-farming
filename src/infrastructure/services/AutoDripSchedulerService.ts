/**
 * SERVICE - AutoDripSchedulerService
 *
 * Penjelasan:
 * Service untuk menjalankan scheduled jobs menggunakan cron.
 * Setiap menit, service ini akan:
 * 1. Mengambil semua jadwal aktif
 * 2. Cek apakah ada yang harus dijalankan sekarang
 * 3. Trigger watering via ZoneControlUseCase
 *
 * Menggunakan node-cron untuk scheduling.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { GetAutoDripScheduleUseCase } from '../../domain/use-cases/GetAutoDripScheduleUseCase';
import { ZoneControlUseCase } from '../../domain/use-cases/ZoneControlUseCase';

@Injectable()
export class AutoDripSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoDripSchedulerService.name);
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    private readonly getScheduleUseCase: GetAutoDripScheduleUseCase,
    private readonly zoneControlUseCase: ZoneControlUseCase,
  ) {}

  /**
   * Initialize cron job when module starts
   */
  onModuleInit() {
    this.startCronJob();
    this.logger.log('🤖 Auto Drip Scheduler Service initialized');
  }

  /**
   * Stop cron job when module is destroyed
   */
  onModuleDestroy() {
    this.stopCronJob();
    this.logger.log('🛑 Auto Drip Scheduler Service stopped');
  }

  /**
   * Start the cron job (runs every minute at :00 seconds)
   */
  private startCronJob() {
    // Cron expression: Setiap menit tepat di detik ke-0
    // Format: * * * * * (minute hour day month day-of-week)
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndTriggerWatering();
    });

    this.cronJob.start();
    this.logger.log('⏰ Cron job started - checking schedules every minute');
  }

  /**
   * Stop the cron job
   */
  private stopCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  /**
   * Main logic: Check all active schedules and trigger watering if needed
   */
  private async checkAndTriggerWatering() {
    try {
      const now = new Date();
      this.logger.debug(`⏰ Checking schedules at ${now.toISOString()}`);

      // Get all active schedules
      const activeSchedules = await this.getScheduleUseCase.getAllActive();
      
      if (activeSchedules.length === 0) {
        this.logger.debug('No active schedules found');
        return;
      }

      this.logger.debug(`Found ${activeSchedules.length} active schedule(s)`);

      // Check each schedule
      for (const schedule of activeSchedules) {
        if (schedule.shouldRunNow(now)) {
          this.logger.log(
            `✅ Schedule matched! Zone: ${schedule.zoneId}, Time: ${now.toLocaleTimeString()}`,
          );

          // Find the matching time slot to get duration
          const currentHour = now.getHours().toString().padStart(2, '0');
          const currentMinute = now.getMinutes().toString().padStart(2, '0');
          const currentTimeString = `${currentHour}:${currentMinute}`;

          const matchingSlot = schedule.timeSlots.find(
            (slot) => slot.startTime === currentTimeString,
          );

          if (matchingSlot) {
            // Trigger watering
            await this.triggerWatering(
              schedule.zoneId,
              matchingSlot.durationMinutes,
              matchingSlot.durationSeconds,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in checkAndTriggerWatering:', error);
    }
  }

  /**
   * Trigger watering for a zone
   */
  private async triggerWatering(
    zoneId: string,
    durationMinutes: number,
    durationSeconds: number,
  ) {
    try {
      this.logger.log(
        `💧 Triggering AUTO DRIP for zone ${zoneId} - Duration: ${durationMinutes}m ${durationSeconds}s`,
      );

      await this.zoneControlUseCase.activateZone(
        zoneId,
        durationMinutes,
        durationSeconds,
        'AUTO_DRIP', // Source marker
      );

      this.logger.log(`✅ Auto drip watering started for zone ${zoneId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to trigger watering for zone ${zoneId}:`, error);
    }
  }

  /**
   * Manual trigger for testing (can be called from controller)
   */
  async manualTrigger() {
    this.logger.log('🔧 Manual trigger requested');
    await this.checkAndTriggerWatering();
  }
}
