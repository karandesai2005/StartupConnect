import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const CustomModal = ({
  visible = false,
  onClose,
  children,
  title,
  // Customization props
  animationType = 'slide',
  backgroundColor = 'white',
  modalHeight = SCREEN_HEIGHT * 0.7,
  headerStyle = {},
  headerTextStyle = {},
  closeButtonStyle = {},
  closeButtonTextStyle = {},
  contentContainerStyle = {},
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  closeButtonText = 'Close',
  showHeader = true,
  position = 'bottom', // 'bottom', 'center', 'top'
  swipeToClose = true,
  closeOnOverlayPress = true,
  borderRadius = 20,
}) => {
  const [slideAnim] = React.useState(new Animated.Value(0));
  const panResponder = React.useRef(null);
  const startY = React.useRef(0);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [visible]);

  React.useEffect(() => {
    if (swipeToClose) {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: (_, gestureState) => {
          startY.current = gestureState.y0;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 50) {
            onClose();
          }
        },
      });
    }
  }, [swipeToClose, onClose]);

  const getModalPosition = () => {
    switch (position) {
      case 'top':
        return { top: 0, bottom: undefined };
      case 'center':
        return { top: '50%', transform: [{ translateY: -modalHeight / 2 }] };
      default:
        return { bottom: 0 };
    }
  };

  const modalStyle = {
    ...getModalPosition(),
    backgroundColor,
    borderTopLeftRadius: borderRadius,
    borderTopRightRadius: borderRadius,
    height: modalHeight,
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [modalHeight, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: overlayColor }]}
          activeOpacity={1}
          onPress={closeOnOverlayPress ? onClose : null}
        />
        <Animated.View
          style={[
            styles.modalContent,
            modalStyle,
            { transform: [{ translateY }] },
            contentContainerStyle,
          ]}
          {...(swipeToClose ? panResponder.current?.panHandlers : {})}
        >
          {showHeader && (
            <View style={[styles.header, headerStyle]}>
              <Text style={[styles.headerText, headerTextStyle]}>{title}</Text>
              <TouchableOpacity
                style={[styles.closeButton, closeButtonStyle]}
                onPress={onClose}
              >
                <Text style={[styles.closeButtonText, closeButtonTextStyle]}>
                  {closeButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {children}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});

export default CustomModal;