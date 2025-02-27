import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({ children, onPress, style, title, titleStyle }) => {
  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      {title && (
        <View style={styles.titleContainer}>
          <Text style={[styles.titleText, titleStyle]}>{title}</Text>
        </View>
      )}
      <View style={[styles.cardContent, !title && styles.cardContentNoTitle]}>
        {children}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 0,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    // Removed shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
    overflow: 'hidden',
  },
  titleContainer: {
    paddingVertical: 2,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: 'lightgrey',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  cardContent: {
    flex: 1,
    padding: 1,
  },
  cardContentNoTitle: {
    paddingTop: 15,
  }
});

export default Card;