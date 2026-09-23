import { JwtPayload } from './jwt-payload';
export type AuthenticatedUser = JwtPayload & {
    id: string;
};
