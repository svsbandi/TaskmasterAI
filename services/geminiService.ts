
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AiParsedTask, Priority, ContextualSource } from "../types";

// IMPORTANT: API_KEY must be set as an environment variable `process.env.API_KEY`.
// This service assumes `process.env.API_KEY` is available in the execution environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Use non-null assertion as we check above and it's an env requirement.

const MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const TEXT_MODEL_NAME_FOR_SEARCH = "gemini-2.5-flash-preview-04-17"; // Specific model for search grounding

export const parseTaskStringWithAI = async (taskString: string): Promise<AiParsedTask | null> => {
  if (!API_KEY) {
    throw new Error("Gemini API key not configured.");
  }
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  const prompt = `
Parse the following user input to extract task details.
Respond ONLY with a valid JSON object with the following fields:
- "title": string (mandatory, if not found, use a concise summary of the original input)
- "description": string (optional, default to empty string)
- "dueDate": string (try to identify a date or relative time like "tomorrow", "next Friday", "July 26th". If a relative date is found, provide it as a descriptive string. If a specific date is found, try to format it as YYYY-MM-DD based on today being ${today}. If no date, set to null.)
- "priority": "Low" | "Medium" | "High" | null (Infer from keywords. Examples: "urgent" -> "High", "important" -> "High", "later" -> "Low", "sometime" -> "Low". If not clear, set to null.)
- "tags": string[] (optional, infer 1-3 relevant single-word tags based on the input. Example: ["meeting", "report"]. If none, set to empty array or null)

User input: "${taskString}"

Example of a good JSON response:
{
  "title": "Schedule meeting with Sarah for next Tuesday",
  "description": "Discuss Q3 report",
  "dueDate": "next Tuesday", 
  "priority": "Medium",
  "tags": ["meeting", "q3"]
}

Another example:
{
  "title": "Buy groceries",
  "description": "",
  "dueDate": "${new Date(Date.now() + 86400000).toLocaleDateString('en-CA')}", 
  "priority": null,
  "tags": ["shopping"]
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{text: prompt}] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, 
      },
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as AiParsedTask;
    
    if (parsedData.priority) {
      const prio = parsedData.priority as string;
      if (['Low', 'Medium', 'High'].includes(prio)) {
        parsedData.priority = prio as Priority;
      } else {
        parsedData.priority = null; 
      }
    }
    if (!parsedData.tags || !Array.isArray(parsedData.tags)) {
        parsedData.tags = [];
    }


    return parsedData;

  } catch (error) {
    console.error("Error parsing task with AI:", error);
    let errorMessage = "Failed to parse task with AI.";
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

export interface EnhancedTaskDetails {
  refinedTitle: string;
  refinedDescription: string;
}

export const enhanceTaskWithAIStream = async (
  currentTitle: string,
  currentDescription: string,
  onTitleCandidate: (title: string) => void,
  onDescriptionCandidate: (description: string) => void,
): Promise<EnhancedTaskDetails> => {
  if (!API_KEY) {
    throw new Error("Gemini API key not configured.");
  }

  const prompt = `You are an AI assistant. Refine the following task details for clarity and actionability.
Respond with the refined title on the VERY FIRST line.
Then, on a NEW LINE, provide the refined description. The description can be multi-line and should be detailed.

Current Task:
Title: "${currentTitle}"
Description: "${currentDescription}"

Example Output (title on first line, description on subsequent lines):
Finalize Q3 Marketing Report and Send to Stakeholders
Finalize the Q3 marketing report by incorporating the latest sales data. Ensure all charts are updated and the executive summary is compelling. Proofread thoroughly before distribution.

If the input title and description are empty or too vague to enhance meaningfully, return the original title (or "Untitled Task") on the first line, and on the second line, "Original description was empty or too vague to enhance. Please add more details."
`;

  let accumulatedResponseText = "";
  let finalTitle = currentTitle; 
  let finalDescription = currentDescription;
  let titleSent = false; 

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.6 },
    });

    let firstNewlineIndex = -1;

    for await (const chunk of stream) {
      const chunkText = chunk.text; 
      if (typeof chunkText !== 'string') continue; 
      
      accumulatedResponseText += chunkText;

      if (firstNewlineIndex === -1) { 
        firstNewlineIndex = accumulatedResponseText.indexOf('\n');
        if (firstNewlineIndex !== -1) { 
          finalTitle = accumulatedResponseText.substring(0, firstNewlineIndex).trim();
          onTitleCandidate(finalTitle);
          titleSent = true;
          const descStart = accumulatedResponseText.substring(firstNewlineIndex + 1);
          finalDescription = descStart; 
          onDescriptionCandidate(finalDescription);
        } else { 
          finalTitle = accumulatedResponseText.trim();
          onTitleCandidate(finalTitle); 
        }
      } else { 
        finalDescription = accumulatedResponseText.substring(firstNewlineIndex + 1);
        onDescriptionCandidate(finalDescription);
      }
    }
    
    firstNewlineIndex = accumulatedResponseText.indexOf('\n');
    if (firstNewlineIndex !== -1) {
        finalTitle = accumulatedResponseText.substring(0, firstNewlineIndex).trim();
        finalDescription = accumulatedResponseText.substring(firstNewlineIndex + 1).trim();
    } else { 
        finalTitle = accumulatedResponseText.trim();
        finalDescription = ""; 
    }
    
    if (titleSent) { 
        onTitleCandidate(finalTitle); 
    } else if (finalTitle) { 
        onTitleCandidate(finalTitle);
    }
    onDescriptionCandidate(finalDescription); 

    return { refinedTitle: finalTitle, refinedDescription: finalDescription };

  } catch (error) {
    console.error("Error enhancing task with AI (stream):", error);
    throw error; 
  }
};

export const suggestTagsWithAI = async (title: string, description: string): Promise<string[]> => {
  if (!API_KEY) {
    throw new Error("Gemini API key not configured.");
  }
  const prompt = `Based on the task title "${title}" and description "${description}", suggest up to 5 relevant single-word or short-phrase tags.
Focus on keywords that help categorize or find this task later.
Respond ONLY with a valid JSON array of strings. For example: ["work", "report", "urgent"].
If no specific tags come to mind, return an empty array [].`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedTags = JSON.parse(jsonStr);
    if (Array.isArray(parsedTags) && parsedTags.every(tag => typeof tag === 'string')) {
      return parsedTags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')); // Normalize tags
    }
    return [];
  } catch (error) {
    console.error("Error suggesting tags with AI:", error);
    throw new Error("Failed to suggest tags with AI.");
  }
};

export const streamSubTasksWithAI = async (
  currentTitle: string,
  currentDescription: string,
  onChunk: (chunk: string) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("Gemini API key not configured.");

  const prompt = `Given the task:
Title: "${currentTitle}"
Description: "${currentDescription}"

Suggest a list of actionable sub-steps or a checklist to help complete this task.
Format them clearly, for example, using bullet points (e.g., "- Action item").
Your response should ONLY contain this list of sub-steps, prefixed with a clear separator like "\\n\\n--- Suggested Sub-tasks ---\\n".
If the task is simple and doesn't need sub-tasks, respond with "\\n\\n--- No sub-tasks suggested for this simple task. ---".
`;

  let accumulatedText = "";
  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.5 },
    });

    for await (const chunk of stream) {
      const textChunk = chunk.text;
      if (typeof textChunk === 'string') {
        onChunk(textChunk);
        accumulatedText += textChunk;
      }
    }
    return accumulatedText;
  } catch (error) {
    console.error("Error streaming sub-tasks with AI:", error);
    throw error;
  }
};

export const streamContextualInfoWithAI = async (
  currentTitle: string,
  currentDescription: string,
  onChunk: (chunk: string) => void,
  onSources: (sources: ContextualSource[]) => void
): Promise<string> => {
  if (!API_KEY) throw new Error("Gemini API key not configured.");

  const prompt = `For the task:
Title: "${currentTitle}"
Description: "${currentDescription}"

Provide relevant contextual information, a brief summary, or links that might be helpful.
Use web search if necessary to get up-to-date details or find resources.
Your response should ONLY contain this information, prefixed with "\\n\\n--- Contextual Information (from AI & Web) ---\\n".
If no specific context is found or needed, respond with "\\n\\n--- No specific contextual information found or deemed necessary by AI. ---".
`;

  let accumulatedText = "";
  let finalApiResponse: GenerateContentResponse | null = null;
  try {
    const stream = await ai.models.generateContentStream({
      model: TEXT_MODEL_NAME_FOR_SEARCH, // Use model specified for search
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.6,
      },
    });

    for await (const chunk of stream) {
      finalApiResponse = chunk; // Keep the latest chunk as it contains cumulative grounding info
      const textChunk = chunk.text;
      if (typeof textChunk === 'string') {
        onChunk(textChunk);
        accumulatedText += textChunk;
      }
    }
    
    if (finalApiResponse) {
        const groundingMetadata = finalApiResponse.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
            const sources: ContextualSource[] = groundingMetadata.groundingChunks
                .map(gc => gc.web)
                .filter(web => web?.uri && web.uri.startsWith('http')) // Ensure it's a web source with a valid URI
                .map(web => ({ uri: web!.uri, title: web!.title || web!.uri })) as ContextualSource[];
            onSources(sources);
        } else {
            onSources([]); // No sources found
        }
    }


    return accumulatedText;
  } catch (error) {
    console.error("Error streaming contextual info with AI:", error);
    if (finalApiResponse) { // Try to extract sources even if text generation failed partially
        const groundingMetadata = finalApiResponse.candidates?.[0]?.groundingMetadata;
         if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
            const sources: ContextualSource[] = groundingMetadata.groundingChunks
                .map(gc => gc.web)
                .filter(web => web?.uri && web.uri.startsWith('http'))
                .map(web => ({ uri: web!.uri, title: web!.title || web!.uri })) as ContextualSource[];
            onSources(sources);
        }
    }
    throw error;
  }
};
