import React from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const user = {
    name: 'John Doe',
    about: 'Passionate entrepreneur and investor with a love for innovation and technology.',
    picture: 'https://via.placeholder.com/150', 
    startups: [
      { id: '1', name: 'TechWave' },
      { id: '2', name: 'InnoVision' },
      { id: '3', name: 'StartupConnect' },
    ],
    investments: [
      { id: '1', name: 'GreenEnergy Co.' },
      { id: '2', name: 'EduSmart' },
      { id: '3', name: 'HealthifyMe' },
    ],
  };

  const renderItem = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemText}>{item.name}</Text>
    </View>
  );

  const sections = [
    { title: 'Startups', data: user.startups },
    { title: 'Investments', data: user.investments },
  ];

  const renderSectionHeader = ({ section }) => (
    <Text style={styles.sectionTitle}>{section.title}</Text>
  );

  return (
    <FlatList
      data={sections}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <FlatList
            data={item.data}
            keyExtractor={(subItem) => subItem.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        </View>
      )}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Image source={{ uri: user.picture }} style={styles.profilePicture} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.about}>{user.about}</Text>
        </View>
      )}
      contentContainerStyle={styles.container}
      ListFooterComponent={<View style={{ height: 20 }} />} // To avoid cutting off at the bottom
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    elevation: 2,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  about: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  list: {
    paddingBottom: 10,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  listItemText: {
    fontSize: 16,
    color: '#333333',
  },
});
