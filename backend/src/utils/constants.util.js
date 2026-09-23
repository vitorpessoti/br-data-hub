export const Constants = {
    // Values of the EnrichmentStatus enum (prisma/schema.prisma).
    ENRICHMENT_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
    },
    MESSAGES: {
        SUCCESS: {},
        ERROR: {
            DEFAULT: "Algo deu errado em sua solicitação.",
        }
    }
};
