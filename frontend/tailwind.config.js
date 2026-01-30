/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a", // Um azul escuro moderno (tipo Streamlit dark)
        surface: "#1e293b",
        primary: "#3b82f6",
        secondary: "#64748b",
      },
    },
  },
  plugins: [],
};
