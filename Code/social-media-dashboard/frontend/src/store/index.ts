import { createStore } from 'vuex';

const store = createStore({
  state: {
    user: null,
    isAuthenticated: false,
    posts: [],
    showUploadModal: false,
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
      state.isAuthenticated = !!user;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
    setPosts(state, posts) {
      state.posts = posts;
    },
    addPost(state, post) {
      state.posts.push(post);
    },
    openUploadModal(state) {
      state.showUploadModal = true;
    },
    closeUploadModal(state) {
      state.showUploadModal = false;
    },
  },
  actions: {
    async fetchPosts({ commit }) {
      const response = await fetch('/api/posts');
      const data = await response.json();
      commit('setPosts', data);
    },
    async login({ commit }, credentials) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      const user = await response.json();
      commit('setUser', user);
    },
    async logout({ commit }) {
      await fetch('/api/auth/logout', { method: 'POST' });
      commit('logout');
    },
  },
  getters: {
    isAuthenticated: (state) => state.isAuthenticated,
    user: (state) => state.user,
    posts: (state) => state.posts,
  },
});

export default store;