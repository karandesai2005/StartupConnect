import * as React from "react";
import { StyleSheet, View, Text,Leading } from "react-native";
import Edit from "../../../assets/edit.svg";


const EditProfile = () => {
  return (
    <View style={styles.editProfile}>
      <View style={styles.editProfile1}>
        <View style={styles.avatarMultiVariants}>
          <View style={styles.masterAvatar} />
        </View>
        <View style={styles.icon}>
          <Edit style={styles.iconLayout} width={24} height={24} />
        </View>
      </View>
      <View style={styles.form}>
        <View style={styles.textFieldBoxRoundedLg}>
          <View style={styles.masterBoxStyle}>
            <View style={styles.textfield}>
              <View style={[styles.content, styles.contentFlexBox]}>
                <Leading style={styles.leadingIcon} width={22} height={22} />
                <View style={styles.content1}>
                  <Text style={[styles.filled, styles.filledClr]}>Pitch</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.masterBoxStyle1}>
          <View style={styles.textfield}>
            <View style={[styles.content, styles.contentFlexBox]}>
              <Personoutline style={styles.leadingIcon} width={22} height={22} />
              <View style={styles.content1}>
                <Text style={[styles.filled, styles.filledClr]}>
                  X be the person
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.textFieldBoxRoundedLg}>
          <View style={styles.masterBoxStyle}>
            <View style={[styles.textfield2, styles.textfieldBorder]}>
              <View style={[styles.content, styles.contentFlexBox]}>
                <Email style={styles.leadingIcon} width={22} height={22} />
                <View style={styles.content1}>
                  <Text style={[styles.filled, styles.filledClr]}>
                    support@pitch.com
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.phoneNumber}>
          <View style={styles.selectDropdown}>
            <View style={styles.masterBoxStyle}>
              <View style={[styles.textfield3, styles.textfieldBorder]}>
                <View style={styles.content1}>
                  <Text style={[styles.filled, styles.filledClr]}>
                    +91 (IND)
                  </Text>
                </View>
                <Trailing style={styles.leadingIcon} width={22} height={22} />
              </View>
            </View>
          </View>
          <View style={styles.content1}>
            <View style={styles.masterBoxStyle}>
              <View style={[styles.textfield2, styles.textfieldBorder]}>
                <View style={[styles.content7, styles.contentFlexBox]}>
                  <View style={styles.content1}>
                    <Text style={[styles.filled, styles.filledClr]}>
                      7894561230
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      <Text style={[styles.editProfile2, styles.filledClr]}>Edit Profile</Text>
      <View style={[styles.left, styles.contentFlexBox]}>
        <Licon1 style={styles.iconLayout} width={24} height={24} />
        <View style={[styles.lIcon2, styles.iconLayout]} />
        <Text style={[styles.label, styles.labelTypo]}>Label</Text>
      </View>
    </View>
  );
};



const FontFamily = {
  bodyDefault: "Nunito-Regular",
  headingH3: "Nunito-Bold",
};

const FontSize = {
  bodyDefault_size: 16,
  headingH3_size: 18,
};

const Color = {
  bgColorLight: "#fff",
  textColorDefault: "#1c1c1c",
  textColorDefault1: "#0b0b0b",
  strokeColorLightGrey: "#e7e7e7",
  bgColorLightPrimary: "#e8f2fe",
  bgColorPrimary: "#1779f3",
};

const StyleVariable = {
  spacingXs: 6,
  spacingSmd: 12,
  spacingSmd1: 12,
  spacingXxxs: 2,
  spacingSmd2: 12,
  spacingMd: 16,
  radiMlg: 8,
  spacingSm: 8,
  spacingSm1: 8,
  radiMlg1: 8,
  spacingSm2: 8,
  spacingXxs: 4,
  radiLg: 12,
};

const Gap = {
  gap_sm: 8,
  gap_md: 12,
};

const Padding = {
  p_xs: 12,
  p_base: 16,
};

const Border = {
  br_5xs: 8,
};

const styles = StyleSheet.create({
  	contentFlexBox: {
    		alignItems: "center",
    		flexDirection: "row"
  	},
  	filledClr: {
    		color: Color.textColorDefault1,
    		textAlign: "left"
  	},
  	textfieldBorder: {
    		borderColor: Color.strokeColorLightGrey,
    		paddingVertical: StyleVariable.spacingMd,
    		paddingHorizontal: StyleVariable.spacingSmd2,
    		alignItems: "center",
    		borderWidth: 1,
    		borderStyle: "solid",
    		alignSelf: "stretch",
    		flexDirection: "row",
    		backgroundColor: Color.bgColorLight
  	},
  	iconLayout: {
    		overflow: "hidden"
  	},
  	labelTypo: {
    		fontFamily: FontFamily.bodyDefault,
    		lineHeight: 22,
    		fontSize: FontSize.bodyDefault_size
  	},
  	masterAvatar: {
    		height: "100%",
    		top: "0%",
    		right: "0%",
    		bottom: "0%",
    		left: "0%",
    		borderRadius: 15,
    		backgroundColor: Color.bgColorLightPrimary,
    		position: "absolute",
    		overflow: "hidden",
    		width: "100%"
  	},
  	avatarMultiVariants: {
    		height: 128,
    		zIndex: 0,
    		width: 128
  	},
  	icon: {
    		top: 96,
    		left: 86,
    		borderRadius: StyleVariable.radiLg,
    		backgroundColor: Color.bgColorPrimary,
    		padding: StyleVariable.spacingXxs,
    		zIndex: 1,
    		flexDirection: "row",
    		position: "absolute"
  	},
  	editProfile1: {
    		marginLeft: -85,
    		top: 143,
    		left: "50%",
    		width: 150,
    		height: 149,
    		gap: 10,
    		flexDirection: "row",
    		position: "absolute"
  	},
  	leadingIcon: {
    		overflow: "hidden"
  	},
  	filled: {
    		textAlign: "left",
    		fontFamily: FontFamily.bodyDefault,
    		lineHeight: 22,
    		fontSize: FontSize.bodyDefault_size,
    		alignSelf: "stretch"
  	},
  	content1: {
    		flex: 1
  	},
  	content: {
    		gap: StyleVariable.spacingSm,
    		flex: 1
  	},
  	textfield: {
    		borderColor: Color.bgColorPrimary,
    		paddingVertical: StyleVariable.spacingMd,
    		paddingHorizontal: StyleVariable.spacingSmd2,
    		borderWidth: 1,
    		alignItems: "center",
    		borderStyle: "solid",
    		borderRadius: StyleVariable.radiMlg,
    		alignSelf: "stretch",
    		backgroundColor: Color.bgColorLightPrimary,
    		flexDirection: "row"
  	},
  	masterBoxStyle: {
    		alignSelf: "stretch",
    		overflow: "hidden"
  	},
  	textFieldBoxRoundedLg: {
    		width: 343
  	},
  	masterBoxStyle1: {
    		width: 343,
    		overflow: "hidden"
  	},
  	textfield2: {
    		borderRadius: StyleVariable.radiMlg,
    		borderColor: Color.strokeColorLightGrey
  	},
  	textfield3: {
    		borderRadius: StyleVariable.radiMlg1,
    		gap: StyleVariable.spacingSm1
  	},
  	selectDropdown: {
    		width: 128
  	},
  	content7: {
    		flex: 1
  	},
  	phoneNumber: {
    		gap: StyleVariable.spacingSmd1,
    		width: 343,
    		flexDirection: "row"
  	},
  	form: {
    		top: 310,
    		left: 35,
    		width: 379,
    		height: 364,
    		gap: StyleVariable.spacingSmd,
    		position: "absolute"
  	},
  	editProfile2: {
    		top: 88,
    		left: 77,
    		fontSize: FontSize.headingH3_size,
    		letterSpacing: 0,
    		lineHeight: 26,
    		fontWeight: "700",
    		fontFamily: FontFamily.headingH3,
    		width: 103,
    		height: 37,
    		textAlign: "left",
    		position: "absolute"
  	},
  	lIcon2: {
    		display: "none"
  	},
  	label: {
    		color: Color.textColorDefault,
    		display: "none",
    		textAlign: "left"
  	},
  	left: {
    		marginTop: -392,
    		top: "50%",
    		left: 40,
    		borderRadius: 5,
    		borderColor: "#000",
    		borderWidth: 2,
    		gap: StyleVariable.spacingXs,
    		borderStyle: "solid",
    		alignItems: "center",
    		position: "absolute"
  	},
  	editProfile: {
    		height: 956,
    		overflow: "hidden",
    		width: "100%",
    		backgroundColor: Color.bgColorLight,
    		flex: 1
  	}
});

export default EditProfile;
