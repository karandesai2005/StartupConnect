import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

export default function HomeScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigation = useNavigation();

  const loadUsers = () => {
    setLoading(true);
    axios
      .get(`https://randomuser.me/api?results=10&page=${currentPage}`)
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.picture.thumbnail }} style={styles.avatar} />
        <View>
          <Text style={styles.name}>{item.name.first} {item.name.last}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      </View>
      <Image source={{ uri: item.picture.large }} style={styles.postImage} />
      <View style={styles.cardFooter}>
        <Text style={styles.likes}>❤️ 789K Likes</Text>
        <Text style={styles.comments}>💬 3M Comments</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/lego/1.jpg' }}
            style={styles.profilePic}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image
            source={require('../assets/Arrow Curve Right Up.svg')}
            style={styles.chatIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Post List */}
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContentContainer}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/Home 05.svg')} style={styles.navIcon} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Post')}>
          <Image source={require('../assets/plus.png')} style={styles.navIcon} />
          <Text style={styles.navLabel}>Post</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Image source={require('../assets/notifications-icon.png')} style={styles.navIcon} />
          <Text style={styles.navLabel}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image source={require('../assets/profile-icon.jpg')} style={styles.navIcon} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  searchBar: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    height: 40,
  },
  chatIcon: { width: 24, height: 24 },
  card: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    elevation: 2,
    padding: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  name: { fontWeight: 'bold', fontSize: 16 },
  email: { fontSize: 12, color: '#555' },
  postImage: { width: '100%', height: 200, borderRadius: 10, marginVertical: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  likes: { fontWeight: 'bold', color: '#555' },
  comments: { fontWeight: 'bold', color: '#555' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  actionButton: { alignItems: 'center' },
  actionText: { fontSize: 14, color: '#007bff' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  navIcon: { width: 24, height: 24, marginBottom: 4 },
  navLabel: { fontSize: 12, color: '#555' },
});
