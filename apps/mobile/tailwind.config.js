module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        ink: "#171717",
        muted: "#737373",
        line: "#E5E5E5",
        accent: "#234E49",
        wash: "#EDF2EE",
      },
    },
  },
  plugins: [],
};
