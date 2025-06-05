import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const ChatScreen = ({ route }) => {
  const { chat_id, otherUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchCurrentUser();
    fetchMessages();

    // Set up real-time subscription for new messages
    const messageSubscription = supabase
      .channel(`chat:${chat_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat_id}` },
        (payload) => {
          console.log('ChatScreen: New message received:', payload);
          setMessages((prevMessages) => [...prevMessages, payload.new]);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [chat_id]);

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const { data: user, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user?.user) throw new Error('User not authenticated');

      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('user_id')
        .eq('supabase_uid', user.user.id)
        .single();
      if (currentUserError || !currentUserData) throw new Error('Current user not found in users table');
      setCurrentUserId(currentUserData.user_id);
    } catch (error) {
      console.error('ChatScreen: Error fetching current user:', error.message);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          users!sender_id (user_id, username)
        `)
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data);
    } catch (error) {
      console.error('ChatScreen: Error fetching messages:', error.message);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const { data: user, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user?.user) throw new Error('User not authenticated');

      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('user_id')
        .eq('supabase_uid', user.user.id)
        .single();
      if (currentUserError || !currentUserData) throw new Error('Current user not found in users table');

      const { data: newMessageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat_id,
          sender_id: currentUserData.user_id,
          content: newMessage,
          created_at: new Date(),
        })
        .select(`
          id,
          content,
          created_at,
          sender_id,
          users!sender_id (user_id, username)
        `)
        .single();

      if (insertError) throw insertError;

      // Update the chats table's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date() })
        .eq('id', chat_id);

      setNewMessage('');
      // No need to call fetchMessages here since the subscription will handle it
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('ChatScreen: Error sending message:', error.message);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    }
  };

  const renderMessage = ({ item }) => {
    const isSentByCurrentUser = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageContainer, isSentByCurrentUser ? styles.sent : styles.received]}>
        {!isSentByCurrentUser && (
          <Text style={styles.sender}>{item.users?.username || 'Unknown'}</Text>
        )}
        <View style={[styles.messageBubble, isSentByCurrentUser ? styles.sentBubble : styles.receivedBubble]}>
          <Text style={isSentByCurrentUser ? styles.message : [styles.message, styles.receivedBubbleText]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUser?.username || 'Chat'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 24,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  sent: {
    alignSelf: 'flex-end',
  },
  received: {
    alignSelf: 'flex-start',
  },
  sender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentBubble: {
    backgroundColor: '#007AFF',
  },
  receivedBubble: {
    backgroundColor: '#e5e5ea',
  },
  message: {
    fontSize: 16,
    color: '#fff',
  },
  receivedBubbleText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    padding: 8,
  },
});

export default ChatScreen;