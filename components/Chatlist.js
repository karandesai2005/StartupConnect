import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NGROK_URL } from '@env';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ensure you have Firebase configured properly

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // In ChatListScreen.js, update the useEffect:
  useEffect(() => {
    const fetchUserIdAndChats = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.navigate('Login');
          return;
        }

        // Log the full URL for debugging
        console.log(`Attempting to fetch chats from: ${NGROK_URL}/chats`);

        const response = await axios.get(`${NGROK_URL}/chats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Set up Firebase listeners for each chat
        response.data.forEach(chat => {
          const messagesRef = collection(db, 'chats', chat.chat_id, 'messages');
          const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

          onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const lastMessage = snapshot.docs[0].data();
              setChats(prevChats =>
                prevChats.map(c =>
                  c.chat_id === chat.chat_id
                    ? { ...c, last_message: lastMessage.messageText }
                    : c
                )
              );
            }
          });
        });

        setChats(response.data);
      } catch (error) {
        console.error('Error fetching chats:', error);

        // Add more detailed error logging
        if (error.response) {
          console.error('Error response:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
        }

        // Handle different error scenarios
        switch (error.response?.status) {
          case 401:
            navigation.navigate('Login');
            break;
          case 404:
            Alert.alert(
              'Service Unavailable',
              'Unable to connect to chat service. Please check your connection and try again.'
            );
            break;
          default:
            Alert.alert(
              'Error',
              'An error occurred while fetching your chats. Please try again later.'
            );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserIdAndChats();
  }, []);
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatScreen', {
        chatId: item.chat_id,
        userId: currentUserId,
        otherUserId: item.participant_id
      })}
    >
      <Image
        source={
          item.profile_picture
            ? { uri: item.profile_picture }
            : require('../assets/del.png')
        }
        style={styles.avatar}
      />
      <View style={styles.chatInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message || 'Start a conversation'}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton}>
          <Image
            source={require('../assets/plus3.png')}
            style={styles.newChatIcon}
          />
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with someone</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.chat_id.toString()}
          contentContainerStyle={styles.listContainer}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newChatButton: {
    padding: 8,
  },
  newChatIcon: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});

export default ChatListScreen;