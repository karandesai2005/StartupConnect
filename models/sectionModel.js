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
          'INSERT INTO dbo.sections (user_id, type, title, content, image_uri, section) ' +
          'VALUES (@userId, @type, @title, @content, @imageUri, @section); ' +
          'SELECT SCOPE_IDENTITY() AS section_id'
        );
      const sectionId = result.recordset[0].section_id;
      console.log(`Created section with ID: ${sectionId} for userId: ${userId}`);
      return sectionId;
    } catch (error) {
      console.error('Error in create:', error.message, error.stack);
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
          SELECT s.section_id, s.user_id, s.type, s.title, s.content, s.image_uri, s.section,
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
              profile_picture: row.profile_picture || null, // Handle null profile_picture
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
            section: row.section || null,
            stories: story ? [story] : [],
          });
        } else if (story) {
          section.stories.push(story);
        }
        return acc;
      }, []);

      console.log(`Sections retrieved for userId ${userId}:`, sections);
      return sections;
    } catch (error) {
      console.error('Error in findByUserId:', error.message, error.stack);
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
      
      const section = result.recordset[0];
      console.log(`Found section for userId ${userId} and sectionName ${sectionName}:`, section);
      return section;
    } catch (error) {
      console.error('Error in findByUserIdAndSection:', error.message, error.stack);
      throw error;
    }
  },

  async update(sectionId, updates) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const { content } = updates;
      const result = await request
        .input('sectionId', sql.Int, sectionId)
        .input('content', sql.Text, content)
        .query(
          'UPDATE dbo.sections SET content = @content WHERE section_id = @sectionId; ' +
          'SELECT @@ROWCOUNT AS updated'
        );
      const updated = result.recordset[0].updated > 0;
      console.log(`Updated section with ID ${sectionId}: ${updated}`);
      return updated;
    } catch (error) {
      console.error('Error in update:', error.message, error.stack);
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
      const deleted = result.recordset[0].deleted > 0;
      console.log(`Deleted section with ID ${sectionId} for userId ${userId}: ${deleted}`);
      return deleted;
    } catch (error) {
      console.error('Error in deleteById:', error.message, error.stack);
      throw error;
    }
  },
};

module.exports = Section;