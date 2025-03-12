import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Bottomnav from './BottamNav';

// Sample event data (fixed duplicate IDs)
const eventsData = [
  { id: '1', title: 'Tech Conference 2025', description: 'Join us for the latest in tech innovations and networking.', imageUrl: require('../assets/del.png') },
  { id: '2', title: 'Startup Pitch Night', description: 'Pitch your ideas to investors and win funding!', imageUrl: require('../assets/del.png') },
  { id: '3', title: 'Hackathon Weekend', description: 'Code, collaborate, and compete for awesome prizes.', imageUrl: require('../assets/del.png') },
  { id: '4', title: 'Entrepreneur Workshop', description: 'Learn business skills from industry experts.', imageUrl: require('../assets/del.png') },
  { id: '5', title: 'AI Summit 2025', description: 'Explore the future of artificial intelligence.', imageUrl: require('../assets/del.png') },
  { id: '6', title: 'Networking Mixer', description: 'Connect with professionals in your industry.', imageUrl: require('../assets/del.png') },
  { id: '7', title: 'Web Dev Bootcamp', description: 'Master web development in one weekend.', imageUrl: require('../assets/del.png') },
  { id: '8', title: 'Innovation Expo', description: 'Showcase and discover groundbreaking ideas.', imageUrl: require('../assets/del.png') },
  { id: '9', title: 'Tech Conference 2025', description: 'Join us for the latest in tech innovations and networking.', imageUrl: require('../assets/del.png') },
  { id: '10', title: 'Startup Pitch Night', description: 'Pitch your ideas to investors and win funding!', imageUrl: require('../assets/del.png') },
  { id: '11', title: 'Hackathon Weekend', description: 'Code, collaborate, and compete for awesome prizes.', imageUrl: require('../assets/del.png') },
  { id: '12', title: 'Entrepreneur Workshop', description: 'Learn business skills from industry experts.', imageUrl: require('../assets/del.png') },
  { id: '13', title: 'AI Summit 2025', description: 'Explore the future of artificial intelligence.', imageUrl: require('../assets/del.png') },
  { id: '14', title: 'Networking Mixer', description: 'Connect with professionals in your industry.', imageUrl: require('../assets/del.png') },
  { id: '15', title: 'Web Dev Bootcamp', description: 'Master web development in one weekend.', imageUrl: require('../assets/del.png') },
  { id: '16', title: 'Innovation Expo', description: 'Showcase and discover groundbreaking ideas.', imageUrl: require('../assets/del.png') },
];

// Event Item Component
const EventItem = ({ event, onPress, isLast }) => {
  return (
    <View style={styles.eventContainer}>
      <TouchableOpacity
        style={[
          styles.eventItem,
          Platform.OS === 'android' && styles.eventItemAndroid, // Apply Android-specific styling
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image
          source={event.imageUrl}
          style={[
            styles.eventIcon,
            Platform.OS === 'android' && styles.eventIconAndroid, // Smaller icon on Android
          ]}
          resizeMode="cover"
        />
        <View style={styles.eventDetails}>
          <Text
            style={[
              styles.eventTitle,
              Platform.OS === 'android' && styles.eventTitleAndroid, // Smaller title on Android
            ]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text
            style={[
              styles.eventDescription,
              Platform.OS === 'android' && styles.eventDescriptionAndroid, // Smaller description on Android
            ]}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
};

// Events Page Component
const Events = () => {
  const navigation = useNavigation();

  const handleEventPress = (event) => {
    navigation.navigate('EventDetails', { event }); // Navigate to EventDetails with event data
  };

  const renderItem = ({ item, index }) => (
    <EventItem
      event={item}
      onPress={() => handleEventPress(item)}
      isLast={index === eventsData.length - 1}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
      </View>
      <FlatList
        data={eventsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <Bottomnav />
    </View>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background like LinkedIn
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60, // Space for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Subtle gray line
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a', // Darker gray for professionalism
    fontFamily: 'AvenirNextCyr',
  },
  listContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  eventContainer: {
    width: '100%',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  eventItemAndroid: {
    paddingVertical: 10, // Reduced from 15 to make it more compact on Android
  },
  eventIcon: {
    width: 60,
    height: 60,
    borderRadius: 8, // Slightly rounded edges
    backgroundColor: '#f0f0f0', // Fallback color
  },
  eventIconAndroid: {
    width: 48, // Reduced from 60
    height: 48, // Reduced from 60
    borderRadius: 6, // Slightly smaller radius to match
  },
  eventDetails: {
    flex: 1,
    marginLeft: 15,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a', // Darker text for readability
    fontFamily: 'AvenirNextCyr',
  },
  eventTitleAndroid: {
    fontSize: 14, // Reduced from 16
  },
  eventDescription: {
    fontSize: 14,
    color: '#666', // Muted gray like LinkedIn
    fontFamily: 'AvenirNextCyr',
    marginTop: 4,
    lineHeight: 18,
  },
  eventDescriptionAndroid: {
    fontSize: 12, // Reduced from 14
    lineHeight: 16, // Adjusted for compactness
    marginTop: 2, // Reduced from 4
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0', // Light gray divider like LinkedIn
    marginHorizontal: 10,
  },
});

export default Events;