import { HardwareInfo } from '../types';

export class HardwareDetection {
  private static cachedInfo: HardwareInfo | null = null;

  static async detect(): Promise<HardwareInfo> {
    if (this.cachedInfo) return this.cachedInfo;

    const info: HardwareInfo = {
      platform: this.detectPlatform(),
      hasGPU: await this.detectGPU(),
      hasNPU: await this.detectNPU(),
      memoryMB: this.detectMemory(),
      cores: this.detectCores(),
      architecture: this.detectArchitecture()
    };

    this.cachedInfo = info;
    return info;
  }

  private static detectPlatform(): HardwareInfo['platform'] {
    if (typeof window !== 'undefined') return 'web';
    if (typeof process !== 'undefined') {
      if (process.platform === 'darwin') return 'ios';
      if (process.platform === 'linux' && process.arch.includes('android')) return 'android';
      return 'node';
    }
    return 'web';
  }

  private static async detectGPU(): Promise<boolean> {
    if (typeof navigator !== 'undefined') {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        return !!adapter;
      } catch {
        return false;
      }
    }

    if (typeof process !== 'undefined') {
      const platform = process.platform;
      if (platform === 'darwin') {
        return true;
      }
      if (platform === 'linux') {
        try {
          const { execSync } = require('child_process');
          const output = execSync('lspci | grep -i vga', { encoding: 'utf8' });
          return output.length > 0;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  private static async detectNPU(): Promise<boolean> {
    const platform = this.detectPlatform();

    if (platform === 'ios') {
      return true;
    }

    if (platform === 'android') {
      return true;
    }

    return false;
  }

  private static detectMemory(): number {
    if (typeof navigator !== 'undefined') {
      const memory = (navigator as any).deviceMemory;
      if (typeof memory === 'number') {
        return memory * 1024;
      }
      return 4 * 1024;
    }

    if (typeof process !== 'undefined') {
      try {
        const os = require('os');
        return Math.round(os.totalmem() / (1024 * 1024));
      } catch {
        return 4 * 1024;
      }
    }

    return 4 * 1024;
  }

  private static detectCores(): number {
    if (typeof navigator !== 'undefined') {
      return (navigator as any).hardwareConcurrency || 4;
    }

    if (typeof process !== 'undefined') {
      try {
        const os = require('os');
        return os.cpus().length;
      } catch {
        return 4;
      }
    }

    return 4;
  }

  private static detectArchitecture(): string {
    if (typeof process !== 'undefined') {
      return process.arch;
    }

    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('arm')) return 'arm64';
      if (userAgent.includes('x86_64')) return 'x64';
    }

    return 'unknown';
  }

  static getOptimalSettings(hardware: HardwareInfo) {
    const settings = {
      useGPU: false,
      useNPU: false,
      maxContextLength: 2048,
      quantization: 'fp32' as 'fp32' | 'fp16' | '8bit',
      batchSize: 1
    };

    if (hardware.memoryMB >= 8 * 1024) {
      settings.maxContextLength = 4096;
      settings.quantization = 'fp16';
    }

    if (hardware.memoryMB >= 16 * 1024) {
      settings.maxContextLength = 8192;
      settings.batchSize = 4;
    }

    if (hardware.memoryMB < 4 * 1024) {
      settings.quantization = '8bit';
      settings.maxContextLength = 1024;
    }

    if (hardware.hasGPU && hardware.memoryMB >= 6 * 1024) {
      settings.useGPU = true;
    }

    if (hardware.hasNPU) {
      settings.useNPU = true;
    }

    return settings;
  }
}