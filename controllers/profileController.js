require('dotenv').config();
const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');
const User = require('../models/userModel');
const { supabase } = require('../services/supabase');
const { queryDB } = require('../config/db');
const { uploadAndConvertPostMedia, uploadProfilePicture } = require('../config/multerConfig');

// Constants
const BASE_URL = process.env.BASE_URL || 'http://pitch-backend-env.eba-ep4nstmn.ap-south-1.elasticbeanstalk.com';

// Utility Functions
const getUserId = async (req) => {
  const uuid = req.user?.id; // UUID from Supabase auth
  if (!uuid) throw new Error('User authentication required');

  const { data: user, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('supabase_uid', uuid)
    .single();
  if (error || !user) throw new Error('User not found');
  return user.user_id;
};

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

const cleanUrl = (url) => {
  if (!url) return url;
  return url
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .replace('http:/', 'http://')
    .replace('https:/', 'https://');
};

// Profile Controller
const profileController = {
  getProfile: async (req, res) => {
    try {
      const supabase_uid = req.user.id;

      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business, reel_url')
        .eq('supabase_uid', supabase_uid)
        .single();
      if (error || !data) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ ...data, profile_picture: cleanUrl(data.profile_picture) });
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
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const followerId = await getUserId(req);
      const isFollowing = followerId ? await User.isFollowing(followerId, user.user_id) : false;

      res.json({ ...user, profile_picture: cleanUrl(user.profile_picture), isFollowing });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  updateProfile: [
    uploadProfilePicture,
    async (req, res) => {
      try {
        const supabase_uid = req.user.id;
        const { bio } = req.body;
        const profilePicture = req.file;

        console.log('Received bio:', bio);
        console.log('Received file:', profilePicture);

        let updates = {};
        if (bio) updates.bio = bio;
        if (profilePicture) {
          const profilePictureUrl = cleanUrl(`${BASE_URL}/Uploads/profile_pictures/${profilePicture.filename}`);
          updates.profile_picture = profilePictureUrl;
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'No fields to update.' });
        }

        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('supabase_uid', supabase_uid)
          .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
          .single();
        if (error) throw error;

        console.log('Updated user:', data);
        res.status(200).json({ ...data, profile_picture: cleanUrl(data.profile_picture) });
      } catch (error) {
        console.error('Update profile error:', error);
        res.status(error.message.includes('No fields') ? 400 : 500).json({ error: error.message });
      }
    },
  ],

  updateProfilePicture: [
    uploadProfilePicture,
    async (req, res) => {
      try {
        const supabase_uid = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'Profile picture required' });

        const profilePictureUrl = cleanUrl(`${BASE_URL}/Uploads/profile_pictures/${req.file.filename}`);
        console.log(`Updating profile picture for user ${supabase_uid}: ${profilePictureUrl}`);

        const { data, error } = await supabase
          .from('users')
          .update({ profile_picture: profilePictureUrl })
          .eq('supabase_uid', supabase_uid)
          .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
          .single();
        if (error) throw error;

        res.status(200).json({
          message: 'Profile picture updated successfully',
          user: { ...data, profile_picture: cleanUrl(data.profile_picture) },
        });
      } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(error.message.includes('Profile picture') ? 400 : 500).json({ error: error.message });
      }
    },
  ],

  getUserPostsByUsername: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);
  
      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const postsQuery = `
        SELECT p.post_id, p.user_id, u.username, u.name, p.media_url, p.content, p.created_at, p.media_type,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count,
               u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `;
      const posts = await queryDB(postsQuery, [user.user_id]);
  
      res.json(posts.map(post => ({
        ...post,
        media_url: cleanUrl(post.media_url),
        profile_picture: cleanUrl(post.profile_picture || ''),
        name: post.name || post.username,
        comment_count: Number(post.comment_count) || 0,
        like_count: Number(post.like_count) || 0
      })));
    } catch (error) {
      console.error('Get user posts by username error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 1) {
        return res.status(400).json({ error: 'Search query is required.' });
      }

      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, profile_picture')
        .ilike('username', `%${q.toLowerCase()}%`)
        .order('username');
      if (error) throw error;

      res.json(data.map(user => ({
        ...user,
        profile_picture: cleanUrl(user.profile_picture),
      })));
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  fixProfilePictureURLs: async (req, res) => {
    try {
      const query = `
        UPDATE users
        SET profile_picture = REPLACE(profile_picture, '//Uploads', '/Uploads')
        WHERE profile_picture LIKE '%//Uploads%';
      `;
      await queryDB(query, []);
      res.status(200).json({ message: 'Profile picture URLs normalized' });
    } catch (error) {
      console.error('Fix profile picture URLs error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  followUser: async (req, res) => {
    try {
      const followerId = await getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      console.log(`Follow request: followerId=${followerId}, username=${username}`);

      const followee = await User.getUserByUsername(username);
      if (!followee) return res.status(404).json({ error: 'User not found' });
      if (followerId === followee.user_id) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      const isFollowing = await User.isFollowing(followerId, followee.user_id);
      if (isFollowing) return res.status(400).json({ error: 'Already following this user' });

      await User.followUser(followerId, followee.user_id);

      const updatedUser = await User.getUserByUsername(username);
      res.status(200).json({
        message: 'Successfully followed user',
        isFollowing: true,
        followers: updatedUser.followers || 0,
      });
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const followerId = await getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      console.log(`Unfollow request: followerId=${followerId}, username=${username}`);

      const followee = await User.getUserByUsername(username);
      if (!followee) return res.status(404).json({ error: 'User not found' });
      if (followerId === followee.user_id) {
        return res.status(400).json({ error: 'Cannot unfollow yourself' });
      }

      const isFollowing = await User.isFollowing(followerId, followee.user_id);
      if (!isFollowing) return res.status(400).json({ error: 'Not following this user' });

      await User.unfollowUser(followerId, followee.user_id);

      const updatedUser = await User.getUserByUsername(username);
      res.status(200).json({
        message: 'Successfully unfollowed user',
        isFollowing: false,
        followers: updatedUser.followers || 0,
      });
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  getStories: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const stories = await Story.findByUserId(userId, { limit: parseInt(limit), offset });

      res.json(stories.map(story => ({
        ...story,
        image_url: cleanUrl(story.image_url),
      })));
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

      res.json(stories.map(story => ({
        ...story,
        image_url: cleanUrl(story.image_url),
      })));
    } catch (error) {
      console.error('Get user stories error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addStory: [
    uploadAndConvertPostMedia,
    async (req, res) => {
      try {
        const userId = await getUserId(req);
        if (!userId) return res.status(401).json({ error: 'User authentication required' });
        if (!req.file) return res.status(400).json({ error: 'Media file required' });

        const user = await User.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const username = user.username;
        const section = req.body.section || 'default';
        const imageUrl = cleanUrl(`${BASE_URL}/Uploads/posts/${req.file.filename}`);

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
      const userId = await getUserId(req);
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
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const sections = await Section.findByUserId(userId, { limit: parseInt(limit), offset });

      res.json(sections.map(section => ({
        ...section,
        image_uri: cleanUrl(section.image_uri),
      })));
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

      res.json(sections.map(section => ({
        ...section,
        image_uri: cleanUrl(section.image_uri),
      })));
    } catch (error) {
      console.error('Get user sections error:', error);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addSection: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { type, title, content, image_uri, section, teamMember } = req.body;
      validateString(type, 'Type', 1, 50);
      validateString(title, 'Title', 1, 100);

      let cleanedImageUri = image_uri ? cleanUrl(image_uri) : null;

      if (type === 'story' && title === 'Team' && teamMember) {
        let teamSection = await Section.findByUserIdAndSection(userId, 'team');
        if (!teamSection) {
          const sectionId = await Section.create(userId, type, title, JSON.stringify({ teamMember }), cleanedImageUri, 'team');
          teamSection = { section_id: sectionId };
        } else {
          const existingContent = teamSection.content ? JSON.parse(teamSection.content) : {};
          await Section.update(teamSection.section_id, {
            content: JSON.stringify({ ...existingContent, teamMember }),
          });
        }
        res.status(201).json({ section_id: teamSection.section_id });
      } else {
        const sectionId = await Section.create(userId, type, title, content, cleanedImageUri, section || 'default');
        res.status(201).json({ section_id: sectionId });
      }
    } catch (error) {
      console.error('Add section error:', error);
      res.status(error.message.includes('must be') ? 400 : 500).json({ error: error.message });
    }
  },

  deleteSection: async (req, res) => {
    try {
      const userId = await getUserId(req);
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
      const userId = await getUserId(req);
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
      const userId = await getUserId(req);
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
      const userId = await getUserId(req);
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