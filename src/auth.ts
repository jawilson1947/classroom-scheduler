import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const [rows] = await pool.query<RowDataPacket[]>(
                        'SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = ?',
                        [credentials.email]
                    );

                    if (rows.length === 0) {
                        return null;
                    }

                    const user = rows[0];
                    const passwordMatch = await bcrypt.compare(
                        credentials.password as string,
                        user.password_hash
                    );

                    if (!passwordMatch) {
                        return null;
                    }

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        tenant_id: user.tenant_id,
                        role: user.role
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            }
        })
    ]
});
