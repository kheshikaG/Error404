/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  async redirects() {
    return [{ source: "/inbox", destination: "/activity", permanent: false }];
  },
};
export default nextConfig;
