import { Platform } from "react-native";
export const colors = {
  paper: "#FAFAF8",
  white: "#FFFFFF",
  ink: "#171717",
  muted: "#737373",
  line: "#E5E5E5",
  accent: "#234E49",
  wash: "#EDF2EE",
  error: "#A23832",
};
export const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  web: 'Georgia, "Times New Roman", serif',
});
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
