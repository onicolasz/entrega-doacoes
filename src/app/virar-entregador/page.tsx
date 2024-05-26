"use client";

import VirarEntregadorForm from "./form";

export default function DocumentUploadForm() {
  return (
    <main>
      <div className="flex h-screen justify-center items-center">
        <div className="relative z-10 p-6 max-w-md mx-auto rounded-xl shadow-md space-y-4">
          <VirarEntregadorForm />
        </div>
      </div>
    </main>
  );
}
