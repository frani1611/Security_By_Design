// frontend/src/services/api.ts

import axios from 'axios';

export type AuthResponse = { message: string; token?: string; id?: string };

// Backend-URL anpassen, falls nötig (z.B. 'http://localhost:5000')
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
});

export async function login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post('/login', { username: usernameOrEmail, password });
  return res.data;
}

export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post('/register', { username, email, password });
  return res.data;
}

// Backwards-compatible alias (falls Komponenten 'register' importieren)
export const register = registerUser;

// Upload / other API helpers (use '/api/...' if your server routes are namespaced)
export async function uploadImage(formData: FormData) {
  // Do not set Content-Type here — let the browser populate the correct
  // multipart/form-data boundary header for FormData.
  const res = await apiClient.post('/api/upload', formData);
  return res.data;
}

export async function uploadPost(formData: FormData) {
  // Authenticated upload: attach JWT from localStorage
  const token = localStorage.getItem('token');
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await apiClient.post('/api/upload-post', formData, { headers });
  return res.data;
}

export async function getUserPosts() {
  const token = localStorage.getItem('token');
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await apiClient.get('/api/user-posts', { headers });
  return res.data as any[];
}

export async function getPosts(limit = 10, skip = 0) {
  const token = localStorage.getItem('token');
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await apiClient.get(`/api/posts?limit=${limit}&skip=${skip}`, { headers });
  return res.data as { posts: any[]; total: number };
}

// Alias für Komponenten, die uploadImageService importieren
export const uploadImageService = uploadImage;

export async function getUserData(userId: string) {
  const res = await apiClient.get(`/api/users/${userId}`);
  return res.data;
}

export default apiClient;