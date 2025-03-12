import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BottomNav from './BottamNav';
import { Ionicons } from '@expo/vector-icons';

const EventDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { event } = route.params; // Event data passed from Events screen

  const handleParticipate = () => {
    // Navigate to CreatePostScreen when Participate is clicked
    navigation.navigate('CreatePost');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} /> {/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image source={event.imageUrl} style={styles.eventImage} resizeMode="cover" />
        <View style={styles.detailsContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDescription}>{event.description}</Text>
          
          {/* Additional event details could be added here */}
          <View style={styles.additionalDetails}>
            <Text style={styles.detailText}>Date: March 25, 2025</Text> {/* Example, replace with real data */}
            <Text style={styles.detailText}>Location: Tech Hub, Silicon Valley</Text>
            <Text style={styles.detailText}>Time: 9:00 AM - 5:00 PM</Text>
          </View>

          <TouchableOpacity style={styles.participateButton} onPress={handleParticipate}>
            <Text style={styles.participateButtonText}>Participate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 40, // Balances the layout with back button
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  eventImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0', // Fallback color
  },
  detailsContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  additionalDetails: {
    marginBottom: 30,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  participateButton: {
    backgroundColor: '#0095f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  participateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventDetailsScreen;