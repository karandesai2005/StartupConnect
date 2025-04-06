import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Participation steps
const participationSteps = [
  'Click the "Participate" button below.',
  'On the next screen, post an image related to the event.',
  'Add relevant tags (e.g., the event title).',
  'Upload your submission to join the event.',
];

const EventDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // Safely access the event object with default values
  const event = route.params?.event || {
    title: 'Event Title',
    description: 'Event Description',
    imageUrl: null,
  };

  const handleParticipate = () => {
    navigation.navigate('CreatePost', { eventTag: event.title }); // Pass event title as a tag
  };

  const renderParticipationSteps = () => (
    <View style={styles.stepsContainer}>
      <Text style={styles.stepsTitle}>How to Participate:</Text>
      {participationSteps.map((step, index) => (
        <Text key={index} style={styles.stepText}>{`${index + 1}. ${step}`}</Text>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {event.imageUrl ? (
          <Image source={event.imageUrl} style={styles.eventImage} resizeMode="cover" />
        ) : (
          <View style={[styles.eventImage, styles.placeholderImage]} />
        )}
        
        <View style={styles.detailsContainer}>
          <Text style={styles.eventTitle}>{event.title || 'Event Title'}</Text>
          <Text style={styles.eventDescription}>{event.description || 'No description available'}</Text>

          <View style={styles.additionalDetails}>
            <Text style={styles.detailText}>Date: March 25, 2025</Text>
            <Text style={styles.detailText}>Location: Tech Hub, Silicon Valley</Text>
            <Text style={styles.detailText}>Time: 9:00 AM - 5:00 PM</Text>
          </View>

          {renderParticipationSteps()}

          <TouchableOpacity style={styles.participateButton} onPress={handleParticipate}>
            <Text style={styles.participateButtonText}>Participate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    width: 40,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  eventImage: {
    width: '100%',
    height: 250,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
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
    marginBottom: 20, // Reduced from 30 to make room for steps
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  stepsContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
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