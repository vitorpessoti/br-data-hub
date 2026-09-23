import { body, param } from 'express-validator';
import { CepConstants } from './cep.constants.js';

const { ERROR } = CepConstants.MESSAGES;
const CEP_PATTERN = /^\d{5}-?\d{3}$/;
const NULLABLE_TEXT_FIELDS = ['street', 'complement', 'unit', 'neighborhood', 'state', 'region', 'giaCode'];

const nullable = { values: 'null' };
const blankToNull = value => (value === '' ? null : value);

// Accepts "00000000" or "00000-000" and normalizes it to 8 digits.
const cepRule = chain => chain
    .isString()
    .withMessage(ERROR.INVALID_CEP)
    .bail()
    .trim()
    .matches(CEP_PATTERN)
    .withMessage(ERROR.INVALID_CEP)
    .bail()
    .customSanitizer(value => value.replace('-', ''));

const nullableTextRule = field => body(field)
    .optional(nullable)
    .isString()
    .withMessage(ERROR.INVALID_TEXT_FIELD(field))
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage(ERROR.INVALID_TEXT_FIELD(field))
    .customSanitizer(blankToNull);

const nullableDigitsRule = (field, length, message) => body(field)
    .optional(nullable)
    .isString()
    .withMessage(message)
    .bail()
    .trim()
    .matches(new RegExp(`^\\d{${length}}$`))
    .withMessage(message);

class CepValidator {
    static cepBodyValidation() {
        return [cepRule(body('cep'))];
    }

    static cepParamValidation() {
        return [cepRule(param('cep'))];
    }

    static updateValidation() {
        return [
            ...CepValidator.cepParamValidation(),
            ...NULLABLE_TEXT_FIELDS.map(nullableTextRule),
            body('city')
                .optional()
                .isString()
                .withMessage(ERROR.INVALID_CITY)
                .bail()
                .trim()
                .isLength({ min: 1, max: 255 })
                .withMessage(ERROR.INVALID_CITY),
            body('uf')
                .optional()
                .isString()
                .withMessage(ERROR.INVALID_UF)
                .bail()
                .trim()
                .matches(/^[A-Za-z]{2}$/)
                .withMessage(ERROR.INVALID_UF)
                .bail()
                .toUpperCase(),
            nullableDigitsRule('ibgeCode', 7, ERROR.INVALID_IBGE_CODE),
            nullableDigitsRule('ddd', 2, ERROR.INVALID_DDD),
            body('siafiCode')
                .optional(nullable)
                .isString()
                .withMessage(ERROR.INVALID_SIAFI_CODE)
                .bail()
                .trim()
                .isLength({ min: 1, max: 10 })
                .withMessage(ERROR.INVALID_SIAFI_CODE),
            body()
                .custom(value => CepConstants.UPDATABLE_FIELDS.some(field => value?.[field] !== undefined))
                .withMessage(ERROR.EMPTY_UPDATE),
        ];
    }
}

export default CepValidator;
