export type SectionId =
  | 'ux-intelligence'
  | 'ux-knowledge'
  | 'ux-project-planning'
  | 'user-understanding'
  | 'user-requirements'
  | 'ux-design-implementation'
  | 'ux-design-evaluation'
  | 'ux-operations'
  | 'ux-organization';

export interface Section {
  id: SectionId;
  label: string;
  labelEn: string;
  description: string;
}

export interface Question {
  id: string;
  sectionId: SectionId;
  question: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  tip?: string;
}

export interface LearningRecord {
  correct: number;
  incorrect: number;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  nextReview: string | null;
  bookmarked: boolean;
  lastAnswered: string | null;
}

export type LearningHistory = Record<string, LearningRecord>;
