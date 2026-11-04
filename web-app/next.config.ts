import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// The API's origin, from the same variable the app uses (fixed at build time)
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002").origin;

/**
 * Content-Security-Policy. Login tokens live in localStorage, so an injected script would mean
 * account takeover: the policy only lets the app's own code run and only talks to the API.
 * - Scripts: 'unsafe-inline' is needed for Next.js's inline bootstrap scripts on prerendered
 *   pages (nonces would need every page rendered per request); no other origin may load code.
 * - Images: the API (signed photo links) and Cloudinary (it can redirect there), plus blob:/data:
 *   for previews of photos being uploaded.
 * Development builds get no policy (React's dev tools need eval).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiOrigin} https://res.cloudinary.com`,
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Photos are picked with the file input (the camera opens from there): no API permissions needed
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // The end-to-end tests build into their own folder, so they never clash with `next dev`
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Connectivity-aware navigation (retries when the network returns) and `useOffline()`
    useOffline: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Always check for a new service worker, so a deploy reaches installed tablets
        source: "/serwist/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

// Bundles the service worker with esbuild (kept out of the server bundle)
export default withSerwist(nextConfig);
