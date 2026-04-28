import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      colors: {
        // STEPI 톤: 짙은 네이비 + 절제된 바이올렛 액센트
        navy: {
          50: "#f4f5f9",
          100: "#e7e9f1",
          200: "#c8cce0",
          300: "#9aa1c2",
          400: "#646e9c",
          500: "#3d4673",
          600: "#2a335e",
          700: "#1f2654",
          800: "#171c44",
          900: "#101535",
          950: "#0a0e25",
        },
        accent: {
          50: "#f4f1ff",
          100: "#ebe6ff",
          200: "#d6caff",
          300: "#b8a4ff",
          400: "#9778ff",
          500: "#7b54f5",
          600: "#6a42e8",
          700: "#5832c8",
          800: "#482aa3",
          900: "#3c2683",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
