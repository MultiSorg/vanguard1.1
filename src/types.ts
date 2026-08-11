/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DisciplinaGlobal {
  id: string;
  nome: string;
}

export interface ClassDisciplina {
  id: string;
  nome: string;
  professorId: string | null; // ID of the teacher assigned to teach this discipline in this class
}

export interface Turma {
  id: string;
  periodo: 'Manhã' | 'Tarde' | 'Noite';
  sala: string;
  identificacao: string; // e.g. "Turma C", "E5GT"
  classe: string; // e.g. "9ª classe", "12ª classe"
  disciplinas: ClassDisciplina[];
  coordenadorId: string | null; // ID of the teacher who coordinates this class
}

export interface Professor {
  id: string;
  nome: string;
  senha: string;
  turmaId: string; // Belongs to this specific class profile
  disciplinaId: string; // The discipline they teach in that class
  cargo: 'Coordenador' | 'Normal';
  sessionVersion: number; // Incremented when credentials change to force logout on other devices
}

export interface Aluno {
  id: string;
  turmaId: string;
  nome: string;
  idade: number;
  numero: string; // Student number, e.g., "17"
}

export interface NotaTrimestre {
  studentId: string;
  disciplineId: string;
  trimester: 1 | 2 | 3;
  macGrades: number[]; // Set of continuous assessment marks
  ppGrade: number | null; // Prova do Professor
  ptGrade: number | null; // Prova Trimestral
}

export interface FaltaTrimestre {
  studentId: string;
  disciplineId: string;
  trimester: 1 | 2 | 3;
  count: number;
}

export interface PresencaDiaria {
  id: string;
  studentId: string;
  disciplineId: string;
  date: string; // YYYY-MM-DD
  status: 'P' | 'F'; // Presente | Falta
}

export interface PermissaoEdicao {
  classId: string;
  disciplineId: string;
  concedida: boolean; // True if the teacher of disciplineId in classId allowed the coordinator to edit grades
}

export interface TrimesterSnapshot {
  trimester: 1 | 2 | 3;
  timestamp: string;
  classes: Turma[];
  teachers: Professor[];
  students: Aluno[];
  grades: NotaTrimestre[];
  absences: FaltaTrimestre[];
  attendance: PresencaDiaria[];
}

export interface DatabaseState {
  anoLectivoIniciado: boolean;
  anoLectivoTerminado: boolean;
  currentTrimester: 1 | 2 | 3;
  autoTimeoutEnabled: boolean;
  autoTimeoutMinutes: number;
  admPassword: string; // default "adm321"
  supportPassword: string; // default "12123434Vv?"
  blockedClasses: string[]; // List of Class IDs blocked from logging in
  disciplinasGlobais: DisciplinaGlobal[];
  turmas: Turma[];
  professores: Professor[];
  alunos: Aluno[];
  grades: NotaTrimestre[];
  absences: FaltaTrimestre[];
  attendance: PresencaDiaria[];
  permissoesEdicao: PermissaoEdicao[];
  ppPtEnabled: Record<string, { pp: boolean; pt: boolean }>; // Map of classId -> {pp, pt}
  snapshots: TrimesterSnapshot[]; // Saved historical trimester data
  yearEndSummary: {
    closedAt: string;
    snapshots: TrimesterSnapshot[];
    finalGrades: any[]; // Final summary of year end
  } | null;
  riskDisciplines: Record<string, string[]>; // classId -> list of disciplineIds
  boletimConfig: Record<string, {
    cabecalho: string;
    alinhamento: 'left' | 'center' | 'right';
    dataEmissao: string;
    anoLectivo: string;
    tamanho: 'A5' | 'A6';
  }>;
}
