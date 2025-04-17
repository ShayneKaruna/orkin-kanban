import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with timeout
const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 second timeout
});

// Add request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = { ...config.params, _t: Date.now() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timeout - server might be offline');
    }
    return Promise.reject(error);
  }
);

// Tasks API with optimistic updates
export const getTasks = async () => {
  try {
    const response = await api.get('/tasks');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch tasks:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createTask = async (task) => {
  try {
    const response = await api.post('/tasks', task);
    return response.data;
  } catch (error) {
    console.warn('Failed to create task:', error);
    // Return the task with a temporary ID for optimistic updates
    return { ...task, id: `temp-${Date.now()}` };
  }
};

export const updateTask = async (id, task) => {
  const response = await api.patch(`/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

// Team Members API
export const getTeamMembers = async () => {
  const response = await api.get('/team-members');
  return response.data;
};

export const createTeamMember = async (member) => {
  const response = await api.post('/team-members', member);
  return response.data;
};

export const updateTeamMember = async (id, member) => {
  const response = await api.patch(`/team-members/${id}`, member);
  return response.data;
};

export const deleteTeamMember = async (id) => {
  const response = await api.delete(`/team-members/${id}`);
  return response.data;
};

// Burning Issues API
export const getBurningIssues = async () => {
  const response = await api.get('/burning-issues');
  return response.data;
};

export const createBurningIssue = async (issue) => {
  const response = await api.post('/burning-issues', issue);
  return response.data;
};

export const updateBurningIssue = async (id, issue) => {
  const response = await api.patch(`/burning-issues/${id}`, issue);
  return response.data;
};

export const deleteBurningIssue = async (id) => {
  const response = await api.delete(`/burning-issues/${id}`);
  return response.data;
};

// Support Items API with optimistic updates
export const getSupportItems = async () => {
  try {
    const response = await api.get('/support-items');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch support items:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createSupportItem = async (item) => {
  try {
    const response = await api.post('/support-items', item);
    return response.data;
  } catch (error) {
    console.warn('Failed to create support item:', error);
    // Return the item with a temporary ID for optimistic updates
    return { ...item, id: `temp-${Date.now()}` };
  }
};

export const updateSupportItem = async (id, item) => {
  const response = await api.patch(`/support-items/${id}`, item);
  return response.data;
};

export const deleteSupportItem = async (id) => {
  const response = await api.delete(`/support-items/${id}`);
  return response.data;
}; 