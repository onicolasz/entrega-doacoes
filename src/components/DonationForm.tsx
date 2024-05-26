"use client";

import React, { useState } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

const ItemSchema = z.object({
  name: z.string().min(1, "Nome do item é obrigatório"),
  quantity: z.number().min(1, "Quantidade mínima é 1"),
  weight: z.number().min(0.1, "Peso mínimo é 0.1kg"),
});

const FormSchema = z.object({
  fromLocation: z.string(),
  items: z.array(ItemSchema),
});

type FormSchemaType = z.infer<typeof FormSchema>;

export default function DonationForm() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [{ name: "", quantity: 1, weight: 0.1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit: SubmitHandler<FormSchemaType> = (data) => {
    console.log("Form data submitted:", data);
  };

  const handleInputFromLocationChange = async (value: string) => {
    if (value.length > 2) {
      const fetchedSuggestions = await fetch(`/api/suggestions?input=${value}`);

      if (fetchedSuggestions.status == 200) {
        const data = await fetchedSuggestions.json();
        setSuggestions(data);
      }
    } else {
      setSuggestions([]);
    }
  };

  return (
    <main>
      <h1 className="text-xl font-medium text-primary">Cadastro de Doações</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((item, index) => (
            <div key={item.id} className="flex space-x-2 items-end">
              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name={`items.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Item</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do item" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder="Quantidade"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name={`items.${index}.weight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          placeholder="Peso em kg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center">
                <Button
                  disabled={fields.length == 1}
                  type="button"
                  onClick={() => remove(index)}
                  variant="outline"
                  className="p-2"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </div>
            </div>
          ))}
          <FormField
            control={form.control}
            name={"fromLocation"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local de origem</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Local de origem"
                    onChange={(e) => {
                      handleInputFromLocationChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ul className="absolute w-full bg-white rounded-xl mt-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => console.log("trooow")}
              >
                {suggestion}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => append({ name: "", quantity: 1, weight: 0.1 })}
              className="flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Adicionar Item</span>
            </Button>
          </div>
          <Button
            type="submit"
            className="block w-full py-2 px-4 rounded-md mt-4"
          >
            Enviar
          </Button>
        </form>
      </Form>
    </main>
  );
}
