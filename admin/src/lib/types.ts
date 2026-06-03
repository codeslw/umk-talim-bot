export type Course = {
  id: number;
  title: string;
  educationType?: string | null;
  duration?: string | null;
  format: string;
  hasPractice: boolean;
  cost?: string | null;
  canPayInInstallments: boolean;
  ageMin: number;
  ageMax: number;
  additionalInfo?: string | null;
  imageFileId?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { applications: number };
};

export type User = {
  id: number;
  telegramId: string;
  username?: string | null;
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
  birthDate?: string | null;
  city?: string | null;
  createdAt: string;
  _count?: { applications: number };
};

export type Application = {
  id: number;
  userId: number;
  courseId: number;
  experience?: string | null;
  workplace?: string | null;
  educationType?: string | null;
  specialization?: string | null;
  learningGoal?: string | null;
  studyFormat?: string | null;
  studyTime?: string | null;
  source?: string | null;
  comment?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  course?: Course;
};

export type Stats = {
  total: number;
  byStatus: Array<{ status: string; _count: { _all: number } }>;
  byCourse: Array<{ courseId: number; _count: { _all: number } }>;
  byGender: Array<{ gender: string | null; _count: { _all: number } }>;
  avgAge: number | null;
};

export type AdminMeta = {
  questionTypes: string[];
  responseTypes: string[];
  applicationStatuses: string[];
  applicationStatusLabels: Record<string, string>;
  educationTypes: string[];
  learningGoals: string[];
  studyFormats: string[];
  courseFormats: Record<string, string>;
};

export type SchemaQuestion = {
  key: string;
  label: string;
  questionType: string;
  responseType: string;
  required: boolean;
  helpText?: string | null;
  placeholder?: string | null;
  options: string[];
  validation: Record<string, unknown>;
};

export type ManagedSchema = {
  title: string;
  description: string;
  questions: SchemaQuestion[];
};

export type DynamicSchemas = {
  course: ManagedSchema;
  application: ManagedSchema;
};

export type AdminUser = {
  id: number;
  username: string;
  displayName?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type AuthStatus = {
  user: AdminUser | null;
  needsBootstrap: boolean;
};
