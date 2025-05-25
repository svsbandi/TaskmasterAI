
import React from 'react';
import { Task, Priority, Status } from '../types';
import { EditIcon, DeleteIcon, InfoIcon } from './icons';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: Status) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(task.id, e.target.value as Status);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words mr-2">{task.title}</h3>
          <Badge variant={task.priority}>{task.priority}</Badge>
        </div>
        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 break-words whitespace-pre-wrap">{task.description}</p>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 space-y-1">
          {task.dueDate && (
            <p>Due: <span className="font-medium">{task.dueDate}</span></p>
          )}
          <p>Created: <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</span></p>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tags:</h4>
            <div className="flex flex-wrap gap-1">
              {task.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {task.contextualSources && task.contextualSources.length > 0 && (
           <div className="mb-3 p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              <InfoIcon className="h-3 w-3 mr-1 text-sky-500"/> Related Sources:
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {task.contextualSources.slice(0, 3).map((source, index) => ( // Show max 3 on card
                <li key={index} className="text-xs truncate">
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline" title={source.title}>
                    {source.title || source.uri}
                  </a>
                </li>
              ))}
              {task.contextualSources.length > 3 && <li className="text-xs text-slate-500 dark:text-slate-400">...and more (see edit)</li>}
            </ul>
          </div>
        )}

      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
        <div className="w-full sm:w-auto">
          <select 
            value={task.status} 
            onChange={handleStatusChange}
            className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-sky-500 focus:border-sky-500"
            aria-label={`Status of task ${task.title}`}
          >
            {Object.values(Status).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(task)} aria-label={`Edit task ${task.title}`}>
            <EditIcon className="h-5 w-5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} aria-label={`Delete task ${task.title}`}>
            <DeleteIcon className="h-5 w-5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
