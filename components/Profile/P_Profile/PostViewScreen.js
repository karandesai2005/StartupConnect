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
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [imageHeight, setImageHeight] = useState(width);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const animatedScale = useRef(new Animated.Value(1)).current;
    const lastTap = useRef(0);

    useEffect(() => {
        if (item.image_url) {
            Image.getSize(
                item.image_url,
                (imgWidth, imgHeight) => {
                    const aspectRatio = imgWidth / imgHeight;
                    setImageAspectRatio(aspectRatio);
                    setImageHeight(width / aspectRatio); // Maintain aspect ratio correctly
                },
                () => setImageError(true)
            );
        }
    }, [item.image_url]);
    

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

    const handleImagePress = useCallback(() => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            onDoubleTap();
            handleLike();
        }
        lastTap.current = now;
    }, [handleLike, onDoubleTap]);
    console.log("Caption:", item.content);


    return (
        <Animated.View
            style={[styles.card, { transform: [{ scale: animatedScale }] }]}
            accessible={true}
            accessibilityRole="none"
            accessibilityLabel={`Post by ${item.username}`}
        >
            {/* User Info Header */}
            <View style={styles.cardHeader}>
                <TouchableOpacity
                    style={styles.userInfo}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.username}'s profile`}
                >
                    <Image
                        source={
                            item?.profile_picture
                                ? { uri: item.profile_picture }
                                : require('../../../assets/del.png')
                        }
                        style={styles.avatar}
                        accessible={true}
                        accessibilityLabel={`${item.username}'s profile picture`}
                    />
                    <Text style={styles.name}>{item.username || 'Unknown User'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.moreButton}
                    accessibilityLabel="More options"
                    accessibilityRole="button"
                >
                    <Text style={styles.moreButtonText}>•••</Text>
                </TouchableOpacity>
            </View>

            {/* Post Image */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleImagePress}
                accessibilityLabel="Double tap to like"
            >
                <View style={[styles.imageContainer, { height: imageHeight }]}>
                    {isLoading && !imageError && (
                        <View style={styles.imageLoader}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    )}
                    {!imageError ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={[styles.postImage, { aspectRatio: imageAspectRatio }]}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setImageError(true);
                            }}
                        />
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Unable to load image</Text>
                        </View>
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
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                    accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
                    accessibilityRole="button"
                >
                    <Image
                        source={require('../../../assets/icon-like.png')}
                        style={[styles.navIcon, isLiked && { tintColor: '#1f219c' }]}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    accessibilityLabel="Comment on post"
                    accessibilityRole="button"
                >
                    <Image source={require('../../../assets/comment6.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    accessibilityLabel="Share post"
                    accessibilityRole="button"
                >
                    <Image source={require('../../../assets/share.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    accessibilityLabel="Save post"
                    accessibilityRole="button"
                >
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
                {item.content.length > 80 && (
                    <TouchableOpacity
                        onPress={() => toggleExpand(index)}
                        accessibilityLabel={expandedItems[index] ? "Show less" : "Show more"}
                        accessibilityRole="button" // Ensuring it's a valid string
                    >
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
    
            // Retrieve token using the correct key
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                console.error('No token found');
                Alert.alert('Authentication Error', 'Please log in again.');
                return;
            }
    
            const response = await fetch(`${NGROK_URL}/api/posts/myposts`, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`, // Ensure the token is correctly formatted
                    "Content-Type": "application/json",
                },
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched posts:", data);
                setLocalPosts(data);
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
});

export default PostViewScreen;