import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

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
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name.first} {item.name.last}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <TouchableOpacity
        style={styles.profilePictureContainer}
        onPress={() => navigation.navigate('Profile')} // Navigate to the Profile page
      >
        <Image
          source={{ uri: 'https://randomuser.me/api/portraits/lego/1.jpg' }} // Example placeholder
          style={styles.profilePicture}
        />
      </TouchableOpacity>

      {/* User List */}
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
  profilePictureContainer: {
    position: 'absolute',
    top: 20, // Add margin to the top
    left: 20, // Position to the left
    zIndex: 10,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  listContentContainer: {
    paddingTop: 80, // Adjust to ensure content is not hidden under the profile picture
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  userCard: {
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'gray',
  },
});
