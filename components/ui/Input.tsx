
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, type, ...props }) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:ring-offset-slate-950 ${className || ''}`}
      {...props}
    />
  );
};

export default Input;
