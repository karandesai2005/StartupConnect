import React, { memo } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Card from "./Card";

// Memoized StoryItem component for better performance
const StoryItem = memo(({ story, onPress }) => {
  const imageSource = story.imageUrl 
    ? { uri: story.imageUrl }
    : require('../assets/profiledefault.jpg');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.storyItem}
      activeOpacity={0.7}
    >
      <View style={[
        styles.storyRing,
        { borderColor: story.viewed ? '#8e8e8e' : '#007bff' },
        story.hasStory && styles.activeStoryRing
      ]}>
        <View style={styles.storyImageContainer}>
          <Image
            source={imageSource}
            style={styles.storyImage}
            resizeMode="cover"
          />
          {story.hasStory && !story.viewed && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {story.username}
      </Text>
    </TouchableOpacity>
  );
});

// Main Stories component
const Stories = memo(({ stories, onStoryPress, title = "Milestones and others" }) => {
  return (
    <Card title={title} style={styles.storiesCard}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
        decelerationRate="fast"
        snapToAlignment="center"
      >
        {stories.map((story) => (
          <StoryItem 
            key={story.id} 
            story={story} 
            onPress={() => onStoryPress?.(story)}
          />
        ))}
      </ScrollView>
    </Card>
  );
});

const styles = StyleSheet.create({
  storiesCard: {
    marginTop: 20,
    marginBottom: 10,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  storiesContainer: {
    padding: 10,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
    marginHorizontal: 6,
    paddingVertical: 4,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  activeStoryRing: {
    borderWidth: 2.5,
    borderColor: '#007bff',
  },
  storyImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyUsername: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    fontFamily: "AvenirNextCyr",
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    borderWidth: 1,
    borderColor: '#fff',
  },
});

export default Stories;