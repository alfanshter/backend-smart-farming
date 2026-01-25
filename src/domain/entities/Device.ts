/**
 * DOMAIN ENTITY - Device
 *
 * Penjelasan:
 * Entity ini merepresentasikan perangkat IoT (ESP32/Arduino) yang terhubung dengan sistem.
 * Dalam Clean Architecture, entity adalah objek bisnis murni tanpa ketergantungan framework.
 */

export class Device {
  constructor(
    public readonly id: string, // ID unik device
    public name: string, // Nama device (contoh: "Pompa Air Zona 1")
    public type: DeviceType, // Tipe device (PUMP, SENSOR, VALVE)
    public mqttTopic: string, // MQTT topic untuk komunikasi
    public status: DeviceStatus, // Status device (ONLINE, OFFLINE, ERROR)
    public isActive: boolean, // Apakah device aktif atau tidak
    public lastSeen?: Date, // Kapan terakhir device kirim data
    public metadata?: Record<string, any>, // Data tambahan (lokasi, spesifikasi, dll)
  ) {}

  // Business Logic: Aktifkan device
  activate(): void {
    this.isActive = true;
  }

  // Business Logic: Nonaktifkan device
  deactivate(): void {
    this.isActive = false;
  }

  // Business Logic: Update status device
  updateStatus(status: DeviceStatus): void {
    this.status = status;
    this.lastSeen = new Date();
  }

  // Business Logic: Cek apakah device masih online
  isOnline(): boolean {
    if (!this.lastSeen) return false;

    const now = new Date();
    const diffMinutes = (now.getTime() - this.lastSeen.getTime()) / 1000 / 60;

    // Jika lebih dari 5 menit tidak ada kabar, anggap offline
    return diffMinutes < 5;
  }
}

// Enums untuk tipe-tipe yang digunakan
export enum DeviceType {
  PUMP = 'PUMP', // Pompa air
  SENSOR = 'SENSOR', // Sensor kelembaban/suhu
  VALVE = 'VALVE', // Katup air
  CONTROLLER = 'CONTROLLER', // Controller utama
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE',
}
