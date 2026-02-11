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

    console.log('🔌 Attempting to connect to MQTT broker:', brokerUrl);

    return new Promise((resolve) => {
      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000, // 10 detik timeout untuk SSL
        rejectUnauthorized: false, // Untuk HiveMQ Cloud
      });

      // Timeout jika tidak connect dalam 12 detik
      const timeout = setTimeout(() => {
        console.warn(
          '⚠️  MQTT broker tidak tersedia. Server tetap jalan tanpa MQTT.',
        );
        console.log('   Broker URL:', brokerUrl);
        console.log('   Username:', username ? '✅ Set' : '❌ Not set');
        resolve(); // Resolve tanpa error
      }, 12000);

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
        console.log('📥 MQTT Message Received:');
        console.log('   Topic:', topic);
        console.log('   Payload:', payload.toString());

        // Check all subscriptions for wildcard matches
        for (const [pattern, callback] of this.subscriptions) {
          if (this.topicMatches(pattern, topic)) {
            console.log(`   ✅ Matched pattern: ${pattern}`);
            callback(payload.toString());
          }
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

  // Helper method untuk match wildcard topics (+ dan #)
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    // # wildcard harus di akhir dan match semua level
    if (pattern.includes('#')) {
      const hashIndex = patternParts.indexOf('#');
      if (hashIndex !== patternParts.length - 1) {
        return false; // # hanya boleh di akhir
      }
      // Check parts sebelum #
      for (let i = 0; i < hashIndex; i++) {
        if (patternParts[i] !== topicParts[i]) {
          return false;
        }
      }
      return true;
    }

    // + wildcard match single level
    if (patternParts.length !== topicParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }
}
