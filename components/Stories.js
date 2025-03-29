import React, { memo } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Card from "./Card";

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

const Stories = memo(({ stories, onStoryPress, title = "Milestones and others", style }) => {
  return (
    <Card 
      title={title} 
      style={[styles.storiesCard, style]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
        decelerationRate="fast"
        snapToAlignment="center"
        alwaysBounceHorizontal={true} // Ensures bounce on Android
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
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
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
    // Removed redundant sizing since storyImageContainer handles it
  },
  activeStoryRing: {
    borderWidth: 2.5,
    borderColor: '#007bff',
  },
  storyImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 45,
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