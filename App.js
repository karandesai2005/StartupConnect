import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import HandlePersonal from './components/Profile/P_Profile/handlePersonal';
import HandleBusiness from './components/Profile/B_Profile/handleBusiness';
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
import ReelScreen from './components/Reels'; // Import the ReelScreen component
import PostItem from './components/PostItem';
const Stack = createStackNavigator();

const App = () => {
  return (
    <ThemeProvider>
      <UserRegistrationProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: 'white' },
              transitionSpec: {
                open: {
                  animation: 'timing',
                  config: { duration: 0 },
                },
                close: {
                  animation: 'timing',
                  config: { duration: 0 },
                },
              },
              cardStyleInterpolator: ({ current }) => ({
                cardStyle: {
                  opacity: current.progress,
                },
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
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="username" component={Username} />
            <Stack.Screen name="preference" component={Preference} />
            <Stack.Screen name="handlePersonal" component={HandlePersonal} />
            <Stack.Screen name="handleBusiness" component={HandleBusiness} />
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
            <Stack.Screen name="BusinessProfile" component={BusinessProfile} />
            <Stack.Screen name="ReelScreen" component={ReelScreen} options={{ headerShown: false }} />
            <Stack.Screen name='PostItem' component={PostItem}/>
          </Stack.Navigator>
        </NavigationContainer>
      </UserRegistrationProvider>
    </ThemeProvider>
  );
};

export default App;