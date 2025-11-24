import axios from 'axios';

// If we are in production, use the VITE_API_URL env var.
// If we are local, use localhost:3000.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL, 
  withCredentials: true,
});
export { BASE_URL };