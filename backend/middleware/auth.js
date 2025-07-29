// middleware/auth.js
import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided, authorization denied',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    
    // Log successful authentication (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Auth successful for user: ${decoded.email}`);
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Generic token error
    return res.status(401).json({ 
      message: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
};

// Optional: Admin-only middleware
export const adminAuth = (req, res, next) => {
  // First run the regular auth middleware
  auth(req, res, (err) => {
    if (err) return next(err);
    
    // Check if user has admin role
    if (req.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    next();
  });
};

// Optional: Owner or Admin middleware for resource access
export const ownerOrAdminAuth = (resourceOwnerField = 'owner') => {
  return (req, res, next) => {
    // This middleware should be used after fetching the resource
    // and checking if req.user matches the resource owner or is admin
    if (req.userRole === 'admin') {
      return next();
    }
    
    // The route handler should set req.resourceOwner before using this middleware
    if (req.resourceOwner && req.resourceOwner.toString() === req.user) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Access denied. Owner or admin rights required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};

export default auth;