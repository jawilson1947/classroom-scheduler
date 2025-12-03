import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLoginPage = nextUrl.pathname.startsWith('/login');
            const isOnDisplayPage = nextUrl.pathname.startsWith('/display');
            const isOnApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
            const isOnDevicePairApi = nextUrl.pathname.startsWith('/api/device/pair');

            // Allow display pages and device pairing (for iPads)
            if (isOnDisplayPage || isOnDevicePairApi) {
                return true;
            }

            // Allow API auth routes
            if (isOnApiAuthRoute) {
                return true;
            }

            if (isOnLoginPage) {
                if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl));
                return true; // Allow access to login page
            }

            if (!isLoggedIn) {
                return false; // Redirect unauthenticated users to login page
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.tenant_id = (user as any).tenant_id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).tenant_id = token.tenant_id;
                (session.user as any).role = token.role;
                (session.user as any).id = token.sub;
            }
            return session;
        }
    },
    providers: [], // Providers added in auth.ts
    session: {
        strategy: 'jwt'
    }
} satisfies NextAuthConfig;
