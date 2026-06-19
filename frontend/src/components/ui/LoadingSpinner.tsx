import React from 'react';
import { RiLoader4Line } from 'react-icons/ri';

export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <RiLoader4Line size={32} className="animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
