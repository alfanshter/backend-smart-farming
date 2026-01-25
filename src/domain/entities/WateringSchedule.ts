/**
 * DOMAIN ENTITY - WateringSchedule
 *
 * Penjelasan:
 * Entity ini merepresentasikan jadwal penyiraman otomatis.
 * Bisa berdasarkan waktu (time-based) atau sensor (sensor-based).
 */

export class WateringSchedule {
  constructor(
    public readonly id: string,
    public name: string,
    public deviceId: string,
    public type: ScheduleType,
    public isActive: boolean,
    public startTime?: string,
    public duration?: number,
    public moistureThreshold?: number,
    public daysOfWeek?: number[],
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  // Business Logic: Aktifkan jadwal
  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  // Business Logic: Nonaktifkan jadwal
  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  // Business Logic: Cek apakah jadwal harus jalan sekarang (untuk time-based)
  shouldRunNow(): boolean {
    if (!this.isActive || this.type !== ScheduleType.TIME_BASED) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Cek apakah hari ini termasuk dalam jadwal
    const isDayScheduled = this.daysOfWeek?.includes(currentDay) ?? false;

    // Cek apakah waktu sekarang sesuai jadwal
    const isTimeMatched = this.startTime === currentTime;

    return isDayScheduled && isTimeMatched;
  }

  // Business Logic: Cek apakah perlu menyiram berdasarkan sensor
  shouldRunBySensor(moistureValue: number): boolean {
    if (!this.isActive || this.type !== ScheduleType.SENSOR_BASED) {
      return false;
    }

    // Jika kelembaban di bawah threshold, nyalakan penyiraman
    return moistureValue < (this.moistureThreshold ?? 30);
  }
}

export enum ScheduleType {
  TIME_BASED = 'TIME_BASED',
  SENSOR_BASED = 'SENSOR_BASED',
  MANUAL = 'MANUAL',
}
