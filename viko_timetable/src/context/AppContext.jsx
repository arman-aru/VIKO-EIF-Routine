import { createContext } from "react";

export const AppContext = createContext();

const DataProvider = ({ children }) => {
  // In development:  http://localhost:3000
  // In production:   set VITE_API_URL in Netlify environment variables
  const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3000" : "");

  return (
    <AppContext.Provider value={{ API_URL }}>
      {children}
    </AppContext.Provider>
  );
};

export default DataProvider;
