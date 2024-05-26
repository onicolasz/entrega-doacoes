"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const FormSchema = z.object({
  frontImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine((file) => file.type.startsWith('image/'), 'File must be an image'),
  backImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine((file) => file.type.startsWith('image/'), 'File must be an image'),
});

type FormSchemaType = z.infer<typeof FormSchema>;

export default function VirarEntregadorForm() {
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      frontImage: undefined,
      backImage: undefined,
    },
  });

  const onSubmit = (data: FormSchemaType) => {
    console.log("Form data submitted:", data);
  };

  return (
    <main>
      <h1 className="text-xl font-medium text-primary">Envio de documento</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="frontImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frente</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        field.onChange(e.target.files[0]);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="backImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verso</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        field.onChange(e.target.files[0]);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="block w-full py-2 px-4 rounded-md">
            Enviar
          </Button>
        </form>
      </Form>
    </main>
  );
}
