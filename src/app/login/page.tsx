"use client";

import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string()
  // password: z.string().regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, {
  //   message: "Password must be at least 8 characters long, contain at least one uppercase letter, and one special character.",
  // }),
});

export default function Login() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log("Form data submitted:", data);

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    if (res?.error) {
      console.error("Login failed:", res.error);
    } else {
      console.log("Login successful:", res);
      // Redirecionar ou atualizar a sessão
    }
  }

  return (
    <main>
      <div className="flex h-screen">
        <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center">
          {/* Lado verde */}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="relative z-10 p-6 max-w-sm mx-auto rounded-xl shadow-md space-y-4">
            <h1 className="text-xl font-medium text-primary">Bem-Vindo</h1>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Email"
                          className="block w-full px-3 py-2 rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Senha"
                          className="block w-full px-3 py-2 rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="block w-full py-2 px-4 rounded-md"
                >
                  Entrar
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </main>
  );
}
