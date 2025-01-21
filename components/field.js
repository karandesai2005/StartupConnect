import React from "react";
import { Text, StyleSheet, View, Pressable} from "react-native";


const fields = [
  { label: "Technology", top: 223 },
  { label: "Technology", top: 289 },
  { label: "Technology", top: 353 },
  { label: "Technology", top: 419 },
  { label: "Technology", top: 484 },
  { label: "Technology", top: 550 },
  { label: "Technology", top: 614 },
  { label: "Technology", top: 680 },
  { label: "Technology", top: 744 },
  { label: "Technology", top: 810 },
  { label: "Technology", top: 874 },
];

const Signup = () => {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Choose 3 or more fields you like.</Text>

      {/* Search Container */}
      {/* <View style={styles.searchContainer}>
        <Search style={styles.searchIcon} />
        <Text style={styles.searchText}>Search</Text>
      </View> */}

      {/* Chevron Icon */}
      {/* <Chevronleft style={styles.chevronIcon} /> */}

      {/* Fields List */}
      {fields.map((field, index) => (
        <View
          key={index}
          style={[
            styles.fieldContainer,
            { top: field.top }, // Ensure `top` is applied as part of the style
          ]}
        >
          <Text style={styles.fieldText}>{field.label}</Text>
        </View>
      ))}
        <Pressable style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    marginTop: 67,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Avenir Next Cyr",
    color: "#000",
  },
  searchContainer: {
    position: "absolute",
    top: 114,
    left: 31,
    width: 369,
    height: 42,
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  chevronIcon: {
    position: "absolute",
    top: 61,
    left: 24,
  },
  fieldContainer: {
    position: "absolute",
    left: 39,
    height: 46,
    width: 112,
    backgroundColor: "#d9d9d9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldText: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Avenir Next Cyr",
    color: "#000",
  },
  nextButton: {
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 140,
    },
    nextButtonText: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "Avenir Next",
    },
});

export default Signup;
