const sql = require('mssql');
const { connectDB } = require('../config/db');

const Section = {
  async create(userId, type, title, content = null, imageUri = null, section = null) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('type', sql.VarChar, type)
        .input('title', sql.VarChar, title)
        .input('content', sql.Text, content)
        .input('imageUri', sql.VarChar, imageUri)
        .input('section', sql.VarChar, section)
        .query(
<<<<<<< HEAD
          'INSERT INTO dbo.sections (user_id, type, title, content, image_uri, section) VALUES (@userId, @type, @title, @content, @imageUri, @section); SELECT SCOPE_IDENTITY() AS section_id'
=======
          'INSERT INTO dbo.sections (user_id, type, title, content, image_uri) VALUES (@userId, @type, @title, @content, @imageUri); ' +
          'SELECT SCOPE_IDENTITY() AS section_id'
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
        );
      return result.recordset[0].section_id;
    } catch (error) {
      throw error;
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query(`
          SELECT s.*, 
                 st.story_id, st.image_url, st.has_story, st.viewed, st.username, st.profile_picture
          FROM dbo.sections s
          LEFT JOIN dbo.stories st ON s.section_id = st.section_id
          WHERE s.user_id = @userId
        `);
      // Group stories under their respective sections
      const sections = result.recordset.reduce((acc, row) => {
        const section = acc.find((s) => s.section_id === row.section_id);
        const story = row.story_id
          ? {
              story_id: row.story_id,
              image_url: row.image_url,
              has_story: row.has_story,
              viewed: row.viewed,
              username: row.username,
              profile_picture: row.profile_picture,
            }
          : null;

        if (!section) {
          acc.push({
            section_id: row.section_id,
            user_id: row.user_id,
            type: row.type,
            title: row.title,
            content: row.content,
            image_uri: row.image_uri,
            section: row.section,
            stories: story ? [story] : [],
          });
        } else if (story) {
          section.stories.push(story);
        }
        return acc;
      }, []);
      return sections;
    } catch (error) {
      throw error;
    }
  },

  async findByUserIdAndSection(userId, sectionName) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('section', sql.VarChar, sectionName)
        .query('SELECT * FROM dbo.sections WHERE user_id = @userId AND section = @section');
      return result.recordset[0]; // Return the first matching section
    } catch (error) {
      throw error;
    }
  },

  async deleteById(sectionId, userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('sectionId', sql.Int, sectionId)
        .input('userId', sql.Int, userId)
        .query(
          'DELETE FROM dbo.sections WHERE section_id = @sectionId AND user_id = @userId; ' +
          'SELECT @@ROWCOUNT AS deleted'
        );
      return result.recordset[0].deleted > 0;
    } catch (error) {
      console.error('Error deleting section:', error.message);
      throw error;
    }
  },
};

module.exports = Section;