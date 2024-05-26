"use client";

import { UserContext } from "@/app/contexts/user.context";
import { useRouter } from "next/navigation";
import { useContext } from "react";

export default function NavBar() {
  const { user } = useContext(UserContext)
  const { push } = useRouter();

  return (
    <div className="flex justify-center mt-4">
      <nav className="flex justify-center bg-green-700 h-10 p-4 items-center text-white rounded-2xl">
        <ul className="flex h-full items-center">
          <li
            onClick={() => push("/")}
            className="h-full items-center flex self-center rounded-2xl p-4 cursor-pointer hover:bg-green-600 hover:font-semibold"
          >
            Home
          </li>
          <li
            className="h-full items-center flex self-center rounded-2xl p-4 cursor-pointer hover:bg-green-600 hover:font-semibold"
            onClick={() => push("/doacoes/entregues")}
          >
            Doações entregues
          </li>
          <li
            className="h-full items-center flex p-4 rounded-2xl cursor-pointer hover:bg-green-600 hover:font-semibold"
            onClick={() => push("/doacoes/acompanhar")}
          >
            Acompanhar suas doações
          </li>
          {!user?.transporter_id && (
            <li
              className="h-full items-center flex p-4 rounded-2xl cursor-pointer hover:bg-green-600 hover:font-semibold"
              onClick={() => push("/virar-entregador")}
            >
              Virar entregador
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
