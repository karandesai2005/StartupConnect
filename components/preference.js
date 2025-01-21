import * as React from "react";
import { Text, StyleSheet, View, Pressable, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const Signup = () => {
    const navigation = useNavigation();

    const handleBack = () => {
        navigation.goBack();
    };

    const handlePersonalAccount = () => {
        navigation.navigate("PersonalAccountPage"); // Replace with the actual route name
    };

    const handleBusinessAccount = () => {
        navigation.navigate("BusinessAccountPage"); // Replace with the actual route name
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

                <Pressable style={styles.nextButton}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </Pressable>
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
    nextButton: {
        backgroundColor: "#535353",
        borderRadius: 21,
        width: 82,
        height: 42,
        justifyContent: "center",
        alignItems: "center",
        marginTop: "auto",
        marginBottom: 140,
    },
    nextButtonText: {
        fontSize: 15,
        color: "#fff",
        fontFamily: "Avenir Next",
    },
});

export default Signup;
