"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserContext } from "./contexts/user.context";
import { useContext } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const { user, updateUser } = useContext(UserContext)
  const { push } = useRouter();

  console.log('plau', session)

  if (status === 'unauthenticated') {
    push("/login");
  }

  if(!!session?.user?.email && !user) {
    updateUser(session.user.email)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Olá {user?.name} </h1>
    </main>
  );
}
