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
    }
  },
  build: {
    // Disable source maps in production to reduce memory usage
    sourcemap: false,
    
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
    
    // Manual code splitting for better optimization
    rollupOptions: {
      output: {
        // Manual chunking strategy
        manualChunks: {
          // Vendor chunks - separate large dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'arcgis-vendor': ['@arcgis/core'],
          'ethers-vendor': ['ethers'],
          'ipfs-vendor': ['ipfs-http-client'],
          'ui-vendor': ['lucide-react', 'react-toastify', 'date-fns']
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
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
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'ethers',
      '@arcgis/core'
    ],
    exclude: ['@arcgis/core'] // ArcGIS is large, exclude from pre-bundling
  }
})
