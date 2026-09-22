import { createContext } from "react";

export const AppContext = createContext();

const DataProvider = ({ children }) => {
  // In development:  the Node proxy — VITE_API_URL, else http://localhost:3000
  // In production:   Netlify Functions on the same site (netlify/functions),
  //                  so the app never depends on a separately hosted backend
  const API_URL = import.meta.env.DEV
    ? import.meta.env.VITE_API_URL || "http://localhost:3000"
    : "/.netlify/functions";

  return (
    <AppContext.Provider value={{ API_URL }}>
      {children}
    </AppContext.Provider>
  );
};

export default DataProvider;
