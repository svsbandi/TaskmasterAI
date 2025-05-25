
import React, { useState, useEffect, useCallback } from 'react';
import { Task, Priority, Status, AiParsedTask, ContextualSource } from './types';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import Modal from './components/Modal';
import TaskForm from './components/TaskForm';
import { parseTaskStringWithAI } from './services/geminiService';
import Button from './components/ui/Button'; 
import { XIcon } from './components/icons';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('zenithTasks');
    if (savedTasks) {
        try {
            const parsed = JSON.parse(savedTasks);
            // Ensure all tasks have arrays for tags and contextualSources if undefined
            return parsed.map((task: Task) => ({
                ...task,
                tags: task.tags || [],
                contextualSources: task.contextualSources || [],
            }));
        } catch (e) {
            console.error("Failed to parse tasks from localStorage", e);
            return []; // Fallback to empty if parsing fails
        }
    }
    return [
        { id: generateId(), title: 'Welcome to TaskMaster AI!', description: 'Explore creating tasks manually or using the AI feature in the header. Try AI Enhance, Suggest Sub-tasks, Get Context, and Suggest Tags in the task form!', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], priority: Priority.Medium, status: Status.ToDo, tags: ['guide', 'welcome'], createdAt: new Date().toISOString(), contextualSources: [] },
        { id: generateId(), title: 'Submit weekly report', description: 'Compile data and send out the weekly progress report. Remember to include a summary of achievements and challenges.', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], priority: Priority.High, status: Status.ToDo, tags: ['work', 'report', 'urgent'], createdAt: new Date().toISOString(), contextualSources: [] },
        { id: generateId(), title: 'Plan weekend trip', description: 'Research destinations, book accommodation, and create an itinerary.', dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], priority: Priority.Medium, status: Status.ToDo, tags: ['personal', 'travel', 'planning'], createdAt: new Date().toISOString(), contextualSources: [] },
    ];
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [aiSuggestedTask, setAiSuggestedTask] = useState<AiParsedTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Used for Header AI add & form submission

  useEffect(() => {
    localStorage.setItem('zenithTasks', JSON.stringify(tasks));
  }, [tasks]);

  const openModalForNew = () => {
    setEditingTask(null);
    setAiSuggestedTask(null);
    setIsModalOpen(true);
    setError(null);
  };

  const openModalForEdit = (task: Task) => {
    setEditingTask(task);
    setAiSuggestedTask(null);
    setIsModalOpen(true);
    setError(null);
  };
  
  const openModalWithAISuggestion = (suggestion: AiParsedTask) => {
    setEditingTask(null);
    setAiSuggestedTask(suggestion); // Pass the full suggestion
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setAiSuggestedTask(null);
    setError(null); 
  };

  const handleAddTaskWithAi = async (taskString: string) => {
    setError(null);
    setIsSubmitting(true); 
    try {
      const parsedTaskData = await parseTaskStringWithAI(taskString);
      if (parsedTaskData) {
        openModalWithAISuggestion(parsedTaskData);
      } else {
        setError("AI couldn't parse the task. Please try rephrasing or add manually.");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unknown error occurred with AI processing.";
      setError(message.startsWith("Failed to parse task with AI.") ? message : "AI Error: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    setError(null);
    setIsSubmitting(true);
    
    // Ensure tags and contextualSources are always arrays
    const dataToSave = {
        ...taskData,
        tags: taskData.tags || [],
        contextualSources: taskData.contextualSources || [],
    };

    setTimeout(() => { // Simulate API call
      try {
        if (dataToSave.id) { 
          setTasks(tasks.map(t => t.id === dataToSave.id ? { ...t, ...dataToSave, id: dataToSave.id! } : t));
        } else { 
          const newTask: Task = {
            ...dataToSave,
            id: generateId(),
            createdAt: new Date().toISOString(),
            status: Status.ToDo, 
          };
          setTasks([newTask, ...tasks]);
        }
        closeModal();
      } catch (e) {
        setError("Failed to save task.");
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    }, 300);
  };

  const handleDeleteTask = (taskId: string) => {
    // Basic confirmation, can be replaced with a custom modal later
    if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Status) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { [Status.ToDo]: 0, [Status.InProgress]: 1, [Status.Done]: 2 };
    const priorityOrder = { [Priority.High]: 0, [Priority.Medium]: 1, [Priority.Low]: 2 };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header onAddTaskManual={openModalForNew} onAddTaskWithAi={handleAddTaskWithAi} />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200 rounded-md flex justify-between items-center shadow">
            <span>{error}</span>
            <Button variant="ghost" size="icon" onClick={() => setError(null)} aria-label="Dismiss error message"><XIcon className="h-5 w-5" /></Button>
          </div>
        )}

        {tasks.length === 0 && !error && (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No tasks yet!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Get started by adding a new task manually or using the AI feature in the header.</p>
            <Button onClick={openModalForNew} variant="default" size="lg">
              Add Your First Task
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={openModalForEdit}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingTask ? "Edit Task" : (aiSuggestedTask ? "Review AI Task" : "Add New Task")}
      >
        <TaskForm 
          task={editingTask} 
          aiSuggestion={aiSuggestedTask}
          onSubmit={handleFormSubmit} 
          onCancel={closeModal}
          isSubmitting={isSubmitting}
        />
      </Modal>
      
      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
        TaskMaster AI &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;