/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@poker-lab/shared', '@poker-lab/parser', '@poker-lab/equity'],
}

module.exports = nextConfig
