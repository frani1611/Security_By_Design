<template>
  <header>
    <div class="container">
      <nav>
        <ul>
          <li class="push-right"><a href="#" @click.prevent="openUpload">Upload</a></li>
          <li><router-link to="/">Dashboard</router-link></li>
          <li><router-link to="/dashboard">Profil</router-link></li>
          <li v-if="!isAuthenticated"><router-link to="/auth">Login/Register</router-link></li>
          <li v-else>
            <button class="btn-logout" @click="handleLogout">Logout</button>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Header',
  setup() {
    const store = useStore();
    const router = useRouter();

    const isAuthenticated = computed(() => {
      // Prefer store value but fall back to presence of token in localStorage
      return store.getters.isAuthenticated || !!localStorage.getItem('token');
    });

    const handleLogout = async () => {
      // Clear client token and update store
      try {
        localStorage.removeItem('token');
        await store.dispatch('logout');
      } catch (e) {
        // still proceed
        console.warn('Logout cleanup error', e);
      }
      router.push('/auth');
    };

    const openUpload = async () => {
      try {
        // ensure we are on the profile page so the modal component is present
        await router.push('/dashboard');
      } catch (e) {
        // ignore navigation errors
      }
      store.commit('openUploadModal');
    };

    return { isAuthenticated, handleLogout, openUpload };
  },
};
</script>

<style scoped>
header {
  background: var(--surface);
  padding: 10px 0;
}

nav ul {
  list-style-type: none;
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 0;
  padding: 0;
}

/* push this item and subsequent siblings to the right */
.push-right {
  margin-left: auto;
}

nav a {
  text-decoration: none;
  color: var(--primary);
  padding: 6px 8px;
  border-radius: 8px;
}

nav a:hover {
  background: rgba(75,143,140,0.08);
}
</style>