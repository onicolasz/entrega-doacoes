"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const FormSchema = z.object({
  vehicleType: z.enum(["Carro", "Moto", "Barco"]),
  licensePlate: z
    .string()
    .optional()
    .refine(
      (value, context) => {
        const vehicleType = context.parent.vehicleType;
        if ((vehicleType === "carro" || vehicleType === "moto") && !value) {
          return false;
        }
        return true;
      },
      {
        message: "License plate is required for car or moto",
      }
    ),
  vehicleModel: z
    .string()
    .optional()
    .refine(
      (value, context) => {
        const vehicleType = context.parent.vehicleType;
        if ((vehicleType === "carro" || vehicleType === "moto") && !value) {
          return false;
        }
        return true;
      },
      {
        message: "Vehicle model is required for car or moto",
      }
    ),
  frontImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "Max file size is 5MB")
    .refine((file) => file.type.startsWith("image/"), "File must be an image"),
  backImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "Max file size is 5MB")
    .refine((file) => file.type.startsWith("image/"), "File must be an image"),
  faceAndDocImage: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "Max file size is 5MB")
    .refine((file) => file.type.startsWith("image/"), "File must be an image"),
});

type FormSchemaType = z.infer<typeof FormSchema>;

export default function VirarEntregadorForm() {
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      vehicleType: "Carro",
      licensePlate: "",
      vehicleModel: "",
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
            name="vehicleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Veículo</FormLabel>
                <FormControl>
                  <Select onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger>
                      <button className="select-trigger-button">
                        {field.value}
                      </button>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Carro">Carro</SelectItem>
                      <SelectItem value="Moto">Moto</SelectItem>
                      <SelectItem value="Barco">Barco</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch("vehicleType") !== "Barco" && (
            <>
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa do Veículo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Digite a placa do veículo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo do Veículo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Digite o modelo do veículo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <FormField
            control={form.control}
            name="frontImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documento do motorista (Frente)</FormLabel>
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
                <FormLabel>Documento do motorista (Verso)</FormLabel>
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
            name="faceAndDocImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foto segurando o documento (Frente)</FormLabel>
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
