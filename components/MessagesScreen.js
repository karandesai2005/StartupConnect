import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MessagesScreen = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    fetchChats();
  }, [isFocused]);

  const fetchChatsData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('MessagesScreen: Token:', token ? 'Found' : 'Not found');
      const { data: user, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user?.user) throw new Error('User not authenticated');
      console.log('MessagesScreen: user:', user.user.email);

      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('user_id')
        .eq('supabase_uid', user.user.id)
        .single();
      if (currentUserError || !currentUserData) throw new Error('Current user not found in users table');
      setCurrentUserId(currentUserData.user_id);

      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('followee_id')
        .eq('follower_id', currentUserData.user_id);
      if (followingError) throw followingError;

      const { data: followersData, error: followersError } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('followee_id', currentUserData.user_id);
      if (followersError) throw followersError;

      const followingIds = followingData.map((item) => item.followee_id);
      const followerIds = followersData.map((item) => item.follower_id);
      // Ensure relatedUserIds are unique using Set
      const relatedUserIds = [...new Set([...followingIds, ...followerIds])].filter(
        (id) => id !== currentUserData.user_id
      );
      console.log('Related user IDs (deduplicated):', relatedUserIds);

      if (relatedUserIds.length === 0) {
        console.log('No followers or following found');
        setChats([]);
        return [];
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, username, profile_picture')
        .in('user_id', relatedUserIds);
      if (usersError) throw usersError;
      console.log('Users data:', usersData);

      const { data: participantsData, error: participantsError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          user_id,
          chats (id, updated_at)
        `)
        .eq('user_id', currentUserData.user_id);
      if (participantsError) throw participantsError;

      const chatIds = participantsData.map((item) => item.chat_id);

      const { data: otherParticipantsData, error: otherParticipantsError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          user_id
        `)
        .in('chat_id', chatIds)
        .neq('user_id', currentUserData.user_id);
      if (otherParticipantsError) throw otherParticipantsError;

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })
        .limit(1, { per: 'chat_id' });
      if (messagesError) throw messagesError;

      const existingChatsMap = new Map(); // Use Map to avoid duplicates by other_user.user_id
      participantsData.forEach((item) => {
        const otherParticipant = otherParticipantsData.find((op) => op.chat_id === item.chat_id);
        const userInfo = usersData.find((u) => u.user_id === otherParticipant?.user_id) || {
          username: 'Unknown',
          user_id: 'unknown',
        };
        const latestMessage = messagesData.find((msg) => msg.chat_id === item.chat_id) || null;

        // Only add if this user_id hasn't been seen before
        if (!existingChatsMap.has(userInfo.user_id)) {
          existingChatsMap.set(userInfo.user_id, {
            chat_id: item.chat_id,
            other_user: userInfo,
            latest_message: latestMessage,
            updated_at: item.chats.updated_at,
          });
        }
      });
      const existingChats = Array.from(existingChatsMap.values());

      const existingChatUserIds = existingChats.map((chat) => chat.other_user.user_id);
      const potentialChatsMap = new Map(); // Use Map for potential chats to avoid duplicates
      usersData
        .filter((u) => !existingChatUserIds.includes(u.user_id))
        .forEach((u) => {
          if (!potentialChatsMap.has(u.user_id)) {
            potentialChatsMap.set(u.user_id, {
              chat_id: null,
              other_user: u,
              latest_message: null,
              updated_at: null,
            });
          }
        });
      const potentialChats = Array.from(potentialChatsMap.values());

      const allChats = [...existingChats, ...potentialChats].sort((a, b) => {
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

      return allChats;
    } catch (error) {
      console.error('MessagesScreen: Error fetching chats data:', error.message);
      throw error;
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const allChats = await fetchChatsData();
      setChats(allChats);
      console.log('MessagesScreen: Fetched chats:', allChats);
    } catch (error) {
      Alert.alert('Error', 'Failed to load chats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createChat = async (otherUserId) => {
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
      const currentUserId = currentUserData.user_id;

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({ created_at: new Date(), updated_at: new Date() })
        .select()
        .single();
      if (chatError) throw chatError;

      const { error: participantsError } = await supabase.from('chat_participants').insert([
        { chat_id: chatData.id, user_id: currentUserId },
        { chat_id: chatData.id, user_id: otherUserId },
      ]);
      if (participantsError) throw participantsError;

      return chatData.id;
    } catch (error) {
      console.error('MessagesScreen: Error creating chat:', error.message);
      throw error;
    }
  };

  const handleChatPress = async (item) => {
    try {
      let chatId = item.chat_id;
      if (!chatId) {
        chatId = await createChat(item.other_user.user_id);
      }
      navigation.navigate('Chat', { chat_id: chatId, otherUser: item.other_user });
    } catch (error) {
      console.error('MessagesScreen: Chat press error:', error.message);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => handleChatPress(item)}>
      <Image
        source={
          item.other_user?.profile_picture
            ? { uri: item.other_user.profile_picture }
            : require('../assets/profiledefault.jpg')
        }
        style={styles.avatar}
      />
      <View style={styles.chatInfo}>
        <Text style={styles.username}>{item.other_user?.username || 'Unknown'}</Text>
        <Text style={styles.messagePreview}>
          {item.latest_message ? item.latest_message.content.slice(0, 30) + '...' : 'Start a conversation'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.parallel}>
        <TouchableOpacity
                onPress={() =>
                  navigation.reset({ index: 0, routes: [{ name: "Main" }] })
                }
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity> 

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.chat_id || item.other_user.user_id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No chats yet</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'AvenirNextCyr',
  },
  backButton: { position: "absolute", left: 10, top: 10, zIndex: 1 }, // Adjusted left and top for better positioning
  backButtonText: { fontSize: 32, color: "#000", marginRight: 9 },
  parallel: {paddingHorizontal: 35},
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default MessagesScreen;