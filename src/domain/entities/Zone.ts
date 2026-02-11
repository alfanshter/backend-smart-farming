/**
 * DOMAIN - Zone Entity
 *
 * Penjelasan:
 * Entity untuk zona penyiraman dengan kontrol manual
 */

export interface Zone {
  id: string;
  name: string; // e.g., "Zona A", "Zona B"
  description?: string;
  deviceId?: string; // ID device pump/valve yang mengontrol zona ini (nullable)
  isActive: boolean;
  durationMinutes: number; // Durasi dalam menit
  durationSeconds: number; // Durasi detik tambahan
  startedAt?: Date; // Waktu mulai penyiraman
  remainingSeconds?: number; // Sisa waktu countdown
  userId: string; // User yang mengaktifkan
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneControlRequest {
  zoneId: string;
  isActive: boolean;
  durationMinutes: number;
  durationSeconds: number;
  userId: string;
}

export interface ZoneStatus {
  zoneId: string;
  name: string;
  isActive: boolean;
  totalDurationSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  startedAt?: Date;
  estimatedEndTime?: Date;
}
