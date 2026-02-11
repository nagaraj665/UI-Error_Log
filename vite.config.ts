import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/UI-Error_Log/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
