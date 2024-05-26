"use client";

import { UserContext } from "@/app/contexts/user.context";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import ProfileButton from "./ProfileButton";

export default function NavBar() {
  const { user } = useContext(UserContext)
  const { push } = useRouter();
  const pathname = usePathname()
  
  if( pathname === '/login') return <></>

  return (
    <div className="flex justify-center mt-4">
      <nav className="flex justify-center bg-green-700 h-10 p-4 items-center text-white rounded-2xl border-gradient">
        <ul className="flex h-full items-center">
          <li
            onClick={() => push("/")}
            className="h-full items-center flex self-center rounded-2xl p-4 cursor-pointer hover:bg-green-600 hover:font-semibold  active:bg-green-700 duration-100"
          >
            <FontAwesomeIcon
              icon={faHome}
              size="lg"
            />
          </li>
          <li
            className="h-full items-center flex self-center rounded-2xl p-4 cursor-pointer hover:bg-green-600 hover:font-semibold  active:bg-green-700 duration-100"
            onClick={() => push("/doacoes/entregues")}
          >
            Doações entregues
          </li>
          <li
            className="h-full items-center flex p-4 rounded-2xl cursor-pointer hover:bg-green-600 hover:font-semibold  active:bg-green-700 duration-100"
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
      <ProfileButton></ProfileButton>
    </div>
  );
}
