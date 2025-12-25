import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Thêm token vào request nếu có
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth API
export const authAPI = {
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },
  getProfile: () => api.get('/auth/profile'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/auth/profile'),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  getOne: (id: string) => api.get(`/users/${id}`),
};

// Post API
export const postAPI = {
  getAll: async () => {
    try {
      return await api.get('/posts');
    } catch (e) {
      console.error('postAPI.getAll failed:', e);
      return { data: [] } as any;
    }
  },
  getOne: (id: string) => api.get(`/posts/${id}`),
  create: (data: any) => api.post('/posts', data),
  update: (id: string, data: any) => api.patch(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
};

// Match API
export const matchAPI = {
  getAll: () => api.get('/matches'),
  getOne: (id: string) => api.get(`/matches/${id}`),
  create: (data: any) => api.post('/matches', data),
  update: (id: string, data: any) => api.patch(`/matches/${id}`, data),
};

// Rating API
export const ratingAPI = {
  create: (data: any) => api.post('/ratings', data),
  findByMatch: (matchId: string) => api.get(`/ratings/match/${matchId}`),
  findByRatee: (rateeId: string) => api.get(`/ratings/user/${rateeId}`),
};

// Chat API
export const chatAPI = {
  createConversation: (data: any) => api.post('/chat/conversations', data),
  getConversationsByPost: (postId: string) =>
    api.get(`/chat/conversations/post/${postId}`),
  getConversationsByUser: (userId: string) =>
    api.get(`/chat/conversations/user/${userId}`),
  getConversationsWithDetails: (userId: string) =>
    api.get(`/chat/conversations/user/${userId}/details`),
  getConversationById: (id: string) => api.get(`/chat/conversations/${id}`),
  updateConversation: (id: string, data: any) =>
    api.patch(`/chat/conversations/${id}`, data),
  createChat: (data: any) => api.post('/chat/messages', data),
  getChats: (conversationId: string) =>
    api.get(`/chat/messages/${conversationId}`),
};

