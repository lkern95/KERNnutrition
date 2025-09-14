import React from "react";

export function HintBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fffbe6",
      color: "#7c6f00",
      border: "1px solid #ffe58f",
      borderRadius: 12,
      padding: 16,
      margin: "16px 0",
      fontSize: 16,
      boxShadow: "0 2px 8px #f7e7a1a0"
    }}>
      {children}
    </div>
  );
}
