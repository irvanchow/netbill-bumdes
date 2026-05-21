import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtected = request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/paket") ||
        request.nextUrl.pathname.startsWith("/pelanggan") ||
        request.nextUrl.pathname.startsWith("/tagihan") ||
        request.nextUrl.pathname.startsWith("/pembayaran") ||
        request.nextUrl.pathname.startsWith("/laporan") ||
        request.nextUrl.pathname.startsWith("/settings");

      if (isOnProtected && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
