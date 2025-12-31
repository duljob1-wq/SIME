export type QuestionType = 'star' | 'slider' | 'text';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
}

export interface GlobalQuestion extends Question {
  category: 'facilitator' | 'process';
  isDefault: boolean;
}

export interface Contact {
  id: string;
  name: string;
  whatsapp: string;
}

export interface Facilitator {
  id: string;
  name: string;
  subject: string;
  sessionDate: string;
  whatsapp?: string; // Added for automation
}

export interface Training {
  id: string;
  accessCode: string; 
  title: string;
  description?: string; // New Field
  startDate: string;
  endDate: string;
  processEvaluationDate: string;
  facilitators: Facilitator[];
  facilitatorQuestions: Question[];
  processQuestions: Question[];
  createdAt: number;
  
  // Automation Features
  targets?: number[]; // e.g., [10, 20, 50]
  reportedTargets?: Record<string, boolean>; // Key format: "facilitatorId_targetNumber"
}

export interface Response {
  id: string;
  trainingId: string;
  type: 'facilitator' | 'process';
  targetName?: string; 
  targetSubject?: string; 
  answers: Record<string, string | number>; 
  timestamp: number;
}

export interface AppSettings {
  waApiKey: string;
  waBaseUrl: string;
  waHeader: string;
  waFooter: string;
  defaultTrainingDescription?: string; // New Field
}