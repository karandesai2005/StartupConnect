// context/UserRegistrationContext.js
import React, { createContext, useState } from "react";

export const UserRegistrationContext = createContext();

export const UserRegistrationProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    email: "",
    password: "",
    username: "",
    accountType: "",
  });

  return (
    <UserRegistrationContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserRegistrationContext.Provider>
  );
};
