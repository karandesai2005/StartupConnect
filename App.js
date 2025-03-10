import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { UserRegistrationProvider } from './context/UserRegistrationContext';
import { ThemeProvider } from './components/ThemeContext'; // Adjust the path based on your file structure

// Import components
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/Home';
import ChatScreen from './components/Chat';
import Register1 from './components/Register1';
import Register2 from './components/Register2';
import Profile from './components/Profile/P_Profile/Profile';
import EditProfilePage from './components/Profile/P_Profile/EditProfilePage';
import ReelsScreen from './components/Reel';
import Username from './components/username';
import Preference from './components/preference';
import HandlePersonal from './components/Profile/P_Profile/handlePersonal';
import HandleBusiness from './components/Profile/B_Profile/handleBusiness';
import EditProfileB from './components/Profile/B_Profile/editProfile';
import Field from './components/field';
import Popup from './components/Popup';
import CreatePostScreen from './components/CreatePostScreen';
import PostViewScreen from './components/Profile/P_Profile/PostViewScreen';
import SettingsScreen from './components/settings';
import Events from './components/Events';
import BottomNav from './components/BottamNav';
// import SelectTagsScreen from './components/Tagscreen';
// import EventDetail from './components/EventDetail';
const Stack = createStackNavigator();

const App = () => {
  const accountType = 'business';

  return (
    <ThemeProvider> {/* Wrap everything with ThemeProvider */}
      <UserRegistrationProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: 'white' }, // This will be overridden by theme later
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Register1" component={Register1} />
            <Stack.Screen name="Register2" component={Register2} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="EditProfileB" component={EditProfileB} />
            <Stack.Screen name="username" component={Username} />
            <Stack.Screen name="preference" component={Preference} />
            <Stack.Screen name="handlePersonal" component={HandlePersonal} />
            <Stack.Screen name="handleBusiness" component={HandleBusiness} />
            <Stack.Screen name="field" component={Field} />
            <Stack.Screen name="PopUp" component={Popup} />
            <Stack.Screen name="EditProfilePage" component={EditProfilePage} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostView" component={PostViewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Events" component={Events} />
            <Stack.Screen name="BottomNav" component={BottomNav} />
            {/* <Stack.Screen name="SelectTags" component={SelectTagsScreen} /> */}
            {/* <Stack.Screen name="EventDetails" component={EventDetail} options={{ title: 'Event Details' }} /> */}
          </Stack.Navigator>
        </NavigationContainer>
      </UserRegistrationProvider>
    </ThemeProvider>
  );
};

export default App;