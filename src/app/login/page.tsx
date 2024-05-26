"use client";

import { signIn, useSession } from "next-auth/react";

export default function Login() {
  const { update } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Faça login</h1>
      <button
        onClick={() =>
          signIn("credentials", {
            email: "teste",
            password: "teste",
          })
        }
      >
        sign in
      </button>
    </main>
  );
}
