import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";

const Profile = ({ route, isBusinessProfile = false }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState('stories');

  // Enhanced update handler
  useEffect(() => {
    if (route.params?.updatedUser) {
      console.log("Received updated user data:", route.params.updatedUser);
      setUserData(prevData => ({
        ...prevData,
        ...route.params.updatedUser,
        profile_picture: route.params.updatedUser.profile_picture,
        bio: route.params.updatedUser.bio
      }));
      setLastUpdate(Date.now());

      if (route.params.forceRefresh) {
        fetchUserData();
      }
    }
  }, [route.params?.updatedUser]);

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`https://552d-202-71-156-66.ngrok-free.app/api/auth/profile?timestamp=${Date.now()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",  // 🔥 Prevents caching
          "Pragma": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched profile data:", data);

        setUserData(data);
        setLastUpdate(Date.now());

        // 🔥 Store fresh data in AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert('Error', 'Failed to fetch profile data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
  }, [fetchUserData]);

  useFocusEffect(
    useCallback(() => {
      const shouldFetch = !userData || (Date.now() - lastUpdate > 5000);

      if (shouldFetch) {
        setIsLoading(true);
        fetchUserData();
      }

      return () => { };
    }, [fetchUserData, userData, lastUpdate])
  );

  const avatarStyle = {
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: isBusinessProfile ? 20 : 48,
    overflow: "hidden",
  };

  const renderTab = (tabName, label) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName ? styles.tab1 : styles.tab2]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text style={activeTab === tabName ? styles.tabs : styles.tabs1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.profileContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007BFF"
        />
      }
    >
      <View style={styles.contentContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.centre}>
          <Text style={styles.title}>Title</Text>
          <Text style={styles.largeTitle}>Profile</Text>
          <Text style={styles.largeTitle1}>
            The quick brown fox jumps over the lazy dog
          </Text>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatarMultiVariants}>
            <View style={avatarStyle}>
              <Image
                source={
                  userData?.profile_picture
                    ? { uri: `${userData.profile_picture}?timestamp=${lastUpdate}` }
                    : require('../../../assets/del.png')
                }
                style={styles.profileImage}
                resizeMode="cover"
                onError={(error) => console.log("Image load error:", error.nativeEvent.error)}
              />


            </View>
          </View>

          <View style={styles.text}>
            <View style={styles.id}>
              <Text style={styles.userName}>{userData?.username || "Chir.a.g"}</Text>
              <Text style={styles.checkCircleIcon}>✓</Text>
            </View>
            <Text style={[styles.about, { textAlign: 'center', paddingHorizontal: 10 }]}>
              {userData?.bio || "CEO of PITCH. Entrepreneur investor and many more"}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.masterOutlineButton}
              onPress={() => navigation.navigate('EditProfilePage', { userData })}
            >
              <Text style={styles.button}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tab}>
          {renderTab("stories", isBusinessProfile ? "The Startup" : "The Stories")}
          {renderTab("startups", "The Teams")}
          {renderTab("bucks", "The Bucks")}
        </View>

        <View style={styles.contentBox} />
      </View>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  profileContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  centre: {
    alignItems: "center",
    gap: 8,
    marginTop: 91,
    width: "100%",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  profile: {
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 14,
    gap: 14,
    marginTop: 20,
  },
  avatarMultiVariants: {
    width: 96,
    height: 96,
  },
  text: {
    width: "100%",
    gap: 4,
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#000",
    fontFamily: "AvenirNextCyr",
    textAlign: "center",
  },
  id: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  about: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#000",
    fontFamily: "AvenirNextCyr",
  },
  checkCircleIcon: {
    marginLeft: 5,
    color: "green",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  masterOutlineButton: {
    borderRadius: 14,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
  },
  title: {
    display: "none",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#333",
    fontFamily: "AvenirNextCyr-Bold",
  },
  largeTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "700",
    color: "#000",
    fontFamily: "AvenirNextCyr",
  },
  largeTitle1: {
    fontSize: 14,
    lineHeight: 20,
    color: "#999",
    fontFamily: "AvenirNextCyr",
    display: "none",
  },
  tab: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderRadius: 18,
    borderColor: "#ddd",
    borderWidth: 1,
    padding: 4,
    gap: 8,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tab1: {
    flex: 1,
    height: 30,
    backgroundColor: "#007bff",
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tab2: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fff",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
    textAlign: "center",
  },
  tabs1: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
    textAlign: "center",
  },
  contentBox: {
    width: "90%",
    height: 382,
    backgroundColor: "#f0f8ff",
    borderRadius: 14,
    marginTop: 20,
  },
  backButton: {
    position: "absolute",
    left: 28,
    top: 86,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },

});

export default Profile;
