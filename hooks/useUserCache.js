    import AsyncStorage from '@react-native-async-storage/async-storage';

    export const useUserCache = () => {
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const CACHE_PREFIX = 'user_cache_';

    const getCachedUser = async (userId) => {
        try {
        const cachedData = await AsyncStorage.getItem(`${CACHE_PREFIX}${userId}`);
        
        if (!cachedData) return null;
        
        const { data, timestamp } = JSON.parse(cachedData);
        
        // Check if cache has expired
        if (Date.now() - timestamp > CACHE_EXPIRY) {
            await AsyncStorage.removeItem(`${CACHE_PREFIX}${userId}`);
            return null;
        }
        
        return data;
        } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
        }
    };

    const cacheUser = async (userId, userData) => {
        try {
        const cacheData = {
            data: userData,
            timestamp: Date.now()
        };
        
        await AsyncStorage.setItem(
            `${CACHE_PREFIX}${userId}`,
            JSON.stringify(cacheData)
        );
        } catch (error) {
        console.error('Error writing to cache:', error);
        }
    };

    const clearUserCache = async (userId) => {
        try {
        if (userId) {
            await AsyncStorage.removeItem(`${CACHE_PREFIX}${userId}`);
        } else {
            // Clear all user cache entries
            const keys = await AsyncStorage.getAllKeys();
            const userCacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(userCacheKeys);
        }
        } catch (error) {
        console.error('Error clearing cache:', error);
        }
    };

    return {
        getCachedUser,
        cacheUser,
        clearUserCache
    };
    };