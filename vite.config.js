import tailwindcssPlugin from '@tailwindcss/vite';
import viteReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import viteConfigPaths from 'vite-tsconfig-paths';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: '/ptcgp-meta/',
  build: {
    reportCompressedSize: false,
    commonjsOptions: { transformMixedEsModules: true },
  },
  server: {
    historyApiFallback: true,
  },
  plugins: [
    tailwindcssPlugin(),
    viteConfigPaths(),
    viteReactPlugin(),
    // eslint-disable-next-line no-undef
    process.env.INLINE ? viteSingleFile() : null,
    {
      name: 'match-data-api',
      configureServer(server) {
        // Handle SPA routing
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/api')) {
            // Skip SPA handling for API routes
            next();
            return;
          }
          
          const paths = ['/stats', '/metadata'];
          if (paths.some(path => req.url.startsWith(path))) {
            req.url = '/'; // Rewrite URL to the root
          }
          next();
        });

        server.middlewares.use('/api/save-matches', async (req, res) => {
          if (req.method === 'POST') {
            try {
              const chunks = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', () => {
                const data = Buffer.concat(chunks).toString();
                const matchData = JSON.parse(data);
                const filePath = path.resolve(__dirname, 'src/data/match_history.json');
                fs.writeFileSync(filePath, JSON.stringify(matchData, null, 2));
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
              });
            } catch (error) {
              console.error('Error saving match data:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save match data' }));
            }
          } else {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          }
        });
      }
    }
  ].filter(Boolean),
});
