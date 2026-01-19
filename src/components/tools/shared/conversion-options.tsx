"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ConversionOption {
  id: string;
  label: string;
  type: "number" | "text" | "color" | "select";
  value: string | number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface ConversionOptionsProps {
  options: ConversionOption[];
  onOptionChange: (id: string, value: string | number) => void;
}

export default function ConversionOptions({
  options,
  onOptionChange,
}: ConversionOptionsProps) {
  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.id} className="space-y-2">
          <Label htmlFor={option.id}>{option.label}</Label>
          {option.type === "select" && option.options ? (
            <select
              id={option.id}
              value={option.value}
              onChange={(e) => onOptionChange(option.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-charcoal text-dark-brown dark:text-light-gray"
            >
              {option.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={option.id}
              type={option.type}
              value={option.value}
              onChange={(e) =>
                onOptionChange(
                  option.id,
                  option.type === "number"
                    ? Number(e.target.value)
                    : e.target.value
                )
              }
              min={option.min}
              max={option.max}
              step={option.step}
              placeholder={option.placeholder}
            />
          )}
        </div>
      ))}
    </div>
  );
}
