import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from '../components/Home';
import CreatePostScreen from '../components/CreatePostScreen';
import Events from '../components/Events';
import Settings from '../components/settings';

const Tab = createBottomTabNavigator();

export default function Bottomnav() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconSource;
          if (route.name === 'Home') {
            iconSource = require('../assets/home4.webp');
          } else if (route.name === 'CreatePost') {
            iconSource = require('../assets/plus3.png');
          } else if (route.name === 'Events') {
            iconSource = require('../assets/event.png');
          } else if (route.name === 'Settings') {
            iconSource = require('../assets/settings.png');
          }
          return (
            <Image
              source={iconSource}
              style={{
                width: route.name === 'Events' ? 25 : 22,
                height: route.name === 'Events' ? 25 : 22,
                tintColor: focused ? '#1f219c' : 'black',
              }}
            />
          );
        },
        tabBarStyle: {
          paddingVertical: Platform.OS === 'ios' ? 12 : 10,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : insets.bottom + 8,
          paddingHorizontal: 20,
          borderTopWidth: 0.5,
          borderTopColor: '#E0E0E0',
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 80 + insets.bottom : 60 + insets.bottom,
          zIndex: 10,
          paddingTop: 15,
        },
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="CreatePost" component={CreatePostScreen} />
      <Tab.Screen name="Events" component={Events} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}