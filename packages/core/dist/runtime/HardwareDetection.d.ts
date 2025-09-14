import { HardwareInfo } from '../types';
export declare class HardwareDetection {
    private static cachedInfo;
    static detect(): Promise<HardwareInfo>;
    private static detectPlatform;
    private static detectGPU;
    private static detectNPU;
    private static detectMemory;
    private static detectCores;
    private static detectArchitecture;
    static getOptimalSettings(hardware: HardwareInfo): {
        useGPU: boolean;
        useNPU: boolean;
        maxContextLength: number;
        quantization: "fp32" | "fp16" | "8bit";
        batchSize: number;
    };
}
//# sourceMappingURL=HardwareDetection.d.ts.map