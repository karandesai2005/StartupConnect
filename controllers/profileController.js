require('dotenv').config();
const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');
const User = require('../models/userModel');
const { supabase } = require('../services/supabase');
const { queryDB } = require('../config/db');
const { uploadPostMedia, uploadProfilePicture } = require('../config/multerConfig');
const path = require('path');
const logger = require('../logger'); // Use winston logger

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit, matching frontend

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
  return url.replace(/\/+/g, '/'); // Only normalize slashes
};

// Profile Controller
const profileController = {
  g// In controllers/profileController.js
getProfile: async (req, res) => {
    try {
      const supabase_uid = req.user.id;

      // Use the same query as getUserByUsername to include followers and following
      const { data, error } = await supabase
        .from('users')
        .select(`
        user_id,
        username,
        email,
        name,
        bio,
        profile_picture,
        is_personal,
        is_business,
        reel_url,
        is_founder,
        is_investor,
        interests,
        followers:followers!public_followers_followee_id_fkey(count),
        following:followers!public_followers_follower_id_fkey(count)
      `)
        .eq('supabase_uid', supabase_uid)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Format followers and following counts
      const formattedData = {
        ...data,
        profile_picture: cleanUrl(data.profile_picture),
        followers: data.followers.count || 0,
        following: data.following.count || 0,
      };

      res.json(formattedData);
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
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
      logger.error(`Get user profile error: ${error.message}`);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const supabase_uid = req.user.id;
      const { bio } = req.body;

      if (!bio) {
        return res.status(400).json({ error: 'Bio is required' });
      }

      const { data, error } = await supabase
        .from('users')
        .update({ bio })
        .eq('supabase_uid', supabase_uid)
        .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
        .single();
      if (error) throw error;

      logger.info('Updated user:', data);
      res.status(200).json({ ...data, profile_picture: cleanUrl(data.profile_picture) });
    } catch (error) {
      logger.error(`Update profile error: ${error.message}`);
      res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message });
    }
  },

  updateProfilePicture: [
    uploadProfilePicture,
    async (req, res) => {
      try {
        const supabase_uid = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'Profile picture required' });

        // Validate file size
        if (req.file.size > MAX_FILE_SIZE) {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ error: 'Only JPEG, PNG, or GIF files are allowed' });
        }

        // Fetch current profile picture to clean up later
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('profile_picture')
          .eq('supabase_uid', supabase_uid)
          .single();
        if (fetchError) throw fetchError;

        // Upload new profile picture
        const fileName = `profile-${Date.now()}${path.extname(req.file.originalname)}`;
        const { data, error } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (error) {
          logger.error(`Supabase upload error: ${error.message}`);
          return res.status(500).json({ error: 'Failed to upload profile picture' });
        }

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

        const profilePictureUrl = urlData.publicUrl;
        logger.info(`Updating profile picture for user ${supabase_uid}: ${profilePictureUrl}`);

        // Update user with new profile picture URL
        const { data: updatedData, error: updateError } = await supabase
          .from('users')
          .update({ profile_picture: profilePictureUrl })
          .eq('supabase_uid', supabase_uid)
          .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
          .single();
        if (updateError) throw updateError;

        // Clean up old profile picture if it exists
        if (user.profile_picture) {
          const oldFileName = user.profile_picture.split('/').pop();
          await supabase.storage.from('profile-pictures').remove([oldFileName]);
          logger.info(`Deleted old profile picture: ${oldFileName}`);
        }

        res.status(200).json({ user: { ...updatedData, profile_picture: cleanUrl(updatedData.profile_picture) } });
      } catch (error) {
        logger.error(`Update profile picture error: ${error.message}`);
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
        like_count: Number(post.like_count) || 0,
      })));
    } catch (error) {
      logger.error(`Get user posts by username error: ${error.message}`);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  getFollowers: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      // Fetch the user by username to get their user_id
      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch followers using User model
      const followers = await User.getFollowers(user.user_id);

      // Clean profile picture URLs
      const cleanedFollowers = followers.map(follower => ({
        ...follower,
        profile_picture: cleanUrl(follower.profile_picture || ''),
      }));

      res.status(200).json(cleanedFollowers);
    } catch (error) {
      logger.error(`Get followers error: ${error.message}`);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  getFollowing: async (req, res) => {
    try {
      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      // Fetch the user by username to get their user_id
      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch following users using User model
      const following = await User.getFollowing(user.user_id);

      // Clean profile picture URLs
      const cleanedFollowing = following.map(follow => ({
        ...follow,
        profile_picture: cleanUrl(follow.profile_picture || ''),
      }));

      res.status(200).json(cleanedFollowing);
    } catch (error) {
      logger.error(`Get following error: ${error.message}`);
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
      logger.error(`Search users error: ${error.message}`);
      res.status(500).json({ error: 'Server error' });
    }
  },

  fixProfilePictureURLs: async (req, res) => {
    try {
      const query = `
        UPDATE users
        SET profile_picture = REGEXP_REPLACE(profile_picture, '//+[uU][pP][lL][oO][aA][dD][sS]', '/Uploads', 'i')
        WHERE profile_picture ~* '//+[uU][pP][lL][oO][aA][dD][sS]';
      `;
      await queryDB(query, []);
      res.status(200).json({ message: 'Profile picture URLs normalized' });
    } catch (error) {
      logger.error(`Fix profile picture URLs error: ${error.message}`);
      res.status(500).json({ error: 'Server error' });
    }
  },

  followUser: async (req, res) => {
    try {
      const followerId = await getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      logger.info(`Follow request: followerId=${followerId}, username=${username}`);

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
      logger.error(`Follow user error: ${error.message}`);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const followerId = await getUserId(req);
      if (!followerId) return res.status(401).json({ error: 'User authentication required' });

      const { username } = req.params;
      validateString(username, 'Username', 3, 20);

      logger.info(`Unfollow request: followerId=${followerId}, username=${username}`);

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
      logger.error(`Unfollow user error: ${error.message}`);
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
      logger.error(`Get stories error: ${error.message}`);
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
      logger.error(`Get user stories error: ${error.message}`);
      res.status(error.message.includes('Username') ? 400 : 500).json({ error: error.message });
    }
  },

  addStory: [
    uploadPostMedia, // Updated middleware name
    async (req, res) => {
      try {
        const userId = await getUserId(req);
        if (!userId) return res.status(401).json({ error: 'User authentication required' });
        if (!req.file) return res.status(400).json({ error: 'Media file required' });

        // Validate file size
        if (req.file.size > MAX_FILE_SIZE) {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/mov'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ error: 'Only images (JPEG, PNG, GIF) and videos (MP4, MOV) allowed for stories' });
        }

        const user = await User.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const fileName = `story-${Date.now()}${path.extname(req.file.originalname)}`;
        const { data, error } = await supabase.storage
          .from('stories')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (error) {
          logger.error(`Supabase upload error (story): ${error.message}`);
          return res.status(500).json({ error: 'Failed to upload story media' });
        }

        const { data: urlData } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;
        logger.info(`Story media uploaded: ${imageUrl}`);

        const username = user.username;
        const section = req.body.section || 'default';

        const storyId = await Story.create(userId, username, imageUrl, 1, 0, section);
        res.status(201).json({ story_id: storyId, image_url: imageUrl, section });
      } catch (error) {
        logger.error(`Add story error: ${error.message}`);
        res.status(error.message.includes('Media file') ? 400 : 500).json({ error: error.message });
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
      logger.error(`Delete story error: ${error.message}`);
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
      logger.error(`Get sections error: ${error.message}`);
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
      logger.error(`Get user sections error: ${error.message}`);
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
      logger.error(`Add section error: ${error.message}`);
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
      logger.error(`Delete section error: ${error.message}`);
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
      logger.error(`Get graphs error: ${error.message}`);
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
      logger.error(`Get user graphs error: ${error.message}`);
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
      logger.error(`Add graph error: ${error.message}`);
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
      logger.error(`Delete graph error: ${error.message}`);
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },
};

module.exports = profileController;