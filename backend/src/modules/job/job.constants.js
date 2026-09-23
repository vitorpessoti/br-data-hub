export const JobConstants = {
    MESSAGES: {
        SUCCESS: {
            JOB_FOUND: "Enrichment job found.",
        },
        ERROR: {
            JOB_NOT_FOUND: "No CEP or CNPJ enrichment was found for the jobId.",
            FETCH_FAILED: "Could not fetch the enrichment job from the database.",
            INVALID_JOB_ID: "The 'jobId' must be a valid UUID.",
        },
    },
};
