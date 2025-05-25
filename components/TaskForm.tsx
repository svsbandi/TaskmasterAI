
import React, { useState, useEffect, useCallback } from 'react';
import { Task, Priority, Status, AiParsedTask, ContextualSource } from '../types';
import { 
  EnhancedTaskDetails, 
  enhanceTaskWithAIStream, 
  suggestTagsWithAI,
  streamSubTasksWithAI,
  streamContextualInfoWithAI 
} from '../services/geminiService';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Select from './ui/Select';
import Button from './ui/Button';
import { SparklesIcon, Loader2Icon, TagIcon, ListChecksIcon, InfoIcon } from './icons';
import Badge from './ui/Badge';


interface TaskFormProps {
  task?: Task | null; // For editing
  aiSuggestion?: AiParsedTask | null; // For pre-filling from AI
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Helper function to check if a string is a YYYY-MM-DD date
const isValidIsoDate = (dateString: string): boolean => {
  if (!dateString) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

const TaskForm: React.FC<TaskFormProps> = ({ task, aiSuggestion, onSubmit, onCancel, isSubmitting }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [status, setStatus] = useState<Status>(Status.ToDo);
  const [tags, setTags] = useState(''); // Comma-separated string for input
  const [contextualSources, setContextualSources] = useState<ContextualSource[]>([]);


  const [isEnhancingAi, setIsEnhancingAi] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  
  const [enhancementError, setEnhancementError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [subtasksError, setSubtasksError] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  const resetFormErrors = () => {
    setEnhancementError(null);
    setTagsError(null);
    setSubtasksError(null);
    setContextError(null);
  };
  
  const isAnyAiLoading = isEnhancingAi || isSuggestingTags || isSuggestingSubtasks || isFetchingContext;

  useEffect(() => {
    resetFormErrors();
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate || '');
      setPriority(task.priority);
      setStatus(task.status);
      setTags(task.tags?.join(', ') || '');
      setContextualSources(task.contextualSources || []);
    } else if (aiSuggestion) {
      setTitle(aiSuggestion.title || '');
      setDescription(aiSuggestion.description || '');
      setDueDate(aiSuggestion.dueDate || '');
      setPriority(aiSuggestion.priority || Priority.Medium);
      setTags(aiSuggestion.tags?.join(', ') || '');
      setStatus(Status.ToDo);
      setContextualSources([]);
    } else {
      // Reset for new task form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority(Priority.Medium);
      setStatus(Status.ToDo);
      setTags('');
      setContextualSources([]);
    }
  }, [task, aiSuggestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setEnhancementError("Title is required.");
      return;
    }
    const finalTags = tags.split(',').map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-')).filter(tag => tag);
    onSubmit({
      id: task?.id,
      title,
      description,
      dueDate,
      priority,
      status: task ? status : Status.ToDo,
      tags: finalTags,
      contextualSources,
    });
  };

  const handleAiEnhance = async () => {
    setIsEnhancingAi(true);
    setEnhancementError(null);
    try {
      // Preserve existing content before stream starts appending
      const currentDesc = description; 
      await enhanceTaskWithAIStream(
        title, 
        currentDesc, // Pass current description explicitly
        (newTitleCandidate) => setTitle(newTitleCandidate),
        (newDescriptionCandidate) => setDescription(newDescriptionCandidate) // This will overwrite, as intended by stream parsing
      );
      // Title and description are set by callbacks.
    } catch (error) {
      console.error("AI Enhancement failed:", error);
      const message = error instanceof Error ? error.message : "AI enhancement failed.";
      setEnhancementError(message);
    } finally {
      setIsEnhancingAi(false);
    }
  };

  const handleSuggestTags = async () => {
    setIsSuggestingTags(true);
    setTagsError(null);
    try {
      const suggested = await suggestTagsWithAI(title, description);
      setTags(current => {
        const existingTags = current.split(',').map(t => t.trim()).filter(t => t);
        const newTags = suggested.filter(s => !existingTags.includes(s));
        return [...existingTags, ...newTags].join(', ');
      });
    } catch (error) {
      console.error("AI Tag Suggestion failed:", error);
      const message = error instanceof Error ? error.message : "AI tag suggestion failed.";
      setTagsError(message);
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleSuggestSubtasks = async () => {
    setIsSuggestingSubtasks(true);
    setSubtasksError(null);
    try {
      // Stream will append to description
      let firstChunk = true;
      await streamSubTasksWithAI(title, description, (chunk) => {
        if (firstChunk) {
            setDescription(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + chunk);
            firstChunk = false;
        } else {
            setDescription(prev => prev + chunk);
        }
      });
    } catch (error) {
      console.error("AI Sub-task Suggestion failed:", error);
      const message = error instanceof Error ? error.message : "AI sub-task suggestion failed.";
      setSubtasksError(message);
    } finally {
      setIsSuggestingSubtasks(false);
    }
  };

  const handleFetchContext = async () => {
    setIsFetchingContext(true);
    setContextError(null);
    setContextualSources([]); // Clear previous sources
    try {
      // Stream will append to description
      let firstChunk = true;
      await streamContextualInfoWithAI(title, description, 
        (chunk) => {
            if (firstChunk) {
                setDescription(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + chunk);
                firstChunk = false;
            } else {
                 setDescription(prev => prev + chunk);
            }
        },
        (sources) => {
          setContextualSources(sources);
        }
      );
    } catch (error) {
      console.error("AI Context Fetch failed:", error);
      const message = error instanceof Error ? error.message : "AI context fetch failed.";
      setContextError(message);
    } finally {
      setIsFetchingContext(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Buy groceries"
          required
          disabled={isAnyAiLoading || isSubmitting}
          aria-describedby={enhancementError && title.trim() === '' ? "title-error" : undefined}
        />
         {enhancementError && !title.trim() && (
          <p id="title-error" className="text-xs text-red-500 dark:text-red-400 mt-1">{enhancementError}</p>
        )}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Milk, eggs, bread. Or let AI enhance this for you!"
          rows={6}
          disabled={isAnyAiLoading || isSubmitting}
        />
      </div>
      
      <div className="flex flex-wrap gap-2 my-2">
        <Button
          type="button" variant="outline" size="sm" onClick={handleAiEnhance}
          disabled={isAnyAiLoading || isSubmitting || !title}
          aria-label="Enhance task details with AI"
        >
          {isEnhancingAi ? <Loader2Icon className="h-4 w-4 mr-2" /> : <SparklesIcon className="h-4 w-4 mr-2 text-sky-500" />}
          {isEnhancingAi ? 'Enhancing...' : 'AI Enhance'}
        </Button>
        <Button
          type="button" variant="outline" size="sm" onClick={handleSuggestSubtasks}
          disabled={isAnyAiLoading || isSubmitting || !title}
          aria-label="Suggest sub-tasks with AI"
        >
          {isSuggestingSubtasks ? <Loader2Icon className="h-4 w-4 mr-2" /> : <ListChecksIcon className="h-4 w-4 mr-2 text-purple-500" />}
          {isSuggestingSubtasks ? 'Working...' : 'Suggest Sub-tasks'}
        </Button>
        <Button
          type="button" variant="outline" size="sm" onClick={handleFetchContext}
          disabled={isAnyAiLoading || isSubmitting || !title}
          aria-label="Get contextual information with AI"
        >
          {isFetchingContext ? <Loader2Icon className="h-4 w-4 mr-2" /> : <InfoIcon className="h-4 w-4 mr-2 text-green-500" />}
          {isFetchingContext ? 'Fetching...' : 'Get Context'}
        </Button>
      </div>
      {enhancementError && title.trim() && <p className="text-xs text-red-500 dark:text-red-400">{enhancementError}</p>}
      {subtasksError && <p className="text-xs text-red-500 dark:text-red-400">{subtasksError}</p>}
      {contextError && <p className="text-xs text-red-500 dark:text-red-400">{contextError}</p>}

      {contextualSources.length > 0 && (
        <div className="my-3 p-3 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
          <h4 className="text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">AI Found Sources:</h4>
          <ul className="list-disc list-inside space-y-1">
            {contextualSources.map((source, index) => (
              <li key={index} className="text-xs">
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline break-all">
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags <span className="text-xs text-slate-500">(comma-separated)</span></label>
        <div className="flex items-center gap-2">
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., work, project-alpha, urgent"
            disabled={isAnyAiLoading || isSubmitting}
            className="flex-grow"
          />
          <Button
            type="button" variant="outline" size="sm" onClick={handleSuggestTags}
            disabled={isAnyAiLoading || isSubmitting || !title}
            aria-label="Suggest tags with AI"
          >
            {isSuggestingTags ? <Loader2Icon className="h-4 w-4" /> : <TagIcon className="h-4 w-4 text-orange-500" />}
          </Button>
        </div>
        {tagsError && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{tagsError}</p>}
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium mb-1">Due Date</label>
        <Input
          id="dueDate"
          type="date"
          value={isValidIsoDate(dueDate) ? dueDate : ''}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isAnyAiLoading || isSubmitting}
          className="w-full"
        />
        {dueDate && !isValidIsoDate(dueDate) && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Current due date: {dueDate} (Select a date to override)
          </p>
        )}
      </div>
      <div>
        <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
        <Select
          id="priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={isAnyAiLoading || isSubmitting}
        >
          {Object.values(Priority).map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
      {task && (
         <div>
         <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
         <Select
           id="status" value={status} onChange={(e) => setStatus(e.target.value as Status)}
           disabled={isAnyAiLoading || isSubmitting}
         >
           {Object.values(Status).map((s) => <option key={s} value={s}>{s}</option>)}
         </Select>
       </div>
      )}
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting || isAnyAiLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isAnyAiLoading || !title.trim()}>
          {isSubmitting ? (task ? 'Saving...' : 'Adding...') : (task ? 'Save Changes' : 'Add Task')}
          {(isSubmitting || isAnyAiLoading) && <Loader2Icon className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
