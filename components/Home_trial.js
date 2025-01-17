
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

// Message icon componentn
const MessageIcon = () => (
  <View style={styles.messageIconContainer}>
    <View style={styles.messageCount}>
      <Text style={styles.messageCountText}>3</Text>
    </View>
    <Image 
      source={require('../assets/message-icon.png')}
      style={styles.messageIcon}
    />
  </View>
);

export default function HomeScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigation = useNavigation();

  const loadUsers = () => {
    setLoading(true);
    axios.get(`https://randomuser.me/api?results=10&page=${currentPage}`)
      .then((res) => {
        setUsers([...users, ...res.data.results]);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading users:", error);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadMore = () => {
    setCurrentPage(currentPage + 1);
  };

  const renderFooter = () => (
    loading ? (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    ) : null
  );

  const renderItem = ({ item }) => (
    <View style={styles.card7}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Image 
            source={{ uri: `${item.picture.thumbnail}` }}
            style={styles.avatarImage}
          />
        </View>
        <Text style={styles.userName}>{item.name.first} {item.name.last}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.imageCaption}>
        <Text style={styles.caption}>#connectstartup</Text>
      </View>
      <View style={styles.engagementSection}>
        <View style={styles.emotesParent}>
          <Text style={styles.engagementText}>789K likes</Text>
        </View>
        <Text style={styles.engagement}>3M comments • 256K shares</Text>
      </View>
      <View style={styles.frameParent}>
        <TouchableOpacity style={styles.vectorParent}>
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.vectorParent}>
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.vectorParent}>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.profilePictureContainer}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/lego/1.jpg' }}
            style={styles.profilePicture}
          />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <View style={styles.bottomAppBar}>
            <Text style={styles.searchText}>Search...</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.messageWidgetContainer}
          onPress={() => navigation.navigate('Chat')}
        >
          <MessageIcon />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  profilePictureContainer: {
    marginRight: 10,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 10,
  },
  bottomAppBar: {
    backgroundColor: '#f3edf7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
  },
  searchText: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontFamily: 'Roboto-Regular',
  },
  messageWidgetContainer: {
    marginLeft: 10,
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIcon: {
    width: 24,
    height: 24,
    tintColor: '#2196F3',
  },
  messageCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  messageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  listContentContainer: {
    padding: 12,
  },
  card7: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.87)',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  imageCaption: {
    marginTop: 8,
  },
  caption: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  engagementSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emotesParent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 14,
    color: '#606163',
    fontWeight: '500',
  },
  engagement: {
    fontSize: 14,
    color: '#606163',
    textAlign: 'right',
  },
  frameParent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  vectorParent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#525252',
    fontWeight: '500',
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
