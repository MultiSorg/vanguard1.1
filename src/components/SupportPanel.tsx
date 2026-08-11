/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wrench, Key, Lock, Trash2, Database, ShieldAlert, X, Eye, EyeOff, Save, Download, Upload, CheckCircle2, AlertTriangle, Cloud, CloudOff, RefreshCw, Info, HelpCircle, Sparkles } from 'lucide-react';
import { DatabaseState, Professor } from '../types';
import { getDatabaseState, saveDatabaseState, resetYearData } from '../utils/db';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, isFirebaseConfigured, DEFAULT_FIREBASE_CONFIG } from '../utils/firebase';
import SalesPortfolioModal from './SalesPortfolioModal';

interface SupportPanelProps {
  dbState: DatabaseState;
  onUpdateDbState: (newState: DatabaseState) => void;
  onClose: () => void;
  firebaseStatus: 'not_configured' | 'syncing' | 'synced' | 'error';
  lastSyncedTime: string | null;
  onManualSync: () => Promise<void>;
  onForcePushToCloud: () => Promise<void>;
  onForcePullFromCloud: () => Promise<void>;
}

export default function SupportPanel({
  dbState,
  onUpdateDbState,
  onClose,
  firebaseStatus,
  lastSyncedTime,
  onManualSync,
  onForcePushToCloud,
  onForcePullFromCloud,
}: SupportPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Maintenance states
  const [editingUserId, setEditingUserId] = useState<string | 'adm' | 'support' | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [importJson, setImportJson] = useState('');
  const [showSalesPortfolio, setShowSalesPortfolio] = useState(false);

  // Firebase Cloud Guide states
  const [firebaseTab, setFirebaseTab] = useState<'manual' | 'guide'>('manual');
  const [customConfig, setCustomConfig] = useState(() => getFirebaseConfig());

  const handleFillDefaultFirebase = () => {
    setCustomConfig(DEFAULT_FIREBASE_CONFIG);
    saveFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    setSuccessMsg('Credenciais Padrão do Vanguard Cloud restauradas com sucesso!');
    onManualSync();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveCustomFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(customConfig);
    setSuccessMsg('Configuração do Firebase salva no navegador com sucesso!');
    await onManualSync();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleClearCustomFirebase = async () => {
    clearFirebaseConfig();
    setCustomConfig(getFirebaseConfig());
    setSuccessMsg('Configuração personalizada do Firebase removida.');
    await onManualSync();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'GilPraga' && password === dbState.supportPassword) {
      setIsAuthenticated(true);
    } else {
      setError('Credenciais de suporte inválidas.');
    }
  };

  const handleChangePassword = (userId: string | 'adm' | 'support') => {
    if (!newPasswordValue.trim()) return;

    const updatedState = { ...dbState };

    if (userId === 'adm') {
      updatedState.admPassword = newPasswordValue;
      // Increment all ADM sessions - handled by state change
    } else if (userId === 'support') {
      updatedState.supportPassword = newPasswordValue;
    } else {
      // Find the teacher
      const idx = updatedState.professores.findIndex((p) => p.id === userId);
      if (idx !== -1) {
        updatedState.professores[idx].senha = newPasswordValue;
        // Increment session version to force logout on other devices!
        updatedState.professores[idx].sessionVersion = (updatedState.professores[idx].sessionVersion || 0) + 1;
      }
    }

    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
    
    setSuccessMsg('Senha alterada com sucesso e sessões do utilizador invalidadas!');
    setEditingUserId(null);
    setNewPasswordValue('');
    
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggleClassBlock = (classId: string) => {
    const updatedState = { ...dbState };
    if (updatedState.blockedClasses.includes(classId)) {
      updatedState.blockedClasses = updatedState.blockedClasses.filter((id) => id !== classId);
    } else {
      updatedState.blockedClasses.push(classId);
    }
    saveDatabaseState(updatedState);
    onUpdateDbState(updatedState);
  };

  const handleClearAllData = () => {
    if (window.confirm('ATENÇÃO: Deseja realmente limpar TODOS os dados do banco de dados escolar? Isso não apagará as senhas do ADM nem do suporte.')) {
      const cleared = resetYearData(dbState);
      onUpdateDbState(cleared);
      setSuccessMsg('Todos os dados foram resetados com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vanguard_database_export_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed && typeof parsed === 'object' && 'admPassword' in parsed && 'supportPassword' in parsed) {
        saveDatabaseState(parsed);
        onUpdateDbState(parsed);
        setSuccessMsg('Banco de dados importado e restaurado com sucesso!');
        setImportJson('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError('O JSON de importação não possui o formato do sistema Vanguard.');
      }
    } catch (e) {
      setError('JSON inválido. Por favor, verifique a sintaxe.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sky-400">
            <Wrench className="w-6 h-6" />
            <h2 className="text-xl font-bold font-sans tracking-wide">Developer Support Console (MultiS)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Login Form */
          <div className="p-8 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
            <div className="text-center space-y-2">
              <Key className="w-12 h-12 text-sky-500 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Autenticação de Suporte</h3>
              <p className="text-xs text-slate-400 font-mono">Consola reservada aos engenheiros da MultiS para reparações técnicas e manutenção de segurança.</p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 rounded text-red-200 text-xs text-center font-mono">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono uppercase">Usuário Suporte</label>
                <input
                  type="text"
                  required
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-sky-500 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono uppercase">Chave de Segurança</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-sky-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold tracking-wider uppercase rounded text-sm transition-colors shadow-lg shadow-sky-500/10"
              >
                Autenticar Consola
              </button>
            </form>
          </div>
        ) : (
          /* Maintenance Control Center */
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300">
            {successMsg && (
              <div className="p-4 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Commercial Sales Kit & Portfolio Banner - Exclusive to Maintenance Dashboard */}
            <div className="p-4 bg-gradient-to-r from-amber-950/70 via-emerald-950/70 to-teal-950/70 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30 shrink-0">
                  <Sparkles className="w-7 h-7 animate-pulse text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase font-mono rounded">
                      NOVO
                    </span>
                    <h3 className="font-bold text-white text-sm sm:text-base">Kit Comercial & Portfólio de Vendas</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Demonstração de produto, calculadora de ROI e gerador de propostas com preço personalizável para reuniões comerciais com clientes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSalesPortfolio(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Abrir Kit Comercial</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-mono uppercase">Turmas Criadas</span>
                <span className="text-2xl font-bold text-sky-400">{dbState.turmas.length}</span>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-mono uppercase">Professores Cadastrados</span>
                <span className="text-2xl font-bold text-indigo-400">{dbState.professores.length}</span>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-mono uppercase">Alunos Matriculados</span>
                <span className="text-2xl font-bold text-emerald-400">{dbState.alunos.length}</span>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-mono uppercase">Trimestre Corrente</span>
                <span className="text-2xl font-bold text-amber-400">{dbState.anoLectivoIniciado ? `T${dbState.currentTrimester}` : 'Não Iniciado'}</span>
              </div>
            </div>

            {/* Cloud Database (Firebase Firestore) Management & Guide - Exclusive for Agente de Manutenção */}
            <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-lg space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Sincronização & Guia Cloud (Firebase Firestore)</h3>
                    <p className="text-[11px] text-slate-400">Consola exclusiva do Agente de Manutenção para monitorização e ligação de banco de dados na nuvem</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Badge */}
                  {firebaseStatus === 'not_configured' ? (
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded font-mono font-semibold flex items-center space-x-1.5">
                      <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Modo Local (Offline)</span>
                    </span>
                  ) : firebaseStatus === 'syncing' ? (
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded font-mono font-semibold flex items-center space-x-1.5 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>Sincronizando...</span>
                    </span>
                  ) : firebaseStatus === 'synced' ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono font-semibold flex items-center space-x-1.5">
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nuvem Ativa</span>
                      {lastSyncedTime && <span className="text-[10px] text-slate-500 font-mono">({lastSyncedTime})</span>}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded font-mono font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Erro Cloud</span>
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await onForcePushToCloud();
                        setSuccessMsg('Dados deste dispositivo enviados para a nuvem com sucesso!');
                        setTimeout(() => setSuccessMsg(''), 4000);
                      }}
                      disabled={firebaseStatus === 'syncing' || firebaseStatus === 'not_configured'}
                      title="Forçar envio de dados deste dispositivo para a nuvem"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir para Nuvem</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await onForcePullFromCloud();
                        setSuccessMsg('Dados baixados da nuvem para este dispositivo!');
                        setTimeout(() => setSuccessMsg(''), 4000);
                      }}
                      disabled={firebaseStatus === 'syncing' || firebaseStatus === 'not_configured'}
                      title="Baixar dados da nuvem para este dispositivo"
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar da Nuvem</span>
                    </button>

                    <button
                      type="button"
                      onClick={onManualSync}
                      disabled={firebaseStatus === 'syncing'}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold uppercase rounded flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${firebaseStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>Auto-Sincronizar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs for Guide vs Direct Browser Config */}
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs max-w-md">
                <button
                  type="button"
                  onClick={() => setFirebaseTab('guide')}
                  className={`flex-1 py-1.5 rounded font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                    firebaseTab === 'guide' ? 'bg-amber-500 text-amber-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Guia Cloud (.env)
                </button>
                <button
                  type="button"
                  onClick={() => setFirebaseTab('manual')}
                  className={`flex-1 py-1.5 rounded font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                    firebaseTab === 'manual' ? 'bg-amber-500 text-amber-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Configurar no Navegador
                </button>
              </div>

              {firebaseTab === 'guide' ? (
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-850">
                  <p>
                    O sistema <strong className="text-amber-400">Vanguard Académico</strong> salva e opera nativamente com alta velocidade.
                  </p>
                  <p>
                    Para conectar múltiplos dispositivos ao mesmo projeto Firebase:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] bg-slate-900/80 p-3 rounded border border-slate-800">
                    <li>Acesse o <strong className="text-amber-400">Firebase Console</strong> (<code className="text-slate-200 font-mono">console.firebase.google.com</code>) e crie um projeto.</li>
                    <li>Vá em <strong className="text-amber-400">Build &gt; Firestore Database</strong> e clique em <strong className="text-white">Criar banco de dados</strong> em <strong className="text-emerald-400">Modo de Teste</strong>.</li>
                    <li>Na aba <strong className="text-amber-400">Regras (Rules)</strong>, certifique-se de permitir leitura e escrita:
                      <pre className="mt-1 p-2 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                      </pre>
                    </li>
                    <li>Copie a chave da API (<code className="text-amber-400 font-mono">apiKey</code>) e ID do Projeto (<code className="text-amber-400 font-mono">projectId</code>) e insira na aba <strong className="text-white">Configurar no Navegador</strong>.</li>
                  </ol>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] space-y-1 select-all">
                    <div className="text-slate-500 font-bold uppercase mb-1">// Variáveis de Ambiente Ativas do Firebase</div>
                    <div className="text-amber-400">VITE_FIREBASE_API_KEY="{customConfig.apiKey || 'AIzaSyB4qKsRk_raCHs32OioeH7LX4pQHsF-U8I'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_AUTH_DOMAIN="{customConfig.authDomain || 'vanguard1-b653d.firebaseapp.com'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_PROJECT_ID="{customConfig.projectId || 'vanguard1-b653d'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_STORAGE_BUCKET="{customConfig.storageBucket || 'vanguard1-b653d.firebasestorage.app'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_MESSAGING_SENDER_ID="{customConfig.messagingSenderId || '438614523977'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_APP_ID="{customConfig.appId || '1:438614523977:web:ee220d9f4466297d0e7f98'}"</div>
                    <div className="text-amber-400">VITE_FIREBASE_MEASUREMENT_ID="{customConfig.measurementId || 'G-5K4B73RX2Z'}"</div>
                  </div>

                  <p className="text-slate-400 text-[11px]">
                    <span className="font-bold text-amber-500">✨ Vantagens da Nuvem:</span> Atualização automática de notas e pautas entre múltiplos dispositivos e backup contínuo contra exclusão local.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveCustomFirebase} className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-lg border border-slate-850">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300 flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Credenciais de configuração da Nuvem (Firebase) ativas para sincronização automática de dados.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleFillDefaultFirebase}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-[10px] rounded transition-all shrink-0 cursor-pointer"
                      title="Preencher automaticamente as credenciais padrão do Vanguard Cloud"
                    >
                      Preencher Padrão Vanguard
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">API Key (apiKey) *</label>
                      <input
                        type="text"
                        required
                        placeholder="AIzaSyB4qKsRk_raCHs32OioeH7LX4pQHsF-U8I"
                        value={customConfig.apiKey}
                        onChange={(e) => setCustomConfig({ ...customConfig, apiKey: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project ID (projectId) *</label>
                      <input
                        type="text"
                        required
                        placeholder="vanguard1-b653d"
                        value={customConfig.projectId}
                        onChange={(e) => setCustomConfig({ ...customConfig, projectId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Auth Domain (authDomain)</label>
                      <input
                        type="text"
                        placeholder="vanguard1-b653d.firebaseapp.com"
                        value={customConfig.authDomain}
                        onChange={(e) => setCustomConfig({ ...customConfig, authDomain: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Storage Bucket (storageBucket)</label>
                      <input
                        type="text"
                        placeholder="vanguard1-b653d.firebasestorage.app"
                        value={customConfig.storageBucket}
                        onChange={(e) => setCustomConfig({ ...customConfig, storageBucket: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Messaging Sender ID (messagingSenderId)</label>
                      <input
                        type="text"
                        placeholder="438614523977"
                        value={customConfig.messagingSenderId}
                        onChange={(e) => setCustomConfig({ ...customConfig, messagingSenderId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">App ID (appId)</label>
                      <input
                        type="text"
                        placeholder="1:438614523977:web:ee220d9f4466297d0e7f98"
                        value={customConfig.appId}
                        onChange={(e) => setCustomConfig({ ...customConfig, appId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Measurement ID (measurementId)</label>
                      <input
                        type="text"
                        placeholder="G-5K4B73RX2Z"
                        value={customConfig.measurementId || ''}
                        onChange={(e) => setCustomConfig({ ...customConfig, measurementId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Summary of Active Config */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] space-y-1">
                    <div className="text-slate-400 font-bold uppercase flex justify-between items-center mb-1">
                      <span>// Credenciais Ativas do Vanguard Cloud</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(customConfig, null, 2));
                          setSuccessMsg('Configuração da nuvem copiada para a área de transferência!');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-sans cursor-pointer"
                      >
                        Copiar Configuração JSON
                      </button>
                    </div>
                    <div className="text-emerald-400">apiKey: <span className="text-white">{customConfig.apiKey || 'AIzaSyB4qKsRk_raCHs32OioeH7LX4pQHsF-U8I'}</span></div>
                    <div className="text-emerald-400">authDomain: <span className="text-white">{customConfig.authDomain || 'vanguard1-b653d.firebaseapp.com'}</span></div>
                    <div className="text-emerald-400">projectId: <span className="text-white">{customConfig.projectId || 'vanguard1-b653d'}</span></div>
                    <div className="text-emerald-400">storageBucket: <span className="text-white">{customConfig.storageBucket || 'vanguard1-b653d.firebasestorage.app'}</span></div>
                    <div className="text-emerald-400">messagingSenderId: <span className="text-white">{customConfig.messagingSenderId || '438614523977'}</span></div>
                    <div className="text-emerald-400">appId: <span className="text-white">{customConfig.appId || '1:438614523977:web:ee220d9f4466297d0e7f98'}</span></div>
                    <div className="text-emerald-400">measurementId: <span className="text-white">{customConfig.measurementId || 'G-5K4B73RX2Z'}</span></div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleClearCustomFirebase}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold uppercase text-[10px] rounded border border-red-500/20 transition-colors cursor-pointer"
                    >
                      Remover Configuração Local
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] rounded transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Salvar e Sincronizar Nuvem</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Change Passwords Panel */}
            <div className="p-5 bg-slate-950/30 border border-slate-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center space-x-2">
                  <Key className="w-5 h-5 text-sky-400" />
                  <span>Substituição Forçada de Credenciais</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Sem necessidade de confirmações adicionais</span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded divide-y divide-slate-850 bg-slate-950/50">
                {/* Admin user */}
                <div className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-amber-400">Administrador Geral</span>
                    <span className="text-xs text-slate-500 ml-2 font-mono">(Admin01)</span>
                  </div>
                  {editingUserId === 'adm' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Nova senha"
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-700 text-xs rounded text-white"
                      />
                      <button
                        onClick={() => handleChangePassword('adm')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors flex items-center space-x-1"
                      >
                        <Save className="w-3.5 h-3.5" /> <span>Salvar</span>
                      </button>
                      <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-white text-xs px-1">Cancelar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingUserId('adm'); setNewPasswordValue(''); }}
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Alterar Senha
                    </button>
                  )}
                </div>

                {/* Support own profile */}
                <div className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-sky-400">Suporte Técnico</span>
                    <span className="text-xs text-slate-500 ml-2 font-mono">(GilPraga)</span>
                  </div>
                  {editingUserId === 'support' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Nova senha"
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-700 text-xs rounded text-white"
                      />
                      <button
                        onClick={() => handleChangePassword('support')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors flex items-center space-x-1"
                      >
                        <Save className="w-3.5 h-3.5" /> <span>Salvar</span>
                      </button>
                      <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-white text-xs px-1">Cancelar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingUserId('support'); setNewPasswordValue(''); }}
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Alterar Senha
                    </button>
                  )}
                </div>

                {/* Teachers list */}
                {dbState.professores.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono">Nenhum professor cadastrado no sistema ainda.</div>
                ) : (
                  dbState.professores.map((prof) => {
                    const cl = dbState.turmas.find(t => t.id === prof.turmaId);
                    const disc = dbState.disciplinasGlobais.find(d => d.id === prof.disciplinaId)?.nome || '';
                    return (
                      <div key={prof.id} className="p-3 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold text-white">{prof.nome}</span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            ({prof.cargo === 'Coordenador' ? 'Coord.' : 'Prof.'} - {cl?.classe} {cl?.identificacao} - {disc})
                          </span>
                        </div>
                        {editingUserId === prof.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Nova senha"
                              value={newPasswordValue}
                              onChange={(e) => setNewPasswordValue(e.target.value)}
                              className="px-2 py-1 bg-slate-900 border border-slate-700 text-xs rounded text-white"
                            />
                            <button
                              onClick={() => handleChangePassword(prof.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors flex items-center space-x-1"
                            >
                              <Save className="w-3.5 h-3.5" /> <span>Salvar</span>
                            </button>
                            <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-white text-xs px-1">Cancelar</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingUserId(prof.id); setNewPasswordValue(''); }}
                            className="text-xs text-sky-400 hover:underline"
                          >
                            Alterar Senha
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Session lockout controls & Backup management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class lockout bypass */}
              <div className="p-5 bg-slate-950/30 border border-slate-800 rounded-lg space-y-4">
                <h3 className="font-bold text-white flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-red-400" />
                  <span>Bloqueios de Sessão por Turma</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {dbState.turmas.length === 0 ? (
                    <div className="text-xs text-slate-500 font-mono text-center py-4">Nenhuma turma cadastrada.</div>
                  ) : (
                    dbState.turmas.map((t) => {
                      const isBlocked = dbState.blockedClasses.includes(t.id);
                      return (
                        <div key={t.id} className="flex items-center justify-between text-xs p-2 bg-slate-950/50 rounded border border-slate-800">
                          <span className="font-medium text-slate-300">
                            {t.classe} - {t.identificacao} ({t.periodo})
                          </span>
                          <button
                            onClick={() => handleToggleClassBlock(t.id)}
                            className={`px-3 py-1 rounded font-mono font-bold uppercase transition-colors ${
                              isBlocked
                                ? 'bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                            }`}
                          >
                            {isBlocked ? 'Bloqueado' : 'Desbloqueado'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Developer Operations */}
              <div className="p-5 bg-slate-950/30 border border-slate-800 rounded-lg space-y-4">
                <h3 className="font-bold text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-amber-500" />
                  <span>Operações de Banco de Dados</span>
                </h3>

                <div className="space-y-3">
                  <button
                    onClick={handleExportData}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-sky-400 font-mono text-xs rounded border border-slate-700 hover:border-slate-500 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Fazer Export do Banco de Dados (JSON)</span>
                  </button>

                  <button
                    onClick={handleClearAllData}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950 text-red-400 font-mono text-xs rounded border border-red-500/20 hover:border-red-500/40 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe Total de Dados Escolares (Reset)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Direct JSON Import */}
            <div className="p-5 bg-slate-950/30 border border-slate-800 rounded-lg space-y-4">
              <h3 className="font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>Restauração Manual via JSON</span>
              </h3>
              <p className="text-xs text-slate-500">Cole aqui um JSON de banco de dados anteriormente exportado pelo Vanguard para realizar a restauração instantânea do sistema.</p>
              <div className="space-y-3">
                <textarea
                  placeholder="Cole aqui o JSON..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleImportData}
                  disabled={!importJson.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-600 text-xs font-mono rounded transition-colors flex items-center space-x-1"
                >
                  <Upload className="w-4 h-4" />
                  <span>Validar e Importar Banco de Dados</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </motion.div>

      {/* Sales Portfolio Modal - Embedded inside Support / Maintenance Panel */}
      <SalesPortfolioModal
        isOpen={showSalesPortfolio}
        onClose={() => setShowSalesPortfolio(false)}
      />
    </div>
  );
}
