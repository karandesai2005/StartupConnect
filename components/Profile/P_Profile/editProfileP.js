import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const EditProfileP = () => {
  const [activeTab, setActiveTab] = useState('stories');
  const [userData, setUserData] = useState(null);  // State for storing user data
  const [isLoading, setIsLoading] = useState(true); // State for loading indicator

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");  // Get the stored token

        if (token) {
          const response = await fetch("http://10.11.18.3:3000/api/auth/profile", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,  // Pass token in the Authorization header
            },
          });

          const result = await response.text();  // Get raw response text

          console.log("API Response:", result);  // Log the raw response for debugging

          if (response.ok) {
            const jsonData = JSON.parse(result);  // Parse only if it's valid JSON
            setUserData(jsonData);  // Store user data in state
          } else {
            console.log(result);  // Handle error message
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);  // Stop loading after fetching
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.profile12}>
      <View style={styles.contentContainer}>
        <View style={styles.centre}>
          <Text style={styles.title}>Title</Text>
          <Text style={styles.largeTitle}>Profile</Text>
          <Text style={styles.largeTitle1}>
            The quick brown fox jumps over the lazy dog
          </Text>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatarMultiVariants}>
            <View style={styles.masterAvatar}>
              <Image 
                source={require('../../../assets/del.png')}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <View style={styles.text}>
            <View style={styles.id}>
              {/* Dynamically display username */}
              <Text style={styles.userName}>{userData?.username}</Text>
              <Text style={styles.checkCircleIcon}>✓</Text>
            </View>
            <Text style={styles.about}>CEO of PITCH. Entrepreneur, investor and many more</Text>
          </View>
          <View style={styles.buttonContainer}>
            <View style={styles.masterOutlineButton}>
              <Text style={styles.button}>Edit Profile</Text>
            </View>
          </View>
        </View>

        <View style={styles.tab}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "stories" ? styles.tab1 : styles.tab2]}
            onPress={() => setActiveTab("stories")}
          >
            <Text style={activeTab === "stories" ? styles.tabs : styles.tabs1}>
              The Stories
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "startups" ? styles.tab1 : styles.tab2]}
            onPress={() => setActiveTab("startups")}
          >
            <Text style={activeTab === "startups" ? styles.tabs : styles.tabs1}>
              The Startups
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "bucks" ? styles.tab1 : styles.tab2]}
            onPress={() => setActiveTab("bucks")}
          >
            <Text style={activeTab === "bucks" ? styles.tabs : styles.tabs1}>
              The Bucks
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profile12Child} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profile12: {
    flex: 1,
    backgroundColor: "#fff",
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
  masterAvatar: {
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: 48,
    overflow: "hidden",
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
  profile12Child: {
    width: "90%",
    height: 382,
    backgroundColor: "#f0f8ff",
    borderRadius: 14,
    marginTop: 20,
  },
});

export default EditProfileP;
