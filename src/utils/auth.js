// utils/auth.js (Frontend utility)
'use client';

// Token management utilities
export const authUtils = {
  // Store token in localStorage
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },

  // Get token from localStorage
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  // Remove token from localStorage
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Store user data
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  // Get user data
  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = authUtils.getToken();
    if (!token) return false;

    try {
      // Parse JWT payload (basic check - server validation is still required)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (payload.exp < currentTime) {
        authUtils.removeToken();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      authUtils.removeToken();
      return false;
    }
  },

  // Check if user is admin
  isAdmin: () => {
    const user = authUtils.getUser();
    return user?.role === 'admin';
  },

  // Get auth headers for API requests
  getAuthHeaders: () => {
    const token = authUtils.getToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  },

  // Logout user
  logout: () => {
    authUtils.removeToken();
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

// API request wrapper with automatic auth headers
export const apiRequest = async (url, options = {}) => {
  const headers = {
    ...authUtils.getAuthHeaders(),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiration
    if (response.status === 401) {
      const data = await response.json();
      if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
        authUtils.logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// React hook for authentication state
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authUtils.isAuthenticated();
      const userData = authUtils.getUser();
      
      setIsAuthenticated(authenticated);
      setUser(userData);
      setLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (token, userData) => {
    authUtils.setToken(token);
    authUtils.setUser(userData);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    authUtils.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin'
  };
};

export default authUtils;