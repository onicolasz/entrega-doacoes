'use client'

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const {status} = useSession();
  const {push} = useRouter()
  
  if (status === 'unauthenticated') {
    push('/login')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Olá Mundo</h1>
      <button onClick={() => signOut()}>sign out</button>
    </main>
  );
}
