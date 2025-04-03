require('dotenv').config();
const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');
const User = require('../models/userModel');
const { uploadAndConvertPostMedia } = require('../config/multerConfig');

// Constants
const BASE_URL = process.env.BASE_URL || 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net';

// Utility Functions
const getUserId = (req) => req.user?.userId || req.user?.id;

const validateId = (id, name) => {
  if (!id || isNaN(id)) throw new Error(`${name} must be a valid number`);
  return parseInt(id);
};

const validateString = (value, name, minLength, maxLength) => {
  if (!value || value.length < minLength || value.length > maxLength) {
    throw new Error(`${name} must be ${minLength}-${maxLength} characters`);
  }
  return value.trim();
};

// Profile Controller
const profileController = {
  getProfile: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const user = await User.getUserById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json(user);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      const user = await User.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const followerId = getUserId(req);
      const isFollowing = followerId ? await User.isFollowing(followerId, user.user_id) : false;

      res.json({ ...user, isFollowing });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  followUser: async (req, res) => {
    try {
      const followerId = getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params; // Changed to req.params to match route
      validateString(username, 'Username', 3, 20);

      const followee = await User.getUserByUsername(username);
      if (!followee) return res.status(404).json({ error: 'User not found' });
      if (followerId === followee.user_id) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      const isFollowing = await User.isFollowing(followerId, followee.user_id);
      if (isFollowing) return res.status(400).json({ error: 'Already following this user' });

      await User.followUser(followerId, followee.user_id);
      res.status(200).json({ message: 'Successfully followed user' });
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const followerId = getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params; // Changed to req.params to match route
      validateString(username, 'Username', 3, 20);

      const followee = await User.getUserByUsername(username);
      if (!followee) return res.status(404).json({ error: 'User not found' });
      if (followerId === followee.user_id) {
        return res.status(400).json({ error: 'Cannot unfollow yourself' });
      }

      const isFollowing = await User.isFollowing(followerId, followee.user_id);
      if (!isFollowing) return res.status(400).json({ error: 'Not following this user' });

      await User.unfollowUser(followerId, followee.user_id);
      res.status(200).json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  getStories: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const stories = await Story.findByUserId(userId, { limit: parseInt(limit), offset });

      res.json(stories);
    } catch (error) {
      console.error('Get stories error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserStories: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      const user = await User.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const stories = await Story.findByUserId(user.user_id, { limit: parseInt(limit), offset });

      res.json(stories);
    } catch (error) {
      console.error('Get user stories error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addStory: [
    uploadAndConvertPostMedia,
    async (req, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'User authentication required' });
        if (!req.file) return res.status(400).json({ error: 'Media file required' });

        const username = req.user.username;
        const section = req.body.section || 'default';
        const imageUrl = `${BASE_URL}/uploads/posts/${req.file.filename}`;

        const storyId = await Story.create(userId, username, imageUrl, 1, 0, section);
        res.status(201).json({ story_id: storyId, image_url: imageUrl, section });
      } catch (error) {
        console.error('Add story error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    },
  ],

  deleteStory: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { storyId } = req.params;
      const deleted = await Story.deleteById(validateId(storyId, 'Story ID'), userId);

      if (!deleted) return res.status(404).json({ error: 'Story not found or unauthorized' });
      res.status(200).json({ message: 'Story deleted successfully' });
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getSections: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const sections = await Section.findByUserId(userId, { limit: parseInt(limit), offset });

      res.json(sections);
    } catch (error) {
      console.error('Get sections error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserSections: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      const user = await User.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const sections = await Section.findByUserId(user.user_id, { limit: parseInt(limit), offset });

      res.json(sections);
    } catch (error) {
      console.error('Get user sections error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addSection: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { type, title, content, image_uri, section, teamMember } = req.body;
      validateString(type, 'Type', 1, 50);
      validateString(title, 'Title', 1, 100);

      if (type === 'story' && title === 'Team' && teamMember) {
        let teamSection = await Section.findByUserIdAndSection(userId, 'team');
        if (!teamSection) {
          const sectionId = await Section.create(userId, type, title, JSON.stringify({ teamMember }), null, 'team');
          teamSection = { section_id: sectionId };
        } else {
          const existingContent = teamSection.content ? JSON.parse(teamSection.content) : {};
          await Section.update(teamSection.section_id, {
            content: JSON.stringify({ ...existingContent, teamMember }),
          });
        }
        res.status(201).json({ section_id: teamSection.section_id });
      } else {
        const sectionId = await Section.create(userId, type, title, content, image_uri, section || 'default');
        res.status(201).json({ section_id: sectionId });
      }
    } catch (error) {
      console.error('Add section error:', error);
      res.status(error.message.includes('must be') ? 400 : 500).json({ error: error.message });
    }
  },

  deleteSection: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { sectionId } = req.params;
      const deleted = await Section.deleteById(validateId(sectionId, 'Section ID'), userId);

      if (!deleted) return res.status(404).json({ error: 'Section not found or unauthorized' });
      res.status(200).json({ message: 'Section deleted successfully' });
    } catch (error) {
      console.error('Delete section error:', error);
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getGraphs: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const graphs = await Graph.findByUserId(userId, { limit: parseInt(limit), offset });

      res.json(graphs);
    } catch (error) {
      console.error('Get graphs error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserGraphs: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      const user = await User.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const graphs = await Graph.findByUserId(user.user_id, { limit: parseInt(limit), offset });

      res.json(graphs);
    } catch (error) {
      console.error('Get user graphs error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addGraph: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { type, title, data } = req.body;
      validateString(type, 'Type', 1, 50);
      validateString(title, 'Title', 1, 100);
      if (!data) throw new Error('Data is required');

      const graphId = await Graph.create(userId, type, title, data);
      res.status(201).json({ graph_id: graphId });
    } catch (error) {
      console.error('Add graph error:', error);
      res.status(error.message.includes('must be') || error.message.includes('required') ? 400 : 500).json({
        error: error.message,
      });
    }
  },

  deleteGraph: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { graphId } = req.params;
      const deleted = await Graph.deleteById(validateId(graphId, 'Graph ID'), userId);

      if (!deleted) return res.status(404).json({ error: 'Graph not found or unauthorized' });
      res.status(200).json({ message: 'Graph deleted successfully' });
    } catch (error) {
      console.error('Delete graph error:', error);
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },
};

module.exports = profileController;