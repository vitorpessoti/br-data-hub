export const CepConstants = {
    CEP_LENGTH: 8,
    VIACEP_DEFAULT_BASE_URL: 'https://viacep.com.br/ws',
    VIACEP_DEFAULT_TIMEOUT_MS: 5000,
    QUEUE_NAME: 'cep-enrichment',
    JOB_NAME: 'enrich-cep',
    RATE_LIMIT_KEY: 'viacep',
    UPDATABLE_FIELDS: [
        'street',
        'complement',
        'unit',
        'neighborhood',
        'city',
        'uf',
        'state',
        'region',
        'ibgeCode',
        'giaCode',
        'ddd',
        'siafiCode',
    ],
    MESSAGES: {
        SUCCESS: {
            CEP_SAVED: "CEP data fetched from ViaCEP and saved successfully.",
            CEP_REFRESHED: "CEP data fetched from ViaCEP and refreshed successfully.",
            CEP_FOUND: "CEP data found.",
            CEPS_LISTED: "CEP data listed.",
            CEP_UPDATED: "CEP data updated successfully.",
            CEP_DELETED: "CEP data deleted successfully.",
            // 202 Accepted (ViaCEP request limit reached)
            CEP_QUEUED: "The ViaCEP request limit was reached, so the CEP was queued for enrichment. Check the progress with the jobId.",
            CEP_ALREADY_QUEUED: "The CEP is already queued for enrichment. Check the progress with the jobId.",
        },
        ERROR: {
            // External API (ViaCEP)
            VIACEP_CEP_NOT_FOUND: "CEP was not found on ViaCEP.",
            VIACEP_REQUEST_FAILED: "Could not fetch the CEP data from ViaCEP.",
            VIACEP_TIMEOUT: "ViaCEP did not respond in time.",
            // Queue (BullMQ/Redis)
            QUEUE_UNAVAILABLE: "The ViaCEP request control (queue) is unavailable. Try again later.",
            // Persistence
            SAVE_FAILED: "Could not save the CEP data.",
            UPDATE_FAILED: "Could not update the CEP data.",
            DELETE_FAILED: "Could not delete the CEP data.",
            // Database lookup
            CEP_NOT_FOUND: "CEP data was not found in the database.",
            FETCH_FAILED: "Could not fetch the CEP data from the database.",
            // Validation
            INVALID_CEP: "The 'cep' must be a text with 8 digits (formats: 00000000 or 00000-000).",
            INVALID_TEXT_FIELD: field => `The '${field}' field must be a text of up to 255 characters or null.`,
            INVALID_CITY: "The 'city' field must be a text between 1 and 255 characters.",
            INVALID_UF: "The 'uf' field must be 2 letters.",
            INVALID_IBGE_CODE: "The 'ibgeCode' field must be 7 digits or null.",
            INVALID_DDD: "The 'ddd' field must be 2 digits or null.",
            INVALID_SIAFI_CODE: "The 'siafiCode' field must be a text of up to 10 characters or null.",
            EMPTY_UPDATE: "Provide at least one field to update: street, complement, unit, neighborhood, city, uf, state, region, ibgeCode, giaCode, ddd or siafiCode.",
        },
    },
};
