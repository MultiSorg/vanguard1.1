/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, GraduationCap, Wrench, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { DatabaseState, Professor } from '../types';

interface LoginScreenProps {
  dbState: DatabaseState;
  onLoginSuccess: (role: 'adm' | 'professor' | 'support', data?: any) => void;
  openSupportPanel: () => void;
}

export default function LoginScreen({ dbState, onLoginSuccess, openSupportPanel }: LoginScreenProps) {
  const [activePanel, setActivePanel] = useState<'adm' | 'normal' | 'coordenador' | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<'adm' | 'normal' | 'coordenador' | null>(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Get teachers filtered by role
  const getTeachersForRole = (isCoordinator: boolean) => {
    if (!selectedClassId) return [];
    return dbState.professores.filter(
      (p) => p.turmaId === selectedClassId && (isCoordinator ? p.cargo === 'Coordenador' : p.cargo === 'Normal')
    );
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activePanel === 'adm') {
      if (username.trim().toLowerCase() === 'admin01' && password === dbState.admPassword) {
        onLoginSuccess('adm');
      } else {
        setError('Credenciais administrativas incorretas.');
      }
    } else {
      // Teacher or Coordinator login
      if (!selectedClassId) {
        setError('Por favor, selecione uma turma.');
        return;
      }
      if (!selectedTeacherId) {
        setError('Por favor, selecione o seu perfil de professor.');
        return;
      }

      // Check if class is blocked
      if (dbState.blockedClasses.includes(selectedClassId)) {
        setError('O acesso para esta turma foi temporariamente BLOQUEADO pelo Administrador.');
        return;
      }

      const teacher = dbState.professores.find((p) => p.id === selectedTeacherId);
      if (teacher && teacher.senha === password) {
        if (activePanel === 'coordenador' && teacher.cargo !== 'Coordenador') {
          setError('Este perfil não possui o cargo de Coordenador.');
          return;
        }
        if (activePanel === 'normal' && teacher.cargo !== 'Normal') {
          setError('Este perfil pertence a um Coordenador de Turma. Inicie seção no painel de Coordenador.');
          return;
        }
        onLoginSuccess('professor', teacher);
      } else {
        setError('Senha incorreta.');
      }
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setSelectedClassId('');
    setSelectedTeacherId('');
    setShowPassword(false);
    setError('');
  };

  const selectPanel = (panel: 'adm' | 'normal' | 'coordenador') => {
    setActivePanel(panel);
    resetForm();
  };

  // Check if year is initialized
  const canTeachersLogin = dbState.anoLectivoIniciado && !dbState.anoLectivoTerminado;

  return (
    <div id="login-container" className="relative min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-slate-950 font-sans">
      
      {/* Visual background split when no panel is actively expanded */}
      <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none opacity-40 mix-blend-overlay">
        <div className="flex-1 bg-gradient-to-br from-amber-600 to-amber-950" />
        <div className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-950" />
        <div className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-950" />
      </div>

      {/* ADM Section */}
      <motion.div
        id="login-adm-panel"
        animate={{
          flex: activePanel === 'adm' ? 5 : activePanel ? 0.5 : hoveredPanel === 'adm' ? 1.4 : 1,
          opacity: activePanel && activePanel !== 'adm' ? 0.2 : 1
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        onHoverStart={() => !activePanel && setHoveredPanel('adm')}
        onHoverEnd={() => setHoveredPanel(null)}
        onClick={() => !activePanel && selectPanel('adm')}
        className={`relative flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none transition-colors duration-300 ${
          activePanel === 'adm' ? 'cursor-default bg-amber-950/95' : 'bg-amber-900/30 hover:bg-amber-900/40'
        } border-b md:border-b-0 md:border-r border-amber-500/20`}
      >
        <AnimatePresence mode="wait">
          {activePanel !== 'adm' ? (
            <motion.div
              key="adm-collapsed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Shield className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-wider uppercase font-sans">Administração</h2>
              <p className="text-xs text-amber-200/60 max-w-xs font-mono">Gestão escolar global, turmas, disciplinas e utilizadores</p>
            </motion.div>
          ) : (
            <motion.div
              key="adm-expanded"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-amber-500/20 pb-4">
                <button
                  id="back-from-adm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePanel(null);
                  }}
                  className="px-3 py-1 text-sm bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 font-mono transition-colors"
                >
                  &larr; Voltar
                </button>
                <div className="flex-1 text-right">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-mono font-bold">Painel ADM</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <Shield className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-2xl font-semibold">Acesso Administrativo</h3>
                <p className="text-sm text-amber-200/70">Insira suas credenciais para gerenciar a plataforma</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-500/30 rounded text-red-200 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-amber-300 font-mono uppercase">Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-amber-400/50" />
                    <input
                      id="adm-username"
                      type="text"
                      required
                      placeholder="Ex: Admin01"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-amber-950/50 border border-amber-500/30 rounded focus:outline-none focus:border-amber-400 text-white placeholder-amber-500/40 text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-amber-300 font-mono uppercase">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-amber-400/50" />
                    <input
                      id="adm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-amber-950/50 border border-amber-500/30 rounded focus:outline-none focus:border-amber-400 text-white placeholder-amber-500/40 text-sm font-mono"
                    />
                    <button
                      type="button"
                      id="toggle-adm-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-amber-400/50 hover:text-amber-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-adm-login"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold tracking-wider uppercase rounded transition-colors shadow-lg shadow-amber-500/15"
                >
                  Entrar no Painel
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* PROFESSOR NORMAL Section */}
      <motion.div
        id="login-normal-panel"
        animate={{
          flex: activePanel === 'normal' ? 5 : activePanel ? 0.5 : hoveredPanel === 'normal' ? 1.4 : 1,
          opacity: activePanel && activePanel !== 'normal' ? 0.2 : 1
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        onHoverStart={() => !activePanel && setHoveredPanel('normal')}
        onHoverEnd={() => setHoveredPanel(null)}
        onClick={() => !activePanel && selectPanel('normal')}
        className={`relative flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none transition-colors duration-300 ${
          activePanel === 'normal' ? 'cursor-default bg-indigo-950/95' : 'bg-indigo-900/30 hover:bg-indigo-900/40'
        } border-b md:border-b-0 md:border-r border-indigo-500/20`}
      >
        <AnimatePresence mode="wait">
          {activePanel !== 'normal' ? (
            <motion.div
              key="normal-collapsed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <BookOpen className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-wider uppercase font-sans">Professores</h2>
              <p className="text-xs text-indigo-200/60 max-w-xs font-mono">Lançamento de notas, registo de faltas e presenças diárias</p>
            </motion.div>
          ) : (
            <motion.div
              key="normal-expanded"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-indigo-500/20 pb-4">
                <button
                  id="back-from-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePanel(null);
                  }}
                  className="px-3 py-1 text-sm bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 font-mono transition-colors"
                >
                  &larr; Voltar
                </button>
                <div className="flex-1 text-right">
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-mono font-bold">Docente Regular</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <BookOpen className="w-10 h-10 text-indigo-400 mx-auto" />
                <h3 className="text-2xl font-semibold">Área do Professor</h3>
                <p className="text-sm text-indigo-200/70">Selecione sua turma e insira suas credenciais</p>
              </div>

              {!canTeachersLogin ? (
                <div className="p-4 bg-amber-950/50 border border-amber-500/40 rounded text-amber-200 text-xs text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-bold uppercase tracking-wider">Ano Lectivo Não Ativo</p>
                  <p>O Administrador ainda não deu início ao ano lectivo ou as atividades do sistema foram encerradas.</p>
                </div>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-950/50 border border-red-500/30 rounded text-red-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-indigo-300 font-mono uppercase">Selecione a Turma</label>
                    <select
                      id="teacher-class-select"
                      required
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedTeacherId('');
                      }}
                      className="w-full px-3 py-2 bg-indigo-950/50 border border-indigo-500/30 rounded focus:outline-none focus:border-indigo-400 text-white text-sm"
                    >
                      <option value="" className="bg-indigo-950">-- Selecione a Turma --</option>
                      {dbState.turmas.map((t) => (
                        <option key={t.id} value={t.id} className="bg-indigo-950">
                          {t.classe} - {t.identificacao} ({t.periodo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-indigo-300 font-mono uppercase">Professor / Disciplina</label>
                    <select
                      id="teacher-profile-select"
                      required
                      disabled={!selectedClassId}
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 bg-indigo-950/50 border border-indigo-500/30 rounded focus:outline-none focus:border-indigo-400 text-white text-sm disabled:opacity-40"
                    >
                      <option value="" className="bg-indigo-950">-- Selecione seu Nome --</option>
                      {getTeachersForRole(false).map((p) => {
                        const discNome = dbState.disciplinasGlobais.find(d => d.id === p.disciplinaId)?.nome || '';
                        return (
                          <option key={p.id} value={p.id} className="bg-indigo-950">
                            {p.nome} ({discNome})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-indigo-300 font-mono uppercase">Senha de Acesso</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400/50" />
                      <input
                        id="teacher-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={!selectedTeacherId}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-indigo-950/50 border border-indigo-500/30 rounded focus:outline-none focus:border-indigo-400 text-white placeholder-indigo-500/40 text-sm font-mono disabled:opacity-40"
                      />
                      <button
                        type="button"
                        id="toggle-teacher-password"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-indigo-400/50 hover:text-indigo-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit-teacher-login"
                    disabled={!selectedTeacherId}
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-indigo-950 font-bold tracking-wider uppercase rounded transition-colors shadow-lg shadow-indigo-500/15 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Iniciar Seção
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* COORDENADOR DE TURMA Section */}
      <motion.div
        id="login-coordinator-panel"
        animate={{
          flex: activePanel === 'coordenador' ? 5 : activePanel ? 0.5 : hoveredPanel === 'coordenador' ? 1.4 : 1,
          opacity: activePanel && activePanel !== 'coordenador' ? 0.2 : 1
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        onHoverStart={() => !activePanel && setHoveredPanel('coordenador')}
        onHoverEnd={() => setHoveredPanel(null)}
        onClick={() => !activePanel && selectPanel('coordenador')}
        className={`relative flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none transition-colors duration-300 ${
          activePanel === 'coordenador' ? 'cursor-default bg-emerald-950/95' : 'bg-emerald-900/30 hover:bg-emerald-900/40'
        } border-b md:border-b-0`}
      >
        <AnimatePresence mode="wait">
          {activePanel !== 'coordenador' ? (
            <motion.div
              key="coordenador-collapsed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <GraduationCap className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-wider uppercase font-sans">Coordenadores</h2>
              <p className="text-xs text-emerald-200/60 max-w-xs font-mono">Gestão de pautas, boletins, rankings e matrículas de alunos</p>
            </motion.div>
          ) : (
            <motion.div
              key="coordenador-expanded"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-emerald-500/20 pb-4">
                <button
                  id="back-from-coordinator"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePanel(null);
                  }}
                  className="px-3 py-1 text-sm bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 font-mono transition-colors"
                >
                  &larr; Voltar
                </button>
                <div className="flex-1 text-right">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-bold">Coordenador</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <GraduationCap className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-2xl font-semibold">Área do Coordenador</h3>
                <p className="text-sm text-emerald-200/70">Selecione a turma que você coordena</p>
              </div>

              {!canTeachersLogin ? (
                <div className="p-4 bg-amber-950/50 border border-amber-500/40 rounded text-amber-200 text-xs text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-bold uppercase tracking-wider">Ano Lectivo Não Ativo</p>
                  <p>O Administrador ainda não deu início ao ano lectivo ou as atividades do sistema foram encerradas.</p>
                </div>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-950/50 border border-red-500/30 rounded text-red-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-emerald-300 font-mono uppercase">Selecione a Turma Coordenada</label>
                    <select
                      id="coordinator-class-select"
                      required
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedTeacherId('');
                      }}
                      className="w-full px-3 py-2 bg-emerald-950/50 border border-emerald-500/30 rounded focus:outline-none focus:border-emerald-400 text-white text-sm"
                    >
                      <option value="" className="bg-emerald-950">-- Selecione a Turma --</option>
                      {dbState.turmas.map((t) => (
                        <option key={t.id} value={t.id} className="bg-emerald-950">
                          {t.classe} - {t.identificacao} ({t.periodo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-emerald-300 font-mono uppercase">Coordenador / Disciplina</label>
                    <select
                      id="coordinator-profile-select"
                      required
                      disabled={!selectedClassId}
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-950/50 border border-emerald-500/30 rounded focus:outline-none focus:border-emerald-400 text-white text-sm disabled:opacity-40"
                    >
                      <option value="" className="bg-emerald-950">-- Selecione seu Nome --</option>
                      {getTeachersForRole(true).map((p) => {
                        const discNome = dbState.disciplinasGlobais.find(d => d.id === p.disciplinaId)?.nome || '';
                        return (
                          <option key={p.id} value={p.id} className="bg-emerald-950">
                            {p.nome} (Coord. / {discNome})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-emerald-300 font-mono uppercase">Senha de Acesso</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400/50" />
                      <input
                        id="coordinator-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={!selectedTeacherId}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-emerald-950/50 border border-emerald-500/30 rounded focus:outline-none focus:border-emerald-400 text-white placeholder-emerald-500/40 text-sm font-mono disabled:opacity-40"
                      />
                      <button
                        type="button"
                        id="toggle-coordinator-password"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-emerald-400/50 hover:text-emerald-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit-coordinator-login"
                    disabled={!selectedTeacherId}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold tracking-wider uppercase rounded transition-colors shadow-lg shadow-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Acessar Coordenação
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Support Panel & Copyright Footer */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center space-y-2 pointer-events-none z-10">
        <button
          id="support-panel-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openSupportPanel();
          }}
          className="pointer-events-auto p-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-sky-400 hover:text-sky-300 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Painel de Suporte Técnico (GilPraga)"
        >
          <Wrench className="w-5 h-5" />
        </button>
        <div className="text-[10px] tracking-widest text-slate-500 font-mono uppercase select-none font-bold">
          &copy; MultiS - Tecnologia e Gestão Escolar Segura
        </div>
      </div>

    </div>
  );
}
