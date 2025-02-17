import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  StatusBar,
  TouchableWithoutFeedback,
  Share,
  Platform,
  SafeAreaView,
} from 'react-native';

// Get window dimensions
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const ReelsScreen = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState({
    height: WINDOW_HEIGHT,
    statusBarHeight: StatusBar.currentHeight || 0,
  });
  const flatListRef = useRef(null);
  const lastTap = useRef(null);

  // Update screen dimensions on layout change
  useEffect(() => {
    const updateLayout = () => {
      const windowHeight = Platform.OS === 'ios' ? Dimensions.get('window').height-80 : Dimensions.get('window').height-15;
      const statusBarHeight = StatusBar.currentHeight || 0;
      setScreenDimensions({
        height: windowHeight,
        statusBarHeight,
      });
    };

    // Initial update
    updateLayout();

    const dimensionsHandler = Dimensions.addEventListener('change', updateLayout);

    return () => {
      dimensionsHandler.remove();
    };
  }, []);

  const reelsData = [
    {
      id: '1',
      type: 'image',
      url: 'https://plus.unsplash.com/premium_photo-1671127303910-754ac2224c7a?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c25vdyUyMGZhbGx8ZW58MHx8MHx8fDA%3D',
      user: 'user1',
      likes: 1234,
      caption: 'Big Buck Bunny - Sample Video',
      duration: 596,
    },
    {
      id: '2',
      type: 'image',
      url: 'https://mediaassets.cbre.com/-/media/project/cbre/bussectors/cbreim/insights/articles/2023-media-folder/how-the-rise-of-remote-work-is-changing-the-real-estate-landscape/how-the-rise-of-remote-work-is-changing-the-real-estate-landscape.jpg',
      user: 'user2',
      likes: 856,
      caption: 'Elephants Dream - Creative Commons Video',
      duration: 653,
    },
    {
      id: '3',
      type: 'image',
      url: 'https://preview.redd.it/advice-if-i-want-this-kind-of-view-in-manhattan-how-much-v0-873vsqb9wvsa1.jpg?width=1038&format=pjpg&auto=webp&s=a9f2f0525e1f06e1678a2bb72dc555ff8f9c3f00',
      user: 'user3',
      likes: 2341,
      caption: 'For Bigger Blazes - Sample Video',
    },
    {
      id: '4',
      type: 'image',
      url: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
      user: 'user2',
      likes: 856,
      caption: 'Beautiful sunset',
    },
  ];

  const [reels, setReels] = useState(reelsData.map(reel => ({
    ...reel,
    isLiked: false,
    progress: 0,
  })));

  const handleDoubleTap = (index) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      const updatedReels = [...reels];
      updatedReels[index].isLiked = true;
      updatedReels[index].likes += 1;
      setReels(updatedReels);
      lastTap.current = null;
    } else {
      lastTap.current = now;
    }
  };

  const handleShare = async (item) => {
    try {
      await Share.share({
        message: `Check out this amazing ${item.type} from ${item.user}!`,
        url: item.url,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLike = (index) => {
    const updatedReels = [...reels];
    updatedReels[index].isLiked = !updatedReels[index].isLiked;
    updatedReels[index].likes += updatedReels[index].isLiked ? 1 : -1;
    setReels(updatedReels);
  };

  const renderProgressBar = (item, index) => {
    if (item.type !== 'video') return null;

    return (
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${item.progress * 100}%` }
          ]}
        />
      </View>
    );
  };

  const getItemLayout = (data, index) => ({
    length: screenDimensions.height,
    offset: screenDimensions.height * index,
    index,
  });

  const renderItem = ({ item, index }) => {
    return (
      <TouchableWithoutFeedback onPress={() => handleDoubleTap(index)}>
        <View style={[styles.reelContainer, { height: screenDimensions.height }]}>
          <Image
            source={{ uri: item.url }}
            style={[styles.mediaContent, { height: screenDimensions.height }]}
            resizeMode="cover"
          />

          {renderProgressBar(item, index)}

          {item.type === 'video' && (
            <TouchableOpacity
              style={[styles.soundButton, { top: screenDimensions.statusBarHeight + 10 }]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Text style={styles.soundIcon}>
                {isMuted ? '🔇' : '🔊'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.overlay}>
            <View style={styles.rightButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(index)}
              >
                <Text style={[
                  styles.actionButtonText,
                  item.isLiked && styles.likedText
                ]}>
                  ❤️
                </Text>
                <Text style={styles.actionText}>{item.likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>💬</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(item)}
              >
                <Text style={styles.actionButtonText}>↗️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomContent}>
              <Text style={styles.username}>@{item.user}</Text>
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenDimensions.height}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={true}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        onEndReachedThreshold={0.5}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 84 : 60 }} // Adjust for bottom nav
      />
      <SafeAreaView style={styles.bottomNavSafeArea}>
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Image source={require('../assets/home4.webp')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
            <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Reel')}>
            <Image source={require('../assets/bell.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Image source={require('../assets/settings.png')} style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  reelContainer: {
    width: WINDOW_WIDTH,
    position: 'relative',
  },
  mediaContent: {
    width: WINDOW_WIDTH,
    position: 'absolute',
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  rightButtons: {
    position: 'absolute',
    right: 10,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    marginVertical: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 24,
    color: 'white',
  },
  likedText: {
    color: '#ff4d4d',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 60,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  caption: {
    color: 'white',
    fontSize: 14,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
  },
  soundButton: {
    position: 'absolute',
    right: 10,
    padding: 10,
    zIndex: 1,
  },
  soundIcon: {
    fontSize: 20,
    color: 'white',
  },
  bottomNavSafeArea: {
    backgroundColor: '#fff',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 10 : 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? 50 : 60,
  },
  navIcon: {
    width: 24,
    height: 24,
  },
});

export default ReelsScreen;