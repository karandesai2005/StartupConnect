require('dotenv').config();
const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');
const User = require('../models/userModel');
const { uploadAndConvertPostMedia } = require('../config/multerConfig');
const path = require('path');

const profileController = {
  // Get the authenticated user's profile
  getProfile: async (req, res) => {
    try {
      console.log('=== Fetching Profile ===');
      const userId = req.user?.userId || req.user?.id;
      console.log('User:', req.user);

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      console.log('Fetching profile for userId:', userId);
      const user = await User.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      console.log('Profile fetched:', user);
      res.json(user);
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get another user's profile by username
  getUserProfile: async (req, res) => {
    try {
      console.log('=== Fetching User Profile ===');
      const { username } = req.params;
      console.log('Fetching profile for username:', username);

      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Check if the authenticated user is following this user
      const followerId = req.user ? (req.user.userId || req.user.id) : null;
      let isFollowing = false;
      if (followerId) {
        isFollowing = await User.isFollowing(followerId, user.user_id);
      }

      console.log('User profile fetched:', user);
      res.json({ ...user, isFollowing });
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Follow a user
  followUser: async (req, res) => {
    try {
      console.log('=== Follow User Debug ===');
      const followerId = req.user?.userId || req.user?.id;
      const { username } = req.body;
      console.log('Follower ID:', followerId, '| Username to follow:', username);

      if (!followerId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      if (!username) {
        return res.status(400).json({ error: 'Username to follow is required.' });
      }

      const followee = await User.getUserByUsername(username);
      if (!followee) {
        return res.status(404).json({ error: 'User to follow not found.' });
      }

      if (followerId === followee.user_id) {
        return res.status(400).json({ error: 'You cannot follow yourself.' });
      }

      const isAlreadyFollowing = await User.isFollowing(followerId, followee.user_id);
      if (isAlreadyFollowing) {
        return res.status(400).json({ error: 'You are already following this user.' });
      }

      await User.followUser(followerId, followee.user_id);
      console.log(`User ${followerId} followed user ${followee.user_id}`);
      res.status(200).json({ message: 'Successfully followed user.' });
    } catch (error) {
      console.error('Error in followUser:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Unfollow a user
  unfollowUser: async (req, res) => {
    try {
      console.log('=== Unfollow User Debug ===');
      const followerId = req.user?.userId || req.user?.id;
      const { username } = req.body;
      console.log('Follower ID:', followerId, '| Username to unfollow:', username);

      if (!followerId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      if (!username) {
        return res.status(400).json({ error: 'Username to unfollow is required.' });
      }

      const followee = await User.getUserByUsername(username);
      if (!followee) {
        return res.status(404).json({ error: 'User to unfollow not found.' });
      }

      const isFollowing = await User.isFollowing(followerId, followee.user_id);
      if (!isFollowing) {
        return res.status(400).json({ error: 'You are not following this user.' });
      }

      await User.unfollowUser(followerId, followee.user_id);
      console.log(`User ${followerId} unfollowed user ${followee.user_id}`);
      res.status(200).json({ message: 'Successfully unfollowed user.' });
    } catch (error) {
      console.error('Error in unfollowUser:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get authenticated user's stories
  getStories: async (req, res) => {
    try {
      console.log('=== Fetching Stories ===');
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
      console.log('Fetching stories for userId:', userId);
      const stories = await Story.findByUserId(userId);
      console.log('Stories fetched:', stories.length);
      res.json(stories);
    } catch (error) {
      console.error('Error in getStories:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get another user's stories by username
  getUserStories: async (req, res) => {
    try {
      console.log('=== Fetching User Stories ===');
      const { username } = req.params;
      console.log('Fetching stories for username:', username);

      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const stories = await Story.findByUserId(user.user_id);
      console.log('User stories fetched:', stories.length);
      res.json(stories);
    } catch (error) {
      console.error('Error in getUserStories:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Add a story (authenticated user only)
  addStory: [
    uploadAndConvertPostMedia,
    async (req, res) => {
      try {
        console.log('=== Add Story Debug ===');
        console.log('User:', req.user, '| Body:', req.body, '| File:', req.file);

        const userId = req.user?.userId || req.user?.id;
        const username = req.user.username;
        const section = req.body.section || 'default';

        if (!userId) return res.status(400).json({ error: 'User ID is required.' });
        if (!req.file) return res.status(400).json({ error: 'Media file is required.' });

        const imageUrl = `/uploads/posts/${req.file.filename}`;
        const has_story = 1;
        const viewed = 0;

        console.log('Creating story:', { userId, username, imageUrl, has_story, viewed, section });
        const storyId = await Story.create(userId, username, imageUrl, has_story, viewed, section);
        console.log('Story created with ID:', storyId);

        res.status(201).json({ story_id: storyId, image_url: imageUrl, section });
      } catch (error) {
        console.error('Error in addStory:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
      }
    },
  ],

  deleteStory: async (req, res) => {
    try {
      console.log('=== Deleting Story ===');
      const userId = req.user?.userId || req.user?.id;
      const { storyId } = req.params;

      if (!userId) return res.status(400).json({ error: 'User ID is required.' });
      if (!storyId) return res.status(400).json({ error: 'Story ID is required.' });

      console.log('Deleting story with ID:', storyId, 'for userId:', userId);
      const deleted = await Story.deleteById(storyId, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Story not found or not authorized.' });
      }

      console.log('Story deleted successfully');
      res.status(200).json({ message: 'Story deleted successfully.' });
    } catch (error) {
      console.error('Error in deleteStory:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getSections: async (req, res) => {
    try {
      console.log('=== Fetching Sections ===');
      const userId = req.user?.userId || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'User ID is required.' });

      console.log('Fetching sections for userId:', userId);
      const sections = await Section.findByUserId(userId);
      console.log('Sections fetched:', sections.length);
      res.json(sections);
    } catch (error) {
      console.error('Error in getSections:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get another user's sections by username
  getUserSections: async (req, res) => {
    try {
      console.log('=== Fetching User Sections ===');
      const { username } = req.params;
      console.log('Fetching sections for username:', username);

      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const sections = await Section.findByUserId(user.user_id);
      console.log('User sections fetched:', sections.length);
      res.json(sections);
    } catch (error) {
      console.error('Error in getUserSections:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Add a section (authenticated user only)
  addSection: async (req, res) => {
    try {
      console.log('=== Add Section Debug ===');
      console.log('User:', req.user, '| Body:', req.body);

      const userId = req.user?.userId || req.user?.id;
      const { type, title, content, image_uri, section, story } = req.body;

      if (!userId) return res.status(400).json({ error: 'User ID is required.' });
      if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

      if (type === 'story' && story && section === 'team') {
        // Check if a "Team" section already exists
        let teamSection = await Section.findByUserIdAndSection(userId, 'team');

        if (!teamSection) {
          // Create a new "Team" section if it doesn’t exist
          const sectionId = await Section.create(userId, type, title, null, null, 'team');
          teamSection = { section_id: sectionId };
        }

        // Add the team member as a story linked to the "Team" section
        const { image_url, has_story, viewed, username, profile_picture } = story;
        const storyId = await Story.create(
          userId,
          username || req.user.username,
          image_url || profile_picture,
          has_story !== undefined ? has_story : 1,
          viewed !== undefined ? viewed : 0,
          'team',
          teamSection.section_id // Link the story to the section
        );

        console.log('Team member story created with ID:', storyId);
        res.status(201).json({ section_id: teamSection.section_id, story_id: storyId });
      } else {
        // Handle other section types (text, image, etc.)
        console.log('Creating section:', { userId, type, title, content, image_uri, section });
        const sectionId = await Section.create(userId, type, title, content, image_uri, section);
        console.log('Section created with ID:', sectionId);
        res.status(201).json({ section_id: sectionId });
      }
    } catch (error) {
      console.error('Error in addSection:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  deleteSection: async (req, res) => {
    try {
      console.log('=== Deleting Section ===');
      const userId = req.user?.userId || req.user?.id;
      const { sectionId } = req.params;

      if (!userId) return res.status(400).json({ error: 'User ID is required.' });
      if (!sectionId) return res.status(400).json({ error: 'Section ID is required.' });

      console.log('Deleting section with ID:', sectionId, 'for userId:', userId);
      const deleted = await Section.deleteById(sectionId, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Section not found or not authorized.' });
      }

      console.log('Section deleted successfully');
      res.status(200).json({ message: 'Section deleted successfully.' });
    } catch (error) {
      console.error('Error in deleteSection:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getGraphs: async (req, res) => {
    try {
      console.log('=== Fetching Graphs ===');
      const userId = req.user?.userId || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'User ID is required.' });

      console.log('Fetching graphs for userId:', userId);
      const graphs = await Graph.findByUserId(userId);
      console.log('Graphs fetched:', graphs.length);
      res.json(graphs);
    } catch (error) {
      console.error('Error in getGraphs:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get another user's graphs by username
  getUserGraphs: async (req, res) => {
    try {
      console.log('=== Fetching User Graphs ===');
      const { username } = req.params;
      console.log('Fetching graphs for username:', username);

      const user = await User.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const graphs = await Graph.findByUserId(user.user_id);
      console.log('User graphs fetched:', graphs.length);
      res.json(graphs);
    } catch (error) {
      console.error('Error in getUserGraphs:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Add a graph (authenticated user only)
  addGraph: async (req, res) => {
    try {
      console.log('=== Add Graph Debug ===');
      console.log('User:', req.user, '| Body:', req.body);

      const userId = req.user?.userId || req.user?.id;
      const { type, title, data } = req.body;

      if (!userId) return res.status(400).json({ error: 'User ID is required.' });
      if (!type || !title || !data) return res.status(400).json({ error: 'Type, title, and data are required.' });

      console.log('Creating graph:', { userId, type, title, data });
      const graphId = await Graph.create(userId, type, title, data);
      console.log('Graph created with ID:', graphId);
      res.status(201).json({ graph_id: graphId });
    } catch (error) {
      console.error('Error in addGraph:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  deleteGraph: async (req, res) => {
    try {
      console.log('=== Deleting Graph ===');
      const userId = req.user?.userId || req.user?.id;
      const { graphId } = req.params;

      if (!userId) return res.status(400).json({ error: 'User ID is required.' });
      if (!graphId) return res.status(400).json({ error: 'Graph ID is required.' });

      console.log('Deleting graph with ID:', graphId, 'for userId:', userId);
      const deleted = await Graph.deleteById(graphId, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Graph not found or not authorized.' });
      }

      console.log('Graph deleted successfully');
      res.status(200).json({ message: 'Graph deleted successfully.' });
    } catch (error) {
      console.error('Error in deleteGraph:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },
};

module.exports = profileController;