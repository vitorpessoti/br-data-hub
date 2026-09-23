import { param } from 'express-validator';
import { JobConstants } from './job.constants.js';

class JobValidator {
    static jobIdParamValidation() {
        return [
            param('jobId')
                .trim()
                .isUUID()
                .withMessage(JobConstants.MESSAGES.ERROR.INVALID_JOB_ID)
                .bail()
                .toLowerCase(),
        ];
    }
}

export default JobValidator;
