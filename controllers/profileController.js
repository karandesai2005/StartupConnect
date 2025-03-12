require('dotenv').config();
const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');
const { uploadAndConvertPostMedia } = require('../config/multerConfig');
const path = require('path');

const profileController = {
  getStories: async (req, res) => {
    try {
      console.log('=== Fetching Stories ===');
      const userId = req.user?.userId || req.user?.id;
      console.log('User:', req.user);

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

  addStory: [
    uploadAndConvertPostMedia,
    async (req, res) => {
      try {
        console.log('=== Add Story Debug ===');
        console.log('User:', req.user, '| Body:', req.body, '| File:', req.file);

        const userId = req.user?.userId || req.user?.id;
        const username = req.user.username; // Assuming username is in the token payload
        const section = req.body.section || 'default'; // Get section from request body, default to 'default'

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required.' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Media file is required.' });
        }

        const imageUrl = `/uploads/posts/${req.file.filename}`;
        const has_story = 1;
        const viewed = 0;

        console.log('Creating story:', { userId, username, imageUrl, has_story, viewed, section });
        const storyId = await Story.create(userId, username, imageUrl, has_story, viewed, section);
        console.log('Story created with ID:', storyId);

        res.status(201).json({
          story_id: storyId,
          image_url: imageUrl,
          section: section, // Include section in response
        });
      } catch (error) {
        console.error('Error in addStory:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
      }
    },
  ],

  getSections: async (req, res) => {
    try {
      console.log('=== Fetching Sections ===');
      const userId = req.user?.userId || req.user?.id;
      console.log('User:', req.user);

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      console.log('Fetching sections for userId:', userId);
      const sections = await Section.findByUserId(userId);
      console.log('Sections fetched:', sections.length);
      res.json(sections);
    } catch (error) {
      console.error('Error in getSections:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  addSection: async (req, res) => {
    try {
      console.log('=== Add Section Debug ===');
      console.log('User:', req.user, '| Body:', req.body);

      const userId = req.user?.userId || req.user?.id;
      const { type, title, content, image_uri } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      if (!type || !title) {
        return res.status(400).json({ error: 'Type and title are required.' });
      }

      console.log('Creating section:', { userId, type, title, content, image_uri });
      const sectionId = await Section.create(userId, type, title, content, image_uri);
      console.log('Section created with ID:', sectionId);
      res.status(201).json({ section_id: sectionId });
    } catch (error) {
      console.error('Error in addSection:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getGraphs: async (req, res) => {
    try {
      console.log('=== Fetching Graphs ===');
      const userId = req.user?.userId || req.user?.id;
      console.log('User:', req.user);

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      console.log('Fetching graphs for userId:', userId);
      const graphs = await Graph.findByUserId(userId);
      console.log('Graphs fetched:', graphs.length);
      res.json(graphs);
    } catch (error) {
      console.error('Error in getGraphs:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  addGraph: async (req, res) => {
    try {
      console.log('=== Add Graph Debug ===');
      console.log('User:', req.user, '| Body:', req.body);

      const userId = req.user?.userId || req.user?.id;
      const { type, title, data } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      if (!type || !title || !data) {
        return res.status(400).json({ error: 'Type, title, and data are required.' });
      }

      console.log('Creating graph:', { userId, type, title, data });
      const graphId = await Graph.create(userId, type, title, data);
      console.log('Graph created with ID:', graphId);
      res.status(201).json({ graph_id: graphId });
    } catch (error) {
      console.error('Error in addGraph:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },
};

module.exports = profileController;