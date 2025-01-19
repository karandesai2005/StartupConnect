import * as React from "react";
import {Text, StyleSheet, Image, View, Pressable} from "react-native";
import Chevronleft from "../assets/chevronleft.svg"

const SIgnup = () => {
  	
  	return (
    		<View style={styles.signup1}>
      			<Text style={[styles.createAccount, styles.createAccountTypo]}>Create account</Text>
      			<Text style={[styles.whatsYourEmail, styles.signup1ChildPosition]}>What’s your email?</Text>
        				<Text style={[styles.youllNeedTo, styles.nextTypo]}>You’ll need to confirm this email later.</Text>
        				<Chevronleft style={styles.chevronleftIcon} width={32} height={32} />
        				<Pressable style={[styles.signup1Child, styles.signup1ChildPosition]} onPress={()=>{}} />
        				<View style={styles.signup1Item} />
        				<Text style={[styles.next, styles.nextTypo]}>Next</Text>
        				</View>);
      			};
      			
      			const styles = StyleSheet.create({
        				createAccountTypo: {
          					textAlign: "center",
          					fontFamily: "Avenir Next Cyr",
          					fontWeight: "700"
        				},
        				signup1ChildPosition: {
          					left: 35,
          					position: "absolute"
        				},
        				nextTypo: {
          					fontFamily: "Avenir Next",
          					textAlign: "center",
          					position: "absolute"
        				},
        				createAccount: {
          					top: 94,
          					left: 142,
          					fontSize: 16,
          					color: "#0a0a0a",
          					width: 152,
          					height: 20,
          					position: "absolute"
        				},
        				whatsYourEmail: {
          					top: 143,
          					fontSize: 20,
          					color: "#000",
          					width: 190,
          					height: 27,
          					textAlign: "center",
          					fontFamily: "Avenir Next Cyr",
          					fontWeight: "700"
        				},
        				youllNeedTo: {
          					top: 229,
          					left: 30,
          					fontSize: 8,
          					color: "#040404",
          					width: 150,
          					height: 11
        				},
        				chevronleftIcon: {
          					top: 86,
          					left: 28,
          					position: "absolute"
        				},
        				signup1Child: {
          					top: 170,
          					borderRadius: 5,
          					backgroundColor: "#b7b7b7",
          					width: 365,
          					height: 51
        				},
        				signup1Item: {
          					top: 283,
          					left: 172,
          					borderRadius: 21,
          					backgroundColor: "#535353",
          					width: 82,
          					height: 42,
          					position: "absolute"
        				},
        				next: {
          					top: 294,
          					left: 193,
          					fontSize: 15,
          					color: "#fff",
          					width: 43,
          					height: 18
        				},
        				signup1: {
          					backgroundColor: "#fff",
          					flex: 1,
          					width: "100%",
          					height: 956,
          					overflow: "hidden"
        				}
      			});
      			
      			export default SIgnup;
      			