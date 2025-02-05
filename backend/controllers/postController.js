const Post = require('../models/postModel');

const postController = {
  createPost: async (req, res) => {
    try {
      console.log('File received:', req.file);
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Post content is required' });
      }

      // Check if a file is uploaded
      let image_url = null;
      if (req.file) {
        // Construct full image URL (including protocol, host, and file path)
        image_url = `${req.protocol}://${req.get('host')}/uploads/posts/${req.file.filename}`;
      }

      console.log('Full Image URL:', image_url); // Log the generated full image URL

      // Pass image_url along with content to the Post.create method
      const newPost = await Post.create(content, image_url);

      // Respond with the newly created post
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
