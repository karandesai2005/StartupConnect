import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRegistrationProvider } from './context/UserRegistrationContext';
import { ThemeProvider } from './components/ThemeContext';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import Bottomnav from './components/Bottomnav';
import SearchScreen from './components/SearchScreen';
import ChatScreen from './components/Chat';
import Register1 from './components/Register1';
import Register2 from './components/Register2';
import Profile from './components/Profile/P_Profile/Profile';
import BusinessProfile from './components/Profile/B_Profile/BusinessProfile';
import EditProfilePage from './components/Profile/P_Profile/EditProfilePage';
import Username from './components/username';
import Preference from './components/preference';
import Field from './components/field';
import Popup from './components/Popup';
import CreatePostScreen from './components/CreatePostScreen';
import PostViewScreen from './components/PostViewScreen';
import Settings from './components/settings';
import Events from './components/Events';
import AddStory from './components/Profile/P_Profile/AddStory';
import SelectTagsScreen from './components/Tagscreen';
import ViewStory from './components/Profile/P_Profile/ViewStory';
import EventDetails from './components/EventDetail';
import ReelScreen from './components/Reels';
import PostItem from './components/PostItem';

const Stack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountType, setAccountType] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userDataStr = await AsyncStorage.getItem('userData');
        console.log('App.js: Checking token:', token ? 'Token found' : 'No token');
        if (token && userDataStr) {
          const userData = JSON.parse(userDataStr);
          setAccountType(userData?.account_type || 'personal');
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('App.js: Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <UserRegistrationProvider>
          <NavigationContainer
            onStateChange={(state) => console.log('Navigation state:', JSON.stringify(state, null, 2))}
            onUnhandledAction={(action) => console.error('Unhandled navigation:', JSON.stringify(action, null, 2))}
          >
            <Stack.Navigator
              initialRouteName={isLoggedIn ? 'Main' : 'Splash'}
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: 'white' },
                transitionSpec: {
                  open: { animation: 'timing', config: { duration: 300 } },
                  close: { animation: 'timing', config: { duration: 300 } },
                },
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: { opacity: current.progress },
                }),
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={Bottomnav} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Register1" component={Register1} />
              <Stack.Screen name="Register2" component={Register2} />
              <Stack.Screen name="Profile" component={Profile} options={{ animation: 'fade' }} />
              <Stack.Screen name="BusinessProfile" component={BusinessProfile} options={{ animation: 'fade' }} />
              <Stack.Screen name="username" component={Username} />
              <Stack.Screen name="preference" component={Preference} />
              <Stack.Screen name="field" component={Field} />
              <Stack.Screen name="PopUp" component={Popup} />
              <Stack.Screen name="EditProfilePage" component={EditProfilePage} />
              <Stack.Screen name="CreatePost" component={CreatePostScreen} />
              <Stack.Screen name="PostView" component={PostViewScreen} />
              <Stack.Screen name="Settings" component={Settings} />
              <Stack.Screen name="Events" component={Events} />
              <Stack.Screen name="AddStory" component={AddStory} />
              <Stack.Screen name="SelectTags" component={SelectTagsScreen} />
              <Stack.Screen name="ViewStory" component={ViewStory} options={{ headerShown: false }} />
              <Stack.Screen name="EventDetails" component={EventDetails} />
              <Stack.Screen name="ReelScreen" component={ReelScreen} options={{ headerShown: false }} />
              <Stack.Screen name="PostItem" component={PostItem} />
            </Stack.Navigator>
          </NavigationContainer>
        </UserRegistrationProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;