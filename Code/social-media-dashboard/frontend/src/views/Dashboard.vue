<template>
  <div class="dashboard container">
    
    <div class="uploads">
      <h2>Your Uploads</h2>
      <div class="grid">
        <div v-for="(upload, idx) in uploads" :key="upload.id || upload._id || idx" class="tile" @click="openDetail(upload)">
          <div class="tile-image">
            <img :src="upload.imageUrl" :alt="upload.text || ('Upload ' + idx)" />
          </div>
        </div>
      </div>
    </div>
    <!-- Upload modal -->
    <div v-if="showUploadModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal card">
        <h2>Upload New Image</h2>
        <div class="upload-row">
          <input type="file" @change="handleFileUpload" />
          <button @click="uploadImage">Upload</button>
          <button @click="closeModal" class="btn--secondary">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Detail modal for image -->
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
            <button v-if="canDeleteSelected" class="btn btn--danger" @click="onDeleteSelected" style="margin-left:8px">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { uploadImageService, uploadPost, getUserPosts, deleteUserPost } from '../services/api';

export default defineComponent({
  name: 'Dashboard',
  setup() {
    const store = useStore();
    const uploads = ref<any[]>([]);
    const selectedFile = ref<File | null>(null);

    const showUploadModal = computed(() => store.state.showUploadModal);
    const selectedPost = ref<any | null>(null);
    const showDetail = ref(false);
    const canDeleteSelected = computed(() => {
      const token = localStorage.getItem('token');
      if (!token || !selectedPost.value) return false;
      // Allow delete only if the selected post belongs to the logged-in user
      // We only have username here; in a real app we'd also verify user id.
      // For now, if token exists, we allow delete of user's own posts list.
      return true;
    });

    const openDetail = (post: any) => {
      selectedPost.value = post;
      showDetail.value = true;
    };

    const closeDetail = () => {
      showDetail.value = false;
      selectedPost.value = null;
    };

    const onDeleteSelected = async () => {
      if (!selectedPost.value) return;
      const id = selectedPost.value._id || selectedPost.value.id;
      if (!id) return;
      if (!confirm('Möchtest du diesen Beitrag wirklich löschen?')) return;
      try {
        await deleteUserPost(String(id));
        // remove from uploads list
        uploads.value = uploads.value.filter(p => (p._id || p.id) !== id);
        closeDetail();
        alert('Beitrag erfolgreich gelöscht!');
      } catch (e: any) {
        console.error('Delete failed:', e);
        const errorMsg = e?.response?.data?.message || e?.message || 'Löschen fehlgeschlagen.';
        alert(`Fehler beim Löschen: ${errorMsg}`);
      }
    };

    const formatDate = (d: any) => {
      try {
        const date = d ? new Date(d) : new Date();
        return date.toLocaleString();
      } catch (e) {
        return String(d);
      }
    };

    const handleFileUpload = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        selectedFile.value = target.files[0];
      }
    };

    const uploadImage = async () => {
      if (selectedFile.value) {
        try {
          const fd = new FormData();
          fd.append('image', selectedFile.value);

          const token = localStorage.getItem('token');
          let res;
          if (token) {
            // Authenticated upload -> save post with username from token
            res = await uploadPost(fd);
            // uploadPost returns { message, post }
            const post = res && res.post ? res.post : res;
            const normalized = {
              id: post._id || post.id,
              _id: post._id || post.id,
              username: post.username || 'anonymous',
              imageUrl: post.imageUrl || post.url || '',
              text: post.text || '',
              createdAt: post.createdAt || new Date().toISOString(),
              likes: post.likes || [],
            };
            uploads.value.push(normalized);
          } else {
            // Anonymous upload
            res = await uploadImageService(fd);
            const post = res && res.post ? res.post : res;
            const normalized = {
              id: post._id || post.id,
              _id: post._id || post.id,
              username: post.username || post.username || 'anonymous',
              imageUrl: post.imageUrl || post.url || '',
              text: post.text || '',
              createdAt: post.createdAt || new Date().toISOString(),
              likes: post.likes || [],
            };
            uploads.value.push(normalized);
          }

          selectedFile.value = null; // Reset the file state
          // close modal if open
          try { store.commit('closeUploadModal'); } catch (e) { /* ignore */ }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    };

    const closeModal = () => {
      try { store.commit('closeUploadModal'); } catch (e) { /* ignore */ }
    };

    // Load authenticated user's posts on mount
    onMounted(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const posts = await getUserPosts();
        // Normalize posts and set to uploads
        uploads.value = (posts || []).map((post: any) => ({
          id: post._id || post.id,
          _id: post._id || post.id,
          username: post.username || 'anonymous',
          imageUrl: post.imageUrl || post.url || '',
          text: post.text || '',
          createdAt: post.createdAt || new Date().toISOString(),
          likes: post.likes || [],
        }));
      } catch (err) {
        console.error('Failed to load user posts:', err);
      }
    });


    return {
      uploads,
      handleFileUpload,
      uploadImage,
      showUploadModal,
      closeModal,
      selectedPost,
      showDetail,
      openDetail,
      closeDetail,
      formatDate,
      canDeleteSelected,
      onDeleteSelected,
    };
  },
});
</script>

<style scoped>
.dashboard {
  padding: 8px 0 40px;
}

.uploads {
  margin-top: 18px;
}

.upload-form {
  margin-top: 20px;
}

.upload-row input[type="file"] {
  padding: 6px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal {
  background: var(--surface);
  padding: 16px;
  border-radius: 8px;
  width: 520px;
  max-width: calc(100% - 80px);
}
.btn--secondary {
  margin-left: 8px;
}
.btn--danger {
  background: #d32f2f;
}

/* Modal content tweaks */
.modal h2 {
  margin: 0 0 12px 0;
  font-size: 1.25rem;
}
.upload-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.upload-row input[type="file"] {
  display: inline-block;
}
.btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.modal .btn--secondary {
  background: transparent;
  color: var(--primary);
  border: 1px solid rgba(0,0,0,0.06);
}

/* Grid of image tiles */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.tile {
  background: var(--surface);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tile-image img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

/* Detail modal layout */
.detail-modal {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.detail-left img {
  width: 360px;
  max-width: 40vw;
  height: auto;
  border-radius: 6px;
}
.detail-right {
  flex: 1;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .detail-left img { max-width: 48vw; }
}
@media (max-width: 520px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .detail-modal { flex-direction: column; }
  .detail-left img { width: 100%; max-width: 100%; }
}
</style>