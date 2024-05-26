"use client";

import { createContext, useState } from "react";

interface IUser {
  id: number;
  name: string;
  email: string;
  transporter_id: number | null;
}

type UserContextProps = {
  user: IUser | null;
  updateUser: (email: string) => void;
};

const UserContext = createContext<UserContextProps>({} as UserContextProps);

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);

  const updateUser = async (email: string) => {
    setUser({
      id: 1,
      name: "Giuseppe Cadura",
      email: email,
      transporter_id: 1,
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        updateUser,
      }}
    >
      <>{children}</>
    </UserContext.Provider>
  );
};

export { UserProvider, UserContext };
