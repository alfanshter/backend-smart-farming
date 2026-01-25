/**
 * DOMAIN ENTITY - Sensor
 *
 * Penjelasan:
 * Entity ini merepresentasikan data sensor dari perangkat IoT.
 * Sensor bisa berupa sensor kelembaban tanah, suhu, atau kelembaban udara.
 */

export class Sensor {
  constructor(
    public readonly id: string,
    public deviceId: string,
    public type: SensorType,
    public value: number,
    public unit: string,
    public timestamp: Date,
    public metadata?: Record<string, any>,
  ) {}

  // Business Logic: Cek apakah kelembaban tanah rendah (perlu disiram)
  isLowMoisture(): boolean {
    if (this.type !== SensorType.SOIL_MOISTURE) {
      return false;
    }
    // Jika kelembaban di bawah 30%, butuh penyiraman
    return this.value < 30;
  }

  // Business Logic: Cek apakah suhu terlalu tinggi
  isHighTemperature(): boolean {
    if (this.type !== SensorType.TEMPERATURE) {
      return false;
    }
    // Jika suhu di atas 35°C, terlalu panas
    return this.value > 35;
  }

  // Business Logic: Validasi nilai sensor masuk akal
  isValidValue(): boolean {
    switch (this.type) {
      case SensorType.SOIL_MOISTURE:
        return this.value >= 0 && this.value <= 100;
      case SensorType.TEMPERATURE:
        return this.value >= -10 && this.value <= 60;
      case SensorType.HUMIDITY:
        return this.value >= 0 && this.value <= 100;
      default:
        return true;
    }
  }
}

export enum SensorType {
  SOIL_MOISTURE = 'SOIL_MOISTURE',
  TEMPERATURE = 'TEMPERATURE',
  HUMIDITY = 'HUMIDITY',
  WATER_LEVEL = 'WATER_LEVEL',
}
