import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { ITankRepository } from '../interfaces/ITankRepository';
import type { IMqttClient } from '../interfaces/IMqttClient';
import { Tank } from '../entities/Tank';
import { TankControlAction } from '../../application/dtos/TankControlDto';
import { TankLogType } from '../entities/TankLog';

@Injectable()
export class TankControlUseCase {
  constructor(
    @Inject('ITankRepository')
    private readonly tankRepository: ITankRepository,
    @Inject('IMqttClient')
    private readonly mqttClient: IMqttClient,
  ) {}

  async createTank(userId: string, data: Partial<Tank>): Promise<Tank> {
    // Validasi device exists (optional - bisa ditambahkan device check)
    
    // Set default values
    const tankData = {
      ...data,
      userId,
      currentLevel: data.currentLevel ?? 0,
      isActive: true,
      autoFillEnabled: data.autoFillEnabled ?? false,
      autoFillMinLevel: data.autoFillMinLevel ?? 60,
      autoFillMaxLevel: data.autoFillMaxLevel ?? 90,
      manualFillMaxLevel: data.manualFillMaxLevel ?? 89,
      agitatorEnabled: data.agitatorEnabled ?? false,
      agitatorStatus: false,
    };

    const tank = await this.tankRepository.create(tankData);
    
    // Log creation
    await this.tankRepository.createLog({
      tankId: tank.id,
      type: TankLogType.LEVEL_UPDATE,
      levelBefore: 0,
      levelAfter: tank.currentLevel,
      message: `Tank "${tank.name}" created with capacity ${tank.capacity}L`,
    });

    return tank;
  }

  async getAllTanks(userId?: string): Promise<Tank[]> {
    return this.tankRepository.findAll(userId);
  }

  async getTankById(tankId: string): Promise<Tank> {
    const tank = await this.tankRepository.findById(tankId);
    if (!tank) {
      throw new NotFoundException(`Tank with ID ${tankId} not found`);
    }
    return tank;
  }

  async updateTank(tankId: string, data: Partial<Tank>): Promise<Tank> {
    const tank = await this.getTankById(tankId);
    
    // Validasi auto fill levels
    if (data.autoFillMinLevel !== undefined && data.autoFillMaxLevel !== undefined) {
      if (data.autoFillMinLevel >= data.autoFillMaxLevel) {
        throw new BadRequestException('Auto fill min level must be less than max level');
      }
    }

    return this.tankRepository.update(tankId, data);
  }

  async deleteTank(tankId: string): Promise<void> {
    await this.getTankById(tankId);
    await this.tankRepository.delete(tankId);
  }

  // ===== AGITATOR CONTROL =====
  async controlAgitator(tankId: string, turnOn: boolean): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    // Auto-enable agitator jika belum enabled
    if (!tank.agitatorEnabled) {
      await this.tankRepository.update(tankId, { agitatorEnabled: true });
    }

    if (tank.agitatorStatus === turnOn) {
      return tank; // Already in desired state
    }

    // Send MQTT command
    const command = turnOn ? 'AGITATOR_ON' : 'AGITATOR_OFF';
    await this.mqttClient.publish(
      `smartfarm/tank/${tank.deviceId}/control`,
      JSON.stringify({ command, tankId: tank.id }),
    );

    // Update status
    const updatedTank = await this.tankRepository.toggleAgitator(tankId, turnOn);

    // Log
    await this.tankRepository.createLog({
      tankId,
      type: turnOn ? TankLogType.AGITATOR_ON : TankLogType.AGITATOR_OFF,
      levelBefore: tank.currentLevel,
      levelAfter: tank.currentLevel,
      message: `Agitator turned ${turnOn ? 'ON' : 'OFF'}`,
    });

    return updatedTank;
  }

  // ===== MANUAL FILL CONTROL =====
  async startManualFill(tankId: string, durationMinutes?: number): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    // Check if already at max level
    if (tank.currentLevel >= tank.manualFillMaxLevel) {
      throw new BadRequestException(
        `Tank is already at or above manual fill max level (${tank.manualFillMaxLevel}%)`,
      );
    }

    // Gunakan durasi dari parameter atau dari tank settings (manualFillDuration)
    const duration = durationMinutes ?? tank.manualFillDuration;

    // Send MQTT command to start pump (device kontrol terpisah dari sensor)
    await this.mqttClient.publish(
      `smartfarm/tank/${tank.deviceId}/control`,
      JSON.stringify({
        command: 'MANUAL_FILL_START',
        tankId: tank.id,
        duration: duration, // Dalam menit, undefined jika tanpa durasi (manual stop)
      }),
    );

    // Increment manual fill count
    await this.tankRepository.incrementManualFillCount(tankId);

    // Log dengan info durasi
    const durationMsg = duration 
      ? ` (duration: ${duration} minutes)` 
      : ' (manual mode - stop manually)';
    await this.tankRepository.createLog({
      tankId,
      type: TankLogType.MANUAL_FILL_START,
      levelBefore: tank.currentLevel,
      levelAfter: tank.currentLevel,
      message: `Manual fill started (target: ${tank.manualFillMaxLevel}%)${durationMsg}`,
    });

    return tank;
  }

  async stopManualFill(tankId: string): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    // Send MQTT command to stop pump
    await this.mqttClient.publish(
      `smartfarm/tank/${tank.deviceId}/control`,
      JSON.stringify({
        command: 'MANUAL_FILL_STOP',
        tankId: tank.id,
      }),
    );

    // Log
    await this.tankRepository.createLog({
      tankId,
      type: TankLogType.MANUAL_FILL_STOP,
      levelBefore: tank.currentLevel,
      levelAfter: tank.currentLevel,
      message: 'Manual fill stopped',
    });

    return tank;
  }

  // ===== AUTO FILL CONTROL =====
  async checkAndTriggerAutoFill(): Promise<void> {
    // Called by cron scheduler every minute
    const tanks = await this.tankRepository.findAll();

    for (const tank of tanks) {
      if (!tank.isActive || !tank.autoFillEnabled) {
        continue;
      }

      // Check if level is below minimum
      if (tank.currentLevel < tank.autoFillMinLevel) {
        console.log(
          `🚰 AUTO FILL TRIGGERED for tank "${tank.name}" (Level: ${tank.currentLevel}% < ${tank.autoFillMinLevel}%)`,
        );
        await this.startAutoFill(tank.id);
      }
    }
  }

  private async startAutoFill(tankId: string): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    // Send MQTT command (device kontrol terpisah dari sensor)
    await this.mqttClient.publish(
      `smartfarm/tank/${tank.deviceId}/control`,
      JSON.stringify({
        command: 'AUTO_FILL_START',
        tankId: tank.id,
      }),
    );

    // Increment auto fill count
    await this.tankRepository.incrementAutoFillCount(tankId);

    // Log
    await this.tankRepository.createLog({
      tankId,
      type: TankLogType.AUTO_FILL_START,
      levelBefore: tank.currentLevel,
      levelAfter: tank.currentLevel,
      message: `Auto fill started (target: ${tank.autoFillMinLevel}% → ${tank.autoFillMaxLevel}%)`,
    });

    return tank;
  }

  async stopAutoFill(tankId: string): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    // Send MQTT command
    await this.mqttClient.publish(
      `smartfarm/tank/${tank.deviceId}/control`,
      JSON.stringify({
        command: 'AUTO_FILL_STOP',
        tankId: tank.id,
      }),
    );

    // Log
    await this.tankRepository.createLog({
      tankId,
      type: TankLogType.AUTO_FILL_STOP,
      levelBefore: tank.currentLevel,
      levelAfter: tank.currentLevel,
      message: 'Auto fill stopped (target level reached)',
    });

    return tank;
  }

  // ===== LEVEL UPDATE (called from MQTT or sensor) =====
  async updateLevel(tankId: string, newLevel: number): Promise<Tank> {
    const tank = await this.getTankById(tankId);

    if (newLevel < 0 || newLevel > 100) {
      throw new BadRequestException('Level must be between 0 and 100');
    }

    const oldLevel = tank.currentLevel;
    const updatedTank = await this.tankRepository.updateLevel(tankId, newLevel);

    // Calculate volume change in liters
    const volumeChange = ((newLevel - oldLevel) / 100) * tank.capacity;

    if (volumeChange > 0) {
      // Water added (filled)
      await this.tankRepository.incrementFilled(tankId, volumeChange);
    } else if (volumeChange < 0) {
      // Water used
      await this.tankRepository.incrementUsage(tankId, Math.abs(volumeChange));
    }

    // Check for overflow warning
    if (newLevel >= 95) {
      await this.tankRepository.createLog({
        tankId,
        type: TankLogType.OVERFLOW_WARNING,
        levelBefore: oldLevel,
        levelAfter: newLevel,
        message: `⚠️ Tank level critical: ${newLevel}% - Risk of overflow!`,
      });
    }

    // Auto-stop if auto fill is active and reached max level
    if (tank.autoFillEnabled && newLevel >= tank.autoFillMaxLevel) {
      await this.stopAutoFill(tankId);
    }

    return updatedTank;
  }

  // ===== STATISTICS =====
  async getTankStatistics(
    tankId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const tank = await this.getTankById(tankId);
    const statistics = await this.tankRepository.getStatistics(
      tankId,
      startDate,
      endDate,
    );

    return {
      tank: {
        id: tank.id,
        name: tank.name,
        capacity: tank.capacity,
        currentLevel: tank.currentLevel,
      },
      statistics,
    };
  }

  async getTodayStatistics(tankId: string): Promise<any> {
    const tank = await this.getTankById(tankId);
    const stats = await this.tankRepository.getTodayStatistics(tankId);

    // Calculate current volume in liters
    const currentVolume = (tank.currentLevel / 100) * tank.capacity;

    return {
      tankId: tank.id,
      tankName: tank.name,
      currentLevel: tank.currentLevel,
      currentVolume: Math.round(currentVolume),
      capacity: tank.capacity,
      today: stats || {
        totalUsage: 0,
        totalFilled: 0,
        averageLevel: tank.currentLevel,
        minLevel: tank.currentLevel,
        maxLevel: tank.currentLevel,
        autoFillCount: 0,
        manualFillCount: 0,
      },
    };
  }

  async getRecentLogs(tankId: string, limit = 50): Promise<any[]> {
    await this.getTankById(tankId);
    return this.tankRepository.getLogs(tankId, limit);
  }

  // ===== TANK STATUS (for frontend polling) =====
  async getTankStatus(tankId: string): Promise<any> {
    const tank = await this.getTankById(tankId);
    const todayStats = await this.tankRepository.getTodayStatistics(tankId);

    const currentVolume = (tank.currentLevel / 100) * tank.capacity;

    return {
      tankId: tank.id,
      name: tank.name,
      capacity: tank.capacity,
      currentLevel: tank.currentLevel,
      currentVolume: Math.round(currentVolume),
      isActive: tank.isActive,
      
      // Agitator
      agitator: {
        enabled: tank.agitatorEnabled,
        status: tank.agitatorStatus,
      },
      
      // Auto Fill
      autoFill: {
        enabled: tank.autoFillEnabled,
        minLevel: tank.autoFillMinLevel,
        maxLevel: tank.autoFillMaxLevel,
      },
      
      // Manual Fill
      manualFill: {
        maxLevel: tank.manualFillMaxLevel,
        canFill: tank.currentLevel < tank.manualFillMaxLevel,
      },
      
      // Today's statistics
      todayUsage: todayStats?.totalUsage || 0,
      todayFilled: todayStats?.totalFilled || 0,
    };
  }
}
