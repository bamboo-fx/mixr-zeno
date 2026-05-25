import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "./env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "mixr://*/*",
    "exp://*/*",
    "http://localhost:*",
    "http://127.0.0.1:*",
  ],

  plugins: [expo()],

  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    // Dev-friendly cookie attributes: work over HTTP on a LAN so we can test
    // from a phone Safari hitting http://<lan-ip>:3000. Production should
    // re-enable Secure/SameSite=none behind HTTPS.
    useSecureCookies: false,
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false,
    },
  },
});
