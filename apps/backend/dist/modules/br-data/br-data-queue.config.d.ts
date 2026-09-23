import type { BrDataSource } from '@br-data-hub/br-data';
import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';
export declare const BR_DATA_QUEUE_NAMES: Record<BrDataSource, string>;
export interface BrDataRateLimit {
    max: number;
    duration: number;
}
export declare const BR_DATA_JOB_OPTIONS: DefaultJobOptions;
export declare function resolveRateLimit(source: BrDataSource): BrDataRateLimit;
export declare function resolveRedisConnection(): ConnectionOptions;
export declare function resolveQueuePrefix(): string;
export declare function resolveSyncWaitMs(): number;
export declare function resolveRateLimitBackoffMs(): number;
