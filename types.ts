
export enum Priority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

export enum Status {
  ToDo = "To Do",
  InProgress = "In Progress",
  Done = "Done",
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: Priority;
  status: Status;
  tags?: string[];
  createdAt: string;
  contextualSources?: ContextualSource[];
}

export interface AiParsedTask {
  title?: string;
  description?: string;
  dueDate?: string; // Keep as string from AI, can be "tomorrow", "next Friday" etc.
  priority?: Priority | null; // AI might return string 'Low', 'Medium', 'High' or null
  tags?: string[]; // AI might also suggest tags during initial parsing
}

export interface ContextualSource {
  uri: string;
  title: string;
}