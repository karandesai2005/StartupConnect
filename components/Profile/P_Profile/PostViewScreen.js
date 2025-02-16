import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    Animated,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
const NGROK_URL = 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/';  // Replace with your actual URL
// Memoized Post Item Component
const PostItem = memo(({
    item,
    index,
    toggleExpand,
    expandedItems,
    onDoubleTap
}) => {
    const [imageHeight, setImageHeight] = useState(width);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [imageError, setImageError] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const animatedScale = useRef(new Animated.Value(1)).current;
    const lastTap = useRef(0);
    const videoRef = useRef(null);

    useEffect(() => {
        const mediaUrl = item.image_url || item.media_url;
        
        if (typeof mediaUrl === 'string') {
            if (mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i)) {
                setIsVideo(true);
                setImageHeight(width * 9 / 16); // 16:9 aspect ratio for videos
                setIsLoading(false);
            } else if (mediaUrl.startsWith('http')) {
                Image.getSize(
                    mediaUrl,
                    (imgWidth, imgHeight) => {
                        const aspectRatio = imgWidth / imgHeight;
                        setImageHeight(width / aspectRatio);
                        setIsLoading(false);
                    },
                    (error) => {
                        console.log('Error getting image size:', error);
                        setImageHeight(width);
                        setIsLoading(false);
                        setImageError(true);
                    }
                );
            } else {
                setIsLoading(false);
            }
        }
    }, [item]);

    const handleMediaPress = () => {
        if (isVideo) {
            setIsPaused(!isPaused);
            if (videoRef.current) {
                if (isPaused) {
                    videoRef.current.playAsync();
                } else {
                    videoRef.current.pauseAsync();
                }
            }
        }
        handlePressIn();
    };

    const handlePressIn = useCallback(() => {
        Animated.spring(animatedScale, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressOut = useCallback(() => {
        Animated.spring(animatedScale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleLike = useCallback(() => {
        setIsLiked(prev => !prev);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    }, [isLiked]);

    return (
        <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
            {/* User Info Header */}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Image
                        source={
                            item?.profile_picture
                                ? { uri: item.profile_picture }
                                : require('../../../assets/del.png')
                        }
                        style={styles.avatar}
                    />
                    <Text style={styles.name}>{item.username || 'Unknown User'}</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreButtonText}>•••</Text>
                </TouchableOpacity>
            </View>

            {/* Media Content */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPressIn={handleMediaPress}
                onPressOut={handlePressOut}
            >
                <View style={[styles.imageContainer, { height: imageHeight }]}>
                    {isLoading && !imageError && (
                        <View style={styles.imageLoader}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    )}

                    {isVideo ? (
                        <>
                            <Video
                                ref={videoRef}
                                source={{ uri: item.image_url || item.media_url }}
                                style={styles.postImage}
                                resizeMode="cover"
                                shouldPlay={!isPaused}
                                isLooping={true}
                                onLoad={() => setIsLoading(false)}
                                onError={(error) => {
                                    console.log("Video loading error:", error);
                                    setIsLoading(false);
                                    setImageError(true);
                                }}
                                useNativeControls={true}
                            />
                            {isPaused && (
                                <View style={styles.playButtonOverlay}>
                                    <Image
                                        source={require('../../../assets/play-button.png')}
                                        style={styles.playButton}
                                    />
                                </View>
                            )}
                        </>
                    ) : (
                        <Image
                            source={{ uri: item.image_url || item.media_url }}
                            style={styles.postImage}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setImageError(true);
                            }}
                        />
                    )}
                </View>
            </TouchableOpacity>

            {/* Engagement Section */}
            <View style={styles.cardFooter}>
                <Text style={styles.likes}>👍 {likeCount} Likes</Text>
                <Text style={styles.comments}>💬 {item.comments || 0}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <Image
                        source={require('../../../assets/icon-like.png')}
                        style={[styles.navIcon, isLiked && { tintColor: '#1f219c' }]}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Image source={require('../../../assets/comment6.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Image source={require('../../../assets/share.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Image source={require('../../../assets/save.png')} style={styles.navIcon} />
                </TouchableOpacity>
            </View>

            {/* Caption */}
            <View style={styles.captionContainer}>
                <Text
                    style={styles.caption}
                    numberOfLines={expandedItems[index] ? undefined : 2}
                >
                    <Text style={styles.username}>{item.username} </Text>
                    {item.content}
                </Text>
                {item.content && item.content.length > 80 && (
                    <TouchableOpacity onPress={() => toggleExpand(index)}>
                        <Text style={styles.showMoreText}>
                            {expandedItems[index] ? 'Show less' : 'Show more'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
});

const PostViewScreen = ({ route }) => {
    const { posts: initialPosts = [], initialIndex = 0 } = route?.params || {};
    const navigation = useNavigation();
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [expandedItems, setExpandedItems] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const scaleValue = useRef(new Animated.Value(1)).current;
    const [isLoading, setIsLoading] = useState(false);
    const [localPosts, setLocalPosts] = useState(initialPosts);  // Initialize with route params posts
    const fetchPosts = async () => {
        try {
            setIsLoading(true);

            const token = await AsyncStorage.getItem("token");
            if (!token) {
                console.error('No token found');
                Alert.alert('Authentication Error', 'Please log in again.');
                return;
            }

            const response = await fetch(`${NGROK_URL}/api/posts/myposts`, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Fetched posts:", data);

                // Map backend fields to match what PostItem expects
                const mappedPosts = data.map(post => ({
                    _id: post.post_id,
                    username: post.username,
                    profile_picture: post.profile_picture,
                    image_url: post.media_url, // Correct field mapping
                    content: post.content,
                    created_at: post.created_at,
                    likes: post.likes ?? 0, // Default to 0 if undefined
                    comments: post.comments ?? 0,
                }));

                setLocalPosts(mappedPosts);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            Alert.alert('Error', 'Failed to fetch posts');
        } finally {
            setIsLoading(false);
        }
    };



    useEffect(() => {
        fetchPosts();
    }, []);
    const toggleExpand = useCallback((index) => {
        setExpandedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchPosts();
        setIsRefreshing(false);
    }, []);



    const handleDoubleTap = useCallback(() => {
        Animated.sequence([
            Animated.spring(scaleValue, {
                toValue: 1.2,
                useNativeDriver: true,
            }),
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>
                    {Array.isArray(localPosts) && localPosts.length > 0
                        ? `${Math.min(currentIndex + 1, localPosts.length)} of ${localPosts.length}`
                        : 'No posts'}
                </Text>

                <View style={styles.backButton} />
            </View>

            {/* Posts */}
            {Array.isArray(localPosts) && localPosts.length > 0 ? (
                <FlatList
                    ref={flatListRef}
                    data={localPosts}
                    renderItem={({ item, index }) => (
                        <PostItem
                            item={item}
                            index={index}
                            toggleExpand={toggleExpand}
                            expandedItems={expandedItems}
                            onDoubleTap={handleDoubleTap}
                        />
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    pagingEnabled={false} // Remove pagingEnabled or set it to false for smooth scrolling
                    showsVerticalScrollIndicator={true} // Enable vertical scrolling
                    initialScrollIndex={Math.min(initialIndex, localPosts?.length - 1) || 0} // Using optional chaining and nullish coalescing
                    getItemLayout={(data, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    onMomentumScrollEnd={(event) => {
                        const newIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
                        setCurrentIndex(newIndex);
                    }}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                />
            ) : (
                <Text style={{ textAlign: 'center', padding: 20 }}>No posts available</Text>
            )}

        </SafeAreaView>
    );
};

PostViewScreen.propTypes = {
    route: PropTypes.shape({
        params: PropTypes.shape({
            posts: PropTypes.array,
            initialIndex: PropTypes.number,
        }),
    }),
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212529',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#212529',
    },
    card: {
        backgroundColor: '#fff',
        width: width,
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#212529',
    },
    moreButton: {
        padding: 8,
    },
    moreButtonText: {
        fontSize: 16,
        color: '#868E96',
        fontWeight: 'bold',
    },
    imageContainer: {
        width: width,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageLoader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    postImage: {
        width: width,
        height: '100%',
        resizeMode: 'cover',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#DC3545',
        fontSize: 14,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 5,
        paddingHorizontal: 10,
    },
    likes: {
        fontWeight: 'bold',
        color: '#555',
    },
    comments: {
        fontWeight: 'bold',
        color: '#555',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    actionButton: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    navIcon: {
        width: 24,
        height: 24,
        marginBottom: 4,
    },
    captionContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    caption: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 20,
    },
    username: {
        fontWeight: '600',
        color: '#212529',
    },
    showMoreText: {
        fontSize: 14,
        color: '#868E96',
        marginTop: 4,
    },
    playButtonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playButton: {
        width: 60,
        height: 60,
        tintColor: 'white',
    },
});

export default PostViewScreen;