import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createGroqMiddleware } from './server/groqMiddleware.js';
import { createAdminMiddleware } from './server/adminMiddleware.js';
import { createPaymentMiddleware } from './server/paymentMiddleware.js';
import { createDbMiddleware } from './server/dbMiddleware.js';
import { createApplicationMiddleware } from './server/applicationMiddleware.js';

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
  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const googleClientId = (env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  const judgeEmail = (env.VITE_JUDGE_EMAIL || env.JUDGE_EMAIL || process.env.VITE_JUDGE_EMAIL || process.env.JUDGE_EMAIL || '').trim();
  const judgePassword = (env.VITE_JUDGE_PASSWORD || env.JUDGE_PASSWORD || process.env.VITE_JUDGE_PASSWORD || process.env.JUDGE_PASSWORD || '').trim();

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (supabaseUrl) {
    process.env.VITE_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_URL = supabaseUrl;
  }
  if (supabaseAnonKey) {
    process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
  }
  if (googleClientId) {
    process.env.VITE_GOOGLE_CLIENT_ID = googleClientId;
  }
  if (env.ALLOY_ADMIN_EMAIL) {
    process.env.ALLOY_ADMIN_EMAIL = env.ALLOY_ADMIN_EMAIL.trim();
  }
  if (judgeEmail) {
    process.env.VITE_JUDGE_EMAIL = judgeEmail;
  }
  if (judgePassword) {
    process.env.VITE_JUDGE_PASSWORD = judgePassword;
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
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_JUDGE_EMAIL': JSON.stringify(judgeEmail),
      'import.meta.env.JUDGE_EMAIL': JSON.stringify(judgeEmail),
      'import.meta.env.VITE_JUDGE_PASSWORD': JSON.stringify(judgePassword),
      'import.meta.env.JUDGE_PASSWORD': JSON.stringify(judgePassword)
    },
    plugins: [
      react(),
      {
        name: 'alloy-api-server',
        configureServer(server) {
          server.middlewares.use(createDbMiddleware());
          server.middlewares.use(createGroqMiddleware());
          server.middlewares.use(createAdminMiddleware());
          server.middlewares.use(createPaymentMiddleware());
          server.middlewares.use(createApplicationMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(createDbMiddleware());
          server.middlewares.use(createGroqMiddleware());
          server.middlewares.use(createAdminMiddleware());
          server.middlewares.use(createPaymentMiddleware());
          server.middlewares.use(createApplicationMiddleware());
        }
      }
    ],
    server: {
      port: 5173,
      open: false
    }
  };
});
