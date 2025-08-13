const { supabase } = require("../services/supabase");
const { queryDB } = require("../config/db");
const logger = require("../logger");
const path = require('path');

// Constants
const MAX_FILE_SIZE_POST = 10 * 1024 * 1024; // 10MB for testing

// Utility Functions
const getUserId = async (req) => {
  const uuid = req.user?.id;
  if (!uuid) {
    logger.error("getUserId: User authentication required - req.user is undefined");
    throw new Error("User authentication required");
  }
  const { data: user, error } = await supabase
    .from("users")
    .select("user_id")
    .eq("supabase_uid", uuid)
    .single();
  if (error || !user) {
    logger.error(`getUserId: User not found - Supabase error: ${error?.message}`);
    throw new Error("User not found");
  }
  return user.user_id;
};

const cleanUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+/g, "/").replace(/^http:/, "https:");
};

// Retry logic for Supabase uploads
const uploadWithRetry = async (bucket, fileName, buffer, contentType, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, { contentType });
      if (error) throw error;
      return data;
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
};

const postController = {
  createPost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "User authentication required" });

      if (!req.file) {
        return res.status(400).json({ error: "Media file required" });
      }

      logger.info(`File received: ${req.file.originalname}, MIME: ${req.file.mimetype}, Size: ${req.file.size}`);

      if (req.file.size > MAX_FILE_SIZE_POST) {
        return res.status(400).json({ error: "File size exceeds 10MB limit" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime", "video/mov"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Only images (JPEG, PNG, GIF) and videos (MP4, MOV) allowed for posts" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const fileName = `post-${Date.now()}${path.extname(req.file.originalname)}`;

      // Upload to Supabase with retry
      await uploadWithRetry("posts", fileName, req.file.buffer, req.file.mimetype);

      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(fileName);
      const mediaUrl = cleanUrl(urlData.publicUrl);

      logger.info(`Post media uploaded: ${mediaUrl}`);

      const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";

      const query = `
        INSERT INTO posts (user_id, content, media_url, media_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING post_id, user_id, content, media_url, media_type, created_at
      `;
      const values = [userId, content, mediaUrl, mediaType];
      const result = await queryDB(query, values);
      const newPost = result[0];

      logger.info("Post created:", newPost);

      res.status(201).json({
        post_id: newPost.post_id,
        user_id: newPost.user_id,
        content: newPost.content,
        media_url: cleanUrl(newPost.media_url),
        media_type: newPost.media_type,
        created_at: newPost.created_at,
      });
    } catch (error) {
      logger.error(`Create post error: ${error.message}`);
      res.status(error.message.includes("required") ? 400 : 500).json({ error: error.message });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      const query = `
        SELECT p.post_id, p.user_id, u.username, u.name, p.media_url, p.content, p.created_at, p.media_type,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count,
               u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        ORDER BY p.created_at DESC
      `;
      const posts = await queryDB(query, []);
      res.json(
        posts.map((post) => ({
          ...post,
          media_url: cleanUrl(post.media_url),
          profile_picture: cleanUrl(post.profile_picture || ""),
          name: post.name || post.username,
          comment_count: Number(post.comment_count) || 0,
          like_count: Number(post.like_count) || 0,
        }))
      );
    } catch (error) {
      logger.error(`Get all posts error: ${error.message}`);
      res.status(500).json({ error: "Server error" });
    }
  },

  getMyPosts: async (req, res) => {
    try {
      let userId;
      if (req.query.user_id) {
        userId = req.query.user_id;
        if (isNaN(userId)) {
          return res.status(400).json({ error: "User ID must be a valid number" });
        }
      } else {
        userId = await getUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "User authentication required" });
        }
      }
      const query = `
        SELECT p.post_id, p.user_id, u.username, u.name, p.media_url, p.content, p.created_at, p.media_type,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count,
               u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `;
      const values = [userId];
      const posts = await queryDB(query, values);
      res.json(
        posts.map((post) => ({
          ...post,
          media_url: cleanUrl(post.media_url),
          profile_picture: cleanUrl(post.profile_picture || ""),
          name: post.name || post.username,
          comment_count: Number(post.comment_count) || 0,
          like_count: Number(post.like_count) || 0,
        }))
      );
    } catch (error) {
      logger.error(`Get my posts error: ${error.message}`);
      res.status(error.message.includes("User ID") || error.message.includes("authentication") ? 400 : 500).json({
        error: error.message,
      });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "User authentication required" });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "Post ID must be a valid number" });
      }

      const postQuery = "SELECT user_id FROM posts WHERE post_id = $1";
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const checkLikeQuery = "SELECT * FROM likes WHERE user_id = $1 AND post_id = $2";
      const likeResult = await queryDB(checkLikeQuery, [userId, postId]);
      let liked = likeResult.length > 0;

      if (liked) {
        const deleteLikeQuery = "DELETE FROM likes WHERE user_id = $1 AND post_id = $2";
        await queryDB(deleteLikeQuery, [userId, postId]);
        liked = false;
      } else {
        const insertLikeQuery = "INSERT INTO likes (user_id, post_id) VALUES ($1, $2)";
        await queryDB(insertLikeQuery, [userId, postId]);
        liked = true;
      }

      const likeCountQuery = "SELECT COUNT(*) as count FROM likes WHERE post_id = $1";
      const likeCountResult = await queryDB(likeCountQuery, [postId]);
      const likeCount = Number(likeCountResult[0].count) || 0;

      res.status(200).json({ success: true, liked, like_count: likeCount });
    } catch (error) {
      logger.error(`Toggle like error: ${error.message}`);
      res.status(error.message.includes("Post ID") ? 400 : 500).json({ error: error.message });
    }
  },

  getLikes: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "User authentication required" });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "Post ID must be a valid number" });
      }

      const postQuery = "SELECT user_id FROM posts WHERE post_id = $1";
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const likeCountQuery = "SELECT COUNT(*) as count FROM likes WHERE post_id = $1";
      const likeCountResult = await queryDB(likeCountQuery, [postId]);
      const likeCount = Number(likeCountResult[0].count) || 0;

      const userLikedQuery = "SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2 LIMIT 1";
      const userLikedResult = await queryDB(userLikedQuery, [userId, postId]);
      const isLiked = userLikedResult.length > 0 ? 1 : 0;

      res.status(200).json({ likeCount, isLiked });
    } catch (error) {
      logger.error(`Get likes error: ${error.message}`);
      res.status(error.message.includes("Post ID") ? 400 : 500).json({ error: error.message });
    }
  },

  addComment: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "User authentication required" });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "Post ID must be a valid number" });
      }

      const { content } = req.body;
      if (!content || content.length < 1 || content.length > 500) {
        return res.status(400).json({ error: "Comment must be 1-500 characters" });
      }

      const postQuery = "SELECT user_id FROM posts WHERE post_id = $1";
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const query = `
        INSERT INTO comments (post_id, user_id, content, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING comment_id, post_id, user_id, content, created_at
      `;
      const values = [postId, userId, content];
      const result = await queryDB(query, values);
      const newComment = result[0];

      res.status(201).json(newComment);
    } catch (error) {
      logger.error(`Add comment error: ${error.message}`);
      res.status(error.message.includes("Post ID") || error.message.includes("Comment") ? 400 : 500).json({
        error: error.message,
      });
    }
  },

  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "Post ID must be a valid number" });
      }

      const postQuery = "SELECT user_id FROM posts WHERE post_id = $1";
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const query = `
        SELECT c.comment_id, c.post_id, c.user_id, u.username, c.content, c.created_at
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = $1
        ORDER BY c.created_at DESC
      `;
      const comments = await queryDB(query, [postId]);
      res.json(comments);
    } catch (error) {
      logger.error(`Get comments error: ${error.message}`);
      res.status(error.message.includes("Post ID") ? 400 : 500).json({ error: error.message });
    }
  },

  fixMediaURLs: async (req, res) => {
    try {
      const query = `
        UPDATE posts
        SET media_url = REGEXP_REPLACE(media_url, '//+[uU][pP][lL][oO][aA][dD][sS]', '/Uploads', 'i')
        WHERE media_url ~* '//+[uU][pP][lL][oO][aA][dD][sS]'
      `;
      await queryDB(query, []);
      res.status(200).json({ message: "Media URLs normalized" });
    } catch (error) {
      logger.error(`Fix media URLs error: ${error.message}`);
      res.status(500).json({ error: "Server error" });
    }
  },

  deletePost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      const { postId } = req.params;

      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }

      const postQuery = "SELECT user_id, media_url FROM posts WHERE post_id = $1";
      const postResult = await queryDB(postQuery, [postId]);

      if (postResult.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      const post = postResult[0];
      if (post.user_id !== userId) {
        return res.status(403).json({ error: "You are not authorized to delete this post" });
      }

      if (post.media_url) {
        const fileName = post.media_url.split('/').pop();
        const { error: storageError } = await supabase.storage
          .from('posts')
          .remove([fileName]);
        if (storageError) {
          console.warn("Failed to delete media from storage:", storageError.message);
        }
        
      }
      // --- NEW CODE START ---
      // 1. Delete all comments associated with the post
      const deleteCommentsQuery = "DELETE FROM comments WHERE post_id = $1";
      await queryDB(deleteCommentsQuery, [postId]);

      // 2. Delete all likes associated with the post
      const deleteLikesQuery = "DELETE FROM likes WHERE post_id = $1";
      await queryDB(deleteLikesQuery, [postId]);
      // --- NEW CODE END ---

      // 3. Finally, delete the post itself
      const deletePostQuery = "DELETE FROM posts WHERE post_id = $1";
      await queryDB(deletePostQuery, [postId]);

      res.status(200).json({ message: "Post deleted successfully" });

    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }

};

module.exports = postController;
