import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    },
    // Handle @arcgis/core CommonJS package properly
    dedupe: ['@arcgis/core'],
    // Ensure proper resolution of @arcgis/core
    conditions: ['import', 'module', 'browser', 'default']
  },
  build: {
    // Disable source maps in production to reduce memory usage
    sourcemap: false,
    
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
    
    // CommonJS options for handling CommonJS modules like @arcgis/core
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      // Convert CommonJS to ES modules
      defaultIsModuleExports: true,
      // Require returns default export
      requireReturnsDefault: 'auto'
    },
    
    // Manual code splitting for better optimization
    rollupOptions: {
      output: {
        // Manual chunking strategy - handle @arcgis/core separately
        manualChunks: (id) => {
          // Handle @arcgis/core as a separate chunk
          if (id.includes('@arcgis/core')) {
            return 'arcgis-vendor';
          }
          // Other vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('ethers')) {
              return 'ethers-vendor';
            }
            if (id.includes('ipfs-http-client')) {
              return 'ipfs-vendor';
            }
            if (id.includes('lucide-react') || id.includes('react-toastify') || id.includes('date-fns')) {
              return 'ui-vendor';
            }
            // Other node_modules go into vendor chunk
            return 'vendor';
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      },
      // External dependencies (none - we want everything bundled)
      external: []
    },
    
    // Target modern browsers for smaller bundle
    target: 'es2015',
    
    // Minification settings (use esbuild for faster builds, terser for better compression)
    minify: 'esbuild', // Faster than terser, good compression
    // If you need better compression, install terser and use: minify: 'terser'
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: false, // Disable to speed up build
    
    // Build optimization
    assetsInlineLimit: 4096 // Inline assets smaller than 4kb
  },
  
  // Optimize dependencies - properly handle @arcgis/core
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'ethers'
      // Note: @arcgis/core is excluded from pre-bundling due to its size and CommonJS nature
    ],
    exclude: [
      '@arcgis/core' // Exclude from pre-bundling - will be handled during build
    ],
    // Force esbuild to handle CommonJS
    esbuildOptions: {
      // Treat @arcgis/core as CommonJS
      loader: {
        '.js': 'jsx'
      }
    }
  },
  
  // Ensure proper module resolution
  ssr: {
    noExternal: ['@arcgis/core'] // Don't externalize @arcgis/core in SSR (if used)
  }
})
