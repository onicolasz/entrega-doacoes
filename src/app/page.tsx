'use client'

import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  if (!session) {
    console.log("não ta logado");
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Olá Mundo</h1>
    </main>
  );
}
