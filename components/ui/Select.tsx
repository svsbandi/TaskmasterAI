
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ className, children, ...props }) => {
  return (
    <select
      className={`flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:ring-offset-slate-950 [&>span]:line-clamp-1 ${className || ''}`}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
