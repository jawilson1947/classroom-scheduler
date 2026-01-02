import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
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
                password: { label: 'Password', type: 'password' },
                tenant_id: { label: 'Tenant ID', type: 'text' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    let query = 'SELECT id, tenant_id, email, firstname, lastname, telephone, password_hash, role FROM users WHERE email = ?';
                    const params: any[] = [credentials.email];

                    if (credentials.tenant_id) {
                        query += ' AND tenant_id = ?';
                        params.push(credentials.tenant_id);
                    }

                    const [rows] = await pool.query<RowDataPacket[]>(query, params);

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
                        firstname: user.firstname,
                        lastname: user.lastname,
                        telephone: user.telephone,
                        role: user.role
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            }
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                // If the user came from Credentials, they already have role/tenant_id
                if ((user as any).role && (user as any).tenant_id) {
                    token.tenant_id = (user as any).tenant_id;
                    token.role = (user as any).role;
                    token.firstname = (user as any).firstname;
                    token.lastname = (user as any).lastname;
                    token.telephone = (user as any).telephone;
                }
                // If they came from Google (or another provider sans DB lookup), look them up
                else if (account?.provider === 'google' && user.email) {
                    try {
                        const [rows] = await pool.query<RowDataPacket[]>(
                            'SELECT id, tenant_id, firstname, lastname, telephone, role FROM users WHERE email = ?',
                            [user.email]
                        );
                        if (rows.length > 0) {
                            const dbUser = rows[0];
                            token.tenant_id = dbUser.tenant_id;
                            token.role = dbUser.role;
                            token.firstname = dbUser.firstname;
                            token.lastname = dbUser.lastname;
                            token.telephone = dbUser.telephone;
                            token.sub = dbUser.id.toString(); // Ensure ID matches DB ID
                        } else {
                            // User not found in DB - potentially deny access or set as guest?
                            // For now, let's leave them without role/tenant (logic in config/middleware handles this)
                            console.warn(`Google user ${user.email} not found in database.`);
                        }
                    } catch (err) {
                        console.error('Error fetching user for Google auth:', err);
                    }
                }
            }
            return token;
        }
    }
});
