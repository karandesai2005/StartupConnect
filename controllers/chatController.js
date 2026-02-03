const { queryDB } = require("../config/db");

const chatController = {
  // Get all chats for a user
  getUserChats: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const query = `
        SELECT 
          c.chat_id,
          u.user_id as participant_id,
          u.username,
          u.profile_picture,
          cp.last_read_at
        FROM chats c
        JOIN chat_participants cp ON c.chat_id = cp.chat_id
        JOIN users u ON cp.user_id = u.user_id
        WHERE c.chat_id IN (
          SELECT chat_id 
          FROM chat_participants 
          WHERE user_id = @param1
        )
        AND u.user_id != @param1
        ORDER BY c.created_at DESC
      `;

      const chats = await queryDB(query, [userId]);
      res.json(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ message: 'Error fetching chats' });
    }
  },

  // Create a new chat
  createChat: async (req, res) => {
    try {
      const { otherUserId, firebaseChatId } = req.body;
      const userId = req.user.userId;

      // Insert chat with Firebase ID
      const createChatQuery = `
        INSERT INTO chats (chat_id) 
        VALUES (@param1);
      `;
      
      await queryDB(createChatQuery, [firebaseChatId]);

      // Add participants
      const addParticipantsQuery = `
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES (@param1, @param2), (@param1, @param3)
      `;
      
      await queryDB(addParticipantsQuery, [firebaseChatId, userId, otherUserId]);

      res.status(201).json({ chat_id: firebaseChatId });
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ message: 'Error creating chat' });
    }
  },

  // Update last read timestamp
  updateLastRead: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      const query = `
        UPDATE chat_participants
        SET last_read_at = GETDATE()
        WHERE chat_id = @param1 AND user_id = @param2
      `;

      await queryDB(query, [chatId, userId]);
      res.status(200).json({ message: 'Last read timestamp updated' });
    } catch (error) {
      console.error('Error updating last read:', error);
      res.status(500).json({ message: 'Error updating last read' });
    }
  },

  // ✅ Get all users except the logged-in user
  getAllUsers: async (req, res) => {
    try {
      const userId = req.user.userId;  // Get logged-in user ID

      const query = `
        SELECT user_id, username, profile_picture 
        FROM users 
        WHERE user_id != @param1
      `;

      const users = await queryDB(query, [userId]);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users' });
    }
  }
};

module.exports = chatController;
//asd