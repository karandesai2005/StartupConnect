require('dotenv').config();
const { supabase } = require('../services/supabase');

const feedbackController = {
  submitFeedback: async (req, res) => {
    try {
      const supabase_uid = req.user.id;
      const { feedback } = req.body;

      if (!feedback || feedback.trim().length < 5 || feedback.trim().length > 1000) {
        return res.status(400).json({ error: 'Feedback must be 5-1000 characters' });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('supabase_uid', supabase_uid)
        .single();
      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.user_id,
          feedback: feedback.trim(),
          created_at: new Date().toISOString(),
        })
        .select('feedback_id')
        .single();
      if (error) throw error;

      res.status(201).json({ message: 'Feedback submitted successfully', feedback_id: data.feedback_id });
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
};

module.exports = feedbackController;