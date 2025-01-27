    import * as React from "react";
    import { Text, StyleSheet, View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
    import { useNavigation } from "@react-navigation/native";
    import AsyncStorage from '@react-native-async-storage/async-storage';

    const HandlePersonal = () => {
        const [realName, setRealName] = React.useState("");
        const [isLoading, setIsLoading] = React.useState(false);
        const [error, setError] = React.useState("");
        const navigation = useNavigation();
    
        React.useEffect(() => {
            const checkUserId = async () => {
                const userId = await AsyncStorage.getItem('userId');
                console.log("Component mounted, current userId:", userId);
            };
            checkUserId();
        }, []);
    
        const handleBack = () => {
            navigation.goBack();
        };
    
        const handleSaveRealName = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                console.log("Retrieved userId:", userId);
        
                if (!userId) {
                    Alert.alert("Error", "User session not found. Please try again.");
                    return;
                }
        
                // Assume `realName` is bound to an input field in your component
                if (!realName || realName.trim() === "") {
                    Alert.alert("Error", "Real name cannot be empty.");
                    return;
                }
        
                const requestBody = {
                    step: 5,
                    data: {
                        realName: realName.trim(),
                        userId: parseInt(userId),
                    },
                };
        
                const response = await fetch("http://10.11.18.3:3000/api/auth/save-user-details", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                });
        
                const result = await response.json();
                console.log("Response from server:", result);
        
                if (response.ok) {
                    // Alert.alert("Success", "Real name saved successfully.");
                    navigation.navigate("field"); // Replace with your next navigation target
                } else {
                    Alert.alert("Error", result.message || "Failed to save real name. Please try again.");
                }
            } catch (error) {
                console.error("Error saving real name:", error);
                Alert.alert("Error", "Something went wrong. Please try again.");
            }
        };
        
        

        return (
            <View style={styles.container}>
                <Text style={[styles.title, styles.centeredText]}>What’s your real name?</Text>

                {/* Input Field */}
                <TextInput
                    style={styles.textInput}
                    placeholder="Enter your real name"
                    value={realName}
                    onChangeText={(text) => setRealName(text)}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Save Button */}
                <Pressable
                    style={[styles.saveButton, isLoading ? styles.disabledButton : null]}
                    onPress={handleSaveRealName}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save and Continue</Text>
                    )}
                </Pressable>

                {/* Back Button */}
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
            </View>
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: "#fff",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
        },
        centeredText: {
            textAlign: "center",
        },
        title: {
            fontSize: 24,
            fontWeight: "700",
            color: "#000",
            marginBottom: 20,
        },
        textInput: {
            width: "100%",
            height: 50,
            borderColor: "#ccc",
            borderWidth: 1,
            borderRadius: 8,
            padding: 10,
            fontSize: 16,
            marginBottom: 10,
        },
        saveButton: {
            width: "100%",
            backgroundColor: "#535353",
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            marginBottom: 20,
        },
        disabledButton: {
            opacity: 0.7,
        },
        saveButtonText: {
            color: "#fff",
            fontSize: 16,
            fontWeight: "600",
        },
        errorText: {
            color: "#ff0000",
            fontSize: 14,
            marginBottom: 10,
            textAlign: "center",
        },
        backButton: {
            marginTop: 10,
        },
        backButtonText: {
            color: "#1ed760",
            fontSize: 14,
        },
    });

    export default HandlePersonal;
