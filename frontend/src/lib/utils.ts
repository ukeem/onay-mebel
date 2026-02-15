import { clsx, type ClassValue } from "clsx";
import React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** onFocus handler: selects the entire value so typing immediately replaces it */
export function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}
