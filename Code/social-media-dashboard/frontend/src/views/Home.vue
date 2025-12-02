<template>
  <div class="home container">
    <h1>Dashboard</h1>
    <p>Recent posts from other users</p>

    <div class="posts">
      <div class="grid">
        <div v-for="(post, idx) in posts" :key="post._id || idx" class="tile" @click="openDetail(post)">
          <img :src="post.imageUrl" alt="post" />
        </div>
      </div>

      <div class="load-more" v-if="posts.length < total">
        <button class="btn" @click="loadMore" :disabled="loading">Load more</button>
      </div>
    </div>
    
    <!-- Detail modal for image on dashboard -->
    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal card detail-modal">
        <div class="detail-left">
          <img :src="selectedPost?.imageUrl" alt="detail" />
        </div>
        <div class="detail-right">
          <h3>Post Details</h3>
          <p><strong>User:</strong> {{ selectedPost?.username || 'anonymous' }}</p>
          <p v-if="selectedPost?.text"><strong>Text:</strong> {{ selectedPost.text }}</p>
          <p v-if="selectedPost?.createdAt"><strong>Uploaded:</strong> {{ formatDate(selectedPost.createdAt) }}</p>
          <p><strong>Likes:</strong> {{ (selectedPost?.likes || []).length }}</p>
          <div style="margin-top:12px">
            <button class="btn" @click="closeDetail">Close</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { getPosts } from '../services/api';

export default defineComponent({
  name: 'Home',
  setup() {
    const posts = ref<any[]>([]);
    const total = ref(0);
    const page = ref(1);
    const limit = 10;
    const loading = ref(false);
    const selectedPost = ref<any | null>(null);
    const showDetail = ref(false);

    const loadPage = async (p = 1) => {
      try {
        loading.value = true;
        const skip = (p - 1) * limit;
        const res = await getPosts(limit, skip);
        // Filter out current user's posts as a client-side safeguard
        const currentUsername = getCurrentUsername();
        let incoming = res.posts || [];
        let removed = 0;
        if (currentUsername) {
          const before = incoming.length;
          incoming = incoming.filter((pp: any) => pp.username !== currentUsername);
          removed = before - incoming.length;
        }

        if (p === 1) posts.value = incoming;
        else posts.value = posts.value.concat(incoming);

        // adjust total to reflect removed posts when backend didn't already exclude them
        const reportedTotal = res.total || 0;
        total.value = Math.max(0, reportedTotal - removed);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        loading.value = false;
      }
    };

    const getCurrentUsername = () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.username || payload.email || null;
      } catch (e) {
        return null;
      }
    };

    const loadMore = async () => {
      if (posts.value.length >= total.value) return;
      page.value += 1;
      await loadPage(page.value);
    };

    const openDetail = (post: any) => {
      selectedPost.value = post;
      showDetail.value = true;
    };

    const closeDetail = () => {
      showDetail.value = false;
      selectedPost.value = null;
    };

    onMounted(async () => {
      await loadPage(1);
    });

    const formatDate = (d: any) => {
      try { return new Date(d).toLocaleString(); } catch(e) { return String(d); }
    };

    return { posts, total, loading, loadMore, openDetail, selectedPost, showDetail, closeDetail, formatDate };
  },
});
</script>

<style scoped>
.home {
  padding: 16px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tile {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f6f7f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 90;
}

.detail-modal {
  max-width: 900px;
  width: 90%;
  display: flex;
  gap: 12px;
}

.detail-left img { max-width: 100%; max-height: 80vh; object-fit: contain; }
</style>
