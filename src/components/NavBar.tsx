"use client";

import { UserContext } from "@/app/contexts/user.context";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function NavBar() {
  const { user } = useContext(UserContext)
  const { push } = useRouter();
  const pathname = usePathname()

  const options = [
    { title: "", icon: faHome, action: () => push("/") },
    { title: "Doações entregues", icon: null, action: () => push("/doacoes/entregues") },
    { title: "Acompanhar suas doações", icon: null, action: () => push("/doacoes/acompanhar") },
    { title: "Virar entregador", icon: null, action: () => push("/virar-entregador") }
  ]

  if (pathname === '/login') return <></>

  return (
    <div className="flex justify-center mt-3">
      <nav className="flex justify-center bg-primary px-2 py-1 items-cente text-secondary rounded-xl custom-shadow" >
        <div className="grid grid-flow-col auto-cols-max gap-2.5">
          {options.map((option, index) => (
            <Button
              key={index}
              className="flex items-center p-2 hover:bg-green-600 hover:font-semibold active:bg-green-700 duration-100 rounded-lg"
              size="sm"
              onClick={option.action}
            >
              {option.icon && <FontAwesomeIcon icon={faHome} size="lg" />}
              {option.title}
            </Button>
          ))}
          <div className="border-l text-secondary h-9 mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-9 h-9 cursor-pointer" onClick={() => console.log("teste")}>
                <AvatarImage sizes="sm" src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav >
    </div >
  );
}
