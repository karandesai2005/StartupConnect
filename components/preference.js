import * as React from "react";
import { Text, StyleSheet, View, Pressable, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';

const Signup = () => {
    const navigation = useNavigation();
    const route = useRoute();

    React.useEffect(() => {
        const checkUserId = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                console.log("Preferences screen - Current userId:", userId);
                if (!userId) {
                    Alert.alert(
                        "Error",
                        "Session expired. Please restart registration.",
                        [{ text: "OK", onPress: () => navigation.navigate("Register1") }]
                    );
                }
            } catch (error) {
                console.error("Error checking userId:", error);
            }
        };
        checkUserId();
    }, []);

    const handleBack = () => {
        navigation.goBack();
    };

    const handlePersonalAccount = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert("Error", "User session not found. Please try again.");
                return;
            }

            const requestBody = {
                step: 4,
                data: {
                    preference: "personal",
                    userId: parseInt(userId),
                },
            };

            console.log("Personal Account Request:", requestBody);

            const response = await fetch(`${NGROK_URL}/api/auth/save-user-details`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            console.log("Server Response:", result);

            if (response.ok) {
                navigation.navigate("handlePersonal");
            } else {
                Alert.alert("Error", result.message || "Failed to save preference.");
            }
        } catch (error) {
            console.error("Error in handlePersonalAccount:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    const handleBusinessAccount = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert("Error", "User session not found. Please try again.");
                return;
            }

            const requestBody = {
                step: 4,
                data: {
                    preference: "business",
                    userId: parseInt(userId),
                },
            };

            console.log("Business Account Request:", requestBody);

            const response = await fetch(`${NGROK_URL}/api/auth/save-user-details`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            console.log("Server Response:", result);

            if (response.ok) {
                navigation.navigate("handleBusiness");
            } else {
                Alert.alert("Error", result.message || "Failed to save preference.");
            }
        } catch (error) {
            console.error("Error in handleBusinessAccount:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    return (
        <View style={styles.signup4}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>

                <Text style={styles.createAccount}>Create account</Text>
                <Text style={styles.whatIsYour}>What is your account type preference?</Text>

                <View style={styles.accountOptionsContainer}>
                    <Pressable style={styles.accountOption} onPress={handlePersonalAccount}>
                        <Text style={styles.accountOptionText}>Personal Account</Text>
                    </Pressable>

                    <View style={styles.orContainer}>
                        <Text style={styles.or}>or</Text>
                    </View>

                    <Pressable style={styles.accountOption} onPress={handleBusinessAccount}>
                        <Text style={styles.accountOptionText}>Business Account</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    signup4: {
        backgroundColor: "#fff",
        flex: 1,
    },
    container: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 40,
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
    createAccount: {
        fontSize: 16,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
        marginTop: 50,
    },
    whatIsYour: {
        fontSize: 20,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
        textAlign: "center",
        marginTop: 20,
        maxWidth: 355,
    },
    accountOptionsContainer: {
        width: "100%",
        alignItems: "center",
        marginTop: 160,
    },
    accountOption: {
        backgroundColor: "#b7b7b7",
        borderRadius: 5,
        width: "100%",
        height: 51,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
    },
    accountOptionText: {
        fontSize: 20,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
    },
    orContainer: {
        backgroundColor: "#f0f0f0",
        borderRadius: 14,
        borderColor: "#000",
        borderWidth: 2,
        width: 103,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 20,
    },
    or: {
        fontSize: 20,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
    },
});

export default Signup;