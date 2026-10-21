import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Permite enviar imagens de até 2 MB nos formulários (o padrão do Next é 1 MB)
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
