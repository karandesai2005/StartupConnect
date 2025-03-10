import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Bottomnav = ()=>{
    const navigation = useNavigation(); 
    return(
        <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                <Image source={require('../assets/film.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('CreatePost')}>
                <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Reel')}>
                <Image source={require('../assets/bell.png')} style={styles.navIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
                <Image source={require('../assets/settings.png')} style={styles.navIcon} />
                </TouchableOpacity>
        </View>
    );
};
const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        paddingHorizontal: 20,
        borderTopWidth: 0.5,
        borderTopColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        height: Platform.OS === 'ios' ? 80 : 60,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      },
      navIcon: {
        width: 22,
        height: 22,
        marginBottom: Platform.OS === 'ios' ? 3 : 0,
      },
      
});
export default Bottomnav;