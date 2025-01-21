import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/Home';
//import ProfileScreenB from './components/Profile/B_Profile/profile';
import ProfileScreenP from './components/Profile/P_Profile/profile';
import ChatScreen from './components/Chat';
import Register1 from "./components/Register1"; 
import Register2 from "./components/Register2"; 
import EditProfileP from './components/Profile/P_Profile/editProfileP';
//import EditProfileB from './components/Profile/B_Profile/editProfile';
import Username from './components/username';
import Preference from './components/preference';
import handlePersonal from './components/Profile/P_Profile/handlePersonal';
import handleBusiness from './components/Profile/B_Profile/handleBusiness';
import field from './components/field';


const Stack = createStackNavigator();

const App = () => {
  const accountType = 'business'; 

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen}/>
        <Stack.Screen name="Register1" component={Register1}/>
        <Stack.Screen name="Register2" component={Register2}/>
        <Stack.Screen name="ProfileP" component={ProfileScreenP} />
        <Stack.Screen name="EditProfileP" component={EditProfileP}/>
        <Stack.Screen name="username" component={Username}/>
        <Stack.Screen name="preference" component={Preference}/>
        <Stack.Screen name="handlePersonal" component={handlePersonal}/>
        <Stack.Screen name="handleBusiness" component={handleBusiness}/>
        <Stack.Screen name="field" component={field}/>



        
        {/* {accountType === 'business' ? (
          <React.Fragment>
            <Stack.Screen name="Profile" component={ProfileScreenB} />
            <Stack.Screen name="EditProfileB" component={EditProfileB} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Stack.Screen name="Profile" component={ProfileScreenP} />
            <Stack.Screen name="EditProfileP" component={EditProfileP}/>
          </React.Fragment>
        )} */}
        
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
