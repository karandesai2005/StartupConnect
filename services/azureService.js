// src/services/azureService.js
import axios from 'axios';

const AZURE_API_BASE_URL = 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/'; // e.g., 'https://your-azure-function.azurewebsites.net/api'

// Create axios instance with default config
const azureApi = axios.create({
  baseURL: AZURE_API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor to include authentication token
azureApi.interceptors.request.use(
  async (config) => {
    // Get the token from your auth storage
    const token = await getAuthToken(); // Implement this based on your auth setup
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const fetchUserDetails = async (userId) => {
  try {
    const response = await azureApi.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw new Error('Failed to fetch user details');
  }
};

export const fetchUserProfilePicture = async (userId) => {
  try {
    const response = await azureApi.get(`/users/${userId}/profile-picture`);
    return response.data.url;
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    throw new Error('Failed to fetch profile picture');
  }
};

export const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await azureApi.put(`/users/${userId}/status`, { isOnline });
  } catch (error) {
    console.error('Error updating online status:', error);
    throw new Error('Failed to update online status');
  }
};

// Helper function to get multiple users' details at once
export const fetchMultipleUserDetails = async (userIds) => {
  try {
    const response = await azureApi.post('/users/batch', { userIds });
    return response.data;
  } catch (error) {
    console.error('Error fetching multiple user details:', error);
    throw new Error('Failed to fetch multiple user details');
  }
};

// Helper function to handle authentication token
const getAuthToken = async () => {
  try {
    // Implement your token retrieval logic here
    // This could be from AsyncStorage, SecureStore, or your auth context
    const token = ''; // Replace with your actual token retrieval
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const searchUsers = async (query) => {
  try {
    const response = await azureApi.get('/users/search', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};