"use client";

import { Upload } from "lucide-react";
import { ChangeEvent } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string;
  disabled?: boolean;
}

export default function FileUpload({
  onFileSelect,
  acceptedFormats,
  disabled = false,
}: FileUploadProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-gold transition-colors">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept={acceptedFormats}
        onChange={handleChange}
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-3"
      >
        <Upload className="w-12 h-12 text-gray-400" />
        <div>
          <p className="text-lg font-medium text-dark-brown dark:text-light-gray mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Accepted formats: {acceptedFormats}
          </p>
        </div>
      </label>
    </div>
  );
}
