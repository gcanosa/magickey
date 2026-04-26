import { defineConfig } from 'vite';

const host = '0.0.0.0';
const port = 3377;
const allowedHosts = ['sekurnet.duckdns.org'];

export default defineConfig({
  server: {
    host,
    port,
    strictPort: true,
    allowedHosts,
  },
  preview: {
    host,
    port,
    strictPort: true,
    allowedHosts,
  },
});
