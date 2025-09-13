import axios from 'axios';
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000' });
export const fetchDashboard = () => API.get('/kpi/dashboard');
