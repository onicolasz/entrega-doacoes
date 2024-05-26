'use client'

import { useRouter } from "next/navigation"

export default function NavBar() {
    const {push} = useRouter()

    return <nav className="flex justify-center bg-green-700 h-10 items-center">
        <span className="cursor-pointer mr-12 " onClick={() => push('/')}><strong>Home</strong></span>
        <ul className="flex h-full items-center">
            <li className="h-full items-center flex self-center mr-4 cursor-pointer hover:bg-green-600"
                onClick={() => push('/oferecer')}
            >
                Oferecer serviços
            </li>
            <li className="h-full items-center flex cursor-pointer hover:bg-green-600"
                onClick={() => push('/receber')}
            >
                Receber ajuda
            </li>
        </ul>
    </nav>
}