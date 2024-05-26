"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { update } = useSession();

  return (
    <main className="">
      <div className="flex h-screen">
        <div className="flex-1 bg-primary flex items-center justify-center">
          {/* Lado verde */}
        </div>
        <div className="relative flex-1 flex items-center justify-center">
          <div className="relative z-10 p-6 max-w-sm mx-auto rounded-xl shadow-md space-y-4">
            <h1 className="text-xl font-medium text-primary">Bem-Vindo</h1>
            <form className="space-y-4">
              <Input
                type="text"
                placeholder="Email"
                className="block w-full px-3 py-2 rounded-md"
              />
              <Input
                type="password"
                placeholder="Senha"
                className="block w-full px-3 py-2 rounded-md"
              />
              <Button
                type="submit"
                className="block w-full py-2 px-4 rounded-md"
              >
                Entrar
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
