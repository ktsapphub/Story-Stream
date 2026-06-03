import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const absUrl = (u) => {
  if (!u) return u;
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  return `${BACKEND_URL}${u}`;
};

const http = axios.create({ baseURL: API });

export const getModels = () => http.get("/models").then((r) => r.data);
export const getStats = () => http.get("/stats").then((r) => r.data);

export const generateBlog = (payload) => http.post("/generate/blog", payload).then((r) => r.data);
export const generateBatch = (payload) => http.post("/generate/blog/batch", payload).then((r) => r.data);
export const getJob = (id) => http.get(`/jobs/${id}`).then((r) => r.data);
export const scoreContent = (payload) => http.post("/score", payload).then((r) => r.data);
export const newsletterFromBlog = (payload) => http.post("/generate/newsletter/from-blog", payload).then((r) => r.data);
export const generateNewsletter = (payload) => http.post("/generate/newsletter", payload).then((r) => r.data);
export const generateImage = (payload) => http.post("/generate/image", payload).then((r) => r.data);

export const uploadMedia = (file, title) => {
  const fd = new FormData();
  fd.append("file", file);
  if (title) fd.append("title", title);
  return http.post("/media/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};
export const mediaFromUrl = (payload) => http.post("/media/from-url", payload).then((r) => r.data);
export const listMedia = (type) => http.get("/media", { params: type ? { media_type: type } : {} }).then((r) => r.data);
export const deleteMedia = (id) => http.delete(`/media/${id}`).then((r) => r.data);

export const addKnowledgeUrl = (url) => http.post("/knowledge/url", { url }).then((r) => r.data);
export const uploadKnowledge = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return http.post("/knowledge/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};
export const listKnowledge = () => http.get("/knowledge").then((r) => r.data);
export const getKnowledge = (id) => http.get(`/knowledge/${id}`).then((r) => r.data);
export const deleteKnowledge = (id) => http.delete(`/knowledge/${id}`).then((r) => r.data);

export const listContent = (type, status) =>
  http.get("/content", { params: { type, status } }).then((r) => r.data);
export const getContent = (id) => http.get(`/content/${id}`).then((r) => r.data);
export const saveContent = (payload) => http.post("/content", payload).then((r) => r.data);
export const updateContent = (id, payload) => http.put(`/content/${id}`, payload).then((r) => r.data);
export const setStatus = (id, status) => http.post(`/content/${id}/status`, null, { params: { status } }).then((r) => r.data);
export const deleteContent = (id) => http.delete(`/content/${id}`).then((r) => r.data);

export const exportUrl = (id, format) => `${API}/export/${id}?format=${format}`;
export const fetchExportText = (id, format) => http.get(`/export/${id}`, { params: { format }, responseType: "text" }).then((r) => r.data);
