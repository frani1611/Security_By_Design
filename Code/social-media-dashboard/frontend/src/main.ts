import { createApp } from 'vue';
import './styles/global.css';
import App from './App.vue';
import router from './router';
import store from './store';
import { setupTimers } from './utils/inactivityTimer';

const app = createApp(App)
  .use(router)
  .use(store);

app.mount('#app');

// Initialize inactivity timer after app is mounted
app.config.globalProperties.$router = router;
setupTimers(router);