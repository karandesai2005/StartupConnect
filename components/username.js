import * as React from "react";
import { Text, StyleSheet, View, Pressable, Image, TouchableOpacity, TextInput } from "react-native";
import { useNavigation } from '@react-navigation/native';

const Signup = () => {
    const navigation = useNavigation();
    const [username, setUsername] = React.useState('');
    
    const handleBack = () => {
        navigation.goBack();
    };    

    const handleNext = () => {
        navigation.navigate('preference');  // Navigate to next register screen
            
    };

    return (
        <View style={styles.signup3}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.createAccount}>Create account</Text>
                <Text style={styles.whatsDoYou}>What's do you wish for Username?</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your username"
                        placeholderTextColor="#666"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <View style={styles.buttonContainer}>
                    <Pressable style={styles.signup3Item} onPress={handleNext}>
                        <Text style={styles.next}>Next</Text>
                    </Pressable>
                </View>
                <Image 
                    source={require("../assets/tick.png")}
                    style={styles.createWatchFace}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    signup3: {
        backgroundColor: "#fff",
        flex: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    backButton: {
        position: 'absolute',
        left: 28,
        top: 86,
        zIndex: 1,
    },
    backButtonText: {
        fontSize: 32,
        color: '#000',
    },
    createAccount: {
        fontSize: 16,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
        marginTop: 50,
    },
    whatsDoYou: {
        fontSize: 20,
        color: "#000",
        fontFamily: "Avenir Next Cyr",
        fontWeight: "700",
        textAlign: "center",
        marginTop: 20,
        maxWidth: 355,
    },
    inputContainer: {
        width: '100%',
        marginTop: 20,
    },
    input: {
        backgroundColor: "#b7b7b7",
        borderRadius: 5,
        width: '100%',
        height: 51,
        paddingHorizontal: 15,
        fontSize: 16,
        color: "#000",
    },
    buttonContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    signup3Item: {
        borderRadius: 21,
        backgroundColor: "#535353",
        width: 82,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    next: {
        fontSize: 15,
        fontFamily: "Avenir Next",
        color: "#fff",
    },
    createWatchFace: {
        width: 20,
        height: 20,
        marginTop: 20,
        resizeMode: 'contain',
    },
    chevronleftIcon: {
        width: 32,
        height: 32,
        position: 'absolute',
        left: 0,
        top: 40,
    },
});

export default Signup;