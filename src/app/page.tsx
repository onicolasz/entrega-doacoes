'use client'

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session } = useSession();
  const {push} = useRouter()
  
  if (!session) {
    push('/login')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Olá Mundo</h1>
    </main>
  );
}
