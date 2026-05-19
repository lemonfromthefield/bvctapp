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
	typescript: {
		tsconfigPath: './tsconfig.json',
	},
	onDemandEntries: {
		maxInactiveAge: 60 * 1000,
		pagesBufferLength: 5,
	},
	webpack: (config) => {
		return config;
	},
};

export default nextConfig;
