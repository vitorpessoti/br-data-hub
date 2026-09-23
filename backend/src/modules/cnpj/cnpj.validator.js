import { body, param } from 'express-validator';
import { CnpjConstants } from './cnpj.constants.js';

const { ERROR } = CnpjConstants.MESSAGES;
const { FIELDS } = CnpjConstants;

// Numeric (00.000.000/0000-00) or alphanumeric (AA.AAA.AAA/AAAA-00) CNPJ, fully formatted or not formatted at all.
const CNPJ_PATTERN = /^(?:[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}|[A-Z0-9]{12}\d{2})$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHARE_CAPITAL_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
const MAX_INTEGER = 2147483647;

const nullable = { values: 'null' };
const blankToNull = value => (value === '' ? null : value);

// Check digits of the Receita Federal algorithm: each character is worth its ASCII code minus 48
// ("0"-"9" → 0-9, "A"-"Z" → 17-42), weighted from 2 to 9 right to left, modulo 11.
const checkDigit = base => {
    const sum = [...base].reverse().reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * ((index % 8) + 2), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = cnpj => {
    if (/^(.)\1*$/.test(cnpj)) return false;
    const first = checkDigit(cnpj.slice(0, 12));
    const second = checkDigit(cnpj.slice(0, 12) + first);
    return cnpj.slice(12) === `${first}${second}`;
};

// Accepts the CNPJ formatted or not (letters in any case) and normalizes it to 14 uppercase characters.
const cnpjRule = chain => chain
    .isString()
    .withMessage(ERROR.INVALID_CNPJ)
    .bail()
    .trim()
    .toUpperCase()
    .matches(CNPJ_PATTERN)
    .withMessage(ERROR.INVALID_CNPJ)
    .bail()
    .customSanitizer(value => value.replace(/[./-]/g, ''))
    .custom(isValidCnpj)
    .withMessage(ERROR.INVALID_CNPJ);

const nullableTextRule = field => body(field)
    .optional(nullable)
    .isString()
    .withMessage(ERROR.INVALID_TEXT_FIELD(field))
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage(ERROR.INVALID_TEXT_FIELD(field))
    .customSanitizer(blankToNull);

const nullableIntegerRule = field => body(field)
    .optional(nullable)
    .custom(value => Number.isInteger(value) && value >= 0 && value <= MAX_INTEGER)
    .withMessage(ERROR.INVALID_INTEGER_FIELD(field));

// Dates travel as "YYYY-MM-DD" and are stored as a date (no time).
const nullableDateRule = field => body(field)
    .optional(nullable)
    .custom(value => typeof value === 'string'
        && DATE_PATTERN.test(value)
        && new Date(value).toISOString().startsWith(value))
    .withMessage(ERROR.INVALID_DATE_FIELD(field))
    .bail()
    .customSanitizer(value => new Date(value));

const nullableBooleanRule = field => body(field)
    .optional(nullable)
    .custom(value => typeof value === 'boolean')
    .withMessage(ERROR.INVALID_BOOLEAN_FIELD(field));

const listRule = field => body(field)
    .optional()
    .custom(value => Array.isArray(value)
        && value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item)))
    .withMessage(ERROR.INVALID_LIST_FIELD(field));

class CnpjValidator {
    static cnpjBodyValidation() {
        return [cnpjRule(body('cnpj'))];
    }

    static cnpjParamValidation() {
        return [cnpjRule(param('cnpj'))];
    }

    static updateValidation() {
        return [
            ...CnpjValidator.cnpjParamValidation(),
            body('corporateName')
                .optional()
                .isString()
                .withMessage(ERROR.INVALID_CORPORATE_NAME)
                .bail()
                .trim()
                .isLength({ min: 1, max: 255 })
                .withMessage(ERROR.INVALID_CORPORATE_NAME),
            ...FIELDS.TEXT.map(nullableTextRule),
            ...FIELDS.INTEGER.map(nullableIntegerRule),
            ...FIELDS.DATE.map(nullableDateRule),
            ...FIELDS.BOOLEAN.map(nullableBooleanRule),
            ...FIELDS.LIST.map(listRule),
            body('cep')
                .optional(nullable)
                .isString()
                .withMessage(ERROR.INVALID_CEP)
                .bail()
                .trim()
                .matches(/^\d{5}-?\d{3}$/)
                .withMessage(ERROR.INVALID_CEP)
                .bail()
                .customSanitizer(value => value.replace('-', '')),
            body('uf')
                .optional(nullable)
                .isString()
                .withMessage(ERROR.INVALID_UF)
                .bail()
                .trim()
                .matches(/^[A-Za-z]{2}$/)
                .withMessage(ERROR.INVALID_UF)
                .bail()
                .toUpperCase(),
            body('email')
                .optional(nullable)
                .isString()
                .withMessage(ERROR.INVALID_EMAIL)
                .bail()
                .trim()
                .isEmail()
                .withMessage(ERROR.INVALID_EMAIL),
            // Sent as a number or a numeric string; stored as Decimal(18, 2).
            body('shareCapital')
                .optional(nullable)
                .custom(value => (typeof value === 'number' || typeof value === 'string')
                    && SHARE_CAPITAL_PATTERN.test(String(value).trim()))
                .withMessage(ERROR.INVALID_SHARE_CAPITAL)
                .bail()
                .customSanitizer(value => String(value).trim()),
            body()
                .custom(value => CnpjConstants.UPDATABLE_FIELDS.some(field => value?.[field] !== undefined))
                .withMessage(ERROR.EMPTY_UPDATE),
        ];
    }
}

export default CnpjValidator;
