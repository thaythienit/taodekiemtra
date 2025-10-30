export enum CognitiveLevel {
  NHAN_BIET = 'Nhận biết',
  THONG_HIEU = 'Thông hiểu',
  VAN_DUNG = 'Vận dụng',
}

export interface MultipleChoiceQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;

  cognitiveLevel: CognitiveLevel;
}

export interface TrueFalseQuestion {
  questionText: string;
  correctAnswer: boolean;
  cognitiveLevel: CognitiveLevel;
}

export interface MatchingPair {
  itemA: string;
  itemB: string;
}

export interface MatchingQuestion {
  prompt: string;
  pairs: MatchingPair[];
  cognitiveLevel: CognitiveLevel;
}

export interface FillBlankQuestion {
  questionText: string;
  correctAnswer: string;
  cognitiveLevel: CognitiveLevel;
}

export interface WrittenQuestion {
  questionText: string;
  suggestedAnswer: string;
  cognitiveLevel: CognitiveLevel;
}

export interface GeneratedTest {
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  trueFalseQuestions: TrueFalseQuestion[];
  matchingQuestions: MatchingQuestion[];
  fillBlankQuestions: FillBlankQuestion[];
  writtenQuestions: WrittenQuestion[];
}

export interface LessonTopic {
  id: string;
  name: string;
  startPage: number;
  endPage: number;
}

export interface FormData {
  subject: string;
  className: string;
  mcqRatio: number;
  writtenRatio: number;
  mcqCount: number;
  writtenCount: number;
  recognitionRatio: number;
  comprehensionRatio: number;
  applicationRatio: number;
  fileContent: string;
  fileImages: string[];
  lessonTopics: LessonTopic[];
  timeLimit: number;
  mcqTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
    matching: boolean;
    fillBlank: boolean;
  };
}

export interface MatrixRow {
  topic: string;
  mcq: {
    recognition: number;
    comprehension: number;
    application: number;
  };
  written: {
    recognition: number;
    comprehension: number;
    application: number;
  };
}

export type TestMatrix = MatrixRow[];

export interface SavedTest {
  id: string;
  name: string;
  createdAt: string;
  testData: GeneratedTest;
  formData: FormData;
}

export interface WrittenGradingGuide {
  questionText: string;
  detailedGuide: string; // Detailed grading steps and points breakdown.
}

export interface TestSolution {
    writtenGradingGuides: WrittenGradingGuide[];
}
