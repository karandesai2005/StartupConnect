import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/Home';
import ProfileScreen from './components/profile';
import ChatScreen from './components/Chat';
import Register1 from "./components/Register1"; // Import Register1
import Register2 from "./components/Register2"; // Import Register1
import EditProfileP from './components/editProfileP';




const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen}/>
        <Stack.Screen name="Chat" component={ChatScreen}/>
        <Stack.Screen name="Register1" component={Register1}/>
        <Stack.Screen name="Register2" component={Register2}/>
        <Stack.Screen name="EditProfileP" component={EditProfileP}/>

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

