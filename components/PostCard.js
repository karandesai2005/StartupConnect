import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');

const PostCard = memo(({ item, index, toggleExpand, expandedItems }) => {
  const [imageHeight, setImageHeight] = useState(width);
  const [isLoading, setIsLoading] = useState(true);
  const animatedScale = new Animated.Value(1);

  useEffect(() => {
    Image.getSize(
      item.picture.large || 'https://picsum.photos/800/800',
      (originalWidth, originalHeight) => {
        const aspectRatio = originalWidth / originalHeight;
        const calculatedHeight = width / aspectRatio;
        setImageHeight(calculatedHeight);
      },
      (error) => {
        console.log('Error getting image size:', error);
        setImageHeight(width);
      }
    );
  }, []);

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.userInfo}>
          <Image 
            source={{ uri: item.picture.thumbnail }} 
            style={styles.avatar}
          />
          <View style={styles.userInfoText}>
            <Text style={styles.name}>
              {item.name.first} {item.name.last}
            </Text>
            <Text style={styles.timeStamp}>2h ago</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {isLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          <Image 
            source={{ uri: item.picture.large || 'https://picsum.photos/800/800' }}
            style={[styles.postImage, { height: imageHeight }]}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.cardFooter}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../assets/icon-like.png')} style={styles.actionIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../assets/comment1.png')} style={styles.actionIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../assets/share1.png')} style={styles.actionIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.likes}>789K Likes</Text>
          <Text style={styles.comments}>3M Comments</Text>
        </View>

        <View style={styles.captionContainer}>
          <Text 
            numberOfLines={expandedItems[index] ? null : 3}
            style={styles.caption}
          >
            {item.email}
          </Text>
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Text style={styles.showMoreText}>
              {expandedItems[index] ? 'Show Less' : 'Show More'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoText: {
    marginLeft: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeStamp: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: '#666',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    padding: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  likes: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
    color: '#1a1a1a',
  },
  comments: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  captionContainer: {
    marginTop: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1a1a1a',
  },
  showMoreText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default PostCard;