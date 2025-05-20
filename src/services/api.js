import axios from 'axios';

const API_URL = 'https://orkin-kanban-backend.onrender.com/api';

// Create axios instance with timeout
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Increased timeout to 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false // Changed to false as we're not using cookies
});

// Add request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = { ...config.params, _t: Date.now() };
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error Request:', {
        url: error.config?.url,
        method: error.config?.method,
        message: 'No response received from server'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Tasks API with optimistic updates
export const getTasks = async () => {
  try {
    console.log('Fetching tasks...');
    const response = await api.get('/tasks');
    console.log('Tasks fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createTask = async (task) => {
  try {
    console.log('Creating task:', task);
    const response = await api.post('/tasks', task);
    console.log('Task created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create task:', error);
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
  try {
    const response = await api.get('/team-members');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch team members:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createTeamMember = async (member) => {
  try {
    const response = await api.post('/team-members', member);
    return response.data;
  } catch (error) {
    console.warn('Failed to create team member:', error);
    // Return the member with a temporary ID for optimistic updates
    return { ...member, id: `temp-${Date.now()}` };
  }
};

export const updateTeamMember = async (id, member) => {
  try {
    const response = await api.patch(`/team-members/${id}`, member);
    return response.data;
  } catch (error) {
    console.warn('Failed to update team member:', error);
    return member; // Return the member as is for optimistic updates
  }
};

export const deleteTeamMember = async (id) => {
  try {
    const response = await api.delete(`/team-members/${id}`);
    return response.data;
  } catch (error) {
    console.warn('Failed to delete team member:', error);
    return { id }; // Return the ID for optimistic updates
  }
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

export const deleteBranchManagerIssue = async (id) => {
  const response = await api.delete(`/branch-manager-issues/${id}`);
  return response.data;
}; 