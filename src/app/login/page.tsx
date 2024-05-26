'use client'

import { signIn, useSession } from "next-auth/react";


export default function Login() {
  const {update} = useSession();
    

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Olá Mundo login</h1>
      <button onClick={() => signIn('google', { callbackUrl: 'http://localhost:3000' })}>sign in</button>
    </main>
  );
}
