import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:process.env.VITE_BASE_PATH || '/',test:{include:['tests/**/*.test.ts']}} as Parameters<typeof defineConfig>[0]);
