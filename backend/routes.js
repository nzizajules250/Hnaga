import express from 'express';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Project from './models/Project.js';
import Task from './models/Task.js';
import Group from './models/Group.js';
import auth from './middleware/auth.js';

const router = express.Router();

// Register route - Updated to handle both name and username from frontend
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role, adminSecret } = req.body;

    // Validate required fields
    if (!email || !password || (!name && !username)) {
      return res.status(400).json({ 
        message: 'Email, password, and name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email }, 
        ...(username ? [{ username }] : [])
      ] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email or username' 
      });
    }

    // Validate admin registration
    if (role === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(400).json({ message: 'Invalid admin secret code' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object - prioritize name over username for compatibility
    const userData = {
      email,
      password: hashedPassword,
      role: role || 'user'
    };

    if (name) {
      userData.name = name;
      userData.username = username || name.toLowerCase().replace(/\s+/g, '');
    } else {
      userData.username = username;
      userData.name = username;
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route - Updated to handle both email and username
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({ 
        message: 'Email/username and password are required' 
      });
    }

    // Find user by email or username
    const user = await User.findOne({ 
      $or: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : [])
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Dashboard route - Enhanced with user data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    const projects = await Project.find({ 
      $or: [{ owner: req.user }, { members: req.user }] 
    }).populate('owner', 'name username email');
    
    const tasks = await Task.find({ 
      $or: [{ assignee: req.user }, { createdBy: req.user }] 
    }).populate('project', 'name');

    const groups = await Group.find({ members: req.user });

    res.json({
      message: 'Welcome to dashboard',
      user,
      stats: {
        projects: projects.length,
        tasks: tasks.length,
        groups: groups.length,
        completedTasks: tasks.filter(task => task.status === 'completed').length
      },
      recentProjects: projects.slice(0, 5),
      recentTasks: tasks.slice(0, 5)
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected route to get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Projects CRUD - Enhanced with better validation and population
router.post('/projects', auth, async (req, res) => {
  try {
    const { name, description, members, endDate, priority } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = new Project({
      name,
      description,
      owner: req.user,
      members: members || [req.user],
      endDate,
      priority: priority || 'medium'
    });
    
    await project.save();
    await project.populate('owner members', 'name username email');
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 
      $or: [{ owner: req.user }, { members: req.user }] 
    }).populate('owner members', 'name username email');
    res.json(projects);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner members', 'name username email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.owner._id.toString() === req.user || 
                     project.members.some(member => member._id.toString() === req.user);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get project tasks
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee createdBy', 'name username email');

    res.json({ ...project.toObject(), tasks });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or member
    const hasAccess = project.owner.toString() === req.user || 
                     project.members.includes(req.user);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('owner members', 'name username email');
    
    res.json(updatedProject);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.user) {
      return res.status(403).json({ message: 'Only project owner can delete this project' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tasks CRUD - Enhanced with better validation
router.post('/tasks', auth, async (req, res) => {
  try {
    const { title, description, status, project, assignee, dueDate, priority } = req.body;
    
    if (!title || !project) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    // Verify project exists and user has access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = projectDoc.owner.toString() === req.user || 
                     projectDoc.members.includes(req.user);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    const task = new Task({ 
      title, 
      description, 
      status: status || 'todo', 
      project, 
      assignee: assignee || req.user,
      createdBy: req.user,
      dueDate,
      priority: priority || 'medium'
    });
    
    await task.save();
    await task.populate('assignee createdBy project', 'name username email');
    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/tasks', auth, async (req, res) => {
  try {
    const { project, status } = req.query;
    let filter = {
      $or: [{ assignee: req.user }, { createdBy: req.user }]
    };

    if (project) filter.project = project;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate('assignee createdBy', 'name username email')
      .populate('project', 'name');
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee createdBy', 'name username email')
      .populate('project', 'name owner members');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access through project membership
    const hasAccess = task.project.owner.toString() === req.user || 
                     task.project.members.includes(req.user) ||
                     task.assignee._id.toString() === req.user ||
                     task.createdBy._id.toString() === req.user;
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access
    const hasAccess = task.project.owner.toString() === req.user || 
                     task.project.members.includes(req.user) ||
                     task.assignee.toString() === req.user ||
                     task.createdBy.toString() === req.user;
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update completedAt if status changes to completed
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('assignee createdBy project', 'name username email');
    
    res.json(updatedTask);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only creator or project owner can delete
    const canDelete = task.createdBy.toString() === req.user ||
                     task.project.owner.toString() === req.user;
    
    if (!canDelete) {
      return res.status(403).json({ message: 'Only task creator or project owner can delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Groups CRUD - Enhanced with admin functionality
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description, members, isPublic } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = new Group({ 
      name, 
      description,
      members: members || [req.user],
      admin: req.user,
      isPublic: isPublic || false
    });
    
    await group.save();
    await group.populate('members admin', 'name username email');
    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 
      $or: [{ members: req.user }, { isPublic: true }] 
    }).populate('members admin', 'name username email');
    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members admin projects', 'name username email');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check access
    const hasAccess = group.members.some(member => member._id.toString() === req.user) ||
                     group.isPublic;
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admin can update group
    if (group.admin.toString() !== req.user) {
      return res.status(403).json({ message: 'Only group admin can update this group' });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('members admin', 'name username email');
    
    res.json(updatedGroup);
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admin can delete group
    if (group.admin.toString() !== req.user) {
      return res.status(403).json({ message: 'Only group admin can delete this group' });
    }

    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;