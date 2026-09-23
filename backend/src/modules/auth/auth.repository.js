import prisma from '../../services/prisma.service.js';

// Fields safe to return: never exposes the password hash.
const publicUserFields = {
    id: true,
    name: true,
    email: true,
    active: true,
    createdAt: true,
    updatedAt: true,
};

export default class AuthRepository {
    async findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }

    async findById(id) {
        return prisma.user.findUnique({ where: { id }, select: publicUserFields });
    }

    async create({ name, email, password }) {
        return prisma.user.create({
            data: { name, email, password },
            select: publicUserFields,
        });
    }

    async update(id, data) {
        return prisma.user.update({ where: { id }, data, select: publicUserFields });
    }

    async findByResetPasswordTokenHash(resetPasswordTokenHash) {
        return prisma.user.findUnique({ where: { resetPasswordTokenHash } });
    }

    async setResetPasswordToken(id, { resetPasswordTokenHash, resetPasswordExpiresAt }) {
        return prisma.user.update({
            where: { id },
            data: { resetPasswordTokenHash, resetPasswordExpiresAt },
        });
    }

    async resetPassword(id, password) {
        return prisma.user.update({
            where: { id },
            data: { password, resetPasswordTokenHash: null, resetPasswordExpiresAt: null },
            select: publicUserFields,
        });
    }
}
