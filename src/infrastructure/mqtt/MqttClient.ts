/**
 * INFRASTRUCTURE - MqttClient
 *
 * Penjelasan:
 * Ini adalah IMPLEMENTASI dari IMqttClient interface.
 * Di sini kita gunakan library 'mqtt' untuk koneksi ke broker MQTT.
 *
 * MQTT Broker bisa:
 * - HiveMQ (cloud gratis)
 * - Mosquitto (local)
 * - AWS IoT Core
 * - dll
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { IMqttClient } from '../../domain/interfaces/IMqttClient';

@Injectable()
export class MqttClient implements IMqttClient, OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private subscriptions: Map<string, (message: string) => void> = new Map();

  constructor(private readonly configService: ConfigService) {}

  // Lifecycle: Connect saat module diinisialisasi
  async onModuleInit() {
    await this.connect();
  }

  // Lifecycle: Disconnect saat module di-destroy
  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    const brokerUrl = this.configService.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 5000, // 5 detik timeout
      });

      // Timeout jika tidak connect dalam 6 detik
      const timeout = setTimeout(() => {
        console.warn(
          '⚠️  MQTT broker tidak tersedia. Server tetap jalan tanpa MQTT.',
        );
        resolve(); // Resolve tanpa error
      }, 6000);

      this.client.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ MQTT Client connected to broker');
        resolve();
      });

      this.client.on('error', (error) => {
        clearTimeout(timeout);
        console.warn('⚠️  MQTT connection error:', error.message);
        console.log(
          '💡 Server tetap jalan. Install MQTT broker untuk enable IoT features.',
        );
        resolve(); // Resolve instead of reject agar server tidak crash
      });

      this.client.on('message', (topic, payload) => {
        const callback = this.subscriptions.get(topic);
        if (callback) {
          callback(payload.toString());
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          console.log('MQTT Client disconnected');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async publish(topic: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`📤 Published to ${topic}:`, message);
          resolve();
        }
      });
    });
  }

  async subscribe(
    topic: string,
    callback: (message: string) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          this.subscriptions.set(topic, callback);
          console.log(`📥 Subscribed to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          console.log(`Unsubscribed from topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
