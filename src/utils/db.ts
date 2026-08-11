/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, DisciplinaGlobal, Turma, Professor, Aluno, NotaTrimestre, FaltaTrimestre, PresencaDiaria, PermissaoEdicao, TrimesterSnapshot } from '../types';
import { isFirebaseConfigured, pushStateToFirebase } from './firebase';

const INITIAL_DISCIPLINAS: DisciplinaGlobal[] = [
  { id: '1', nome: 'Língua Portuguesa' },
  { id: '2', nome: 'Matemática' },
  { id: '3', nome: 'Física' },
  { id: '4', nome: 'Química' },
  { id: '5', nome: 'Educação Laboral' },
  { id: '6', nome: 'História' },
  { id: '7', nome: 'Geografia' },
  { id: '8', nome: 'E.M.C' },
];

const DEFAULT_STATE: DatabaseState = {
  anoLectivoIniciado: false,
  anoLectivoTerminado: false,
  currentTrimester: 1,
  autoTimeoutEnabled: true,
  autoTimeoutMinutes: 10,
  admPassword: 'adm321', // Initial credentials
  supportPassword: '12123434Vv?', // Initial support credentials
  blockedClasses: [],
  disciplinasGlobais: INITIAL_DISCIPLINAS,
  turmas: [],
  professores: [],
  alunos: [],
  grades: [],
  absences: [],
  attendance: [],
  permissoesEdicao: [],
  ppPtEnabled: {},
  snapshots: [],
  yearEndSummary: null,
  riskDisciplines: {},
  absenceRiskLimits: {},
  absenceJustifications: [],
  boletimConfig: {},
};

const STORAGE_KEY = 'vanguard_academico_db';
const LEGACY_STORAGE_KEY = 'vanguard_estudante_db';

export function getDatabaseState(): DatabaseState {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure default keys exist in case of partial migrations
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Error reading database from localStorage', e);
  }
  
  // Save default state on first run
  saveDatabaseState(DEFAULT_STATE);
  return DEFAULT_STATE;
}

export function saveDatabaseStateLocal(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Trigger storage event manually for same-window updates
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving database to localStorage', e);
  }
}

export function saveDatabaseState(state: DatabaseState): void {
  saveDatabaseStateLocal(state);

  // Trigger Firebase sync in background if configured
  if (isFirebaseConfigured()) {
    pushStateToFirebase(state).catch((err: any) => {
      console.warn('Sincronização em segundo plano do Firebase adiada (modo offline ativo):', err?.message || err);
    });
  }
}

// Reset everything except support and admin passwords
export function resetYearData(state: DatabaseState): DatabaseState {
  const resetState: DatabaseState = {
    ...state,
    anoLectivoIniciado: false,
    anoLectivoTerminado: false,
    currentTrimester: 1,
    blockedClasses: [],
    turmas: [],
    professores: [],
    alunos: [],
    grades: [],
    absences: [],
    attendance: [],
    permissoesEdicao: [],
    ppPtEnabled: {},
    snapshots: [],
    yearEndSummary: null,
    riskDisciplines: {},
    boletimConfig: {},
  };
  saveDatabaseState(resetState);
  return resetState;
}

// Create a snapshot of the current trimester data
export function createTrimesterSnapshot(state: DatabaseState, trimester: 1 | 2 | 3): TrimesterSnapshot {
  return {
    trimester,
    timestamp: new Date().toISOString(),
    classes: JSON.parse(JSON.stringify(state.turmas)),
    teachers: JSON.parse(JSON.stringify(state.professores)),
    students: JSON.parse(JSON.stringify(state.alunos)),
    grades: JSON.parse(JSON.stringify(state.grades)),
    absences: JSON.parse(JSON.stringify(state.absences)),
    attendance: JSON.parse(JSON.stringify(state.attendance)),
  };
}

// Calculation utility for grades
export interface StudentDisciplineReport {
  disciplineId: string;
  disciplineNome: string;
  macList: number[];
  macAverage: number;
  pp: number | null;
  pt: number | null;
  mat: number | null; // (MAC + PP + PT) / 3 if all present
  absencesCount: number;
}

export function calculateStudentGrades(
  studentId: string,
  disciplineId: string,
  trimester: 1 | 2 | 3,
  state: DatabaseState
): StudentDisciplineReport {
  // Find grade entry
  const gradeEntry = state.grades.find(
    (g) => g.studentId === studentId && g.disciplineId === disciplineId && g.trimester === trimester
  );
  
  // Find discipline name
  const classDisciplineName = state.disciplinasGlobais.find((d) => d.id === disciplineId)?.nome || 'Outra';

  // Find absences
  const absenceEntry = state.absences.find(
    (a) => a.studentId === studentId && a.disciplineId === disciplineId && a.trimester === trimester
  );

  const macList = gradeEntry ? gradeEntry.macGrades : [];
  const macAverage = macList.length > 0 ? macList.reduce((a, b) => a + b, 0) / macList.length : 0;
  const pp = gradeEntry ? gradeEntry.ppGrade : null;
  const pt = gradeEntry ? gradeEntry.ptGrade : null;

  let mat: number | null = null;
  if (macList.length > 0 && pp !== null && pt !== null) {
    // Round to 2 decimal places or nearest half for professional school look
    mat = Number(((macAverage + pp + pt) / 3).toFixed(1));
  }

  return {
    disciplineId,
    disciplineNome: classDisciplineName,
    macList,
    macAverage: Number(macAverage.toFixed(1)),
    pp,
    pt,
    mat,
    absencesCount: absenceEntry ? absenceEntry.count : 0,
  };
}

// Calculate general performance average of a student across all disciplines
export interface StudentGeneralRank {
  studentId: string;
  studentNome: string;
  studentNumero: string;
  age: number;
  averageGrade: number; // average MAT across all disciplines (penalized if failing risk disciplines)
  totalAbsences: number;
  completedDisciplinesCount: number;
  totalDisciplinesCount: number;
  isAtRisk: boolean; // At risk if average MAT is below 10 or has high absences
  originalAverageGrade?: number;
  failingRiskDisciplinesCount?: number;
}

export function calculateClassRankings(
  turmaId: string,
  trimester: 1 | 2 | 3,
  state: DatabaseState
): StudentGeneralRank[] {
  const turma = state.turmas.find((t) => t.id === turmaId);
  if (!turma) return [];

  const students = state.alunos.filter((s) => s.turmaId === turmaId);
  const classDisciplines = turma.disciplinas;
  const riskDiscIds = state.riskDisciplines?.[turmaId] || [];

  const rankings: StudentGeneralRank[] = students.map((student) => {
    let totalMatSum = 0;
    let completedCount = 0;
    let totalAbsences = 0;
    let failingRiskDisciplinesCount = 0;

    classDisciplines.forEach((disc) => {
      const report = calculateStudentGrades(student.id, disc.id, trimester, state);
      if (report.mat !== null) {
        totalMatSum += report.mat;
        completedCount++;
      }
      totalAbsences += report.absencesCount;

      // Check if it is a risk discipline and the student is failing ("estiver mal")
      if (riskDiscIds.includes(disc.id)) {
        const isFailing =
          (report.macList.length > 0 && report.macAverage < 10) ||
          (report.pp !== null && report.pp < 10) ||
          (report.mat !== null && report.mat < 10);

        if (isFailing) {
          failingRiskDisciplinesCount++;
        }
      }
    });

    const rawAverage = completedCount > 0 ? Number((totalMatSum / completedCount).toFixed(1)) : 0;
    
    // Significant penalty: subtract 3.0 points per failing risk discipline
    const penalty = failingRiskDisciplinesCount * 3.0;
    const averageGrade = Math.max(0, Number((rawAverage - penalty).toFixed(1)));

    // Configurable absence risk limit per class (default 15)
    const absenceLimit = state.absenceRiskLimits?.[turmaId] ?? 15;
    const isAbsenceAtRisk = totalAbsences >= absenceLimit;

    // A student is at risk if average < 10, or absences >= limit, or failing risk disciplines
    const isAtRisk = averageGrade < 10 || isAbsenceAtRisk || failingRiskDisciplinesCount > 0;

    return {
      studentId: student.id,
      studentNome: student.nome,
      studentNumero: student.numero,
      age: student.idade,
      averageGrade,
      totalAbsences,
      completedDisciplinesCount: completedCount,
      totalDisciplinesCount: classDisciplines.length,
      isAtRisk,
      originalAverageGrade: rawAverage,
      failingRiskDisciplinesCount,
    };
  });

  // Sort by average grade descending, then absences ascending
  return rankings.sort((a, b) => {
    if (b.averageGrade !== a.averageGrade) {
      return b.averageGrade - a.averageGrade;
    }
    return a.totalAbsences - b.totalAbsences;
  });
}

export interface DisciplineComparisonStats {
  classAverage: number;
  highestGrade: number;
  lowestGrade: number;
  evaluatedCount: number;
  passingCount: number;
}

export function getDisciplineStats(
  turmaId: string,
  disciplineId: string,
  trimester: 1 | 2 | 3,
  state: DatabaseState
): DisciplineComparisonStats {
  const students = state.alunos.filter((s) => s.turmaId === turmaId);
  const gradesList: number[] = [];
  let passingCount = 0;

  students.forEach((st) => {
    const report = calculateStudentGrades(st.id, disciplineId, trimester, state);
    const score = report.mat !== null ? report.mat : (report.macList.length > 0 ? report.macAverage : null);
    if (score !== null) {
      gradesList.push(score);
      if (score >= 10) passingCount++;
    }
  });

  if (gradesList.length === 0) {
    return { classAverage: 0, highestGrade: 0, lowestGrade: 0, evaluatedCount: 0, passingCount: 0 };
  }

  const sum = gradesList.reduce((a, b) => a + b, 0);
  const classAverage = Number((sum / gradesList.length).toFixed(1));
  const highestGrade = Math.max(...gradesList);
  const lowestGrade = Math.min(...gradesList);

  return {
    classAverage,
    highestGrade,
    lowestGrade,
    evaluatedCount: gradesList.length,
    passingCount,
  };
}
