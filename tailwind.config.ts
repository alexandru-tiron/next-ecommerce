import type { Config } from "tailwindcss";

export default {
   content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/admin/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}", "*.{js,ts,jsx,tsx}"],
   theme: {
      screens: {
         sm: "375px",
         md: "768px",
         lg: "1200px",
         xl: "1400px",
      },
      container: {
         center: true,
         padding: {
            DEFAULT: "1rem",
            md: "2rem",
         },
      },
      extend: {
         fontFamily: {
            sans: "var(--font-sans)",
            serif: "var(--font-serif)",
         },
         animation: {
            "ping-large": "ping-large 1s ease-in-out infinite",
            "move-left": "move-left 1s linear infinite",
            "move-right": "move-right 1s linear infinite",
            "open-menu": "open-menu 0.2s linear ",
            "close-menu": "close-menu 0.2s linear ",
            "open-menu-md": "open-menu-md 0.2s linear ",
            "close-menu-md": "close-menu-md 0.2s linear ",
            rotator: "rotator 1.4s linear infinite",
            bounce: "bounce 0.8s linear ",
            "outline-flash": "outline-flash 0.7s ease-in-out 2",
         },
         keyframes: {
            "ping-large": { "75%, 100%": { transform: "scale(3)", opacity: "0" } },
            "move-left": {
               "0%": {
                  transform: "translateX(0%)",
               },
               "100%": {
                  transform: "translateX(-50%)",
               },
            },
            "move-right": {
               "0%": {
                  transform: "translateX(-50%)",
               },
               "100%": {
                  transform: "translateX(0%)",
               },
            },
            rotator: {
               "0%": {
                  transform: "rotate(0deg)",
               },
               "100%": {
                  transform: "rotate(360deg)",
               },
            },

            "open-menu": {
               "0%": {
                  transform: "translateY(100%)",
               },
               "100%": {
                  transform: "translateY(0%)",
               },
            },
            "close-menu": {
               "0%": {
                  transform: "translateY(0%)",
               },
               "100%": {
                  transform: "translateY(100%)",
               },
            },
            "open-menu-md": {
               "0%": {
                  transform: "translateX(-100%)",
               },
               "100%": {
                  transform: "translateX(0%)",
               },
            },
            "close-menu-md": {
               "0%": {
                  transform: "translateX(0%)",
               },
               "100%": {
                  transform: "translateX(-100%)",
               },
            },
            bounce: {
               "0%": {
                  transform: "translateX(0px)",
                  "timing-function": "ease-in",
               },
               "37%": {
                  transform: "translateX(4px)",
                  "timing-function": "ease-out",
               },
               "55%": {
                  transform: "translateX(-4px)",
                  "timing-function": "ease-in",
               },
               "73%": {
                  transform: "translateX(3px)",
                  "timing-function": "ease-out",
               },
               "82%": {
                  transform: "translateX(-3px)",
                  "timing-function": "ease-in",
               },
               "91%": {
                  transform: "translateX(2px)",
                  "timing-function": "ease-out",
               },
               "96%": {
                  transform: "translateX(-2px)",
                  "timing-function": "ease-in",
               },
               "100%": {
                  transform: "translateX(0px)",
                  "timing-function": "ease-in",
               },
            },
            "outline-flash": {
               "0%": {
                  outline: "2px solid rgba(255, 0, 0, 0)",
               },
               "50%": { outline: "2px solid rgba(255, 0, 0, 100)" },
               "100%": {
                  outline: "2px solid rgba(255, 0, 0, 0)",
               },
            },
         },
      },
   },
   plugins: [],
} satisfies Config;
