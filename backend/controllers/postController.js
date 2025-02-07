const Post = require('../models/postModel');

const postController = {
  createPost: async (req, res) => {
    try {
      console.log('=== Create Post Debug ===');
      console.log('User:', req.user, '| Body:', req.body, '| File:', req.file);

      const { content } = req.body;
      const user_id = req.user.userId || req.user.id;

      if (!content) {
        return res.status(400).json({ error: "Post content is required." });
      }

      const image_url = req.file?.filename
        ? `${process.env.NGROK_URL}/uploads/posts/${req.file.filename}`
        : '';

      console.log('Creating post:', { content, user_id, image_url });

      try {
        const newPost = await Post.create(content, image_url, user_id);
        console.log('Post created:', newPost);
        res.status(201).json(newPost);
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('Error in createPost:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      const posts = await Post.getAllPosts();
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const user_id = req.params.user_id || req.user.userId || req.user.id;
      console.log('Fetching posts for:', user_id);

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
      }

      const posts = await Post.getPostsByUserId(user_id);
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in getUserPosts:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
};

module.exports = postController;
