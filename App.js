import React, { useEffect, useState } from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createStackNavigator } from '@react-navigation/stack';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
  import HandlePersonal from './components/Profile/P_Profile/handlePersonal';
  import HandleBusiness from './components/Profile/B_Profile/handleBusiness';
  import { supabase } from './services/supabase';
  import AsyncStorage from '@react-native-async-storage/async-storage';

  const Stack = createStackNavigator();

  const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Splash');

    useEffect(() => {
      const checkAuthStatus = async () => {
        try {
          console.log('App.js: Checking auth status');
          const storedToken = await AsyncStorage.getItem('token');
          console.log('App.js: Stored token:', storedToken ? 'Found' : 'Not found');

          if (storedToken) {
            const { data: { session }, error } = await supabase.auth.setSession({ access_token: storedToken });
            if (error || !session) {
              console.error('App.js: Session restore error:', error?.message);
              await AsyncStorage.removeItem('token');
              setInitialRoute('Login');
            } else {
              console.log('App.js: Session restored:', session.user.email);
              await AsyncStorage.setItem('token', session.access_token); // Update token
              setInitialRoute('Main');
            }
          } else {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
              console.error('App.js: Get session error:', error.message);
            }
            setInitialRoute(session ? 'Main' : 'Login');
          }
        } catch (error) {
          console.error('App.js: Error checking auth status:', error);
          setInitialRoute('Login');
        } finally {
          setIsLoading(false);
        }
      };

      checkAuthStatus();

      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('App.js: Auth event:', event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            await AsyncStorage.setItem('token', session.access_token);
            console.log('App.js: Token saved:', session.user.email);
            setInitialRoute('Main');
          }
        } else if (event === 'SIGNED_OUT') {
          await AsyncStorage.removeItem('token');
          console.log('App.js: User signed out');
          setInitialRoute('Login');
        }
      });

      return () => {
        authListener.subscription?.unsubscribe();
      };
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
            >
              <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                  headerShown: false,
                  cardStyle: { backgroundColor: 'white' },
                  transitionSpec: {
                    open: { animation: 'timing', config: { duration: 200 } },
                    close: { animation: 'timing', config: { duration: 200 } },
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
                <Stack.Screen name="handlePersonal" component={HandlePersonal} />
                <Stack.Screen name="handleBusiness" component={HandleBusiness} />
              </Stack.Navigator>
            </NavigationContainer>
          </UserRegistrationProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  };

  export default App;