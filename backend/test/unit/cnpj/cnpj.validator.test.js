import { isValidCnpj } from '../../../src/modules/cnpj/cnpj.validator.js';

describe('# CnpjValidator - isValidCnpj', () => {
    it.each([
        ['a numeric CNPJ', '19131243000197'],
        ['a numeric CNPJ whose first check digit is 0', '33000167000101'],
        ['a CNPJ starting with zeros', '00000000000191'],
        ['the Receita Federal alphanumeric example', '12ABC34501DE35'],
    ])('should accept %s', (_, cnpj) => {
        expect(isValidCnpj(cnpj)).toBe(true);
    });

    it.each([
        ['a wrong first check digit', '19131243000187'],
        ['a wrong second check digit', '19131243000198'],
        ['a wrong alphanumeric check digit', '12ABC34501DE36'],
        ['letters in the check digits', '191312430001AB'],
        ['only zeros', '00000000000000'],
        ['a repeated digit', '11111111111111'],
    ])('should reject %s', (_, cnpj) => {
        expect(isValidCnpj(cnpj)).toBe(false);
    });
});
