import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BrDataEnrichmentProcessor } from './br-data-enrichment.processor';
export declare class BrDataEnrichmentWorker implements OnModuleInit, OnModuleDestroy {
    private readonly processor;
    private readonly logger;
    private readonly workers;
    constructor(processor: BrDataEnrichmentProcessor);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private createWorker;
}
