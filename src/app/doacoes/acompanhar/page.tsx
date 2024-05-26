"use client";

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
    delivery: {
      status: 'FINISHED',
      transporter: {
        user: {
          name: 'Zé da Pinga'
        }
      }
    },
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
    delivery: {
      status: 'INCOMING',
      transporter: {
        user: {
          name: 'Zé da Manga'
        }
      }
    },
  },
];

export default function DoacoesEntregues() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-14">
      <div className="min-h-screen w-[700px]">
        <p className="text-2xl text-black font-semibold py-4 pl-4">
          Acompanhar doações
        </p>
        {data.map((item, index) => (
          <DonationCard
            key={index}
            userName={item.userName}
            items={item.items}
            fromLocation={item.from_location}
            destinationLocation={item.destination_location}
            deliveryStatus={item.delivery.status}
            transporter={item?.delivery?.transporter?.user}
          />
        ))}
      </div>
    </main>
  );
}
