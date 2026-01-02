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
            const isOnTenantSelectPage = nextUrl.pathname.startsWith('/select-tenant');

            // Allow display pages and device pairing (for iPads)
            if (isOnDisplayPage || isOnDevicePairApi) {
                return true;
            }

            // Allow API auth routes and tenant check
            if (isOnApiAuthRoute || nextUrl.pathname.startsWith('/api/check-tenants')) {
                return true;
            }

            // Check for pending tenant selection
            const isPendingSelection = (auth?.user as any)?.is_pending_selection;

            if (isPendingSelection) {
                if (!isOnTenantSelectPage) {
                    return Response.redirect(new URL('/select-tenant', nextUrl));
                }
                return true;
            } else if (isOnTenantSelectPage) {
                // If not pending selection, shouldn't be on this page
                return Response.redirect(new URL('/dashboard', nextUrl));
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
                token.firstname = (user as any).firstname;
                token.lastname = (user as any).lastname;
                token.telephone = (user as any).telephone;
                token.is_pending_selection = (user as any).is_pending_selection;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).tenant_id = token.tenant_id;
                (session.user as any).role = token.role;
                (session.user as any).id = token.sub;
                (session.user as any).firstname = token.firstname;
                (session.user as any).lastname = token.lastname;
                (session.user as any).telephone = token.telephone;
                (session.user as any).is_pending_selection = token.is_pending_selection;
            }
            return session;
        }
    },
    providers: [], // Providers added in auth.ts
    session: {
        strategy: 'jwt'
    }
} satisfies NextAuthConfig;
