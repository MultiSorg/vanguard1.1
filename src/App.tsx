/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shield, Clock, AlertTriangle, CheckCircle, Info, Cloud, CloudOff, Database, RefreshCw, HelpCircle } from 'lucide-react';

import { DatabaseState, Professor } from './types';
import { getDatabaseState, saveDatabaseState, saveDatabaseStateLocal } from './utils/db';
import { isFirebaseConfigured, pullStateFromFirebase, pushStateToFirebase, pushStateToFirebaseImmediate, subscribeToFirebaseState, getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './utils/firebase';
import LoginScreen from './components/LoginScreen';
import SupportPanel from './components/SupportPanel';
import AdminPanel from './components/AdminPanel';
import TeacherPanel from './components/TeacherPanel';

interface CurrentSession {
  role: 'adm' | 'professor';
  teacher?: Professor;
  lastPassword?: string;
  lastVersion?: number;
}

function isStatePopulated(state: DatabaseState | null | undefined): boolean {
  if (!state) return false;
  return (
    (state.turmas && state.turmas.length > 0) ||
    (state.professores && state.professores.length > 0) ||
    (state.alunos && state.alunos.length > 0) ||
    (state.grades && state.grades.length > 0) ||
    state.anoLectivoIniciado === true
  );
}

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(getDatabaseState());
  const [currentUser, setCurrentUser] = useState<CurrentSession | null>(null);
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  
  // Custom alerts/notifications
  const [timeoutAlert, setTimeoutAlert] = useState(false);
  const [forcedLogoutReason, setForcedLogoutReason] = useState<string | null>(null);
  const [classBlockedWarning, setClassBlockedWarning] = useState<string | null>(null);

  // Firebase states
  const [firebaseStatus, setFirebaseStatus] = useState<'not_configured' | 'syncing' | 'synced' | 'error'>('not_configured');
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [firebaseTab, setFirebaseTab] = useState<'guide' | 'manual'>('guide');
  const [customConfig, setCustomConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const handleOpenFirebaseModal = () => {
    const current = getFirebaseConfig();
    setCustomConfig(current);
    setShowFirebaseModal(true);
  };

  const handleSaveCustomFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(customConfig);
    setShowFirebaseModal(false);
    await handleManualSync();
  };

  const handleClearCustomFirebase = async () => {
    clearFirebaseConfig();
    const current = getFirebaseConfig();
    setCustomConfig(current);
    if (!isFirebaseConfigured()) {
      setFirebaseStatus('not_configured');
      setLastSyncedTime(null);
    } else {
      await handleManualSync();
    }
  };

  // Set document title to Vanguard Académico
  useEffect(() => {
    document.title = 'Vanguard Académico';
  }, []);

  // Sync with Firebase on mount & real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initSync() {
      if (!isFirebaseConfigured()) {
        setFirebaseStatus('not_configured');
        return;
      }

      setFirebaseStatus('syncing');
      try {
        const cloudState = await pullStateFromFirebase();
        const localCurrent = getDatabaseState();

        const cloudHasData = isStatePopulated(cloudState);
        const localHasData = isStatePopulated(localCurrent);

        if (cloudState && cloudHasData) {
          // Cloud has real populated data -> load cloud state locally
          setDbState(cloudState);
          saveDatabaseStateLocal(cloudState);
          setFirebaseStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
        } else if (localHasData && (!cloudState || !cloudHasData)) {
          // Local device has real populated data, but cloud is empty/default -> Push local state to Cloud!
          const success = await pushStateToFirebaseImmediate(localCurrent);
          if (success) {
            setFirebaseStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
          } else {
            setFirebaseStatus('error');
          }
        } else if (cloudState) {
          // Neither has rich custom data yet
          setDbState(cloudState);
          saveDatabaseStateLocal(cloudState);
          setFirebaseStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
        } else {
          // No document on cloud yet, push local state
          const success = await pushStateToFirebaseImmediate(localCurrent);
          if (success) {
            setFirebaseStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
          } else {
            setFirebaseStatus('error');
          }
        }

        // Subscribe to real-time changes from other devices
        unsubscribe = subscribeToFirebaseState((remoteState) => {
          const currentLocal = getDatabaseState();
          const remoteHasData = isStatePopulated(remoteState);
          const currentLocalHasData = isStatePopulated(currentLocal);

          if (remoteHasData || !currentLocalHasData) {
            setDbState(remoteState);
            saveDatabaseStateLocal(remoteState);
            setFirebaseStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
          } else if (currentLocalHasData && !remoteHasData) {
            // Local device has rich data, but remote snapshot came empty -> Push local state up
            pushStateToFirebase(currentLocal);
          }
        });
      } catch (error: any) {
        console.warn('Aviso: Operando em modo offline/local - sincronização com Firebase não disponível:', error?.message || error);
        setFirebaseStatus('error');
      }
    }
    initSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleForcePushToCloud = async () => {
    if (!isFirebaseConfigured()) return;
    setFirebaseStatus('syncing');
    const success = await pushStateToFirebaseImmediate(dbState);
    if (success) {
      setFirebaseStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
    } else {
      setFirebaseStatus('error');
    }
  };

  const handleForcePullFromCloud = async () => {
    if (!isFirebaseConfigured()) return;
    setFirebaseStatus('syncing');
    const cloudState = await pullStateFromFirebase();
    if (cloudState) {
      setDbState(cloudState);
      saveDatabaseStateLocal(cloudState);
      setFirebaseStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
    } else {
      setFirebaseStatus('error');
    }
  };

  const handleManualSync = async () => {
    if (!isFirebaseConfigured()) return;
    setFirebaseStatus('syncing');
    try {
      const localCurrent = getDatabaseState();
      const localHasData = isStatePopulated(localCurrent);

      if (localHasData) {
        await pushStateToFirebaseImmediate(localCurrent);
      } else {
        const cloudState = await pullStateFromFirebase();
        if (cloudState) {
          setDbState(cloudState);
          saveDatabaseStateLocal(cloudState);
        }
      }
      setFirebaseStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('pt-PT'));
    } catch (error: any) {
      console.warn('Aviso: Sincronismo manual não realizado:', error?.message || error);
      setFirebaseStatus('error');
    }
  };

  // Reference for inactivity tracking
  const lastActivityTime = useRef<number>(Date.now());
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state from localStorage in case of cross-tab changes
  useEffect(() => {
    const handleStorageChange = () => {
      setDbState(getDatabaseState());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateDbState = (newState: DatabaseState) => {
    setDbState(newState);
    saveDatabaseState(newState);
  };

  // 1. SESSION INTEGRITY & ADM LOCKOUT MONITORING
  useEffect(() => {
    if (!currentUser) return;

    // Check credential changes or admin blockouts
    if (currentUser.role === 'adm') {
      if (dbState.admPassword !== currentUser.lastPassword) {
        // Password changed! Log out immediately
        setCurrentUser(null);
        setForcedLogoutReason('A sua senha de Administrador foi alterada. Por favor, inicie seção novamente.');
      }
    } 
    else if (currentUser.role === 'professor' && currentUser.teacher) {
      const dbTeacher = dbState.professores.find(p => p.id === currentUser.teacher?.id);
      
      if (!dbTeacher) {
        // Teacher deleted
        setCurrentUser(null);
        setForcedLogoutReason('O seu perfil de professor foi removido do sistema.');
        return;
      }

      if (dbTeacher.senha !== currentUser.lastPassword || dbTeacher.sessionVersion !== currentUser.lastVersion) {
        // Credentials modified
        setCurrentUser(null);
        setForcedLogoutReason('As suas credenciais de acesso foram alteradas. Por segurança, sua seção foi encerrada em todos os dispositivos.');
        return;
      }

      // Check if class lockout is enabled by ADM
      const isClassBlocked = dbState.blockedClasses.includes(currentUser.teacher.turmaId);
      const isYearTerminated = dbState.anoLectivoTerminado;

      if (isClassBlocked || isYearTerminated) {
        if (!classBlockedWarning) {
          setClassBlockedWarning(
            isYearTerminated 
              ? 'Aviso: O Ano Letivo foi encerrado oficialmente pelo Administrador. Seus dados foram guardados e sua seção será encerrada em breve.' 
              : 'Aviso: O Administrador bloqueou as sessões para a sua turma. Seus dados foram guardados e sua seção será encerrada em breve.'
          );

          // Force clean logout after 4 seconds
          blockTimeoutRef.current = setTimeout(() => {
            setCurrentUser(null);
            setClassBlockedWarning(null);
          }, 5000);
        }
      } else {
        // If unblocked while warn is visible
        if (classBlockedWarning) {
          setClassBlockedWarning(null);
          if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current);
        }
      }
    }
  }, [dbState, currentUser, classBlockedWarning]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current);
    };
  }, []);

  // 2. INACTIVITY TIMEOUT DETECTOR
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTime.current = Date.now();
    };

    // Listen to user input across window
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Operational check loop every 3 seconds
    const interval = setInterval(() => {
      if (!currentUser || !dbState.autoTimeoutEnabled) return;

      const elapsed = Date.now() - lastActivityTime.current;
      const limit = dbState.autoTimeoutMinutes * 60 * 1000;

      if (elapsed > limit) {
        // Session timeout! Save state and log out
        setCurrentUser(null);
        setClassBlockedWarning(null);
        setTimeoutAlert(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(interval);
    };
  }, [currentUser, dbState.autoTimeoutEnabled, dbState.autoTimeoutMinutes]);

  // Handle successful login from Landing Page
  const handleLoginSuccess = (role: 'adm' | 'professor' | 'support', data?: any) => {
    setTimeoutAlert(false);
    setForcedLogoutReason(null);
    setClassBlockedWarning(null);
    lastActivityTime.current = Date.now();

    if (role === 'adm') {
      setCurrentUser({
        role: 'adm',
        lastPassword: dbState.admPassword
      });
    } else if (role === 'professor' && data) {
      setCurrentUser({
        role: 'professor',
        teacher: data,
        lastPassword: data.senha,
        lastVersion: data.sessionVersion || 1
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setClassBlockedWarning(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic warning modal when class is locked out */}
      <AnimatePresence>
        {classBlockedWarning && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-red-500/40 p-6 rounded-xl text-center space-y-4 max-w-sm"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
              <h3 className="font-bold text-white text-base">Bloqueio Ativo em Curso</h3>
              <p className="text-xs text-red-200">
                {classBlockedWarning}
              </p>
              <div className="py-2.5 flex justify-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>Encerrando Sessão de Forma Limpa...</span>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Screen router */}
      {currentUser === null ? (
        /* landing Login Screen */
        <div className="flex-1 flex flex-col">
          {/* Timeout Alert Header */}
          <AnimatePresence>
            {timeoutAlert && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-amber-950/80 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between text-xs text-amber-300 font-sans"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Sua sessão foi encerrada de forma automática por inatividade de {dbState.autoTimeoutMinutes} min. Os seus dados foram guardados e protegidos com sucesso.</span>
                </div>
                <button onClick={() => setTimeoutAlert(false)} className="text-amber-400 hover:text-white uppercase font-bold text-[10px] tracking-wider pl-4">Fechar</button>
              </motion.div>
            )}

            {forcedLogoutReason && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-950/80 border-b border-red-500/30 px-6 py-3 flex items-center justify-between text-xs text-red-300 font-sans"
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{forcedLogoutReason}</span>
                </div>
                <button onClick={() => setForcedLogoutReason(null)} className="text-red-400 hover:text-white uppercase font-bold text-[10px] tracking-wider pl-4">Entendi</button>
              </motion.div>
            )}
          </AnimatePresence>

          <LoginScreen
            dbState={dbState}
            onLoginSuccess={handleLoginSuccess}
            openSupportPanel={() => setShowSupportPanel(true)}
          />
        </div>
      ) : currentUser.role === 'adm' ? (
        /* ADM AdminPanel Screen */
        <AdminPanel
          dbState={dbState}
          onUpdateDbState={updateDbState}
          onLogout={handleLogout}
        />
      ) : (
        /* Teacher / Coordinator Screen */
        currentUser.teacher && (
          <TeacherPanel
            dbState={dbState}
            loggedTeacher={currentUser.teacher}
            onUpdateDbState={updateDbState}
            onLogout={handleLogout}
          />
        )
      )}

      {/* Developer Support Panel Overlay */}
      {showSupportPanel && (
        <SupportPanel
          dbState={dbState}
          onUpdateDbState={updateDbState}
          onClose={() => setShowSupportPanel(false)}
          firebaseStatus={firebaseStatus}
          lastSyncedTime={lastSyncedTime}
          onManualSync={handleManualSync}
          onForcePushToCloud={handleForcePushToCloud}
          onForcePullFromCloud={handleForcePullFromCloud}
        />
      )}

      {/* Global Cloud Synchronization Signal Indicator (Visible for ALL Users) */}
      <div
        id="global-cloud-sync-signal"
        className="fixed bottom-3 right-3 z-30 flex items-center space-x-2 bg-slate-900/95 border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-full text-xs shadow-2xl backdrop-blur-md transition-all select-none"
      >
        <div className="relative flex items-center justify-center">
          {firebaseStatus === 'synced' && (
            <>
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          )}
          {firebaseStatus === 'syncing' && (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}
          {firebaseStatus === 'not_configured' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
          )}
          {firebaseStatus === 'error' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
          <Cloud className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 hidden sm:inline">Sinal Nuvem:</span>
          {firebaseStatus === 'synced' && (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <span>Sincronizado</span>
              {lastSyncedTime && <span className="text-[10px] text-slate-500 font-normal">({lastSyncedTime})</span>}
            </span>
          )}
          {firebaseStatus === 'syncing' && (
            <span className="text-amber-400 font-semibold">Sincronizando...</span>
          )}
          {firebaseStatus === 'not_configured' && (
            <span className="text-slate-400 font-semibold">Modo Local (Offline)</span>
          )}
          {firebaseStatus === 'error' && (
            <span className="text-rose-400 font-semibold">Falha na Conexão</span>
          )}
        </div>

        {isFirebaseConfigured() && firebaseStatus !== 'syncing' && (
          <button
            type="button"
            onClick={handleManualSync}
            title="Forçar Sincronização em Tempo Real"
            className="ml-1 p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-full transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

    </div>
  );
}
