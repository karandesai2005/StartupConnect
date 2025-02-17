import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
const Card = ({ 
  title, 
  subtitle, 
  children, 
  onPress, 
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {title && (
        <Text style={[styles.title, titleStyle]}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, subtitleStyle]}>
          {subtitle}
        </Text>
      )}
      {children}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    width: "99%",
    borderRadius: 12,
    padding: 1,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
});

export default Card;