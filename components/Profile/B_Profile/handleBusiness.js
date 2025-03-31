import * as React from "react";
import { Text, StyleSheet, View, TextInput, Pressable } from "react-native";
import { useNavigation } from '@react-navigation/native';

const SetupBusinessProfile = () => {
    const [companyName, setCompanyName] = React.useState("");
    const navigation = useNavigation();
    
    const handleBack = () => {
        navigation.goBack();
    };
    
    const handleNext = () => {
        if (!companyName.trim()) {
          Alert.alert("Error", "Please enter your company's name");
          return;
        }
        // Save company name to AsyncStorage or pass it along
        navigation.navigate("UploadPitchVideo");
      };

    return (
        <View style={styles.container}>
            <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <Text style={[styles.createAccount, styles.centeredText]}>Create account</Text>
            <Text style={[styles.whatsYourName, styles.centeredText]}>
                What’s your company's name?
            </Text>

            <TextInput
                style={styles.textInput}
                placeholder="Enter your company's name"
                value={companyName}
                onChangeText={(text) => setCompanyName(text)}
            />

            <Pressable style={styles.signupButton} onPress={handleNext}>
                <Text style={styles.signupButtonText}>Next</Text>
            </Pressable>

            <Text style={styles.termsText}>
                {`By tapping "Next", you agree to the Pitch Terms of Use.\n\nTo learn more about how Pitch collects, uses, shares, and protects your personal data, please see the Pitch Privacy Policy.`}
            </Text>
            <Text style={[styles.privacyPolicy, styles.linkText]}>Privacy Policy</Text>
            <Text style={[styles.termsOfUse, styles.linkText]}>Terms of Use</Text>
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
    backButton: {
        position: "absolute",
        left: 20,
        top: 40,
    },
    backButtonText: {
        fontSize: 32,
        color: "#000",
    },
    centeredText: {
        textAlign: "center",
    },
    createAccount: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
        marginBottom: 20,
    },
    whatsYourName: {
        fontSize: 18,
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
        marginBottom: 30,
    },
    signupButton: {
        width: "100%",
        backgroundColor: "#535353",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 20,
    },
    signupButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    termsText: {
        fontSize: 12,
        color: "#000",
        textAlign: "center",
        marginVertical: 10,
    },
    privacyPolicy: {
        color: "#1ed760",
        fontSize: 12,
        textAlign: "center",
        marginBottom: 5,
    },
    termsOfUse: {
        color: "#1ed760",
        fontSize: 12,
        textAlign: "center",
    },
    linkText: {
        fontWeight: "500",
    },
});

export default SetupBusinessProfile;