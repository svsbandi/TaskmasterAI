
import React, { useState, useEffect } from 'react';
import { PlusIcon, SparklesIcon, MoonIcon, SunIcon, Loader2Icon } from './icons';
import Button from './ui/Button';
import Input from './ui/Input';

interface HeaderProps {
  onAddTaskManual: () => void;
  onAddTaskWithAi: (taskString: string) => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ onAddTaskManual, onAddTaskWithAi }) => {
  const [nlpInput, setNlpInput] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark'); 
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light'); 
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;

    console.log('Header.tsx: AI Add submitted with input:', nlpInput); // Debug log

    setIsProcessingAi(true);
    try {
      await onAddTaskWithAi(nlpInput);
      setNlpInput(''); // Clear input on success
    } catch (error) {
      // Error is primarily handled and displayed by App.tsx
      console.error("Header.tsx: Error during onAddTaskWithAi call:", error); // Specific log for header context
    } finally {
      setIsProcessingAi(false);
    }
  };

  return (
    <header className="bg-slate-100 dark:bg-slate-900 p-4 shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-500 flex-shrink-0">TaskMaster AI</h1>
        
        {/* Updated className for the form for better alignment and responsiveness */}
        <form onSubmit={handleAiSubmit} id="ai-task-form" className="flex-grow w-full min-w-0">
          <Input 
            type="text"
            value={nlpInput}
            onChange={(e) => setNlpInput(e.target.value)}
            placeholder="e.g., Remind me to call John tomorrow at 2pm"
            className="w-full" // Input takes full width of the form
            disabled={isProcessingAi}
            aria-label="AI task input"
          />
        </form>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button type="submit" form="ai-task-form" size="default" disabled={isProcessingAi || !nlpInput.trim()}>
            {isProcessingAi ? <Loader2Icon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5 mr-1" />}
            AI Add
          </Button>
          <Button onClick={onAddTaskManual} variant="default">
            <PlusIcon className="h-5 w-5 mr-1" /> New Task
          </Button>
          <Button onClick={toggleTheme} variant="outline" size="icon" aria-label="Toggle theme">
            {document.documentElement.classList.contains('dark') ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
