import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

const API_URL = `${API_BASE}/api/auth`;

const authService = {
  forgotPassword: async (email) => {
    // For future backend integration
    // const response = await axios.post(`${API_URL}/forgot-password`, { email });
    // return response.data;
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1500));
  },

  verifyOTP: async (email, otp) => {
    // For future backend integration
    // const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
    // return response.data;
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1500));
  },

  resetPassword: async (email, newPassword) => {
    // For future backend integration
    // const response = await axios.post(`${API_URL}/reset-password`, { email, newPassword });
    // return response.data;
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1500));
  }
};

export default authService;
