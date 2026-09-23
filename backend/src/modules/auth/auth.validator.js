import { body, param } from 'express-validator';
import { AuthConstants } from './auth.constants.js';

const { ERROR } = AuthConstants.MESSAGES;
// Email is unique and immutable: it is never accepted as an updatable field.
const UPDATABLE_FIELDS = ['name', 'password'];

const nameRule = () => body('name')
    .isString()
    .withMessage(ERROR.INVALID_NAME)
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage(ERROR.INVALID_NAME);

const emailRule = () => body('email')
    .isString()
    .withMessage(ERROR.INVALID_EMAIL)
    .bail()
    .trim()
    .isEmail()
    .withMessage(ERROR.INVALID_EMAIL)
    .bail()
    .toLowerCase();

const passwordRule = () => body('password')
    .isString()
    .withMessage(ERROR.INVALID_PASSWORD)
    .bail()
    .isLength({ min: AuthConstants.PASSWORD_MIN_LENGTH, max: AuthConstants.PASSWORD_MAX_LENGTH })
    .withMessage(ERROR.INVALID_PASSWORD);

class AuthValidator {
    static registerValidation() {
        return [nameRule(), emailRule(), passwordRule()];
    }

    static loginValidation() {
        return [
            emailRule(),
            body('password')
                .isString()
                .withMessage(ERROR.PASSWORD_REQUIRED)
                .bail()
                .notEmpty()
                .withMessage(ERROR.PASSWORD_REQUIRED),
        ];
    }

    static forgotPasswordValidation() {
        return [emailRule()];
    }

    static resetPasswordValidation() {
        return [
            body('token')
                .isString()
                .withMessage(ERROR.RESET_TOKEN_REQUIRED)
                .bail()
                .notEmpty()
                .withMessage(ERROR.RESET_TOKEN_REQUIRED),
            passwordRule(),
        ];
    }

    static updateValidation() {
        return [
            param('id').isUUID().withMessage(ERROR.INVALID_ID),
            nameRule().optional(),
            passwordRule().optional(),
            body()
                .custom(value => UPDATABLE_FIELDS.some(field => value?.[field] !== undefined))
                .withMessage(ERROR.EMPTY_UPDATE),
        ];
    }
}

export default AuthValidator;
