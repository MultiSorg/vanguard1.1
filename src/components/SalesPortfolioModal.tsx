/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Zap,
  Users,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Cloud,
  Lock,
  Printer,
  Calculator,
  Download,
  BookOpen,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  GraduationCap,
  X,
  Building,
  Check,
  Sliders,
  DollarSign,
  HelpCircle,
  FileText,
  PlayCircle,
  Edit3
} from 'lucide-react';

interface SalesPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesPortfolioModal({ isOpen, onClose }: SalesPortfolioModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'roi' | 'proposal' | 'demoScript'>('overview');

  // ROI Calculator states
  const [numTurmas, setNumTurmas] = useState<number>(12);
  const [numProfessores, setNumProfessores] = useState<number>(20);
  const [numAlunos, setNumAlunos] = useState<number>(420);

  // Proposal Generator states - HIGHLY CUSTOMIZABLE
  const [clientName, setClientName] = useState<string>('Complexo Escolar de Luanda');
  const [contactName, setContactName] = useState<string>('Prof. Dr. António Mateus');
  const [planType, setPlanType] = useState<'anual' | 'mensal' | 'trimestral'>('anual');
  const [currencySymbol, setCurrencySymbol] = useState<string>('Kz');
  const [basePriceValue, setBasePriceValue] = useState<string>('350.000');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [customProposalNotes, setCustomProposalNotes] = useState<string>(
    'Licenciamento ilimitado de professores e turmas com garantia de sincronização em tempo real e cópias de segurança diárias.'
  );

  const [includedSupport, setIncludedSupport] = useState<boolean>(true);
  const [includedCloudSync, setIncludedCloudSync] = useState<boolean>(true);
  const [includedTraining, setIncludedTraining] = useState<boolean>(true);
  const [includedBackups, setIncludedBackups] = useState<boolean>(true);

  const [showProposalView, setShowProposalView] = useState<boolean>(false);

  // Calculations for ROI
  const totalHoursSavedPerTrimester = Math.round(numProfessores * 12 + numTurmas * 8);
  const totalHoursSavedPerYear = totalHoursSavedPerTrimester * 3;
  const reportTimeBefore = '4 a 7 dias úteis';
  const reportTimeAfter = '10 segundos (Instantâneo)';

  if (!isOpen) return null;

  const fullPriceFormatted = `${basePriceValue} ${currencySymbol}${
    discountValue && discountValue !== '0' ? ` (Com desconto de ${discountValue} ${currencySymbol})` : ''
  }`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Top Header Banner */}
          <div className="relative bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-700 p-5 sm:p-6 text-white flex-shrink-0">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Fechar Portfólio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20">
                <GraduationCap className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full">
                    KIT DE VENDAS & DEMONSTRAÇÃO
                  </span>
                  <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 bg-white/20 text-white rounded-full">
                    v2.5 Pro (Manutenção)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
                  Vanguard Académico — Portfólio Comercial
                </h2>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
              Plataforma Integrada de Pauta Digital, Lançamento de Notas, Assiduidade e Sincronização Nuvem. Ferramenta para demonstrar o valor comercial do software e gerar propostas totalmente personalizadas para instituições de ensino.
            </p>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 mt-4 pt-2 border-t border-white/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white text-slate-900 font-bold shadow-md'
                    : 'bg-black/20 hover:bg-black/30 text-white/90'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Proposta de Valor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'modules'
                    ? 'bg-white text-slate-900 font-bold shadow-md'
                    : 'bg-black/20 hover:bg-black/30 text-white/90'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Módulos & Recursos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roi')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'roi'
                    ? 'bg-white text-slate-900 font-bold shadow-md'
                    : 'bg-black/20 hover:bg-black/30 text-white/90'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-teal-600" />
                <span>Calculadora de ROI</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('proposal')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'proposal'
                    ? 'bg-white text-slate-900 font-bold shadow-md'
                    : 'bg-black/20 hover:bg-black/30 text-white/90'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Gerar Proposta Comercial</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('demoScript')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'demoScript'
                    ? 'bg-white text-slate-900 font-bold shadow-md'
                    : 'bg-black/20 hover:bg-black/30 text-white/90'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>Guia de Apresentação</span>
              </button>
            </div>
          </div>

          {/* Modal Content Scroll Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-6 text-slate-200 custom-scrollbar">
            {/* TAB 1: OVERVIEW & VALUE PROPOSITION */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* 3 Core Value Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white text-base">Automação Total de Médias</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cálculo automático e sem erros de MAC1 a MAC4, Prova do Professor (PP) e Prova Trimestral (PT), gerando a Média Trimestral e Média Final da Disciplina de acordo com a regulamentação oficial.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white text-base">Nuvem & Trabalho Offline</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Professores e diretores trabalham em qualquer lugar. Sincronização em tempo real via Firebase com funcionamento contínuo mesmo quando a internet falha.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white text-base">Controlo & Segurança Máxima</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Perfis hierárquicos rígidos (Administrador, Coordenador de Turma e Professor de Disciplina), fecho e congelamento de trimestres com snapshots de segurança.
                    </p>
                  </div>
                </div>

                {/* Comparative Section */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span>Por que as Escolas Precisam do Vanguard Académico?</span>
                      </h3>
                      <p className="text-xs text-slate-400">Comparativo direto entre o método tradicional e a nossa plataforma</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Traditional Method */}
                    <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg space-y-2.5">
                      <div className="font-bold text-rose-400 uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Método Tradicional (Papel / Excel Isolado)</span>
                      </div>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start space-x-2">
                          <span className="text-rose-500 mt-0.5">✕</span>
                          <span><strong>Perda de Tempo:</strong> Professores gastam dezenas de horas calculando médias manualmente em calculadoras.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-rose-500 mt-0.5">✕</span>
                          <span><strong>Alta Taxa de Erro:</strong> Rasuras em pautas de papel e erros no cálculo de médias causam reclamações.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-rose-500 mt-0.5">✕</span>
                          <span><strong>Atraso nos Boletins:</strong> Demora de semanas para fechar notas e emitir boletins aos encarregados.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Vanguard Solution */}
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg space-y-2.5">
                      <div className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Com o Vanguard Académico</span>
                      </div>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span><strong>Cálculo Instantâneo:</strong> Lançou a nota, a Média Trimestral e Final calcula no exato segundo.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span><strong>Precisão de 100%:</strong> Algoritmo validado de acordo com as regras exatas do ensino nacional.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span><strong>Boletins Imediatos:</strong> Impressão de pautas gerais e mini-boletins individuais com 1 clique.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-xl sm:text-2xl font-black text-amber-400">100%</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Regulamentado</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">&gt; 90%</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Redução de Tempo</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-xl sm:text-2xl font-black text-sky-400">Realtime</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Sincronização Firebase</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="text-xl sm:text-2xl font-black text-purple-400">Offline</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Suporte Completo Local</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: MODULES */}
            {activeTab === 'modules' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-base">Módulos do Sistema Vanguard Académico</h3>
                  <p className="text-xs text-slate-400">
                    Visão de todos os módulos para demonstração em reuniões comerciais.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                      <BookOpen className="w-4 h-4" />
                      <span>1. Painel de Administração & Configuração Geral</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Gestão de turmas, disciplinas globais, professores, coordenadores, bloqueio de turmas e senhas do sistema.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>2. Pauta Digital & Lançamento de Notas</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Interface para lançamento de avaliações MAC1-MAC4, PP e PT com cálculo automático e instantâneo da Média Trimestral e Média Final.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                      <Users className="w-4 h-4" />
                      <span>3. Perfil de Coordenador vs Professor Normal</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      O Coordenador de Turma acompanha todas as disciplinas da sua turma, enquanto o Professor Normal acede apenas às suas matérias.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                      <Clock className="w-4 h-4" />
                      <span>4. Caderneta & Registo de Faltas Diárias</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Marcação de presenças e faltas acumuladas por trimestre com alerta do limite legal de faltas para retenção de aluno.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>5. Fecho de Trimestre, Snapshots & Restauro</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Fecho formal de cada trimestre com geração de snapshot imutável em nuvem para histórico permanente.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
                      <Printer className="w-4 h-4" />
                      <span>6. Impressão de Boletins & Pautas de Conselho</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Impressão de boletins individuais e pautas síntese para as reuniões de conselho de turma.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ROI CALCULATOR */}
            {activeTab === 'roi' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-base flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-teal-400" />
                    <span>Calculadora de Retorno sobre Investimento (ROI)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajuste a dimensão da escola cliente para demonstrar a poupança em tempo e custos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Nº de Turmas:</span>
                      <span className="font-mono text-amber-400 font-bold">{numTurmas}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={numTurmas}
                      onChange={(e) => setNumTurmas(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Nº de Professores:</span>
                      <span className="font-mono text-emerald-400 font-bold">{numProfessores}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={numProfessores}
                      onChange={(e) => setNumProfessores(Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Nº Total de Alunos:</span>
                      <span className="font-mono text-sky-400 font-bold">{numAlunos}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="10"
                      value={numAlunos}
                      onChange={(e) => setNumAlunos(Number(e.target.value))}
                      className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1 text-center">
                    <div className="text-xs font-mono uppercase text-emerald-400 font-semibold">Horas Poupadas / Ano</div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{totalHoursSavedPerYear} Horas</div>
                    <p className="text-[10px] text-emerald-200/70">
                      ~{totalHoursSavedPerTrimester} horas por trimestre em cálculos manuais.
                    </p>
                  </div>

                  <div className="p-4 bg-sky-950/30 border border-sky-500/30 rounded-xl space-y-1 text-center">
                    <div className="text-xs font-mono uppercase text-sky-400 font-semibold">Emissão de Boletins</div>
                    <div className="text-2xl sm:text-3xl font-black text-white">Instantânea</div>
                    <p className="text-[10px] text-sky-200/70">
                      Redução de {reportTimeBefore} para {reportTimeAfter}.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1 text-center">
                    <div className="text-xs font-mono uppercase text-purple-400 font-semibold">Erros de Cálculo</div>
                    <div className="text-2xl sm:text-3xl font-black text-white">0% Erros</div>
                    <p className="text-[10px] text-purple-200/70">
                      Zero rasuras, zero re-cálculos manuais.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: HIGHLY CUSTOMIZABLE PROPOSAL GENERATOR */}
            {activeTab === 'proposal' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!showProposalView ? (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base flex items-center space-x-2">
                          <Edit3 className="w-5 h-5 text-emerald-400" />
                          <span>Gerador de Proposta Comercial Personalizada</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Personalize o preço, a moeda, o cliente e as condições contratuais da proposta.
                        </p>
                      </div>
                    </div>

                    {/* Customization Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Nome da Instituição Cliente:</label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: Complexo Escolar de Luanda"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Nome do Responsável / Diretor:</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ex: Prof. Dr. António Mateus"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Modelo de Licenciamento:</label>
                        <select
                          value={planType}
                          onChange={(e) => setPlanType(e.target.value as 'anual' | 'mensal' | 'trimestral')}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="anual">Licença Anual (Aconselhado)</option>
                          <option value="trimestral">Subscrição Trimestral</option>
                          <option value="mensal">Subscrição Mensal</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Símbolo / Moeda:</label>
                        <input
                          type="text"
                          value={currencySymbol}
                          onChange={(e) => setCurrencySymbol(e.target.value)}
                          placeholder="Ex: Kz, $, €"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      {/* Customizable Price Inputs */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold flex justify-between">
                          <span>Valor Proposto do Licenciamento:</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {basePriceValue} {currencySymbol}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={basePriceValue}
                          onChange={(e) => setBasePriceValue(e.target.value)}
                          placeholder="Ex: 350.000"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                        />
                        {/* Quick Presets */}
                        <div className="flex gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 self-center">Predefinições:</span>
                          {['150.000', '250.000', '350.000', '500.000', '750.000'].map((val) => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => setBasePriceValue(val)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-mono cursor-pointer"
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Valor do Desconto Especial (Opcional):</label>
                        <input
                          type="text"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder="Ex: 50.000 ou 0"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-slate-300 font-semibold">Observações / Termos Especiais da Proposta:</label>
                        <textarea
                          rows={2}
                          value={customProposalNotes}
                          onChange={(e) => setCustomProposalNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500 text-xs custom-scrollbar"
                          placeholder="Escreva termos adicionais para incluir na proposta..."
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-2 pt-2">
                        <label className="text-slate-300 font-semibold block">Serviços e Benefícios Incluídos:</label>
                        <div className="grid grid-cols-2 gap-2 text-slate-300">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includedCloudSync}
                              onChange={(e) => setIncludedCloudSync(e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                            <span>Sincronização Nuvem em Tempo Real (Firebase)</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includedTraining}
                              onChange={(e) => setIncludedTraining(e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                            <span>Formação e Capacitação de Professores</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includedSupport}
                              onChange={(e) => setIncludedSupport(e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                            <span>Suporte Técnico Dedicado e Manutenção</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includedBackups}
                              onChange={(e) => setIncludedBackups(e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                            <span>Backups Automáticos & Restauro com Snapshots</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowProposalView(true)}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Visualizar & Gerar Documento de Proposta</span>
                    </button>
                  </div>
                ) : (
                  /* Formal Document View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <button
                        type="button"
                        onClick={() => setShowProposalView(false)}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                      >
                        <span>← Voltar à Edição e Preço</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir / Salvar PDF</span>
                      </button>
                    </div>

                    {/* Proposal Document Body */}
                    <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl space-y-6 text-xs sm:text-sm font-sans border border-slate-200 select-text">
                      {/* Document Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                        <div>
                          <div className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                            <GraduationCap className="w-6 h-6 text-emerald-600" />
                            <span>VANGUARD ACADÉMICO</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono uppercase mt-0.5">
                            Proposta Comercial de Licenciamento de Software
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <div>Data: {new Date().toLocaleDateString('pt-PT')}</div>
                          <div>Ref: PR-VANGUARD-{Math.floor(1000 + Math.random() * 9000)}</div>
                        </div>
                      </div>

                      {/* Addressed To */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente / Instituição:</div>
                          <div className="font-bold text-slate-800 text-sm">{clientName || 'Instituição de Ensino'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aos cuidados de:</div>
                          <div className="font-semibold text-slate-700">{contactName || 'Direção Geral'}</div>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 text-sm border-b border-emerald-500/30 pb-1 text-emerald-700">
                          1. Objeto da Proposta
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs">
                          A presente proposta visa o fornecimento e licenciamento da plataforma <strong>Vanguard Académico</strong> para a gestão de pautas digitais, cálculo de médias trimestrais e finais, assiduidade de alunos e sincronização em nuvem multi-dispositivo.
                        </p>
                      </div>

                      {/* Scope & Benefits */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 text-sm border-b border-emerald-500/30 pb-1 text-emerald-700">
                          2. Cobertura do Software e Serviços Incluídos
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          <li className="flex items-center space-x-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Lançamento de Notas (MAC1-MAC4, PP, PT)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Cálculo Automático de Médias Trimestrais e Finais</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Perfis para Professores e Coordenadores de Turma</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Caderneta de Faltas e Assiduidade Acumulada</span>
                          </li>
                          {includedCloudSync && (
                            <li className="flex items-center space-x-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>Sincronização em Nuvem (Firebase) em Tempo Real</span>
                            </li>
                          )}
                          {includedTraining && (
                            <li className="flex items-center space-x-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>Capacitação e Formação dos Professores e Direção</span>
                            </li>
                          )}
                          {includedSupport && (
                            <li className="flex items-center space-x-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>Suporte Técnico Dedicado e Manutenção Contínua</span>
                            </li>
                          )}
                          {includedBackups && (
                            <li className="flex items-center space-x-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>Backups Automáticos e Snapshots de Segurança</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Pricing Box - Dynamic */}
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-emerald-800 font-bold uppercase">
                            Investimento Total ({planType === 'anual' ? 'Licença Anual' : planType === 'trimestral' ? 'Licença Trimestral' : 'Mensalidade'})
                          </div>
                          <div className="text-2xl font-black text-emerald-900 mt-0.5">
                            {fullPriceFormatted}
                          </div>
                          {customProposalNotes && (
                            <div className="text-[11px] text-emerald-800 mt-1 italic">
                              &quot;{customProposalNotes}&quot;
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow">
                            Proposta Válida por 30 Dias
                          </span>
                        </div>
                      </div>

                      {/* Footer signatures */}
                      <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                        <div className="border-t border-slate-300 pt-2">
                          <div className="font-bold text-slate-800">Equipa Comercial Vanguard</div>
                          <div>MultiS - Soluções Tecnológicas</div>
                        </div>
                        <div className="border-t border-slate-300 pt-2">
                          <div className="font-bold text-slate-800">{clientName || 'Instituição de Ensino'}</div>
                          <div>Direção da Instituição</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: DEMO SCRIPT */}
            {activeTab === 'demoScript' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-base flex items-center space-x-2">
                    <PlayCircle className="w-5 h-5 text-purple-400" />
                    <span>Roteiro de Apresentação de Vendas</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Siga estes passos na demonstração ao vivo para fechar a venda com diretores escolares.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="font-bold text-amber-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-[10px]">1</span>
                      <span>Passo 1: Apresentação da Tela de Entrada</span>
                    </div>
                    <p className="text-slate-300 pl-7 leading-relaxed">
                      Mostre a facilidade de acesso por perfil (Administrador, Coordenador e Professor).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">2</span>
                      <span>Passo 2: Lançamento de Nota em Tempo Real</span>
                    </div>
                    <p className="text-slate-300 pl-7 leading-relaxed">
                      Lançamento de MAC1 ou PT e destaque do cálculo imediato das médias.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="font-bold text-sky-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-[10px]">3</span>
                      <span>Passo 3: Sincronização e Pautas Prontas</span>
                    </div>
                    <p className="text-slate-300 pl-7 leading-relaxed">
                      Demonstre a geração instantânea de boletins para encarregados.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
