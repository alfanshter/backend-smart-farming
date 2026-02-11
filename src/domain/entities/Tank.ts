export class Tank {
  id: string;
  name: string;
  description?: string;
  deviceId: string; // ESP32 device yang mengontrol tandon (pompa, agitator)
  sensorDeviceId?: string; // ESP32 device untuk sensor level (optional)
  capacity: number; // Kapasitas maksimum dalam liter
  currentLevel: number; // Level saat ini dalam persen (0-100)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Settings untuk kontrol otomatis
  autoFillEnabled: boolean; // Pengisian otomatis aktif/tidak
  autoFillMinLevel: number; // Level minimum untuk mulai isi (%)
  autoFillMaxLevel: number; // Level target untuk berhenti isi (%)
  
  // Manual fill settings
  manualFillMaxLevel: number; // Batas maksimum untuk pompa manual (%)
  manualFillDuration?: number; // Durasi pengisian manual (menit) - untuk tank tanpa sensor
  
  // Agitator (Pengaduk)
  agitatorEnabled: boolean; // Pengaduk aktif/tidak
  agitatorStatus: boolean; // Status pengaduk saat ini (on/off)
  
  userId: string;

  constructor(partial: Partial<Tank>) {
    Object.assign(this, partial);
  }
}
