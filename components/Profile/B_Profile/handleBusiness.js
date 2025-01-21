import * as React from "react";
import { Text, StyleSheet, View, TextInput, Pressable } from "react-native";
import { useNavigation } from '@react-navigation/native';
import field from '../../field';



const Signup = () => {
    const [name, setName] = React.useState("");
    const navigation = useNavigation();
    
    const handleBack = () => {
        navigation.goBack();
    };
    
    const nxtpage = () => {
        navigation.navigate("field");
    };

    return (
        <View style={styles.signup5}>
            <Text style={[styles.createAccount, styles.centeredText]}>Create account</Text>
            <Text style={[styles.whatsYourName, styles.centeredText]}>What’s your Company's name?</Text>

            <TextInput
                style={styles.textInput}
                placeholder="Enter your Company's name"
                value={name}
                onChangeText={(text) => setName(text)}
            />

            <Pressable style={styles.signupButton} onPress={nxtpage}>
                <Text style={styles.signupButtonText}>Create an account</Text>
            </Pressable>

            {/* <Image source={require("../assets/create-watch-face.png")} style={styles.imageIcon} /> */}
            {/* <Image source={require("../assets/line-1.png")} style={styles.imageIconLine} /> */}

            <Text style={styles.byTappingOn}>
                {`By tapping on “Create account”, you agree to the Pitch Terms of Use.\n\nTo learn more about how Pitch collects, uses, shares, and protects your personal data, please see the Pitch Privacy Policy.`}
            </Text>
            <Text style={[styles.privacyPolicy, styles.termsText]}>Privacy Policy</Text>
            <Text style={[styles.termsOfUse, styles.termsText]}>Terms of Use</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    signup5: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
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
    imageIcon: {
        width: 100,
        height: 100,
        resizeMode: "contain",
        marginBottom: 20,
    },
    imageIconLine: {
        width: "100%",
        height: 2,
        backgroundColor: "#ccc",
        marginBottom: 20,
    },
    byTappingOn: {
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
    termsText: {
        fontWeight: "500",
    },
});

export default Signup;
