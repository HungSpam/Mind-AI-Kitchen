import type { NextConfig } from 'next';
const production = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);
const supabaseOrigin = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const parsed = url ? new URL(url) : null;
    return parsed && ['https:', 'http:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
})();
const nextConfig: NextConfig = {
  distDir: isVercel ? '.next' : production ? '.next-production' : '.next',
  experimental: { cpus: 2 },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (production ? '' : " 'unsafe-eval'") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'" +
              (supabaseOrigin ? ` ${supabaseOrigin}` : '') +
              "; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
          ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
        ],
      },
    ];
  },
};
export default nextConfig;
