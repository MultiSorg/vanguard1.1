/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Calendar, FileText, ChevronRight, Award, Lock, Unlock, 
  Settings, UserPlus, AlertCircle, LogOut, CheckCircle, ShieldAlert, RefreshCw, Eye, Printer, Download, Sparkles
} from 'lucide-react';
import { DatabaseState, Professor, Aluno, NotaTrimestre, FaltaTrimestre, PresencaDiaria } from '../types';
import { saveDatabaseState, calculateStudentGrades, calculateClassRankings, StudentGeneralRank } from '../utils/db';

interface TeacherPanelProps {
  dbState: DatabaseState;
  loggedTeacher: Professor;
  onUpdateDbState: (newState: DatabaseState) => void;
  onLogout: () => void;
}

export default function TeacherPanel({ dbState, loggedTeacher, onUpdateDbState, onLogout }: TeacherPanelProps) {
  const isCoordinator = loggedTeacher.cargo === 'Coordenador';
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'presencas' | 'ranking-disciplina' | 'coordenacao'>('lancamentos');

  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Turma and Discipline detail cache
  const currentClass = dbState.turmas.find(t => t.id === loggedTeacher.turmaId);
  const currentDiscipline = dbState.disciplinasGlobais.find(d => d.id === loggedTeacher.disciplinaId);

  const classBoletimConfig = currentClass ? (dbState.boletimConfig?.[currentClass.id] || {
    cabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL DE LUANDA\nDIRECÇÃO PROVINCIAL DA EDUCAÇÃO',
    alinhamento: 'center' as 'left' | 'center' | 'right',
    dataEmissao: new Date().toLocaleDateString('pt-PT'),
    anoLectivo: 'Ano Lectivo 2025/2026',
    tamanho: 'A5' as 'A5' | 'A6'
  }) : {
    cabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL DE LUANDA\nDIRECÇÃO PROVINCIAL DA EDUCAÇÃO',
    alinhamento: 'center' as 'left' | 'center' | 'right',
    dataEmissao: new Date().toLocaleDateString('pt-PT'),
    anoLectivo: 'Ano Lectivo 2025/2026',
    tamanho: 'A5' as 'A5' | 'A6'
  };

  // --- 1. LANÇAMENTO DE NOTAS STATES ---
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState<Aluno | null>(null);
  const [newMacGrade, setNewMacGrade] = useState('');
  const [newPpGrade, setNewPpGrade] = useState('');
  const [newPtGrade, setNewPtGrade] = useState('');
  const [showGradeConfirm, setShowGradeConfirm] = useState(false);
  const [gradePendingConfirm, setGradePendingConfirm] = useState<{
    type: 'mac' | 'pp' | 'pt';
    value: number;
  } | null>(null);

  // --- 2. REGISTRO DE FALTAS STATES ---
  const [absencesStudentId, setAbsencesStudentId] = useState('');
  const [absencesCountInput, setAbsencesCountInput] = useState('1');

  // --- 3. PRESENÇAS DIÁRIAS STATES ---
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyAttendanceList, setDailyAttendanceList] = useState<Record<string, 'P' | 'F'>>({});

  // --- 4. COORDENAÇÃO STATES (Coordenador only) ---
  const [coordTab, setCoordTab] = useState<'alunos' | 'ranking-geral' | 'pautas-boletins' | 'grades-config'>('alunos');
  // Student Enrollment
  const [newStudentNome, setNewStudentNome] = useState('');
  const [newStudentIdade, setNewStudentIdade] = useState('');
  const [newStudentNumero, setNewStudentNumero] = useState('');
  // Selected student for Report Card print
  const [reportCardStudentId, setReportCardStudentId] = useState('');
  // Print Overlay preview triggers
  const [printLayoutType, setPrintLayoutType] = useState<'boletim' | 'pauta' | 'backup' | null>(null);

  // --- 5. PERMISSION FOR COORDINATOR TO EDIT GRADES ---
  // A Normal Teacher can toggle if the coordinator is allowed to edit grades in their discipline
  const isCoordAllowedToEditMyDiscipline = () => {
    if (!currentClass) return false;
    const perm = dbState.permissoesEdicao.find(
      p => p.classId === currentClass.id && p.disciplineId === loggedTeacher.disciplinaId
    );
    return perm ? perm.concedida : false;
  };

  const handleToggleCoordEditPermission = () => {
    if (!currentClass) return;
    const updatedState = { ...dbState };
    const permIdx = updatedState.permissoesEdicao.findIndex(
      p => p.classId === currentClass.id && p.disciplineId === loggedTeacher.disciplinaId
    );

    if (permIdx !== -1) {
      updatedState.permissoesEdicao[permIdx].concedida = !updatedState.permissoesEdicao[permIdx].concedida;
    } else {
      updatedState.permissoesEdicao.push({
        classId: currentClass.id,
        disciplineId: loggedTeacher.disciplinaId,
        concedida: true
      });
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess('Permissão de edição para o Coordenador atualizada!');
  };

  const handleUpdateBoletimConfig = (key: string, value: any) => {
    if (!currentClass) return;
    const updatedState = { ...dbState };
    if (!updatedState.boletimConfig) {
      updatedState.boletimConfig = {};
    }
    
    const currentConfig = updatedState.boletimConfig[currentClass.id] || {
      cabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO\nDIRECÇÃO PEDAGÓGICA REGIONAL',
      alinhamento: 'center',
      dataEmissao: new Date().toLocaleDateString('pt-PT'),
      anoLectivo: 'Ano Lectivo 2025/2026',
      tamanho: 'A5'
    };

    updatedState.boletimConfig[currentClass.id] = {
      ...currentConfig,
      [key]: value
    };

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
  };

  const handleToggleRiskDiscipline = (disciplineId: string) => {
    if (!currentClass) return;
    const updatedState = { ...dbState };
    if (!updatedState.riskDisciplines) {
      updatedState.riskDisciplines = {};
    }
    
    const currentList = updatedState.riskDisciplines[currentClass.id] || [];
    if (currentList.includes(disciplineId)) {
      updatedState.riskDisciplines[currentClass.id] = currentList.filter(id => id !== disciplineId);
    } else {
      updatedState.riskDisciplines[currentClass.id] = [...currentList, disciplineId];
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess('Configuração de Disciplina de Risco atualizada!');
  };

  // Helper messages
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // Auto-fill attendance list with existing for date, or 'P' by default
  useEffect(() => {
    if (!currentClass) return;
    const filteredAlunos = dbState.alunos.filter(s => s.turmaId === currentClass.id);
    const initialList: Record<string, 'P' | 'F'> = {};
    
    filteredAlunos.forEach(aluno => {
      const existing = dbState.attendance.find(
        att => att.studentId === aluno.id && 
               att.disciplineId === loggedTeacher.disciplinaId && 
               att.date === attendanceDate
      );
      initialList[aluno.id] = existing ? existing.status : 'P';
    });
    
    setDailyAttendanceList(initialList);
  }, [attendanceDate, dbState.attendance, currentClass, loggedTeacher.disciplinaId]);

  // --- ACTIONS ---

  // Lançamento de notas: Propose Nota (triggers Huge Confirmation PopUp)
  const proposeMacGrade = (student: Aluno) => {
    const val = parseFloat(newMacGrade);
    if (isNaN(val) || val < 0 || val > 20) {
      triggerError('A nota de avaliação MAC deve ser um valor de 0 a 20.');
      return;
    }
    setSelectedStudentForGrade(student);
    setGradePendingConfirm({ type: 'mac', value: val });
    setShowGradeConfirm(true);
  };

  const proposePpGrade = (student: Aluno) => {
    const val = parseFloat(newPpGrade);
    if (isNaN(val) || val < 0 || val > 20) {
      triggerError('A nota de PP deve ser um valor de 0 a 20.');
      return;
    }
    setSelectedStudentForGrade(student);
    setGradePendingConfirm({ type: 'pp', value: val });
    setShowGradeConfirm(true);
  };

  const proposePtGrade = (student: Aluno) => {
    const val = parseFloat(newPtGrade);
    if (isNaN(val) || val < 0 || val > 20) {
      triggerError('A nota de PT deve ser um valor de 0 a 20.');
      return;
    }
    setSelectedStudentForGrade(student);
    setGradePendingConfirm({ type: 'pt', value: val });
    setShowGradeConfirm(true);
  };

  // Confirm and actually record grade in database
  const handleConfirmGrade = () => {
    if (!selectedStudentForGrade || !gradePendingConfirm) return;

    const { type, value } = gradePendingConfirm;
    const updatedState = { ...dbState };

    let gradeEntryIdx = updatedState.grades.findIndex(
      g => g.studentId === selectedStudentForGrade.id &&
           g.disciplineId === loggedTeacher.disciplinaId &&
           g.trimester === dbState.currentTrimester
    );

    if (gradeEntryIdx === -1) {
      // Create new trimester grade card
      const newEntry: NotaTrimestre = {
        studentId: selectedStudentForGrade.id,
        disciplineId: loggedTeacher.disciplinaId,
        trimester: dbState.currentTrimester,
        macGrades: [],
        ppGrade: null,
        ptGrade: null
      };
      updatedState.grades.push(newEntry);
      gradeEntryIdx = updatedState.grades.length - 1;
    }

    if (type === 'mac') {
      updatedState.grades[gradeEntryIdx].macGrades.push(value);
      setNewMacGrade('');
    } else if (type === 'pp') {
      updatedState.grades[gradeEntryIdx].ppGrade = value;
      setNewPpGrade('');
    } else if (type === 'pt') {
      updatedState.grades[gradeEntryIdx].ptGrade = value;
      setNewPtGrade('');
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);

    triggerSuccess(`Nota ${value} gravada com sucesso!`);
    setShowGradeConfirm(false);
    setGradePendingConfirm(null);
    setSelectedStudentForGrade(null);
  };

  // Atribuir Faltas Direct launch (Normal and Coordinator)
  const handleAddFaltas = (studentId: string, count: number) => {
    if (count <= 0) return;
    const updatedState = { ...dbState };

    let absenceIdx = updatedState.absences.findIndex(
      a => a.studentId === studentId &&
           a.disciplineId === loggedTeacher.disciplinaId &&
           a.trimester === dbState.currentTrimester
    );

    if (absenceIdx !== -1) {
      updatedState.absences[absenceIdx].count += count;
    } else {
      updatedState.absences.push({
        studentId,
        disciplineId: loggedTeacher.disciplinaId,
        trimester: dbState.currentTrimester,
        count
      });
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess(`Registada(s) ${count} falta(s) para o aluno.`);
  };

  // Presença Diária Checkbox save
  const handleSavePresenca = () => {
    if (!currentClass) return;
    const updatedState = { ...dbState };

    Object.entries(dailyAttendanceList).forEach(([studentId, val]) => {
      const status: 'P' | 'F' = val === 'F' ? 'F' : 'P';
      // Find or insert
      const idx = updatedState.attendance.findIndex(
        att => att.studentId === studentId &&
               att.disciplineId === loggedTeacher.disciplinaId &&
               att.date === attendanceDate
      );

      if (idx !== -1) {
        updatedState.attendance[idx].status = status;
      } else {
        updatedState.attendance.push({
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          studentId,
          disciplineId: loggedTeacher.disciplinaId,
          date: attendanceDate,
          status
        });

        // If status is 'F' (absence), also log it into trimester absences counter!
        if (status === 'F') {
          let absenceIdx = updatedState.absences.findIndex(
            a => a.studentId === studentId &&
                 a.disciplineId === loggedTeacher.disciplinaId &&
                 a.trimester === dbState.currentTrimester
          );

          if (absenceIdx !== -1) {
            updatedState.absences[absenceIdx].count += 1;
          } else {
            updatedState.absences.push({
              studentId,
              disciplineId: loggedTeacher.disciplinaId,
              trimester: dbState.currentTrimester,
              count: 1
            });
          }
        }
      }
    });

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess(`Presenças diárias do dia ${attendanceDate} gravadas e sincronizadas.`);
  };

  // --- COORDINATOR FUNCTIONALITIES ---

  // Add Student enrollment
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentNome.trim() || !newStudentIdade.trim() || !newStudentNumero.trim()) {
      triggerError('Preencha todas as informações do estudante.');
      return;
    }

    if (!currentClass) return;

    // Check if student number is already used in this class
    const duplicate = dbState.alunos.find(
      s => s.turmaId === currentClass.id && s.numero === newStudentNumero.trim()
    );
    if (duplicate) {
      triggerError(`O número ${newStudentNumero} já está sendo usado por outro aluno nesta turma.`);
      return;
    }

    const updatedState = { ...dbState };
    updatedState.alunos.push({
      id: 'student_' + Date.now(),
      turmaId: currentClass.id,
      nome: newStudentNome.trim(),
      idade: parseInt(newStudentIdade) || 15,
      numero: newStudentNumero.trim()
    });

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);

    setNewStudentNome('');
    setNewStudentIdade('');
    setNewStudentNumero('');
    triggerSuccess('Aluno matriculado e integrado com sucesso no perfil de turma!');
  };

  // Coordinator toggle PP and PT grade inputs
  const handleTogglePpPtInput = (type: 'pp' | 'pt') => {
    if (!currentClass) return;
    const updatedState = { ...dbState };
    
    if (!updatedState.ppPtEnabled[currentClass.id]) {
      updatedState.ppPtEnabled[currentClass.id] = { pp: false, pt: false };
    }

    updatedState.ppPtEnabled[currentClass.id][type] = !updatedState.ppPtEnabled[currentClass.id][type];

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess(`Atribuição de notas de ${type.toUpperCase()} foi ${updatedState.ppPtEnabled[currentClass.id][type] ? 'HABILITADA' : 'DESABILITADA'} para todos os professores.`);
  };

  const isPpInputEnabled = () => {
    if (!currentClass) return false;
    return dbState.ppPtEnabled[currentClass.id]?.pp || false;
  };

  const isPtInputEnabled = () => {
    if (!currentClass) return false;
    return dbState.ppPtEnabled[currentClass.id]?.pt || false;
  };

  // Coordinator Grades Modification workflow
  const [editingGradePayload, setEditingGradePayload] = useState<{
    studentId: string;
    disciplineId: string;
    field: 'mac' | 'pp' | 'pt';
    macIdx?: number;
    value: string;
  } | null>(null);

  const handleCoordinatorEditGrade = (
    studentId: string,
    disciplineId: string,
    field: 'mac' | 'pp' | 'pt',
    macIdx?: number
  ) => {
    if (!currentClass) return;
    
    // Checks: Is it my own discipline? No authorization needed.
    // Is it another discipline? Must have permission allowed by that discipline's teacher!
    if (disciplineId !== loggedTeacher.disciplinaId) {
      const allowed = dbState.permissoesEdicao.find(
        p => p.classId === currentClass.id && p.disciplineId === disciplineId
      )?.concedida;

      if (!allowed) {
        triggerError('ACESSO NEGADO: O professor regente desta disciplina não concedeu permissão para você modificar as notas.');
        return;
      }
    }

    // Prepare payload
    const grade = dbState.grades.find(
      g => g.studentId === studentId && g.disciplineId === disciplineId && g.trimester === dbState.currentTrimester
    );

    let val = '';
    if (grade) {
      if (field === 'mac' && macIdx !== undefined) val = grade.macGrades[macIdx].toString();
      if (field === 'pp') val = (grade.ppGrade ?? '').toString();
      if (field === 'pt') val = (grade.ptGrade ?? '').toString();
    }

    setEditingGradePayload({ studentId, disciplineId, field, macIdx, value: val });
  };

  const saveCoordinatorEditedGrade = () => {
    if (!editingGradePayload) return;
    const { studentId, disciplineId, field, macIdx, value } = editingGradePayload;
    const parsedVal = parseFloat(value);
    
    if (value !== '' && (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 20)) {
      triggerError('A nota deve ser de 0 a 20 ou limpa (vazia).');
      return;
    }

    const updatedState = { ...dbState };
    const idx = updatedState.grades.findIndex(
      g => g.studentId === studentId && g.disciplineId === disciplineId && g.trimester === dbState.currentTrimester
    );

    if (idx !== -1) {
      if (field === 'mac' && macIdx !== undefined) {
        if (value === '') {
          updatedState.grades[idx].macGrades.splice(macIdx, 1);
        } else {
          updatedState.grades[idx].macGrades[macIdx] = parsedVal;
        }
      } else if (field === 'pp') {
        updatedState.grades[idx].ppGrade = value === '' ? null : parsedVal;
      } else if (field === 'pt') {
        updatedState.grades[idx].ptGrade = value === '' ? null : parsedVal;
      }
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess('Nota alterada e salva pelo Coordenador de Turma.');
    setEditingGradePayload(null);
  };

  // Get active student list in class matching search
  const getActiveStudents = () => {
    if (!currentClass) return [];
    return dbState.alunos.filter(
      s => s.turmaId === currentClass.id && 
           (s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.numero.includes(searchQuery))
    );
  };

  // Performance computations for rankings
  const getRankings = () => {
    if (!currentClass) return [];
    return calculateClassRankings(currentClass.id, dbState.currentTrimester, dbState);
  };

  // Rank in own discipline
  const getDisciplineRanking = () => {
    if (!currentClass) return [];
    const students = dbState.alunos.filter(s => s.turmaId === currentClass.id);
    
    const mapped = students.map(st => {
      const report = calculateStudentGrades(st.id, loggedTeacher.disciplinaId, dbState.currentTrimester, dbState);
      return {
        studentId: st.id,
        nome: st.nome,
        numero: st.numero,
        macAverage: report.macAverage,
        pp: report.pp,
        pt: report.pt,
        mat: report.mat,
        absences: report.absencesCount
      };
    });

    // Sort by MAT descending (using macAverage as secondary rank factor if MAT is null)
    return mapped.sort((a, b) => {
      const aVal = a.mat !== null ? a.mat : a.macAverage * 0.1;
      const bVal = b.mat !== null ? b.mat : b.macAverage * 0.1;
      return bVal - aVal;
    });
  };

  // Generate mock printable views trigger
  const handleTriggerPrint = (type: 'boletim' | 'pauta' | 'backup') => {
    if (type === 'boletim' && !reportCardStudentId) {
      triggerError('Selecione um aluno para emissão de boletim.');
      return;
    }
    setPrintLayoutType(type);
  };

  return (
    <div id="teacher-dashboard" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-950 px-6 py-4 border-b border-indigo-500/20 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide">Vanguard Estudante &bull; Docente</h1>
            <p className="text-xs text-indigo-400 font-mono">
              Sala {currentClass?.sala} &bull; {currentClass?.classe} - {currentClass?.identificacao} ({currentClass?.periodo}) &bull; {currentTrimesterName(dbState.currentTrimester)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden md:block">
            <span className="text-xs text-slate-500 block uppercase font-mono">Docente Logado</span>
            <span className="font-bold text-white">{loggedTeacher.nome}</span>
            <span className={`text-[9px] uppercase tracking-wider block font-bold ${isCoordinator ? 'text-amber-400' : 'text-slate-400'}`}>
              {isCoordinator ? 'Coordenador de Turma (Especial)' : 'Professor Regente'} &bull; {currentDiscipline?.nome}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-200 border border-red-500/20 hover:border-red-500/40 rounded text-xs transition-colors flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Body Columns */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-3 mb-2 font-bold">Atividades de Disciplina</p>

          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'lancamentos' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Lançamento de Notas</span>
          </button>

          <button
            onClick={() => setActiveTab('presencas')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'presencas' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Chamada / Presenças</span>
          </button>

          <button
            onClick={() => setActiveTab('ranking-disciplina')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'ranking-disciplina' ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Rendimento Disciplinar</span>
          </button>

          {/* Teacher coordination edit permission toggler */}
          <div className="p-3 bg-slate-950/60 rounded border border-slate-850 space-y-2 text-xs mt-4">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Controle do Coordenador</span>
            <p className="text-[10px] text-slate-400">Permitir que o Coordenador altere notas da sua disciplina ({currentDiscipline?.nome})?</p>
            <button
              onClick={handleToggleCoordEditPermission}
              className={`w-full py-1.5 text-[10px] font-bold font-mono rounded uppercase transition-all ${
                isCoordAllowedToEditMyDiscipline()
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {isCoordAllowedToEditMyDiscipline() ? 'Permissão Concedida' : 'Dar Permissão'}
            </button>
          </div>

          {/* COORDINATOR TAB SELECTOR */}
          {isCoordinator && (
            <div className="border-t border-slate-800 pt-4 mt-4">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-3 mb-2 font-bold">Módulo de Coordenação</p>
              
              <button
                onClick={() => setActiveTab('coordenacao')}
                className={`w-full text-left px-4 py-2.5 rounded font-semibold text-sm flex items-center space-x-3 transition-all ${
                  activeTab === 'coordenacao' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Painel do Coordenador</span>
              </button>
            </div>
          )}
        </aside>

        {/* Action Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          
          {/* Status alerts */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 mb-4 bg-emerald-950/50 border border-emerald-500/30 rounded text-emerald-300 text-sm"
              >
                {successMsg}
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 mb-4 bg-red-950/50 border border-red-500/30 rounded text-red-300 text-sm"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SEARCH BAR (except for coordinator's admin settings page) */}
          {activeTab !== 'coordenacao' && (
            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar aluno pelo nome ou número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          {/* TAB 1: LANÇAMENTO DE NOTAS */}
          {activeTab === 'lancamentos' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>Atribuição e Lançamento de Notas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Lançamento de notas trimestrais na disciplina regente ({currentDiscipline?.nome}). Notas MAC são adicionadas livremente. PP e PT necessitam de ativação pelo Coordenador.</p>
              </div>

              {/* Student grading matrix */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="px-5 py-3">Nº</th>
                      <th className="px-5 py-3">Nome do Aluno</th>
                      <th className="px-5 py-3">Notas MAC (Contínuas)</th>
                      <th className="px-5 py-3">PP (Prova Prof.)</th>
                      <th className="px-5 py-3">PT (Trimestral)</th>
                      <th className="px-5 py-3">Nota Final MAT</th>
                      <th className="px-5 py-3 text-right">Adicionar Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs">
                    {getActiveStudents().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">Nenhum aluno encontrado ou cadastrado nesta turma.</td>
                      </tr>
                    ) : (
                      getActiveStudents().map((st) => {
                        const gradesReport = calculateStudentGrades(st.id, loggedTeacher.disciplinaId, dbState.currentTrimester, dbState);
                        return (
                          <tr key={st.id} className="hover:bg-slate-900/10">
                            <td className="px-5 py-3 font-mono text-indigo-400 font-bold">{st.numero}</td>
                            <td className="px-5 py-3 font-semibold text-white">{st.nome}</td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {gradesReport.macList.length === 0 ? (
                                  <span className="text-slate-600 font-mono italic">Sem avaliações</span>
                                ) : (
                                  gradesReport.macList.map((g, gi) => (
                                    <span key={gi} className="px-2 py-0.5 bg-slate-900 rounded font-bold font-mono border border-slate-800">
                                      {g}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 font-mono font-bold">
                              {gradesReport.pp !== null ? (
                                <span className="text-white">{gradesReport.pp}</span>
                              ) : (
                                <span className="text-slate-600 italic">Lançar PP</span>
                              )}
                            </td>
                            <td className="px-5 py-3 font-mono font-bold">
                              {gradesReport.pt !== null ? (
                                <span className="text-white">{gradesReport.pt}</span>
                              ) : (
                                <span className="text-slate-600 italic">Lançar PT</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {gradesReport.mat !== null ? (
                                <span className={`px-2 py-0.5 rounded font-bold font-mono ${gradesReport.mat >= 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {gradesReport.mat}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono italic">Pendente (MAC+PP+PT)</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* MAC input */}
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.5"
                                    placeholder="MAC"
                                    onChange={(e) => setNewMacGrade(e.target.value)}
                                    className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-center text-xs text-white"
                                  />
                                  <button
                                    onClick={() => proposeMacGrade(st)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase rounded"
                                  >
                                    Add MAC
                                  </button>
                                </div>

                                {/* PP input - lock check */}
                                <div className="flex items-center space-x-1 border-l border-slate-800 pl-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.5"
                                    placeholder="PP"
                                    disabled={!isPpInputEnabled()}
                                    onChange={(e) => setNewPpGrade(e.target.value)}
                                    className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-center text-xs text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                  <button
                                    onClick={() => proposePpGrade(st)}
                                    disabled={!isPpInputEnabled()}
                                    className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase rounded disabled:opacity-30"
                                    title={!isPpInputEnabled() ? "Bloqueado pelo Coordenador" : "Adicionar PP"}
                                  >
                                    Add PP
                                  </button>
                                </div>

                                {/* PT input - lock check */}
                                <div className="flex items-center space-x-1 border-l border-slate-800 pl-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.5"
                                    placeholder="PT"
                                    disabled={!isPtInputEnabled()}
                                    onChange={(e) => setNewPtGrade(e.target.value)}
                                    className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-center text-xs text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                  <button
                                    onClick={() => proposePtGrade(st)}
                                    disabled={!isPtInputEnabled()}
                                    className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase rounded disabled:opacity-30"
                                    title={!isPtInputEnabled() ? "Bloqueado pelo Coordenador" : "Adicionar PT"}
                                  >
                                    Add PT
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PRESENÇAS / CHAMADA */}
          {activeTab === 'presencas' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    <span>Marcação de Presenças Diárias</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Insira a data do dia e marque a presença ou ausência para cada estudante.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-400 font-mono">DATA DE MARCAÇÃO:</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono font-bold text-indigo-400"
                  />
                </div>
              </div>

              {/* Attendance checklist */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-w-xl">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/20 text-xs text-slate-400 font-mono flex justify-between items-center">
                  <span>Lista de Estudantes</span>
                  <span>Opções de Presença</span>
                </div>

                <div className="divide-y divide-slate-850">
                  {getActiveStudents().length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-mono text-xs">Nenhum aluno cadastrado.</div>
                  ) : (
                    getActiveStudents().map((st) => {
                      const currentStatus = dailyAttendanceList[st.id] || 'P';
                      return (
                        <div key={st.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="font-mono text-indigo-400 font-bold">Nº {st.numero}</span>
                            <span className="font-semibold text-white">{st.nome}</span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setDailyAttendanceList({ ...dailyAttendanceList, [st.id]: 'P' })}
                              className={`px-3 py-1 text-[10px] font-bold rounded font-mono uppercase transition-colors ${
                                currentStatus === 'P'
                                  ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Presente
                            </button>
                            <button
                              onClick={() => setDailyAttendanceList({ ...dailyAttendanceList, [st.id]: 'F' })}
                              className={`px-3 py-1 text-[10px] font-bold rounded font-mono uppercase transition-colors ${
                                currentStatus === 'F'
                                  ? 'bg-red-500/10 border border-red-500 text-red-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Ausente
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 bg-slate-900/20 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400 italic">As ausências ('Ausente') somarão automaticamente ao contador de faltas do trimestre.</span>
                  <button
                    onClick={handleSavePresenca}
                    disabled={getActiveStudents().length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-600 text-white font-bold font-mono text-xs rounded transition-colors"
                  >
                    Salvar Presenças
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RENDIMENTO DISCIPLINAR (RANKING) */}
          {activeTab === 'ranking-disciplina' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <span>Rendimento Disciplinar ({currentDiscipline?.nome})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Ranking de rendimento dos alunos ordenado das maiores notas MAT às menores, exibindo também o volume de faltas absolutas.</p>
              </div>

              {/* Ranking Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="px-5 py-3 text-center">Posição</th>
                      <th className="px-5 py-3">Estudante</th>
                      <th className="px-5 py-3">Média MAC</th>
                      <th className="px-5 py-3">PP</th>
                      <th className="px-5 py-3">PT</th>
                      <th className="px-5 py-3">Média MAT</th>
                      <th className="px-5 py-3 text-right">Faltas Acumuladas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                    {getDisciplineRanking().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">Nenhum aluno registrado.</td>
                      </tr>
                    ) : (
                      getDisciplineRanking().map((rk, idx) => {
                        return (
                          <tr key={rk.studentId} className="hover:bg-slate-900/10">
                            <td className="px-5 py-3 text-center font-mono font-bold text-indigo-400">{idx + 1}º</td>
                            <td className="px-5 py-3">
                              <span className="font-semibold text-white">{rk.nome}</span>
                              <span className="text-[10px] text-slate-500 font-mono ml-2">Nº {rk.numero}</span>
                            </td>
                            <td className="px-5 py-3 font-mono">{rk.macAverage}</td>
                            <td className="px-5 py-3 font-mono">{rk.pp !== null ? rk.pp : '-'}</td>
                            <td className="px-5 py-3 font-mono">{rk.pt !== null ? rk.pt : '-'}</td>
                            <td className="px-5 py-3 font-mono">
                              {rk.mat !== null ? (
                                <span className={`px-2 py-0.5 rounded font-bold ${rk.mat >= 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {rk.mat}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">Pendente</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-red-400 font-bold">{rk.absences} F</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COORDENAÇÃO DE TURMA (COORDINATOR EXCLUSIVE) */}
          {activeTab === 'coordenacao' && isCoordinator && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-amber-400">
                  <Settings className="w-5 h-5" />
                  <span>Painel do Coordenador de Turma (Especial)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Funções exclusivas para o regente da coordenação desta turma. Matricule alunos, controle exames PP/PT, extraia boletins, backup e veja rendimentos.</p>
              </div>

              {/* Sub navbar */}
              <div className="flex border-b border-slate-800 gap-4">
                <button
                  onClick={() => setCoordTab('alunos')}
                  className={`pb-2.5 text-xs font-bold uppercase font-mono border-b-2 transition-all ${
                    coordTab === 'alunos' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  Matrículas Alunos
                </button>
                <button
                  onClick={() => setCoordTab('ranking-geral')}
                  className={`pb-2.5 text-xs font-bold uppercase font-mono border-b-2 transition-all ${
                    coordTab === 'ranking-geral' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  Rendimento Geral Turma
                </button>
                <button
                  onClick={() => setCoordTab('pautas-boletins')}
                  className={`pb-2.5 text-xs font-bold uppercase font-mono border-b-2 transition-all ${
                    coordTab === 'pautas-boletins' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  Boletins & Pautas
                </button>
                <button
                  onClick={() => setCoordTab('grades-config')}
                  className={`pb-2.5 text-xs font-bold uppercase font-mono border-b-2 transition-all ${
                    coordTab === 'grades-config' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  Exames PP/PT & Notas
                </button>
              </div>

              {/* SUB TAB 4.1: MATRÍCULAS ALUNOS */}
              {coordTab === 'alunos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Matricula Form */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <h3 className="font-bold text-white text-sm">Matricular Novo Estudante</h3>
                    
                    <form onSubmit={handleAddStudent} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 uppercase font-mono">Nome Completo do Aluno</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Alfredo Daniel Miguel"
                          value={newStudentNome}
                          onChange={(e) => setNewStudentNome(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-xs rounded text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 uppercase font-mono">Nº do Aluno</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: 17"
                            value={newStudentNumero}
                            onChange={(e) => setNewStudentNumero(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-xs rounded text-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 uppercase font-mono">Idade</label>
                          <input
                            type="number"
                            required
                            min="5"
                            max="60"
                            placeholder="Ex: 15"
                            value={newStudentIdade}
                            onChange={(e) => setNewStudentIdade(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-xs rounded text-white font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold uppercase text-[10px] rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Matricular Aluno</span>
                      </button>
                    </form>
                  </div>

                  {/* Registered List */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <h3 className="font-bold text-white text-sm">Alunos Matriculados ({getActiveStudents().length})</h3>
                    
                    <div className="max-h-72 overflow-y-auto border border-slate-800 rounded divide-y divide-slate-850">
                      {getActiveStudents().length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-500 font-mono">Nenhum aluno registrado na turma.</p>
                      ) : (
                        getActiveStudents().map(al => (
                          <div key={al.id} className="p-3 flex items-center justify-between text-xs text-slate-300">
                            <div>
                              <span className="font-mono text-indigo-400 font-bold mr-2">Nº {al.numero}</span>
                              <span className="font-semibold text-white">{al.nome}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{al.idade} anos</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 4.2: RENDIMENTO GERAL TURMA (BENTO PANEL EXCLUSIVE) */}
              {coordTab === 'ranking-geral' && (
                <div className="space-y-6">
                  {/* Performance metrics breakdown */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-white text-sm">Rendimento de Aproveitamento Geral Trimestral</h3>
                      <span className="text-xs text-slate-400 italic">Ordenação com base na média global ponderada das disciplinas lançadas</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase">
                            <th className="px-5 py-3 text-center">Lugar</th>
                            <th className="px-5 py-3">Nome</th>
                            <th className="px-5 py-3">Idade</th>
                            <th className="px-5 py-3">Disciplinas Concluídas</th>
                            <th className="px-5 py-3">Média Geral MAT</th>
                            <th className="px-5 py-3">Taxa de Aproveitamento</th>
                            <th className="px-5 py-3">Faltas Absolutas</th>
                            <th className="px-5 py-3 text-right">Risco Reprovação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                          {getRankings().map((rk, idx) => {
                            // Calculate aproveitamento percentage: average MAT (out of 20) converted to %
                            const aproveitamentoPct = Math.round((rk.averageGrade / 20) * 100);
                            return (
                              <tr key={rk.studentId} className="hover:bg-slate-900/10">
                                <td className="px-5 py-3 text-center font-mono font-bold text-amber-400">{idx + 1}º</td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-col">
                                    <div className="flex items-center space-x-1">
                                      {rk.failingRiskDisciplinesCount && rk.failingRiskDisciplinesCount > 0 ? (
                                        <span className="text-amber-400 font-bold" title="Baixo rendimento em disciplina de risco!">&#9888;</span>
                                      ) : null}
                                      <span className="font-semibold text-white">{rk.studentNome}</span>
                                      <span className="text-[10px] text-slate-500 font-mono">Nº {rk.studentNumero}</span>
                                    </div>
                                    {rk.failingRiskDisciplinesCount && rk.failingRiskDisciplinesCount > 0 ? (
                                      <span className="text-[9px] text-amber-500 font-mono font-bold mt-0.5 uppercase tracking-wide">
                                        FALHOU EM {rk.failingRiskDisciplinesCount} DISCIPLINA(S) DE RISCO!
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono">{rk.age} anos</td>
                                <td className="px-5 py-3 font-mono">{rk.completedDisciplinesCount} / {rk.totalDisciplinesCount}</td>
                                <td className="px-5 py-3 font-mono">
                                  <div className="flex flex-col">
                                    <span className={`font-bold ${rk.failingRiskDisciplinesCount && rk.failingRiskDisciplinesCount > 0 ? 'text-amber-400' : 'text-indigo-400'}`}>
                                      {rk.averageGrade}
                                    </span>
                                    {rk.failingRiskDisciplinesCount && rk.failingRiskDisciplinesCount > 0 ? (
                                      <span className="text-[9px] text-slate-500 font-semibold leading-none">
                                        Original: {rk.originalAverageGrade} <br/>
                                        Penalização: -{(rk.failingRiskDisciplinesCount * 3.0).toFixed(1)} pt
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full ${aproveitamentoPct >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${aproveitamentoPct}%` }} />
                                    </div>
                                    <span className="font-semibold">{aproveitamentoPct}%</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono text-red-400 font-bold">{rk.totalAbsences} F</td>
                                <td className="px-5 py-3 text-right">
                                  {rk.failingRiskDisciplinesCount && rk.failingRiskDisciplinesCount > 0 ? (
                                    <span className="px-2 py-0.5 bg-amber-950 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase rounded font-mono">Risco Disciplinar</span>
                                  ) : rk.isAtRisk ? (
                                    <span className="px-2 py-0.5 bg-red-950 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase rounded font-mono">Em Risco</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase rounded font-mono">Apto</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 4.3: BOLETINS & PAUTAS (PRINT CENTER) */}
              {coordTab === 'pautas-boletins' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Report Cards (Boletim) and Configuration */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <div className="border-b border-slate-800 pb-2">
                      <h3 className="font-bold text-amber-400 text-sm">Configuração & Emissão de Boletins</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure o cabeçalho, tamanho e data antes de imprimir em lote ou individual.</p>
                    </div>

                    <div className="space-y-3">
                      {/* Select Student */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Selecione o Aluno para Impressão</label>
                        <select
                          value={reportCardStudentId}
                          onChange={(e) => setReportCardStudentId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white font-semibold"
                        >
                          <option value="">-- Escolha o Estudante --</option>
                          <option value="ALL" className="text-amber-400 font-bold">-- IMPRIMIR TODOS OS ALUNOS EM LOTE --</option>
                          {dbState.alunos.filter(s => s.turmaId === currentClass?.id).map(st => (
                            <option key={st.id} value={st.id}>
                              Nº {st.numero} - {st.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Report Size */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Tamanho do Boletim (Organização em A4)</label>
                        <select
                          value={classBoletimConfig.tamanho}
                          onChange={(e) => handleUpdateBoletimConfig('tamanho', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                        >
                          <option value="A5">A5 (2 boletins por folha A4 - ideal para corte)</option>
                          <option value="A6">A6 (4 boletins por folha A4 - compacto)</option>
                        </select>
                      </div>

                      {/* Head sayings */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Dizeres do Cabeçalho (Múltiplas Linhas)</label>
                        <textarea
                          rows={3}
                          value={classBoletimConfig.cabecalho}
                          onChange={(e) => handleUpdateBoletimConfig('cabecalho', e.target.value)}
                          placeholder="Escreva os dizeres oficiais..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white font-sans"
                        />
                      </div>

                      {/* Alignment */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Alinhamento dos Dizeres</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => handleUpdateBoletimConfig('alinhamento', align)}
                              className={`py-1.5 text-xs font-mono rounded border uppercase font-bold transition-all ${
                                classBoletimConfig.alinhamento === align
                                  ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-350'
                              }`}
                            >
                              {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Emission Date & Academic Year */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Data de Emissão</label>
                          <input
                            type="text"
                            value={classBoletimConfig.dataEmissao}
                            onChange={(e) => handleUpdateBoletimConfig('dataEmissao', e.target.value)}
                            placeholder="Ex: Luanda, 17/07/2026"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Ano Lectivo</label>
                          <input
                            type="text"
                            value={classBoletimConfig.anoLectivo}
                            onChange={(e) => handleUpdateBoletimConfig('anoLectivo', e.target.value)}
                            placeholder="Ex: Ano Lectivo 2025/2026"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleTriggerPrint('boletim')}
                        disabled={!reportCardStudentId}
                        className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-850 disabled:text-slate-600 text-amber-950 font-bold uppercase text-[10px] rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{reportCardStudentId === 'ALL' ? 'Imprimir Todos em Lote (PDF)' : 'Imprimir Boletim Individual (PDF)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Class Pauta and Backup */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <h3 className="font-bold text-white text-sm">Geração de Pauta e Backup Geral</h3>
                    <p className="text-xs text-slate-400">Emita a pauta geral e faça o backup físico de segurança com todos os dados da turma integrados.</p>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleTriggerPrint('pauta')}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Gerar Pauta Escolar Geral (PDF)</span>
                      </button>

                      <button
                        onClick={() => handleTriggerPrint('backup')}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold uppercase text-[10px] border border-slate-700 rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Exportar Backup Físico da Turma (PDF)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 4.4: EXAMES CONTROLS & DIRECT GRADE MODIFICATION */}
              {coordTab === 'grades-config' && (
                <div className="space-y-6">
                  {/* PP and PT access toggles */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <h3 className="font-bold text-white text-sm">Controle de Janelas de Exame</h3>
                    <p className="text-xs text-slate-400">Habilite ou desabilite o lançamento de notas das Provas de Professores (PP) e Provas Trimestrais (PT) para os docentes.</p>

                    <div className="flex space-x-4">
                      {/* PP toggle */}
                      <button
                        onClick={() => handleTogglePpPtInput('pp')}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                          isPpInputEnabled()
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <span className="font-mono font-bold block text-base">NOTAS PP</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider block mt-1">
                          {isPpInputEnabled() ? 'Lançamento Habilitado' : 'Lançamento Bloqueado'}
                        </span>
                      </button>

                      {/* PT toggle */}
                      <button
                        onClick={() => handleTogglePpPtInput('pt')}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                          isPtInputEnabled()
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <span className="font-mono font-bold block text-base">NOTAS PT</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider block mt-1">
                          {isPtInputEnabled() ? 'Lançamento Habilitado' : 'Lançamento Bloqueado'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* CONFIGURAÇÃO DE DISCIPLINAS DE RISCO */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-amber-500">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-white text-sm">Disciplinas de Risco da Turma</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Selecione as disciplinas consideradas críticas nesta turma. Se o aluno estiver mal (média MAC &lt; 10 ou PP &lt; 10 ou MAT &lt; 10) em qualquer uma destas disciplinas, seu rendimento e classificação no ranking geral cairão significativamente por meio de uma penalização de -3.0 valores por disciplina em seu aproveitamento global.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {currentClass?.disciplinas.map((disc) => {
                        const isRisk = (dbState.riskDisciplines?.[currentClass.id] || []).includes(disc.id);
                        return (
                          <button
                            key={disc.id}
                            type="button"
                            onClick={() => handleToggleRiskDiscipline(disc.id)}
                            className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isRisk
                                ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold font-sans'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-xs">{disc.nome}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isRisk ? 'border-amber-500 bg-amber-500 text-amber-950' : 'border-slate-700'
                            }`}>
                              {isRisk && <span className="text-[10px] font-black">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct grades modifications panel */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <h3 className="font-bold text-white text-sm">Substituição Direta de Notas</h3>
                    <p className="text-xs text-slate-400">O Coordenador de Turma pode editar notas de qualquer disciplina da turma contanto que possua a autorização concedida pelo respectivo regente.</p>

                    <div className="overflow-x-auto max-h-96 border border-slate-800 rounded">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-mono text-[9px] uppercase">
                            <th className="px-4 py-2">Aluno</th>
                            {currentClass?.disciplinas.map(d => (
                              <th key={d.id} className="px-4 py-2">{d.nome}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs">
                          {dbState.alunos.filter(s => s.turmaId === currentClass?.id).map(st => (
                            <tr key={st.id} className="hover:bg-slate-900/10">
                              <td className="px-4 py-3 font-semibold text-white">Nº {st.numero} - {st.nome}</td>
                              {currentClass?.disciplinas.map(d => {
                                const rep = calculateStudentGrades(st.id, d.id, dbState.currentTrimester, dbState);
                                const isAllowed = d.professorId === loggedTeacher.id || dbState.permissoesEdicao.find(p => p.classId === currentClass.id && p.disciplineId === d.id)?.concedida;
                                return (
                                  <td key={d.id} className="px-4 py-3">
                                    <div className="space-y-1">
                                      {/* MAC entries */}
                                      <div className="flex flex-wrap gap-1">
                                        {rep.macList.map((m, mi) => (
                                          <button
                                            key={mi}
                                            disabled={!isAllowed}
                                            onClick={() => handleCoordinatorEditGrade(st.id, d.id, 'mac', mi)}
                                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                              isAllowed ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-700' : 'bg-slate-900 text-slate-600'
                                            }`}
                                            title="Clique para editar nota MAC"
                                          >
                                            {m}
                                          </button>
                                        ))}
                                      </div>
                                      {/* PP / PT */}
                                      <div className="flex space-x-1.5 font-mono text-[10px]">
                                        <button
                                          disabled={!isAllowed}
                                          onClick={() => handleCoordinatorEditGrade(st.id, d.id, 'pp')}
                                          className={`px-1 rounded ${isAllowed ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600'}`}
                                          title="Editar PP"
                                        >
                                          PP: {rep.pp ?? '-'}
                                        </button>
                                        <button
                                          disabled={!isAllowed}
                                          onClick={() => handleCoordinatorEditGrade(st.id, d.id, 'pt')}
                                          className={`px-1 rounded ${isAllowed ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-600'}`}
                                          title="Editar PT"
                                        >
                                          PT: {rep.pt ?? '-'}
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* --- CONFIRMATION MODALS --- */}

      {/* GRADE CONFIRMATION MODAL - POPUP REQUERED TO BE EXTRA HUGE */}
      <AnimatePresence>
        {showGradeConfirm && selectedStudentForGrade && gradePendingConfirm && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 border-2 border-indigo-500/40 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6"
            >
              <CheckCircle className="w-16 h-16 text-indigo-400 mx-auto animate-bounce" />
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-wide uppercase font-sans">Confirmar Lançamento de Nota</h3>
                <p className="text-xs text-slate-400">
                  Estás prestes a lançar no trimestre de forma definitiva e irretroativa a nota para o aluno:
                </p>
                <p className="text-base font-bold text-indigo-400 mt-2 font-sans">
                  Nº {selectedStudentForGrade.numero} - {selectedStudentForGrade.nome}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">Disciplina: {currentDiscipline?.nome} &bull; Componente: {gradePendingConfirm.type.toUpperCase()}</p>
              </div>

              {/* LARGE HIGH-REALSE FONT FOR VALUE AS REQUESTED: "exibida na tela em um tamanho de fonte de grande realse" */}
              <div className="py-4 bg-slate-900 border border-indigo-500/10 rounded-xl">
                <span className="text-6xl sm:text-7xl font-black text-indigo-400 font-mono block tracking-tighter">
                  {gradePendingConfirm.value}
                </span>
                <span className="text-[10px] uppercase text-slate-500 tracking-widest font-mono font-bold">Valor da Nota</span>
              </div>

              <p className="text-[10px] text-red-400 italic">
                *Aviso: Após confirmação, esta nota não poderá ser alterada por si sem prévia autorização especial do Coordenador de Turma.
              </p>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => { setShowGradeConfirm(false); setGradePendingConfirm(null); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-bold rounded uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmGrade}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold rounded uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Confirmar & Adicionar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COORDINATOR GRADES MANUAL SUBSTITUTION OVERLAY */}
      <AnimatePresence>
        {editingGradePayload && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-xs"
            >
              <h3 className="font-bold text-white text-sm mb-4">Ajustar Nota (Coordenador)</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Componente: {editingGradePayload.field.toUpperCase()}</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    placeholder="Deixe em branco para remover"
                    value={editingGradePayload.value}
                    onChange={(e) => setEditingGradePayload({ ...editingGradePayload, value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded font-mono text-sm text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setEditingGradePayload(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={saveCoordinatorEditedGrade}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded"
                  >
                    Salvar Nota
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIGH FIDELITY PRINTABLE REPORTS OVERLAYS */}
      <AnimatePresence>
        {printLayoutType && currentClass && (
          <PrintReportOverlay
            type={printLayoutType}
            classObj={currentClass}
            studentId={reportCardStudentId}
            dbState={dbState}
            onClose={() => setPrintLayoutType(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Helpers
function currentTrimesterName(trimester: 1 | 2 | 3): string {
  return trimester === 1 ? '1º Trimestre' : trimester === 2 ? '2º Trimestre' : '3º Trimestre';
}

// PRINTING OVERLAYS IMPLEMENTATION
interface PrintReportOverlayProps {
  type: 'boletim' | 'pauta' | 'backup';
  classObj: any;
  studentId: string;
  dbState: DatabaseState;
  onClose: () => void;
}

function PrintReportOverlay({ type, classObj, studentId, dbState, onClose }: PrintReportOverlayProps) {
  
  // Find selected student details or all students
  const studentsToPrint = studentId === 'ALL'
    ? dbState.alunos.filter(s => s.turmaId === classObj.id)
    : dbState.alunos.filter(s => s.id === studentId);

  const config = dbState.boletimConfig?.[classObj.id] || {
    cabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL DE LUANDA\nDIRECÇÃO PROVINCIAL DA EDUCAÇÃO',
    alinhamento: 'center' as 'left' | 'center' | 'right',
    dataEmissao: new Date().toLocaleDateString('pt-PT'),
    anoLectivo: 'Ano Lectivo 2025/2026',
    tamanho: 'A5' as 'A5' | 'A6'
  };

  const isA6 = config.tamanho === 'A6';
  const chunkSize = isA6 ? 4 : 2;

  // Chunking helper
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const studentChunks = chunkArray(studentsToPrint, chunkSize);

  const renderBoletimCard = (st: Aluno, a6Mode: boolean) => {
    return (
      <div className={`flex flex-col justify-between h-full bg-white text-slate-950 ${a6Mode ? 'p-3' : 'p-6'}`}>
        {/* Header Sayings */}
        <div 
          className="font-bold tracking-tight uppercase leading-tight font-sans"
          style={{ 
            textAlign: config.alinhamento, 
            fontSize: a6Mode ? '8px' : '10px' 
          }}
        >
          <div className="whitespace-pre-line">{config.cabecalho}</div>
          <div className="mt-1 font-mono font-medium text-slate-500 normal-case" style={{ fontSize: a6Mode ? '7px' : '9px' }}>
            {config.anoLectivo} &bull; Emissão: {config.dataEmissao}
          </div>
        </div>

        {/* The Main Table of Cells */}
        <div className="my-2">
          <table className="w-full border-collapse border-[1.5px] border-slate-950">
            <tbody>
              {/* Row 1: Single cell for Name, Number, Class */}
              <tr>
                <td 
                  colSpan={5} 
                  className="border-[1.5px] border-slate-950 bg-slate-50 p-1.5 font-sans font-bold text-slate-900"
                  style={{ fontSize: a6Mode ? '8.5px' : '11px', textAlign: 'center' }}
                >
                  ALUNO: {st.nome.toUpperCase()} &nbsp;|&nbsp; Nº {st.numero} &nbsp;|&nbsp; TURMA: {classObj.classe} - {classObj.identificacao}
                </td>
              </tr>

              {/* Row 2: Headers */}
              <tr className="bg-slate-100 font-mono font-bold uppercase tracking-wider text-center">
                <td className="border-[1.5px] border-slate-950 p-1" style={{ fontSize: a6Mode ? '7.5px' : '9px' }}>Disciplina</td>
                <td className="border-[1.5px] border-slate-950 p-1" style={{ fontSize: a6Mode ? '7.5px' : '9px' }}>MAC</td>
                <td className="border-[1.5px] border-slate-950 p-1" style={{ fontSize: a6Mode ? '7.5px' : '9px' }}>PP</td>
                <td className="border-[1.5px] border-slate-950 p-1" style={{ fontSize: a6Mode ? '7.5px' : '9px' }}>PT</td>
                <td className="border-[1.5px] border-slate-950 p-1" style={{ fontSize: a6Mode ? '7.5px' : '9px' }}>MAT</td>
              </tr>

              {/* Subject Rows */}
              {classObj.disciplinas.map((disc: any) => {
                const rep = calculateStudentGrades(st.id, disc.id, dbState.currentTrimester, dbState);
                const isFailing = rep.mat !== null && rep.mat < 10;
                return (
                  <tr key={disc.id} className="font-sans">
                    <td 
                      className="border-[1.5px] border-slate-950 p-1 font-bold text-slate-800" 
                      style={{ fontSize: a6Mode ? '8px' : '10px' }}
                    >
                      {disc.nome}
                    </td>
                    <td 
                      className="border-[1.5px] border-slate-950 p-1 text-center font-mono font-semibold" 
                      style={{ fontSize: a6Mode ? '8px' : '10px' }}
                    >
                      {rep.macAverage}
                    </td>
                    <td 
                      className="border-[1.5px] border-slate-950 p-1 text-center font-mono font-semibold" 
                      style={{ fontSize: a6Mode ? '8px' : '10px' }}
                    >
                      {rep.pp !== null ? rep.pp : '-'}
                    </td>
                    <td 
                      className="border-[1.5px] border-slate-950 p-1 text-center font-mono font-semibold" 
                      style={{ fontSize: a6Mode ? '8px' : '10px' }}
                    >
                      {rep.pt !== null ? rep.pt : '-'}
                    </td>
                    <td 
                      className={`border-[1.5px] border-slate-950 p-1 text-center font-mono font-bold ${
                        isFailing ? 'text-red-600 bg-red-50 underline decoration-red-600 font-black' : 'text-slate-900'
                      }`} 
                      style={{ fontSize: a6Mode ? '8px' : '10px' }}
                    >
                      {rep.mat !== null ? rep.mat : 'Pendente'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures and Stamp */}
        <div className="grid grid-cols-2 gap-4 text-center mt-2 leading-tight font-sans">
          <div className="border-t border-slate-300 pt-1">
            <p className="font-bold uppercase" style={{ fontSize: a6Mode ? '7px' : '9px' }}>O Coordenador de Turma</p>
            <div className={a6Mode ? 'h-4' : 'h-7'}></div>
            <p className="text-slate-500 font-mono" style={{ fontSize: a6Mode ? '6px' : '7px' }}>Assinatura Digital Vanguard</p>
          </div>
          <div className="border-t border-slate-300 pt-1">
            <p className="font-bold uppercase" style={{ fontSize: a6Mode ? '7px' : '9px' }}>A Direção Pedagógica</p>
            <div className={a6Mode ? 'h-4' : 'h-7'}></div>
            <p className="text-slate-500 font-mono" style={{ fontSize: a6Mode ? '6px' : '7px' }}>VISTO & SELO OFICIAL</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-y-auto z-50 p-6 flex flex-col items-center">
      
      {/* Controls */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 print:hidden">
        <div className="text-xs text-slate-400 font-mono flex flex-col">
          <span className="font-bold text-white">Visualização de Impressão Escolar</span>
          <span>Tamanho: {config.tamanho} (Organizado para A4) | Lote de {studentsToPrint.length} aluno(s)</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs uppercase font-mono rounded flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Agora (PDF / Impressora)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase font-mono rounded transition-colors cursor-pointer"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>

      {/* PRINT CANVAS */}
      <div id="printable-area" className="w-full max-w-[210mm] flex flex-col items-center">
        
        {/* BOLETIM ESCALADO */}
        {type === 'boletim' && (
          <div className="w-full flex flex-col items-center bg-transparent">
            {studentChunks.map((chunk, chunkIdx) => {
              if (isA6) {
                // A6 Layout: 2x2 grid on A4 sheet
                return (
                  <div 
                    key={chunkIdx} 
                    className="w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] grid grid-cols-2 grid-rows-2 bg-white text-slate-950 border-2 border-slate-300 print:border-none page-break overflow-hidden box-border mb-8 print:mb-0"
                  >
                    {chunk.map((st, idx) => (
                      <div 
                        key={st.id} 
                        className={`w-[105mm] h-[148.5mm] max-h-[148.5mm] box-border p-3 overflow-hidden border-slate-300 border-dashed ${
                          idx % 2 === 0 ? 'border-r' : ''
                        } ${idx < 2 ? 'border-b' : ''}`}
                      >
                        {renderBoletimCard(st, true)}
                      </div>
                    ))}
                    {/* Fill remaining cells if chunk is less than 4 */}
                    {chunk.length < 4 && Array.from({ length: 4 - chunk.length }).map((_, emptyIdx) => (
                      <div 
                        key={`empty-${emptyIdx}`} 
                        className={`w-[105mm] h-[148.5mm] bg-slate-50/20 border-slate-300 border-dashed ${
                          (chunk.length + emptyIdx) % 2 === 0 ? 'border-r' : ''
                        } ${chunk.length + emptyIdx < 2 ? 'border-b' : ''}`}
                      />
                    ))}
                  </div>
                );
              } else {
                // A5 Layout: 2 rows of A5 on A4 sheet
                return (
                  <div 
                    key={chunkIdx} 
                    className="w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] flex flex-col justify-between bg-white text-slate-950 border-2 border-slate-300 print:border-none page-break overflow-hidden box-border mb-8 print:mb-0"
                  >
                    {chunk.map((st, idx) => (
                      <div 
                        key={st.id} 
                        className="w-full h-[148.5mm] max-h-[148.5mm] box-border p-6 overflow-hidden border-slate-300 border-dashed border-b last:border-b-0"
                      >
                        {renderBoletimCard(st, false)}
                      </div>
                    ))}
                    {/* Fill remaining row if chunk is less than 2 */}
                    {chunk.length < 2 && (
                      <div className="w-full h-[148.5mm] bg-slate-50/20" />
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* PAUTA GERAL DA TURMA */}
        {type === 'pauta' && (
          <div className="space-y-6 w-[210mm] min-h-[297mm] bg-white p-10 shadow-xl print:shadow-none print:p-0 page-break">
            <div className="text-center border-b-2 border-slate-950 pb-4">
              <h1 className="text-2xl font-bold uppercase tracking-wider">Pauta Escolar Geral de Turma</h1>
              <p className="text-xs uppercase tracking-widest text-slate-600 font-mono">Rendimento e Notas Finais Consolidadas</p>
              <p className="text-xs font-bold text-slate-500 font-mono">Turma: {classObj.classe} - {classObj.identificacao} &bull; Sala {classObj.sala} &bull; {currentTrimesterName(dbState.currentTrimester)}</p>
            </div>

            {/* Matrix table */}
            <table className="w-full border-collapse border border-slate-950 text-xs">
              <thead>
                <tr className="bg-slate-100 font-mono text-[9px]">
                  <th className="border border-slate-950 p-1">Nº</th>
                  <th className="border border-slate-950 p-1 text-left">Nome do Estudante</th>
                  {classObj.disciplinas.map((d: any) => (
                    <th key={d.id} className="border border-slate-950 p-1 text-center font-bold rotate-0 max-w-[80px]">{d.nome}</th>
                  ))}
                  <th className="border border-slate-950 p-1 text-center font-bold">Média Geral MAT</th>
                </tr>
              </thead>
              <tbody>
                {dbState.alunos.filter(s => s.turmaId === classObj.id).map(st => {
                  let totalMat = 0;
                  let count = 0;
                  
                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="border border-slate-950 p-1 text-center font-mono font-bold">{st.numero}</td>
                      <td className="border border-slate-950 p-1 font-bold">{st.nome}</td>
                      {classObj.disciplinas.map((d: any) => {
                        const rep = calculateStudentGrades(st.id, d.id, dbState.currentTrimester, dbState);
                        if (rep.mat !== null) {
                          totalMat += rep.mat;
                          count++;
                        }
                        return (
                          <td key={d.id} className={`border border-slate-950 p-1 text-center font-mono font-bold ${rep.mat && rep.mat < 10 ? 'text-red-600 bg-red-50' : ''}`}>
                            {rep.mat !== null ? rep.mat : '-'}
                          </td>
                        );
                      })}
                      <td className="border border-slate-950 p-1 text-center font-mono font-bold bg-slate-100">
                        {count > 0 ? (totalMat / count).toFixed(1) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom Signature */}
            <div className="pt-12 text-center text-xs">
              <div className="max-w-xs mx-auto border-t border-slate-400 pt-2">
                <p className="font-bold uppercase">O Coordenador de Turma</p>
                <div className="h-10"></div>
                <p className="text-[10px] text-slate-500 font-mono">Assinatura Digital Validada</p>
              </div>
            </div>
          </div>
        )}

        {/* BACKUP FISICO COMPLETO */}
        {type === 'backup' && (
          <div className="space-y-6 w-[210mm] min-h-[297mm] bg-white p-10 shadow-xl print:shadow-none print:p-0 font-mono text-xs page-break">
            <div className="text-center border-b-2 border-slate-950 pb-4">
              <h1 className="text-xl font-bold uppercase">Backup Integral de Turma (Físico/Offline)</h1>
              <p className="text-[10px] text-slate-600 uppercase">Dump Completo de Dados Gerados - MultiS Vanguard</p>
              <p className="text-[10px] text-slate-400">Turma: {classObj.classe} {classObj.identificacao} &bull; Sala: {classObj.sala}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold border-b pb-1 text-slate-700">1. Cadastro de Estudantes</h3>
                <div className="grid grid-cols-1 gap-1 pl-2">
                  {dbState.alunos.filter(s => s.turmaId === classObj.id).map(st => (
                    <div key={st.id}>
                      Nº {st.numero} &bull; {st.nome} ({st.idade} anos)
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold border-b pb-1 text-slate-700">2. Cadeiras e Docentes</h3>
                <div className="grid grid-cols-1 gap-1 pl-2">
                  {classObj.disciplinas.map((d: any) => {
                    const prof = dbState.professores.find(p => p.id === d.professorId);
                    return (
                      <div key={d.id}>
                        {d.nome} &mdash; Regente: {prof ? prof.nome : 'Null'}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-bold border-b pb-1 text-slate-700">3. Dump das Avaliações</h3>
                <div className="space-y-2 pl-2">
                  {dbState.alunos.filter(s => s.turmaId === classObj.id).map(st => {
                    return (
                      <div key={st.id} className="border-b border-dashed pb-2">
                        <p className="font-bold">{st.nome}:</p>
                        {classObj.disciplinas.map((d: any) => {
                          const rep = calculateStudentGrades(st.id, d.id, dbState.currentTrimester, dbState);
                          return (
                            <div key={d.id} className="pl-2 text-[11px] text-slate-600">
                              {d.nome}: MAC: [{rep.macList.join(', ')}] Average: {rep.macAverage} | PP: {rep.pp ?? '-'} | PT: {rep.pt ?? '-'} | MAT: {rep.mat ?? '-'}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
