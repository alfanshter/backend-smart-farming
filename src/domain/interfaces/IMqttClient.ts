/**
 * DOMAIN INTERFACE - IMqttClient
 *
 * Penjelasan:
 * Interface ini adalah "kontrak" untuk MQTT client.
 * Kita definisikan apa yang BISA dilakukan oleh MQTT client,
 * tapi TIDAK peduli bagaimana implementasinya.
 *
 * Ini prinsip Dependency Inversion di Clean Architecture:
 * Domain tidak bergantung pada teknologi spesifik!
 */

export interface IMqttClient {
  // Connect ke MQTT broker
  connect(): Promise<void>;

  // Disconnect dari MQTT broker
  disconnect(): Promise<void>;

  // Publish pesan ke topic tertentu
  publish(topic: string, message: string): Promise<void>;

  // Subscribe ke topic tertentu dan terima callback
  subscribe(topic: string, callback: (message: string) => void): Promise<void>;

  // Unsubscribe dari topic
  unsubscribe(topic: string): Promise<void>;

  // Cek status koneksi
  isConnected(): boolean;
}
