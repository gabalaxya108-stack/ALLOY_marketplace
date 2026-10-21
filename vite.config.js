import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createGroqMiddleware } from './server/groqMiddleware.js';
import { createAdminMiddleware } from './server/adminMiddleware.js';
import { createPaymentMiddleware } from './server/paymentMiddleware.js';

export default defineConfig(({ mode }) => {
  // Load environment variables on the server side (including non-VITE_ keys)
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }
  if (env.GROQ_MODEL) {
    process.env.GROQ_MODEL = env.GROQ_MODEL;
  }
  // Supabase and Admin middleware environment variables
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL.trim();
  }
  if (env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY.trim();
  }
  if (env.ALLOY_ADMIN_EMAIL) {
    process.env.ALLOY_ADMIN_EMAIL = env.ALLOY_ADMIN_EMAIL.trim();
  }
  if (env.VITE_JUDGE_EMAIL) {
    process.env.VITE_JUDGE_EMAIL = env.VITE_JUDGE_EMAIL.trim();
  }
  if (env.VITE_JUDGE_PASSWORD) {
    process.env.VITE_JUDGE_PASSWORD = env.VITE_JUDGE_PASSWORD.trim();
  }
  if (env.ALLOY_ADMIN_PROVISION_SECRET) {
    process.env.ALLOY_ADMIN_PROVISION_SECRET = env.ALLOY_ADMIN_PROVISION_SECRET.trim();
  }
  if (env.ALLOY_ADMIN_PASSKEY) {
    process.env.ALLOY_ADMIN_PASSKEY = env.ALLOY_ADMIN_PASSKEY.trim();
  }
  // Razorpay Test Mode credentials
  if (env.RAZORPAY_KEY_ID) {
    process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID.trim();
  }
  if (env.RAZORPAY_KEY_SECRET) {
    process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET.trim();
  }

  return {
    plugins: [
      react(),
      {
        name: 'alloy-api-server',
        configureServer(server) {
          server.middlewares.use(createGroqMiddleware());
          server.middlewares.use(createAdminMiddleware());
          server.middlewares.use(createPaymentMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(createGroqMiddleware());
          server.middlewares.use(createAdminMiddleware());
          server.middlewares.use(createPaymentMiddleware());
        }
      }
    ],
    server: {
      port: 5173,
      open: false
    }
  };
});
