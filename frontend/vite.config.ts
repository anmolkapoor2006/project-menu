import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    // Raise the warning limit — we'll still split the chunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — very stable, cache-friendly
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts only needed on admin/dashboard pages
          'vendor-charts': ['recharts'],
          // Socket.io only needed on live-order pages
          'vendor-socket': ['socket.io-client'],
          // QR code — only needed in dashboard/QR pages
          'vendor-qrcode': ['qrcode'],
          // Lucide icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});

