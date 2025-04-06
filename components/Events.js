import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
const eventsData = [
  {
    id: '1',
    title: 'IDEATHON',
    description: 'Unleash your creativity in a marathon of bold ideas and groundbreaking solutions.',
    imageUrl: require('../assets/ideathon.webp'),
  },
  {
    id: '2',
    title: 'PITCH2025',
    description: 'Step into a high-stakes showdown where your vision meets future opportunities.',
    imageUrl: require('../assets/startup-pitch.webp'),
  },
  {
    id: '3',
    title: 'STARTMEUP',
    description: 'Ignite your journey with energy, collaboration, and a kickstart to success.',
    imageUrl: require('../assets/startmeup.jpeg'),
  },
  {
    id: '4',
    title: 'CO-FOUNDER STORY',
    description: 'Discover tales of partnership, grit, and triumph from co-founder duos.',
    imageUrl: require('../assets/cofounderstory.png.png'),
  },
  {
    id: '5',
    title: 'BEST MVP',
    description: 'Celebrate lean ideas that prove their maximum potential with minimal brilliance.',
    imageUrl: require('../assets/MVP.jpeg'),
  },
  {
    id: '6',
    title: 'WANNA GET FUNDED',
    description: 'Unlock the cash flow to fuel your dreams—opportunity is calling.',
    imageUrl: require('../assets/wannagetfunded.webp'),
  },
];

const EventItem = ({ event, onPress, isLast }) => {
  return (
    <View style={styles.eventContainer}>
      <TouchableOpacity
        style={[styles.eventItem, Platform.OS === 'android' && styles.eventItemAndroid]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image
          source={event.imageUrl}
          style={[styles.eventIcon, Platform.OS === 'android' && styles.eventIconAndroid]}
          resizeMode="cover"
        />
        <View style={styles.eventDetails}>
          <Text style={[styles.eventTitle, Platform.OS === 'android' && styles.eventTitleAndroid]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.eventDescription, Platform.OS === 'android' && styles.eventDescriptionAndroid]} numberOfLines={2}>
            {event.description}
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
};

const Events = () => {
  const navigation = useNavigation();

  const handleEventPress = (event) => {
    navigation.navigate('EventDetails', { event });
  };

  const renderItem = ({ item, index }) => (
    <EventItem
      event={item}
      onPress={() => handleEventPress(item)}
      isLast={index === eventsData.length - 1}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
      </View>
      <FlatList
        data={eventsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'AvenirNextCyr',
  },
  listContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  eventContainer: {
    width: '100%',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  eventItemAndroid: {
    paddingVertical: 10,
  },
  eventIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  eventIconAndroid: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 15,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'AvenirNextCyr',
  },
  eventTitleAndroid: {
    fontSize: 14,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AvenirNextCyr',
    marginTop: 4,
    lineHeight: 18,
  },
  eventDescriptionAndroid: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
});

export default Events;