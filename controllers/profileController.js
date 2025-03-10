const Story = require('../models/storyModel');
const Section = require('../models/sectionModel');
const Graph = require('../models/graphModel');

exports.getStories = async (req, res) => {
  try {
    const stories = await Story.findByUserId(req.user.userId);
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addStory = async (req, res) => {
  const { username, image_url, has_story, viewed } = req.body;
  try {
    const storyId = await Story.create(req.user.userId, username, image_url, has_story, viewed);
    res.status(201).json({ story_id: storyId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSections = async (req, res) => {
  try {
    const sections = await Section.findByUserId(req.user.userId);
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addSection = async (req, res) => {
  const { type, title, content, image_uri } = req.body;
  try {
    const sectionId = await Section.create(req.user.userId, type, title, content, image_uri);
    res.status(201).json({ section_id: sectionId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getGraphs = async (req, res) => {
  try {
    const graphs = await Graph.findByUserId(req.user.userId);
    res.json(graphs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addGraph = async (req, res) => {
  const { type, title, data } = req.body;
  try {
    const graphId = await Graph.create(req.user.userId, type, title, data);
    res.status(201).json({ graph_id: graphId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};