import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		devtoolSegmentExplorer: false,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'bomberosvoluntarioscoloniatirolesa.org',
				pathname: '/Images/**',
			},
		],
	},
};

export default nextConfig;
