<template>
  <div class="auth card">
    <h1>Login / Register</h1>

    <!-- Google Sign-In Button -->
    <div class="google-section">
      <!-- GOOGLE AUTO-RENDERED BUTTON -->
      <div
        id="g_id_onload"
        :data-client_id="googleClientId"
        data-callback="onGoogleSignIn"
      ></div>

      <div
        class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-text="signin_with"
        data-shape="rectangular"
        data-logo_alignment="left"
      ></div>

      <p class="divider">oder</p>
    </div>

    <!-- Traditional Auth Form -->
    <form @submit.prevent="handleSubmit">
      <div v-if="!isLogin">
        <label for="username">Benutzername:</label>
        <input id="username" type="text" v-model="username" required />
      </div>
      <div>
        <label for="email">Email:</label>
        <input id="email" type="email" v-model="email" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input id="password" type="password" v-model="password" required />
        <div v-if="!isLogin && password.length > 0 && password.length < 10" class="password-hint">
          Passwort muss mindestens 10 Zeichen lang sein ({{ password.length }}/10)
        </div>
      </div>
      <P></P>
      <div>
        <button type="submit" :disabled="!isLogin && password.length < 10">
          {{ isLogin ? 'Login' : 'Register' }}
        </button>
      </div>
      <P></P>
      <div>
        <button type="button" class="btn--secondary" @click="toggleAuthMode">
          {{ isLogin ? 'Switch to Register' : 'Switch to Login' }}
        </button>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { login, register as registerUser } from '../services/api';

declare global {
  interface Window {
    google: any;
    onGoogleSignIn: (response: any) => void;
  }
}

export default {
  setup() {
    const username = ref('');
    const email = ref('');
    const password = ref('');
    const isLogin = ref(true);
    const error = ref('');
  const router = useRouter();
  const store = useStore();
    // Read from runtime config or fallback to build-time env
    const googleClientId = ref(
      (window as any).ENV_CONFIG?.VITE_GOOGLE_CLIENT_ID || 
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || 
      ''
    );

    // Handle classic form auth
    const handleSubmit = async () => {
      error.value = '';
      try {
        if (isLogin.value) {
          const res = await login(email.value, password.value);
          if (res.token) {
            localStorage.setItem('token', res.token);
            // update store so header updates immediately
            try { store.commit('setUser', { email: email.value }); } catch (e) { /* ignore */ }
            router.push('/dashboard');
          }
        } else {
          await registerUser(username.value, email.value, password.value);
          const res = await login(email.value, password.value);
          if (res.token) {
            localStorage.setItem('token', res.token);
            try { store.commit('setUser', { email: email.value, username: username.value }); } catch (e) { /* ignore */ }
            router.push('/dashboard');
          }
        }
      } catch (err: any) {
        console.error('Authentication failed:', err);
        error.value = err?.message || 'Fehler bei der Authentifizierung';
      }
    };

    // Google callback
    const onGoogleSignInCallback = async (response: any) => {
      try {
        error.value = '';
        console.log('[Google Sign-In] Response received');

        const idToken = response.credential;
        if (!idToken) throw new Error('No ID token received');

        const res = await fetch('http://localhost:5000/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json();
        if (data.token) {
          console.log('[Google Sign-In] Login successful');
          localStorage.setItem('token', data.token);
          // if backend provided user info, hydrate store so header updates
          try {
            if (data.user) store.commit('setUser', data.user);
            else store.commit('setUser', { email: data.email || '' });
          } catch (e) {
            // ignore if store not available
          }
          router.push('/dashboard');
        } else {
          error.value = data.message || 'Google login failed';
        }
      } catch (err: any) {
        console.error('[Google Sign-In] Error:', err);
        error.value = err?.message || 'Google authentication failed';
      }
    };

    // Load Google SDK
    const loadGoogleScript = () => {
      if (!document.getElementById('google-signin-script')) {
        const script = document.createElement('script');
        script.id = 'google-signin-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        window.onGoogleSignIn = onGoogleSignInCallback;

        console.log('[Google Sign-In] Script loaded');
      }
    };

    const toggleAuthMode = () => {
      isLogin.value = !isLogin.value;
      error.value = '';
    };

    onMounted(() => {
      loadGoogleScript();
    });

    return {
      username,
      email,
      password,
      isLogin,
      handleSubmit,
      toggleAuthMode,
      error,
      googleClientId,
    };
  },
};
</script>


<style scoped>
.auth {
  max-width: 420px;
  margin: 24px auto;
}

.google-section {
  margin-bottom: 24px;
}

.btn--google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: white;
  border: 1px solid #dadce0;
  color: #3c4043;
  padding: 12px 16px;
  border-radius: 10px;
  width: 100%;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: background 140ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.btn--google:hover {
  background: #f8f9fa;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  border-color: #d2d3d4;
}

.btn--google:active {
  background: #f1f3f4;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.divider {
  text-align: center;
  margin: 20px 0 24px;
  color: var(--muted);
  font-size: 0.9rem;
  position: relative;
}

.divider::before {
  content: '';
  display: block;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #e6e9ee;
}

.divider {
  background: var(--surface);
  display: inline-block;
  padding: 0 8px;
  position: relative;
  z-index: 2;
  width: 100%;
}

.error {
  color: #dc2626;
  margin-top: 8px;
  font-size: 0.9rem;
}

.password-hint {
  color: #ea580c;
  font-size: 0.85rem;
  margin-top: 4px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>