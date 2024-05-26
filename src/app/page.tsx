"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserContext } from "./contexts/user.context";
import { useContext } from "react";
import DonationCard from "@/components/DonationCard";

const data = [
  {
    userName: "Nicolas",
    items: [
      { name: "Feijão", quantity: 10, weigth: 100 },
      { name: "Arroz", quantity: 5, weigth: 100 },
      { name: "Item 3", quantity: 5, weigth: 100 },
      { name: "Item 4", quantity: 5, weigth: 100 },
    ],
    from_location: "Rua general lima e silva 250 porto alegre",
    destination_location: "RUA JUSTINO CAMOBIM 994 SAPUCAIA DO SUL",
  },
  {
    userName: "Giuseppe Cadura",
    items: [
      { name: "Feijão", quantity: 10, weigth: 100 },
      { name: "Arroz", quantity: 5, weigth: 100 },
      { name: "Item 3", quantity: 5, weigth: 100 },
      { name: "Item 4", quantity: 5, weigth: 100 },
    ],
    from_location: "Rua general lima e silva 250 porto alegre",
    destination_location: "RUA JUSTINO CAMOBIM 994 SAPUCAIA DO SUL",
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const { user, updateUser } = useContext(UserContext);
  const { push } = useRouter();

  if (status === "unauthenticated") {
    push("/login");
  }

  if (!!session?.user?.email && !user) {
    updateUser(session.user.email);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-14">
      <div className="min-h-screen w-[700px]">
        <p className="text-2xl text-black font-semibold py-4 pl-4">
          Esperando entregador
        </p>
        {data.map((item, index) => (
          <DonationCard
            key={index}
            userName={item.userName}
            items={item.items}
            fromLocation={item.from_location}
            destinationLocation={item.destination_location}
          />
        ))}
      </div>
    </main>
  );
}
