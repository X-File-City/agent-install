"use client";

import { useState } from "react";

import { COPY_RESET_MS } from "@/lib/constants";

interface CopyButtonProps {
  getValue: () => string;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const CopyButton = ({ getValue, label, onClick }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    await navigator.clipboard.writeText(getValue());
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="cursor-pointer shrink-0 content-center group"
      aria-label={label}
    >
      {copied ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            height: "20px",
            verticalAlign: "middle",
            width: "20px",
            overflow: "clip",
          }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.28 3.22a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L4.75 7.69l4.47-4.47a.75.75 0 0 1 1.06 0Z"
            fill="#059669"
          />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          color="#0A0A0A"
          style={{
            height: "20px",
            verticalAlign: "middle",
            width: "20px",
            overflow: "clip",
            flexShrink: "0",
          }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.25 2.25C3.25 1.698 3.698 1.25 4.25 1.25H9.25C10.079 1.25 10.75 1.922 10.75 2.75V7.75C10.75 8.302 10.302 8.75 9.75 8.75C9.474 8.75 9.25 8.526 9.25 8.25C9.25 7.974 9.474 7.75 9.75 7.75V2.75C9.75 2.474 9.526 2.25 9.25 2.25H4.25C4.25 2.526 4.026 2.75 3.75 2.75C3.474 2.75 3.25 2.526 3.25 2.25ZM1.25 4.75C1.25 3.922 1.922 3.25 2.75 3.25H7.25C8.078 3.25 8.75 3.922 8.75 4.75V9.25C8.75 10.079 8.078 10.75 7.25 10.75H2.75C1.922 10.75 1.25 10.079 1.25 9.25V4.75ZM2.75 4.25C2.474 4.25 2.25 4.474 2.25 4.75V9.25C2.25 9.526 2.474 9.75 2.75 9.75H7.25C7.526 9.75 7.75 9.526 7.75 9.25V4.75C7.75 4.474 7.526 4.25 7.25 4.25H2.75Z"
            fill="#696969"
          />
        </svg>
      )}
    </button>
  );
};
