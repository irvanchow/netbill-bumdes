import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth } = NextAuth(authConfig);
export { auth as middleware };

export const config = {
  matcher: ["/dashboard/:path*", "/paket/:path*", "/pelanggan/:path*", "/tagihan/:path*", "/pembayaran/:path*", "/laporan/:path*", "/settings/:path*"],
};
