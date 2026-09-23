import { OnModuleDestroy } from '@nestjs/common';
import type { BrDataEnrichmentProvider, BrDataEnrichmentRequest, BrDataSource } from '@br-data-hub/br-data';
import type { BrDataEnrichmentResult } from './br-data-enrichment.processor';
export interface BrDataPendingJob {
    source: BrDataSource;
    jobId: string;
}
export interface BrDataJob {
    jobId: string;
    source: BrDataSource;
    state: string;
    request: BrDataEnrichmentRequest;
    attemptsMade: number;
    maxAttempts: number;
    rateLimited: boolean;
    result: BrDataEnrichmentResult | null;
    failedReason: string | null;
    createdAt: Date;
    processedAt: Date | null;
    finishedAt: Date | null;
}
export declare class BullMqBrDataEnrichmentProvider implements BrDataEnrichmentProvider, OnModuleDestroy {
    private readonly connection;
    private readonly prefix;
    private readonly queues;
    private readonly queueEvents;
    enqueue(request: BrDataEnrichmentRequest): Promise<string>;
    isRateLimited(source: BrDataSource): Promise<boolean>;
    waitForJobs(jobs: BrDataPendingJob[], timeoutMs: number): Promise<void>;
    findJob(jobId: string): Promise<BrDataJob | null>;
    onModuleDestroy(): Promise<void>;
    private isRateLimitedWhileQueued;
    private isQueued;
    private sourceOf;
    private bySource;
}
