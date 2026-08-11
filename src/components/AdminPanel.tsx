/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Plus, Users, BookOpen, Lock, Unlock, Settings, Calendar, RefreshCw, 
  Trash2, LogOut, Check, Edit2, Save, FileText, AlertTriangle, Eye, EyeOff, KeyRound, Clock, Sparkles
} from 'lucide-react';
import { DatabaseState, Turma, Professor, DisciplinaGlobal, ClassDisciplina } from '../types';
import { saveDatabaseState, resetYearData, createTrimesterSnapshot } from '../utils/db';

interface AdminPanelProps {
  dbState: DatabaseState;
  onUpdateDbState: (newState: DatabaseState) => void;
  onLogout: () => void;
}

export default function AdminPanel({ dbState, onUpdateDbState, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'turmas' | 'professores' | 'disciplinas' | 'sessoes' | 'ano-lectivo'>('ano-lectivo');
  
  // Success & Error messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. --- TURMAS STATES ---
  const [showAddTurma, setShowAddTurma] = useState(false);
  const [turmaPeriodo, setTurmaPeriodo] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const [turmaSala, setTurmaSala] = useState('');
  const [turmaIdentificacao, setTurmaIdentificacao] = useState('');
  const [turmaClasse, setTurmaClasse] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);

  // 2. --- PROFESSORES STATES ---
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  
  // Registration and edit fields
  const [teacherNome, setTeacherNome] = useState('');
  const [teacherTurmaId, setTeacherTurmaId] = useState('');
  const [teacherDisciplinaId, setTeacherDisciplinaId] = useState('');
  const [teacherCargo, setTeacherCargo] = useState<'Coordenador' | 'Normal'>('Normal');
  const [teacherSenha, setTeacherSenha] = useState('');
  const [teacherConfSenha, setTeacherConfSenha] = useState('');
  const [showTeacherPw, setShowTeacherPw] = useState(false);

  // 3. --- DISCIPLINAS STATES ---
  const [newGlobalDiscNome, setNewGlobalDiscNome] = useState('');
  const [selectedTurmaForDisc, setSelectedTurmaForDisc] = useState('');
  const [selectedDiscToAdd, setSelectedDiscToAdd] = useState('');

  // 4. --- SESSOES STATES ---
  const [selectedClassesForBlock, setSelectedClassesForBlock] = useState<string[]>([]);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockActionType, setBlockActionType] = useState<'block' | 'unblock'>('block');

  // 5. --- ANO LECTIVO & TRIME STATES ---
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationType, setValidationType] = useState<'trimester' | 'end_year' | 'clear_year' | null>(null);
  const [valPassword, setValPassword] = useState('');
  const [showValPw, setShowValPw] = useState(false);

  // 6. --- PASSWORD ADMIN STATE ---
  const [showAdmPwChange, setShowAdmPwChange] = useState(false);
  const [newAdmPassword, setNewAdmPassword] = useState('');
  const [confNewAdmPassword, setConfNewAdmPassword] = useState('');

  // 7. --- INACTIVITY TIMEOUT ---
  const [timeoutEnabled, setTimeoutEnabled] = useState(dbState.autoTimeoutEnabled);
  const [timeoutMins, setTimeoutMins] = useState(dbState.autoTimeoutMinutes);

  // Show a status alert helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // --- HANDLERS ---

  // 1. ADD TURMA
  const handleAddTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSala.trim() || !turmaIdentificacao.trim() || !turmaClasse.trim()) {
      triggerError('Por favor preencha todos os campos da turma.');
      return;
    }

    const newTurma: Turma = {
      id: 'turma_' + Date.now(),
      periodo: turmaPeriodo,
      sala: turmaSala,
      identificacao: turmaIdentificacao,
      classe: turmaClasse,
      disciplinas: selectedDisciplines.map(id => {
        const disc = dbState.disciplinasGlobais.find(d => d.id === id);
        return {
          id,
          nome: disc ? disc.nome : 'Outra',
          professorId: null
        };
      }),
      coordenadorId: null
    };

    const updatedState = {
      ...dbState,
      turmas: [...dbState.turmas, newTurma]
    };

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);

    // Reset fields
    setTurmaSala('');
    setTurmaIdentificacao('');
    setTurmaClasse('');
    setSelectedDisciplines([]);
    setShowAddTurma(false);
    triggerSuccess('Perfil de Turma criado com sucesso!');
  };

  // Toggle discipline selection when creating class
  const handleToggleDiscSelection = (discId: string) => {
    if (selectedDisciplines.includes(discId)) {
      setSelectedDisciplines(selectedDisciplines.filter(id => id !== discId));
    } else {
      setSelectedDisciplines([...selectedDisciplines, discId]);
    }
  };

  // 2. ADD / EDIT TEACHER
  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherTurmaId) {
      triggerError('Selecione uma turma primeiro.');
      return;
    }

    if (!teacherNome.trim() || !teacherDisciplinaId || !teacherSenha) {
      triggerError('Por favor, preencha todos os campos do professor.');
      return;
    }

    if (teacherSenha !== teacherConfSenha) {
      triggerError('As senhas introduzidas não correspondem.');
      return;
    }

    // Check password duplicate against other teachers
    const duplicate = dbState.professores.find(
      p => p.senha === teacherSenha && p.id !== editingTeacherId
    );
    if (duplicate) {
      triggerError('Para segurança do sistema, esta senha já está sendo utilizada por outro utilizador.');
      return;
    }

    const updatedState = { ...dbState };

    if (editingTeacherId) {
      // Edit Teacher mode
      const idx = updatedState.professores.findIndex(p => p.id === editingTeacherId);
      if (idx !== -1) {
        const prev = updatedState.professores[idx];
        
        // Update values
        updatedState.professores[idx] = {
          ...prev,
          nome: teacherNome,
          senha: teacherSenha,
          // Force logout of other devices on credential change
          sessionVersion: prev.sessionVersion + 1
        };

        triggerSuccess('Dados do Professor atualizados com sucesso!');
      }
      setEditingTeacherId(null);
    } else {
      // Create new teacher
      const newTeacherId = 'prof_' + Date.now();
      const newTeacher: Professor = {
        id: newTeacherId,
        nome: teacherNome,
        senha: teacherSenha,
        turmaId: teacherTurmaId,
        disciplinaId: teacherDisciplinaId,
        cargo: teacherCargo,
        sessionVersion: 1
      };

      updatedState.professores.push(newTeacher);

      // Assign teacher to the class's discipline list
      const turmaIdx = updatedState.turmas.findIndex(t => t.id === teacherTurmaId);
      if (turmaIdx !== -1) {
        const discIdx = updatedState.turmas[turmaIdx].disciplinas.findIndex(d => d.id === teacherDisciplinaId);
        if (discIdx !== -1) {
          updatedState.turmas[turmaIdx].disciplinas[discIdx].professorId = newTeacherId;
        }

        // Set as coordinator if cargo is Coordenador
        if (teacherCargo === 'Coordenador') {
          updatedState.turmas[turmaIdx].coordenadorId = newTeacherId;
        }
      }

      triggerSuccess('Professor cadastrado com sucesso!');
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);

    // Reset teacher forms
    setTeacherNome('');
    setTeacherTurmaId('');
    setTeacherDisciplinaId('');
    setTeacherCargo('Normal');
    setTeacherSenha('');
    setTeacherConfSenha('');
    setShowAddTeacher(false);
  };

  const handleEditTeacher = (prof: Professor) => {
    setEditingTeacherId(prof.id);
    setTeacherNome(prof.nome);
    setTeacherTurmaId(prof.turmaId);
    setTeacherDisciplinaId(prof.disciplinaId);
    setTeacherCargo(prof.cargo);
    setTeacherSenha(prof.senha);
    setTeacherConfSenha(prof.senha);
    setShowAddTeacher(true);
  };

  // Helper when selecting class on teacher registration to see which disciplines and cargos are occupied
  const getDisciplinesForRegister = () => {
    if (!teacherTurmaId) return [];
    const turma = dbState.turmas.find(t => t.id === teacherTurmaId);
    if (!turma) return [];
    return turma.disciplinas;
  };

  const isCoordinatorOccupiedForClass = () => {
    if (!teacherTurmaId) return false;
    const turma = dbState.turmas.find(t => t.id === teacherTurmaId);
    return turma ? turma.coordenadorId !== null : false;
  };

  // 3. GLOBAL DISCIPLINAS
  const handleAddGlobalDisc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGlobalDiscNome.trim()) return;

    // Check duplication
    if (dbState.disciplinasGlobais.some(d => d.nome.toLowerCase() === newGlobalDiscNome.trim().toLowerCase())) {
      triggerError('Esta disciplina já existe no banco de dados.');
      return;
    }

    const updatedState = {
      ...dbState,
      disciplinasGlobais: [
        ...dbState.disciplinasGlobais,
        { id: 'disc_g_' + Date.now(), nome: newGlobalDiscNome.trim() }
      ]
    };

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    setNewGlobalDiscNome('');
    triggerSuccess('Nova disciplina adicionada ao Banco de Dados!');
  };

  const handleAddDiscToTurma = () => {
    if (!selectedTurmaForDisc || !selectedDiscToAdd) {
      triggerError('Por favor selecione a turma e a disciplina.');
      return;
    }

    const updatedState = { ...dbState };
    const turmaIdx = updatedState.turmas.findIndex(t => t.id === selectedTurmaForDisc);
    if (turmaIdx !== -1) {
      const turma = updatedState.turmas[turmaIdx];
      
      // Check if already in class
      if (turma.disciplinas.some(d => d.id === selectedDiscToAdd)) {
        triggerError('Esta turma já possui esta disciplina.');
        return;
      }

      const discDetails = dbState.disciplinasGlobais.find(d => d.id === selectedDiscToAdd);
      if (discDetails) {
        updatedState.turmas[turmaIdx].disciplinas.push({
          id: selectedDiscToAdd,
          nome: discDetails.nome,
          professorId: null
        });
        saveDatabaseState(updatedState);
        onUpdateDbState(updatedState);
        setSelectedDiscToAdd('');
        triggerSuccess(`Disciplina ${discDetails.nome} adicionada à turma!`);
      }
    }
  };

  // 4. BLOCK / UNBLOCK SESSIONS
  const handleToggleClassSelectionForBlock = (classId: string) => {
    if (selectedClassesForBlock.includes(classId)) {
      setSelectedClassesForBlock(selectedClassesForBlock.filter(id => id !== classId));
    } else {
      setSelectedClassesForBlock([...selectedClassesForBlock, classId]);
    }
  };

  const executeSessionBlock = () => {
    if (selectedClassesForBlock.length === 0) {
      triggerError('Nenhuma turma selecionada.');
      return;
    }

    const updatedState = { ...dbState };
    if (blockActionType === 'block') {
      // Add selected to blockedClasses list
      const unique = new Set([...updatedState.blockedClasses, ...selectedClassesForBlock]);
      updatedState.blockedClasses = Array.from(unique);
      triggerSuccess('Sessões de professores das turmas selecionadas BLOQUEADAS!');
    } else {
      // Remove selected from blockedClasses list
      updatedState.blockedClasses = updatedState.blockedClasses.filter(
        id => !selectedClassesForBlock.includes(id)
      );
      triggerSuccess('Acesso às turmas selecionadas DESBLOQUEADO!');
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    setSelectedClassesForBlock([]);
    setShowBlockConfirm(false);
  };

  // 5. ACADEMIC YEAR & TRIMESTERS VALIDATIONS
  const triggerValidation = (type: 'trimester' | 'end_year' | 'clear_year') => {
    setValidationType(type);
    setValPassword('');
    setShowValidationModal(true);
  };

  const handleValidatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (valPassword !== dbState.admPassword) {
      triggerError('Senha de Administrador incorreta.');
      return;
    }

    // Success! Proceed with action
    const updatedState = { ...dbState };

    if (validationType === 'trimester') {
      // Start next trimester
      const current = dbState.currentTrimester;
      if (current === 3) {
        triggerError('Já se encontra no 3º Trimestre. Encerre o ano letivo para avançar.');
        setShowValidationModal(false);
        return;
      }

      // Save snapshot of current trimester
      const snapshot = createTrimesterSnapshot(dbState, current);
      updatedState.snapshots.push(snapshot);
      
      // Advance trimester
      updatedState.currentTrimester = (current + 1) as 1 | 2 | 3;
      
      triggerSuccess(`Iniciado o ${current + 1}º Trimestre. Dados do ${current}º Trimestre foram arquivados com segurança.`);
    } 
    else if (validationType === 'end_year') {
      // End school year, save snapshot of current (trimester 3 usually) and lock everything except ADM
      const current = dbState.currentTrimester;
      const finalSnapshot = createTrimesterSnapshot(dbState, current);
      updatedState.snapshots.push(finalSnapshot);

      updatedState.anoLectivoTerminado = true;
      updatedState.anoLectivoIniciado = false;
      
      // Auto block all classes
      updatedState.blockedClasses = dbState.turmas.map(t => t.id);

      // Generate the year summary
      updatedState.yearEndSummary = {
        closedAt: new Date().toISOString(),
        snapshots: JSON.parse(JSON.stringify(updatedState.snapshots)),
        finalGrades: JSON.parse(JSON.stringify(dbState.grades))
      };

      triggerSuccess('Ano Letivo encerrado oficialmente! Relatórios de pautas finais gerados para exportação.');
    } 
    else if (validationType === 'clear_year') {
      // Reset completely
      const cleared = resetYearData(dbState);
      onUpdateDbState(cleared);
      setShowValidationModal(false);
      triggerSuccess('Banco de dados escolar zerado com sucesso! Credenciais administrativas preservadas.');
      return;
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    setShowValidationModal(false);
    setValPassword('');
  };

  const handleStartYear = () => {
    const updatedState: DatabaseState = {
      ...dbState,
      anoLectivoIniciado: true,
      anoLectivoTerminado: false,
      currentTrimester: 1 as 1 | 2 | 3,
      blockedClasses: [],
      yearEndSummary: null,
      snapshots: []
    };
    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess('Ano Letivo Iniciado com Sucesso! 1º Trimestre operacional.');
  };

  // 6. CHANGE ADM PASSWORD
  const handleChangeAdmPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdmPassword !== confNewAdmPassword) {
      triggerError('As novas senhas digitadas não coincidem.');
      return;
    }

    if (!newAdmPassword.trim()) {
      triggerError('A senha não pode ser vazia.');
      return;
    }

    const updatedState = {
      ...dbState,
      admPassword: newAdmPassword
    };

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    setNewAdmPassword('');
    setConfNewAdmPassword('');
    setShowAdmPwChange(false);
    triggerSuccess('Senha de administrador alterada com sucesso!');
  };

  // 7. INACTIVITY TIMEOUT CONFIG
  const handleSaveTimeoutConfig = () => {
    const updatedState = {
      ...dbState,
      autoTimeoutEnabled: timeoutEnabled,
      autoTimeoutMinutes: Math.max(1, timeoutMins)
    };
    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    triggerSuccess('Configurações de inatividade salvas com sucesso!');
  };

  return (
    <div id="admin-panel" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="bg-slate-950 px-6 py-4 border-b border-amber-500/20 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">Vanguard Estudante</h1>
            <p className="text-xs text-amber-500/80 font-mono">Consola de Administração &bull; Logado como Admin01</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Change own password quick button */}
          <button
            id="adm-change-pw-btn"
            onClick={() => { setShowAdmPwChange(true); triggerSuccess(''); }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 rounded text-xs transition-colors flex items-center space-x-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Alterar Senha</span>
          </button>

          <button
            id="adm-logout"
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-200 border border-red-500/20 hover:border-red-500/40 rounded text-xs transition-colors flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left Side Navigation tabs */}
        <aside className="w-full md:w-64 bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-3 mb-2 font-bold">Módulos Escolares</p>
          
          <button
            id="tab-ano-lectivo"
            onClick={() => setActiveTab('ano-lectivo')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'ano-lectivo' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Ano Lectivo & Épocas</span>
          </button>

          <button
            id="tab-turmas"
            onClick={() => setActiveTab('turmas')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'turmas' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Perfis de Turmas</span>
          </button>

          <button
            id="tab-professores"
            onClick={() => setActiveTab('professores')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'professores' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Professores</span>
          </button>

          <button
            id="tab-disciplinas"
            onClick={() => setActiveTab('disciplinas')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'disciplinas' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Disciplinas</span>
          </button>

          <button
            id="tab-sessoes"
            onClick={() => setActiveTab('sessoes')}
            className={`w-full text-left px-4 py-2.5 rounded font-medium text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'sessoes' ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Bloqueio de Sessões</span>
          </button>

          <div className="border-t border-slate-800 pt-4 mt-4">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-3 mb-2 font-bold">Segurança & Sistema</p>
            
            {/* Auto Timeout Quick Controls */}
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase text-amber-500/70 font-mono flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Auto-Saída Inatividade</span>
              </span>
              
              <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={timeoutEnabled}
                  onChange={(e) => setTimeoutEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Habilitar Fecho Auto</span>
              </label>

              {timeoutEnabled && (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={timeoutMins}
                    onChange={(e) => setTimeoutMins(parseInt(e.target.value) || 5)}
                    className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-xs text-white rounded font-mono"
                  />
                  <span className="text-[10px] text-slate-400">minutos</span>
                </div>
              )}

              <button
                onClick={handleSaveTimeoutConfig}
                className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[10px] font-bold rounded uppercase transition-colors"
              >
                Salvar Config.
              </button>
            </div>
          </div>
        </aside>

        {/* Content Region */}
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

          {/* TAB 1: ANO LECTIVO & EPOCAS */}
          {activeTab === 'ano-lectivo' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>Controle do Ano Lectivo & Épocas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Gere o ciclo operacional da escola, trimestres e fechamentos de segurança.</p>
              </div>

              {/* Year State banner */}
              {!dbState.anoLectivoIniciado && !dbState.anoLectivoTerminado ? (
                <div className="p-6 bg-slate-950 border border-amber-500/20 rounded-xl space-y-4 text-center max-w-2xl">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Ano Lectivo Não Iniciado</h3>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Para iniciar o funcionamento do software e permitir que os professores façam login e operações, você deve iniciar o ano lectivo. Isto ativará automaticamente o 1º Trimestre.
                  </p>
                  <button
                    id="start-academic-year-btn"
                    onClick={handleStartYear}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-amber-500/10"
                  >
                    Iniciar Ano Lectivo
                  </button>
                </div>
              ) : dbState.anoLectivoIniciado && !dbState.anoLectivoTerminado ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current status */}
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded uppercase font-mono font-bold">Ativo &bull; Operacional</span>
                    <h3 className="text-2xl font-bold text-white mt-2">Trimestre em Curso: <span className="text-amber-400">{dbState.currentTrimester}º Trimestre</span></h3>
                    <p className="text-xs text-slate-400">Todos os dados inseridos pelos docentes serão atribuídos para o {dbState.currentTrimester}º Trimestre.</p>

                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      {dbState.currentTrimester < 3 ? (
                        <button
                          id="advance-trimester-btn"
                          onClick={() => triggerValidation('trimester')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded flex items-center justify-center space-x-2 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 animate-spin-slow" />
                          <span>Fechar Época e Avançar para o {dbState.currentTrimester + 1}º Trimestre</span>
                        </button>
                      ) : (
                        <p className="text-xs text-amber-400 font-mono">Nos encontramos no último trimestre (3º Trimestre). Próxima ação recomendada: Encerramento do Ano Lectivo.</p>
                      )}

                      <button
                        id="end-academic-year-btn"
                        onClick={() => triggerValidation('end_year')}
                        className="w-full py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-500/20 text-red-200 text-xs font-bold uppercase rounded flex items-center justify-center space-x-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Terminar e Fechar Ano Lectivo</span>
                      </button>
                    </div>
                  </div>

                  {/* Operational Guide */}
                  <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-semibold text-white">Manual Operacional</h4>
                    <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                      <li><strong>Avanço de Época</strong>: Ao avançar para o próximo trimestre, as notas e faltas atuais são congeladas/arquivadas em snapshots seguros e os utilizadores começam do zero no trimestre seguinte.</li>
                      <li><strong>Fechamento</strong>: Ao terminar o ano lectivo, o acesso dos professores será completamente revogado (bloqueio automático) e a pauta anual finalizada.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Year Ended view */
                <div className="space-y-6">
                  <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-xl space-y-4 max-w-3xl">
                    <h3 className="text-lg font-bold text-red-400 flex items-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span>Ano Letivo Oficialmente Encerrado e Bloqueado</span>
                    </h3>
                    <p className="text-sm text-slate-300">
                      O ano letivo escolar corrente foi finalizado. O acesso para professores normais e coordenadores está totalmente revogado e trancado.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => triggerValidation('clear_year')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono uppercase rounded transition-colors"
                      >
                        Zerar Banco de Dados para Novo Ano Letivo
                      </button>
                    </div>
                  </div>

                  {/* Print Annual Report summaries */}
                  {dbState.yearEndSummary && (
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                      <h4 className="font-bold text-white flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        <span>Resumos do Ano Lectivo (Relatório Pauta Geral)</span>
                      </h4>
                      <p className="text-xs text-slate-400">Resumo final estruturado e pronto para download/impressão direta para os registros escolares.</p>
                      
                      <div className="max-h-96 overflow-y-auto border border-slate-800 p-4 rounded bg-slate-900/50 space-y-4 text-xs font-mono">
                        <div className="border-b border-slate-800 pb-3 text-center">
                          <h5 className="font-bold text-lg text-white">VANGUARD ESTUDANTE - RELATÓRIO ANUAL GERAL</h5>
                          <p className="text-slate-400 text-[10px]">Gerado em: {new Date(dbState.yearEndSummary.closedAt).toLocaleString()}</p>
                        </div>

                        {dbState.turmas.length === 0 ? (
                          <p className="text-center text-slate-500 py-4">Nenhuma turma registrada no encerramento.</p>
                        ) : (
                          dbState.turmas.map((t) => {
                            const students = dbState.alunos.filter(s => s.turmaId === t.id);
                            return (
                              <div key={t.id} className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                                <p className="font-bold text-white text-sm">Turma: {t.classe} - {t.identificacao} ({t.periodo})</p>
                                <p className="text-slate-400 text-[10px]">Alunos Matriculados: {students.length} | Sala: {t.sala}</p>
                                
                                <div className="space-y-1 pl-2">
                                  {students.map(st => {
                                    return (
                                      <div key={st.id} className="text-[11px] text-slate-300 flex justify-between border-b border-slate-900 pb-1">
                                        <span>Nº {st.numero} &bull; {st.nome}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs uppercase font-bold rounded flex items-center space-x-1"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Imprimir / Baixar Pauta de Ano Letivo Completo (PDF)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Past Trimesters snapshot views */}
              {dbState.snapshots.length > 0 && (
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <h3 className="font-bold text-white flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>Dados de Épocas Passadas (Histórico Guardado)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Dados congelados de trimestres finalizados. Disponíveis para consulta e exportação de PDF, impossibilitados de edição.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbState.snapshots.map((snap, i) => (
                      <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="font-bold text-indigo-400 uppercase">{snap.trimester}º Trimestre</span>
                          <span className="text-slate-500 font-mono text-[10px]">{new Date(snap.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 font-mono">Turmas Registradas: {snap.classes.length}</p>
                        <p className="text-slate-300 font-mono">Professores Registrados: {snap.teachers.length}</p>
                        <p className="text-slate-300 font-mono">Alunos Registrados: {snap.students.length}</p>
                        
                        <button
                          onClick={() => {
                            // Simple print workflow for historical snapshot
                            const win = window.open('', '_blank');
                            if (win) {
                              win.document.write(`
                                <html>
                                <head>
                                  <title>Histórico - ${snap.trimester}º Trimestre</title>
                                  <style>
                                    body { font-family: monospace; padding: 20px; color: #333; }
                                    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                                    .block { margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Vanguard Estudante - Histórico de Época</h1>
                                  <p>Trimestre: ${snap.trimester}º Trimestre</p>
                                  <p>Data do Arquivo: ${new Date(snap.timestamp).toLocaleString()}</p>
                                  <div class="block">
                                    <h3>Resumo Quantitativo</h3>
                                    <p>Turmas: ${snap.classes.length}</p>
                                    <p>Alunos: ${snap.students.length}</p>
                                    <p>Docentes: ${snap.teachers.length}</p>
                                  </div>
                                  <script>window.print();</script>
                                </body>
                                </html>
                              `);
                              win.document.close();
                            }
                          }}
                          className="w-full mt-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
                        >
                          Exportar Relatório Trimestral PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TURMAS */}
          {activeTab === 'turmas' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                    <Users className="w-5 h-5 text-amber-500" />
                    <span>Perfis de Turmas Escolares</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Crie e configure as turmas de alunos, salas e disciplinas tuteladas.</p>
                </div>

                <button
                  id="add-turma-btn"
                  onClick={() => setShowAddTurma(!showAddTurma)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold uppercase text-xs tracking-wider rounded transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Perfil de Turma</span>
                </button>
              </div>

              {/* Form Add Turma */}
              {showAddTurma && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleAddTurma}
                  className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-4"
                >
                  <h3 className="font-bold text-white text-sm font-sans">Cadastrar Nova Turma</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Classe / Ano</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 9ª Classe, 12ª Classe"
                        value={turmaClasse}
                        onChange={(e) => setTurmaClasse(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Identificação da Turma</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Turma C, E5GT, B6"
                        value={turmaIdentificacao}
                        onChange={(e) => setTurmaIdentificacao(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Sala</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Sala 12, Bloco B"
                        value={turmaSala}
                        onChange={(e) => setTurmaSala(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Período Letivo</label>
                      <select
                        value={turmaPeriodo}
                        onChange={(e) => setTurmaPeriodo(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                      >
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                      </select>
                    </div>
                  </div>

                  {/* Selecting disciplines */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase font-mono">Selecione as Disciplinas Desta Turma</label>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {dbState.disciplinasGlobais.map((d) => {
                        const isSelected = selectedDisciplines.includes(d.id);
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => handleToggleDiscSelection(d.id)}
                            className={`p-2 text-xs rounded text-left border flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                            }`}
                          >
                            <span>{d.nome}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTurma(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded"
                    >
                      Criar Turma
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Class profiles list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dbState.turmas.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl col-span-2">
                    Nenhuma turma criada ainda. Use o botão acima para registrar.
                  </div>
                ) : (
                  dbState.turmas.map((t) => {
                    const coord = dbState.professores.find(p => p.id === t.coordenadorId);
                    const studentsCount = dbState.alunos.filter(s => s.turmaId === t.id).length;
                    return (
                      <div key={t.id} className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                          <div>
                            <h3 className="font-bold text-white text-lg">{t.classe} &bull; {t.identificacao}</h3>
                            <span className="text-xs text-slate-500 font-mono">Sala {t.sala} &bull; {t.periodo}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase font-mono">
                            {studentsCount} {studentsCount === 1 ? 'Aluno' : 'Alunos'}
                          </span>
                        </div>

                        {/* Coordinator display */}
                        <div className="p-3 bg-slate-900/60 rounded border border-slate-800 flex justify-between items-center">
                          <div className="text-xs">
                            <span className="text-slate-500 uppercase font-mono font-bold block text-[9px]">Coordenador de Turma (Professor Especial)</span>
                            <span className="font-semibold text-amber-400">{coord ? coord.nome : 'Nenhum definido'}</span>
                          </div>
                        </div>

                        {/* Disciplines lists */}
                        <div className="space-y-1.5">
                          <span className="text-slate-500 uppercase font-mono font-bold text-[9px] block">Cadeiras de Disciplinas & Regedores</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {t.disciplinas.map((disc) => {
                              const regedor = dbState.professores.find(p => p.id === disc.professorId);
                              return (
                                <div key={disc.id} className="p-2 bg-slate-900/40 rounded border border-slate-850 text-[11px] flex justify-between items-center">
                                  <span className="text-slate-300 font-medium">{disc.nome}</span>
                                  {regedor ? (
                                    <span className="text-indigo-400 font-medium truncate max-w-[100px]">{regedor.nome}</span>
                                  ) : (
                                    <span className="text-red-400/80 font-mono text-[9px] uppercase font-bold">Inativa (Reg. Null)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROFESSORES */}
          {activeTab === 'professores' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                    <Users className="w-5 h-5 text-amber-500" />
                    <span>Corpo Docente (Professores)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Cadastre e gerencie professores, defina regências e atribua o cargo de Coordenador.</p>
                </div>

                <button
                  id="add-professor-btn"
                  onClick={() => {
                    setShowAddTeacher(!showAddTeacher);
                    setEditingTeacherId(null);
                    setTeacherNome('');
                    setTeacherTurmaId('');
                    setTeacherDisciplinaId('');
                    setTeacherCargo('Normal');
                    setTeacherSenha('');
                    setTeacherConfSenha('');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold uppercase text-xs tracking-wider rounded transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Professor</span>
                </button>
              </div>

              {/* Form Add / Edit Teacher */}
              {showAddTeacher && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleAddTeacherSubmit}
                  className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-4"
                >
                  <h3 className="font-bold text-white text-sm font-sans">
                    {editingTeacherId ? 'Editar Dados do Professor' : 'Cadastrar Novo Professor para Turma'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SELECT TURMA FIRST - MANDATORY */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">1. Selecione a Turma</label>
                      <select
                        id="form-prof-turma-select"
                        required
                        disabled={editingTeacherId !== null} // Cannot edit class after registered
                        value={teacherTurmaId}
                        onChange={(e) => {
                          setTeacherTurmaId(e.target.value);
                          setTeacherDisciplinaId('');
                          setTeacherCargo('Normal');
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white disabled:opacity-50"
                      >
                        <option value="">-- Escolha uma Turma --</option>
                        {dbState.turmas.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.classe} - {t.identificacao} ({t.periodo})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* TEACHER NAME - ONLY IF TURMA IS SELECTED */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">2. Nome Completo</label>
                      <input
                        type="text"
                        required
                        disabled={!teacherTurmaId}
                        placeholder="Nome Completo do Docente"
                        value={teacherNome}
                        onChange={(e) => setTeacherNome(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-600 disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SELECT DISCIPLINES IN THAT TURMA */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">3. Disciplina Lencionada</label>
                      <select
                        required
                        disabled={!teacherTurmaId || editingTeacherId !== null}
                        value={teacherDisciplinaId}
                        onChange={(e) => setTeacherDisciplinaId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white disabled:opacity-40"
                      >
                        <option value="">-- Escolha a Disciplina --</option>
                        {getDisciplinesForRegister().map((d) => {
                          // Check if another teacher is already occupying it
                          const isOccupied = d.professorId !== null && d.professorId !== editingTeacherId;
                          return (
                            <option key={d.id} value={d.id} disabled={isOccupied} className={isOccupied ? 'text-slate-600 bg-slate-950 line-through' : ''}>
                              {d.nome} {isOccupied ? '(Já Ocupada)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* CARGO (COORDINATOR OR NORMAL) */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">4. Cargo na Turma</label>
                      <select
                        disabled={!teacherTurmaId || editingTeacherId !== null}
                        value={teacherCargo}
                        onChange={(e) => setTeacherCargo(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white disabled:opacity-40"
                      >
                        <option value="Normal">Professor Normal (Regente)</option>
                        <option value="Coordenador" disabled={isCoordinatorOccupiedForClass() && editingTeacherId === null}>
                          Coordenador de Turma (Especial) {isCoordinatorOccupiedForClass() ? '(Já Ocupado)' : ''}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* PASSWORDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Senha de Acesso</label>
                      <div className="relative">
                        <input
                          type={showTeacherPw ? 'text' : 'password'}
                          required
                          disabled={!teacherTurmaId}
                          placeholder="••••••••"
                          value={teacherSenha}
                          onChange={(e) => setTeacherSenha(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white disabled:opacity-40 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTeacherPw(!showTeacherPw)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                        >
                          {showTeacherPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 uppercase font-mono">Confirmar Senha</label>
                      <input
                        type={showTeacherPw ? 'text' : 'password'}
                        required
                        disabled={!teacherTurmaId}
                        placeholder="••••••••"
                        value={teacherConfSenha}
                        onChange={(e) => setTeacherConfSenha(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white disabled:opacity-40 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddTeacher(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!teacherTurmaId}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-amber-950 font-bold text-xs rounded"
                    >
                      {editingTeacherId ? 'Salvar Edição' : 'Cadastrar Professor'}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Teachers list table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm">Lista de Professores Registrados</h3>
                </div>

                <div className="overflow-x-auto">
                  {dbState.professores.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-mono text-sm">Nenhum professor cadastrado ainda.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase">
                          <th className="px-5 py-3">Docente</th>
                          <th className="px-5 py-3">Turma Alocada</th>
                          <th className="px-5 py-3">Disciplina</th>
                          <th className="px-5 py-3">Cargo</th>
                          <th className="px-5 py-3">Senha Atual</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                        {dbState.professores.map((prof) => {
                          const cl = dbState.turmas.find(t => t.id === prof.turmaId);
                          const disc = dbState.disciplinasGlobais.find(d => d.id === prof.disciplinaId)?.nome || '';
                          return (
                            <tr key={prof.id} className="hover:bg-slate-900/10">
                              <td className="px-5 py-3 font-semibold text-white">{prof.nome}</td>
                              <td className="px-5 py-3">{cl ? `${cl.classe} - ${cl.identificacao}` : 'N/A'}</td>
                              <td className="px-5 py-3 font-mono text-indigo-400">{disc}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                  prof.cargo === 'Coordenador' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {prof.cargo === 'Coordenador' ? 'Coordenador' : 'Docente Normal'}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono text-slate-500 select-all font-semibold hover:text-slate-300 transition-colors">
                                {prof.senha}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => handleEditTeacher(prof)}
                                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/30 transition-colors inline-flex items-center space-x-1"
                                  title="Editar dados e redefinir senha"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Editar</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISCIPLINAS */}
          {activeTab === 'disciplinas' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span>Configuração de Disciplinas (Cadeiras)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Gerencie as disciplinas disponíveis globalmente na instituição e associe-as às turmas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Global Disciplines Management */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-sm">Disciplinas Globais do Sistema</h3>
                  
                  <form onSubmit={handleAddGlobalDisc} className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="Nova Disciplina (Ex: Geografia)"
                      value={newGlobalDiscNome}
                      onChange={(e) => setNewGlobalDiscNome(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded text-white"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold uppercase text-[10px] rounded transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </form>

                  <div className="border border-slate-850 rounded bg-slate-900/30 max-h-64 overflow-y-auto divide-y divide-slate-850">
                    {dbState.disciplinasGlobais.map((d) => (
                      <div key={d.id} className="p-2.5 text-xs text-slate-300 font-mono flex items-center justify-between">
                        <span>{d.nome}</span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {d.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Discipline to Selected Class */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-sm">Inserir Disciplina em Turma</h3>
                  <p className="text-xs text-slate-400">Adicione disciplinas preexistentes diretamente para qualquer perfil de turma selecionada.</p>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 uppercase font-mono">Selecione a Turma</label>
                      <select
                        value={selectedTurmaForDisc}
                        onChange={(e) => setSelectedTurmaForDisc(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="">-- Escolha uma Turma --</option>
                        {dbState.turmas.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.classe} - {t.identificacao}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 uppercase font-mono">Selecione a Disciplina</label>
                      <select
                        value={selectedDiscToAdd}
                        onChange={(e) => setSelectedDiscToAdd(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="">-- Escolha uma Disciplina --</option>
                        {dbState.disciplinasGlobais.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleAddDiscToTurma}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Disciplina à Turma</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: LOCK SESSIONS */}
          {activeTab === 'sessoes' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <span>Controle e Bloqueio de Sessões Escolares</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Bloqueie o início de seção de todos os professores de determinadas turmas em tempo real.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Selector */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-sm">Selecione as Turmas Operacionais</h3>
                  <p className="text-xs text-slate-400">Clique nas turmas para incluí-las na operação de segurança em massa.</p>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {dbState.turmas.map((t) => {
                      const isSelected = selectedClassesForBlock.includes(t.id);
                      const isCurrentlyBlocked = dbState.blockedClasses.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleToggleClassSelectionForBlock(t.id)}
                          className={`w-full p-3 text-xs rounded-lg text-left border flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <span className="font-bold block">{t.classe} &bull; {t.identificacao}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Sala {t.sala} &bull; {t.periodo}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {isCurrentlyBlocked && (
                              <span className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-500/20 text-[9px] rounded font-bold uppercase font-mono">Bloqueado Atualmente</span>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => { setBlockActionType('block'); setShowBlockConfirm(true); }}
                      disabled={selectedClassesForBlock.length === 0}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Bloquear Turmas</span>
                    </button>
                    
                    <button
                      onClick={() => { setBlockActionType('unblock'); setShowBlockConfirm(true); }}
                      disabled={selectedClassesForBlock.length === 0}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Desbloquear</span>
                    </button>
                  </div>
                </div>

                {/* Operations Info */}
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-semibold text-white">Impacto Operacional de Bloqueio</h4>
                  <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4">
                    <li><strong>Impedimento de Login</strong>: Os professores das turmas bloqueadas não conseguirão iniciar sessão na tela inicial.</li>
                    <li><strong>Sessão Corrente / Notificação</strong>: Docentes que já estiverem com sessões ativas receberão uma notificação na tela em tempo real, os dados de notas pendentes serão guardados automaticamente e a sua sessão será imediatamente finalizada e bloqueada de forma limpa.</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL 1: CHANGE PASSWORD ADM */}
      {showAdmPwChange && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm"
          >
            <h3 className="font-bold text-white text-base mb-4 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <span>Alterar Própria Senha</span>
            </h3>

            <form onSubmit={handleChangeAdmPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase font-mono">Nova Senha Administrativa</label>
                <input
                  type="text"
                  required
                  placeholder="Introduza a nova senha"
                  value={newAdmPassword}
                  onChange={(e) => setNewAdmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-700 text-sm rounded text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase font-mono">Confirmar Nova Senha</label>
                <input
                  type="text"
                  required
                  placeholder="Repita a nova senha"
                  value={confNewAdmPassword}
                  onChange={(e) => setConfNewAdmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-700 text-sm rounded text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdmPwChange(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded"
                >
                  Alterar Senha
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: CONFIRM SESSION BLOCK/UNBLOCK */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center space-y-4"
          >
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="font-bold text-white text-base">Confirmar Operação de Bloqueio</h3>
            <p className="text-xs text-slate-300">
              Tem certeza que deseja prosseguir com o {blockActionType === 'block' ? 'BLOQUEIO' : 'DESBLOQUEIO'} das sessões para as turmas selecionadas? Isso forçará a saída automática de todos os professores que estiverem trabalhando atualmente nelas!
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={executeSessionBlock}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs text-white rounded font-bold uppercase"
              >
                Prosseguir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: TRIME / END YEAR PASSWORD VALIDATION */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm space-y-4"
          >
            <div className="text-center space-y-2">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="font-bold text-white text-base">Validação de Segurança Necessária</h3>
              <p className="text-xs text-slate-400">
                {validationType === 'trimester' 
                  ? 'Esta operação fechará a época corrente de forma definitiva e passará para o próximo trimestre escolar.' 
                  : validationType === 'end_year' 
                  ? 'Esta operação encerrará e bloqueará o ano letivo completo para todos os docentes.'
                  : 'Esta operação apagará todos os dados escolares do ano letivo de forma irreversível!'}
              </p>
              <p className="text-xs text-amber-400 font-bold">Por favor, insira suas credenciais do Administrador (Senha) para prosseguir:</p>
            </div>

            <form onSubmit={handleValidatePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono uppercase">Senha do Administrador</label>
                <div className="relative">
                  <input
                    type={showValPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={valPassword}
                    onChange={(e) => setValPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowValPw(!showValPw)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                  >
                    {showValPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs uppercase rounded"
                >
                  Confirmar e Prosseguir
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
