import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Tasks API
export const getTasks = async () => {
  const response = await axios.get(`${API_URL}/tasks`);
  return response.data;
};

export const createTask = async (task) => {
  const response = await axios.post(`${API_URL}/tasks`, task);
  return response.data;
};

export const updateTask = async (id, task) => {
  const response = await axios.patch(`${API_URL}/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await axios.delete(`${API_URL}/tasks/${id}`);
  return response.data;
};

// Team Members API
export const getTeamMembers = async () => {
  const response = await axios.get(`${API_URL}/team-members`);
  return response.data;
};

export const createTeamMember = async (member) => {
  const response = await axios.post(`${API_URL}/team-members`, member);
  return response.data;
};

export const updateTeamMember = async (id, member) => {
  const response = await axios.patch(`${API_URL}/team-members/${id}`, member);
  return response.data;
};

export const deleteTeamMember = async (id) => {
  const response = await axios.delete(`${API_URL}/team-members/${id}`);
  return response.data;
};

// Burning Issues API
export const getBurningIssues = async () => {
  const response = await axios.get(`${API_URL}/burning-issues`);
  return response.data;
};

export const createBurningIssue = async (issue) => {
  const response = await axios.post(`${API_URL}/burning-issues`, issue);
  return response.data;
};

export const updateBurningIssue = async (id, issue) => {
  const response = await axios.patch(`${API_URL}/burning-issues/${id}`, issue);
  return response.data;
};

export const deleteBurningIssue = async (id) => {
  const response = await axios.delete(`${API_URL}/burning-issues/${id}`);
  return response.data;
};

// Support Items API
export const getSupportItems = async () => {
  const response = await axios.get(`${API_URL}/support-items`);
  return response.data;
};

export const createSupportItem = async (item) => {
  const response = await axios.post(`${API_URL}/support-items`, item);
  return response.data;
};

export const updateSupportItem = async (id, item) => {
  const response = await axios.patch(`${API_URL}/support-items/${id}`, item);
  return response.data;
};

export const deleteSupportItem = async (id) => {
  const response = await axios.delete(`${API_URL}/support-items/${id}`);
  return response.data;
}; 