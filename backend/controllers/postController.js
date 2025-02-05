const Post = require('../models/postModel');

const postController = {
  createPost: async (req, res) => {
    try {
      const { content } = req.body;
      const startup_id = req.user.user_id; // Extract user_id from token

      if (!content) {
        return res.status(400).json({ error: 'Post content is required' });
      }

      const newPost = await Post.create(startup_id, content);
      res.status(201).json(newPost);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      const posts = await Post.getAllPosts();
      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const { user_id } = req.params;
      const posts = await Post.getPostsByUserId(user_id);
      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  },
};

module.exports = postController;
