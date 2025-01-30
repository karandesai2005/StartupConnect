import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, TextInput, Modal, Button, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from 'react-native-image-picker'; // Importing the image picker


// import { launchImageLibrary } from 'react-native-image-picker'; // Importing the image picker

// Inside your EditProfileP component:
const handleProfilePictureChange = () => {
  launchImageLibrary(
    {
      mediaType: 'photo',
      quality: 1,  // Full quality image
      includeBase64: false,  // You can enable this if you need base64 image
    },
    (response) => {
      if (response.didCancel) {
        console.log("User cancelled image picker");
      } else if (response.errorCode) {
        console.log("Image Picker Error: ", response.errorMessage);
      } else {
        const selectedImage = response.assets[0];
        setUpdatedProfileImage(selectedImage.uri); // Set the selected image URI
      }
    }
  );
};

const EditProfileP = () => {
  const [activeTab, setActiveTab] = useState('stories');
  const [userData, setUserData] = useState(null); 
  const [isLoading, setIsLoading] = useState(true); 
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // For editing profile modal
  const [updatedBio, setUpdatedBio] = useState(''); // Store updated bio
  const [updatedProfileImage, setUpdatedProfileImage] = useState(null); // Store updated profile image

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (token) {
          const response = await fetch("http://10.11.18.3:3000/api/auth/profile", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          const result = await response.text(); 

          console.log("API Response:", result);

          if (response.ok) {
            const jsonData = JSON.parse(result);
            setUserData(jsonData); 
            setUpdatedBio(jsonData?.bio); // Set the current bio for editing
          } else {
            console.log(result); 
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleEditProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append('bio', updatedBio);
      if (updatedProfileImage) {
        formData.append('profile_picture', updatedProfileImage);
      }
  
      const response = await fetch("https://6691-59-97-191-226.ngrok-free.app/api/auth/login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
  
      const responseText = await response.text();
      console.log("Raw Response:", responseText);
  
      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log("Edit Profile Result:", result);
  
        // Update user data
        setUserData({ ...userData, bio: updatedBio, profile_picture: updatedProfileImage });
  
        // Close the modal after a successful update
        setIsEditModalVisible(false);
      } else {
        console.log("Error updating profile:", responseText);
        // Optionally show an error message if the update fails
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };
  
  

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
                source={updatedProfileImage ? { uri: updatedProfileImage } : require('../../../assets/del.png')}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <View style={styles.text}>
            <View style={styles.id}>
              <Text style={styles.userName}>{userData?.username}</Text>
              <Text style={styles.checkCircleIcon}>✓</Text>
            </View>
            <Text style={styles.about}>{updatedBio || userData?.bio}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
              <View style={styles.masterOutlineButton}>
                <Text style={styles.button}>Edit Profile</Text>
              </View>
            </TouchableOpacity>
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

      {/* Modal for editing profile */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Edit Profile</Text>
      
      <TextInput 
        style={styles.textInput}
        value={updatedBio}
        onChangeText={setUpdatedBio}
        placeholder="Update Bio"
        multiline
      />
      
      {/* Button for changing profile picture */}
      <TouchableOpacity style={styles.changePicButton} onPress={() => console.log("Profile picture change functionality")}>
        <Text style={styles.changePicButtonText}>Change Profile Picture</Text>
      </TouchableOpacity>
      
      {/* Save Changes Button */}
      <TouchableOpacity onPress={handleEditProfile}>
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </View>
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
        <Text style={styles.cancelButton}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

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
    backgroundColor: "#ffffff",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textInput: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
    borderRadius: 5,
  },
  saveButton: {
    backgroundColor: "#007bff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    color: "#007bff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",  // Darker overlay for better focus
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",  // Shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5, // Android shadow
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  textInput: {
    width: "100%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  changePicButton: {
    backgroundColor: "#f0f8ff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007bff",
  },
  changePicButtonText: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditProfileP;
