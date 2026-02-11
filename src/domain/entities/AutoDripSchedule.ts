/**
 * DOMAIN ENTITY - AutoDripSchedule
 * 
 * Penjelasan:
 * Entity domain untuk jadwal penyiraman otomatis.
 * Berisi time slots (waktu mulai + durasi) dan active days (hari-hari aktif).
 */

export interface TimeSlot {
  startTime: string; // Format: "HH:MM" (24-hour), contoh: "07:00", "17:30"
  durationMinutes: number; // Durasi dalam menit
  durationSeconds: number; // Durasi dalam detik
}

export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

export class AutoDripSchedule {
  id: string; // UUID
  zoneId: string; // ID zona yang dijadwalkan
  isActive: boolean; // Status aktif/non-aktif
  timeSlots: TimeSlot[]; // Array of time slots
  activeDays: DayOfWeek[]; // Hari-hari aktif dalam seminggu
  userId: string; // ID user pemilik jadwal
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    zoneId: string,
    isActive: boolean,
    timeSlots: TimeSlot[],
    activeDays: DayOfWeek[],
    userId: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.zoneId = zoneId;
    this.isActive = isActive;
    this.timeSlots = timeSlots;
    this.activeDays = activeDays;
    this.userId = userId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Mendapatkan total durasi penyiraman dalam detik untuk satu time slot
   */
  getTimeSlotDurationInSeconds(timeSlot: TimeSlot): number {
    return timeSlot.durationMinutes * 60 + timeSlot.durationSeconds;
  }

  /**
   * Mendapatkan total durasi penyiraman per hari (semua time slots)
   */
  getTotalDailyDurationInSeconds(): number {
    return this.timeSlots.reduce((total, slot) => {
      return total + this.getTimeSlotDurationInSeconds(slot);
    }, 0);
  }

  /**
   * Cek apakah jadwal aktif untuk hari tertentu
   */
  isActiveOnDay(day: DayOfWeek): boolean {
    return this.isActive && this.activeDays.includes(day);
  }

  /**
   * Cek apakah jadwal harus dijalankan sekarang
   */
  shouldRunNow(currentTime: Date): boolean {
    if (!this.isActive) return false;

    // Cek hari
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[currentTime.getDay()];
    
    if (!this.activeDays.includes(currentDay)) return false;

    // Cek time slot
    const currentHour = currentTime.getHours().toString().padStart(2, '0');
    const currentMinute = currentTime.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;

    return this.timeSlots.some(slot => slot.startTime === currentTimeString);
  }

  /**
   * Mendapatkan time slot berikutnya yang akan dijalankan
   */
  getNextTimeSlot(currentTime: Date): TimeSlot | null {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[currentTime.getDay()];
    
    if (!this.isActiveOnDay(currentDay)) return null;

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Cari time slot berikutnya hari ini
    for (const slot of this.timeSlots) {
      const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;

      if (slotTimeInMinutes > currentTimeInMinutes) {
        return slot;
      }
    }

    return null; // Tidak ada time slot lagi hari ini
  }
}
