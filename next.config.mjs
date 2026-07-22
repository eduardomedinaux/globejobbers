/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Fluxo do Ato 1 (print da headline) mudou de rota na Fase 2 (SaaS) —
      // /headline já é linkado do Instagram, então mantemos redirect
      // permanente em vez de quebrar o link.
      {
        source: "/headline",
        destination: "/preview/headline",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
