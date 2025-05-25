
import React from 'react';
import { Priority, Status } from '../../types';

interface BadgeProps {
  variant?: "default" | "secondary" | "destructive" | "outline" | Priority | Status;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = "default", children, className }) => {
  const baseStyle = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variantStyles = {
    default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
    destructive: "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/80",
    outline: "text-slate-950 dark:text-slate-50",
    [Priority.Low]: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
    [Priority.Medium]: "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    [Priority.High]: "border-transparent bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
    [Status.ToDo]: "border-transparent bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    [Status.InProgress]: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    [Status.Done]: "border-transparent bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  };

  return (
    <div className={`${baseStyle} ${variantStyles[variant]} ${className || ''}`}>
      {children}
    </div>
  );
};

export default Badge;
