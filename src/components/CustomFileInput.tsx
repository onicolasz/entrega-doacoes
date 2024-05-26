import React, { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";

interface CustomFileInputProps {
  onChange: (file: File) => void;
  label: string;
}

const CustomFileInput: React.FC<CustomFileInputProps> = ({ onChange, label }) => {
  const [fileName, setFileName] = useState<string>("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      onChange(e.target.files[0]);
    }
  };

  const handleClick = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <label className="block">
        <span className="sr-only">Choose file</span>
        <input
          type="file"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          variant="outline"
          className="cursor-pointer w-full"
          onClick={handleClick}
        >
          {fileName || label}
        </Button>
      </label>
    </div>
  );
};

export default CustomFileInput;
