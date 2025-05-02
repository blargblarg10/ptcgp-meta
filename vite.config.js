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
    copyPublicDir: true,
    assetsDir: 'assets',
    outDir: 'dist',
  },
  publicDir: 'public',
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
      name: 'copy-assets-plugin',
      apply: 'build',
      enforce: 'post',
      closeBundle() {
        // Log debugging information about the build process
        console.log('Build complete. Ensuring assets are copied.');
        
        const publicPath = path.resolve(__dirname, 'public');
        const distPath = path.resolve(__dirname, 'dist');
        
        // Copy the icons folder specifically
        const iconsSourcePath = path.resolve(publicPath, 'icons');
        const iconsDestPath = path.resolve(distPath, 'icons');
        
        if (!fs.existsSync(iconsDestPath)) {
          fs.mkdirSync(iconsDestPath, { recursive: true });
          console.log(`Created directory: ${iconsDestPath}`);
        }
        
        try {
          const iconFiles = fs.readdirSync(iconsSourcePath);
          console.log(`Found ${iconFiles.length} icon files to copy`);
          
          iconFiles.forEach(file => {
            const sourcePath = path.resolve(iconsSourcePath, file);
            const destPath = path.resolve(iconsDestPath, file);
            fs.copyFileSync(sourcePath, destPath);
          });
          
          console.log('Successfully copied icon files to the build directory');
        } catch (err) {
          console.error('Error copying icon files:', err);
        }
      }
    },
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
          
          // Also ensure requests to /icons/ directory are served correctly
          if (req.url.startsWith('/icons/')) {
            // Log icon requests for debugging
            console.log(`Icon request: ${req.url}`);
            
            // Adjust path for development server
            req.url = req.url.startsWith('/ptcgp-meta/icons/') 
              ? req.url.replace('/ptcgp-meta/', '/') 
              : req.url;
            
            // Verify if the requested file exists
            const iconPath = path.join(__dirname, 'public', req.url);
            if (fs.existsSync(iconPath)) {
              console.log(`Found icon at: ${iconPath}`);
            } else {
              console.log(`Icon not found at: ${iconPath}`);
            }
            
            next();
            return;
          }
          
          const paths = ['/stats', '/metadata', '/icons'];
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
