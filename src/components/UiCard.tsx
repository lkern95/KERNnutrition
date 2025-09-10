import React from 'react';

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function UiCard({ className = '', ...props }: Props) {
  return (
    <div
      className={`bg-inkdark text-golden rounded-2xl shadow-md border border-golden/20 p-4 md:p-6 ${className}`}
      {...props}
    />
  );
}
