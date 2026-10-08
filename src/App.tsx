import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  BarChart2,
  VolumeX,
  Eye,
  EyeOff,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VOCABULARY_QUESTIONS, VocabularyQuestion } from './data/vocabularyQuestions.ts';
import { playSound, speakEnglishWord } from './utils/audio.ts';

type FilterType = 'all' | 'synonym' | 'antonym' | 'meaning' | 'bookmarked' | 'mistakes';

export default function App() {
  // Navigation & Question State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('mv_selected_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('mv_bookmarked_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mv_sound_enabled') !== 'false';
  });
  const [autoShowExplanation, setAutoShowExplanation] = useState<boolean>(true);
  const [showManualExplanation, setShowManualExplanation] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Filtered Questions List
  const filteredQuestions = useMemo(() => {
    return VOCABULARY_QUESTIONS.filter((q) => {
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesWord = q.targetWord.toLowerCase().includes(query);
        const matchesQuestion = q.question.toLowerCase().includes(query);
        const matchesMeaning = q.wordMeaningBangla.includes(query) || q.explanationBangla.includes(query);
        const matchesTag = q.examTag.toLowerCase().includes(query);
        if (!matchesWord && !matchesQuestion && !matchesMeaning && !matchesTag) return false;
      }

      // Filter category
      if (activeFilter === 'synonym') return q.type === 'synonym';
      if (activeFilter === 'antonym') return q.type === 'antonym';
      if (activeFilter === 'meaning') return q.type === 'meaning';
      if (activeFilter === 'bookmarked') return bookmarkedIds.includes(q.id);
      if (activeFilter === 'mistakes') {
        const answer = selectedAnswers[q.id];
        return answer && answer !== q.correctAnswer;
      }
      return true;
    });
  }, [activeFilter, searchQuery, bookmarkedIds, selectedAnswers]);

  // Adjust index if out of bounds
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
    }
  }, [filteredQuestions.length, currentIndex]);

  // Reset manual explanation on question shift
  useEffect(() => {
    setShowManualExplanation(false);
  }, [currentIndex, activeFilter]);

  // Save state
  useEffect(() => {
    try {
      localStorage.setItem('mv_selected_answers', JSON.stringify(selectedAnswers));
    } catch {
      // Storage fail safe
    }
  }, [selectedAnswers]);

  useEffect(() => {
    try {
      localStorage.setItem('mv_bookmarked_ids', JSON.stringify(bookmarkedIds));
    } catch {
      // Storage fail safe
    }
  }, [bookmarkedIds]);

  useEffect(() => {
    localStorage.setItem('mv_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const currentQ: VocabularyQuestion | undefined = filteredQuestions[currentIndex];

  const hasAnswered = currentQ ? Boolean(selectedAnswers[currentQ.id]) : false;
  const userAnswer = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const isCorrect = currentQ && userAnswer ? userAnswer === currentQ.correctAnswer : false;
  const isBookmarked = currentQ ? bookmarkedIds.includes(currentQ.id) : false;

  // Answer handler
  const handleSelectOption = (optionKey: 'a' | 'b' | 'c' | 'd' | 'e') => {
    if (!currentQ || hasAnswered) return;

    const isRight = optionKey === currentQ.correctAnswer;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionKey }));

    if (isRight) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = (id: number) => {
    playSound('tap', soundEnabled);
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Next & Prev Navigation
  const handleNext = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      playSound('tap', soundEnabled);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, filteredQuestions.length, soundEnabled]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      playSound('tap', soundEnabled);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, soundEnabled]);

  // Reset current question answer
  const handleResetCurrent = () => {
    if (!currentQ) return;
    playSound('tap', soundEnabled);
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  // Pronounce word
  const handlePronounce = () => {
    if (!currentQ) return;
    speakEnglishWord(currentQ.targetWord);
  };

  // Stats calculation
  const totalAttempted = Object.keys(selectedAnswers).length;
  const totalCorrect = Object.entries(selectedAnswers).filter(
    ([id, ans]) => {
      const q = VOCABULARY_QUESTIONS.find((item) => item.id === Number(id));
      return q && q.correctAnswer === ans;
    }
  ).length;
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showJumpModal || showStatsModal) return;

      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'e' || e.key === 'E') {
        setShowManualExplanation((prev) => !prev);
      } else if (['1', 'a', 'A'].includes(e.key)) {
        handleSelectOption('a');
      } else if (['2', 'b', 'B'].includes(e.key)) {
        handleSelectOption('b');
      } else if (['3', 'c', 'C'].includes(e.key)) {
        handleSelectOption('c');
      } else if (['4', 'd', 'D'].includes(e.key)) {
        handleSelectOption('d');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, showJumpModal, showStatsModal, currentQ, hasAnswered]);

  const showExplanation = autoShowExplanation ? (hasAnswered || showManualExplanation) : showManualExplanation;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Background Subtle Gradient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950 -z-10" />

      {/* Main Container - Strictly Fitted Mobile Frame (Max width 460px on desktop, 100% on mobile) */}
      <div className="w-full max-w-md h-full flex flex-col justify-between p-2.5 sm:p-3 relative overflow-hidden">
        
        {/* TOP COMPACT HEADER (Height ~48px) */}
        <header className="flex-shrink-0 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-3 py-1.5 shadow-sm">
          {/* Left: App Title & Category badge */}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs tracking-wider uppercase text-indigo-400 font-mono">
              VocabMCQ
            </span>
            <div className="h-3 w-px bg-slate-800" />
            <button
              onClick={() => setShowJumpModal(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              title="Jump to question"
            >
              <Hash className="w-3 h-3 text-indigo-400" />
              <span>{filteredQuestions.length > 0 ? currentIndex + 1 : 0}/{filteredQuestions.length}</span>
            </button>
          </div>

          {/* Right: Quick Utility Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Pronounce target word */}
            <button
              onClick={handlePronounce}
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              title="Pronounce word"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Bookmark */}
            {currentQ && (
              <button
                onClick={() => handleToggleBookmark(currentQ.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'text-amber-400 bg-amber-950/30'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/80'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Stats modal button */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              title="Progress & stats"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* PROGRESS THIN BAR */}
        <div className="w-full h-1 bg-slate-900 rounded-full my-1.5 overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
            style={{
              width: `${filteredQuestions.length > 0 ? ((currentIndex + 1) / filteredQuestions.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* CATEGORY FILTER PILLS (Height ~28px) */}
        <div className="flex-shrink-0 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(['all', 'synonym', 'antonym', 'meaning', 'bookmarked', 'mistakes'] as FilterType[]).map((filter) => {
            const count =
              filter === 'all'
                ? VOCABULARY_QUESTIONS.length
                : filter === 'synonym'
                ? VOCABULARY_QUESTIONS.filter((q) => q.type === 'synonym').length
                : filter === 'antonym'
                ? VOCABULARY_QUESTIONS.filter((q) => q.type === 'antonym').length
                : filter === 'meaning'
                ? VOCABULARY_QUESTIONS.filter((q) => q.type === 'meaning').length
                : filter === 'bookmarked'
                ? bookmarkedIds.length
                : Object.entries(selectedAnswers).filter(([id, ans]) => {
                    const q = VOCABULARY_QUESTIONS.find((item) => item.id === Number(id));
                    return q && q.correctAnswer !== ans;
                  }).length;

            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => {
                  playSound('tap', soundEnabled);
                  setActiveFilter(filter);
                  setCurrentIndex(0);
                }}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all whitespace-nowrap cursor-pointer capitalize ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {filter === 'all' ? 'All' : filter} ({count})
              </button>
            );
          })}
        </div>

        {/* CENTRAL FIXED CARD SECTION (Strictly contained, no scrolling needed) */}
        {currentQ ? (
          <div className="flex-1 flex flex-col justify-between py-1 min-h-0 overflow-hidden">
            {/* 1. Question Prompt Section */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-md flex-shrink-0">
              {/* Top metadata tags */}
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 uppercase tracking-wide text-[10px]">
                  {currentQ.type}
                </span>

                {/* Exam source tag */}
                <span className="text-[10px] text-slate-400 font-bangla font-medium truncate max-w-[200px]" title={currentQ.examTag}>
                  {currentQ.examTag}
                </span>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-medium text-slate-100 leading-snug tracking-tight">
                {currentQ.question.split(new RegExp(`(${currentQ.targetWord})`, 'gi')).map((part, i) =>
                  part.toLowerCase() === currentQ.targetWord.toLowerCase() ? (
                    <span
                      key={i}
                      className="font-bold text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 underline decoration-amber-400/40 decoration-2 underline-offset-2"
                    >
                      {part}
                    </span>
                  ) : (
                    part
                  )
                )}
              </div>

              {/* Target Word Bengali Meaning (Prioritized from PDF) */}
              <div className="mt-1.5 flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400 text-[11px] font-bangla">
                  মূল শব্দ:{' '}
                  <span className="font-semibold text-slate-200">{currentQ.targetWord}</span>
                </span>
                <span className="font-bangla font-semibold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded text-[11px]">
                  {currentQ.wordMeaningBangla}
                </span>
              </div>
            </div>

            {/* 2. Four Minimalist MCQ Options (Height-optimized) */}
            <div className="grid grid-cols-1 gap-1.5 my-1.5 flex-shrink-0">
              {currentQ.options.map((optionText, idx) => {
                const optKey = (['a', 'b', 'c', 'd', 'e'][idx]) as 'a' | 'b' | 'c' | 'd' | 'e';
                const isSelected = userAnswer === optKey;
                const isCorrectOption = optKey === currentQ.correctAnswer;

                let buttonStyle = 'bg-slate-900/90 border-slate-800/90 text-slate-200 hover:border-slate-700 hover:bg-slate-850';
                let badgeStyle = 'bg-slate-800 text-slate-300';
                let indicatorIcon = null;

                if (hasAnswered) {
                  if (isCorrectOption) {
                    // Correct answer (Green highlight)
                    buttonStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-sm shadow-emerald-950/30';
                    badgeStyle = 'bg-emerald-600 text-white font-bold';
                    indicatorIcon = <Check className="w-3.5 h-3.5 text-emerald-400" />;
                  } else if (isSelected && !isCorrectOption) {
                    // User's wrong pick (Red highlight)
                    buttonStyle = 'bg-rose-950/40 border-rose-500/80 text-rose-100 shadow-sm shadow-rose-950/30';
                    badgeStyle = 'bg-rose-600 text-white font-bold';
                    indicatorIcon = <X className="w-3.5 h-3.5 text-rose-400" />;
                  } else {
                    // Other unpicked options
                    buttonStyle = 'bg-slate-900/40 border-slate-850 text-slate-500 opacity-60';
                    badgeStyle = 'bg-slate-850 text-slate-500';
                  }
                }

                return (
                  <button
                    key={optKey}
                    onClick={() => handleSelectOption(optKey)}
                    disabled={hasAnswered}
                    className={`w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${buttonStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono uppercase flex-shrink-0 transition-colors ${badgeStyle}`}
                      >
                        {optKey}
                      </span>
                      <span className="text-xs sm:text-sm font-medium tracking-tight truncate">
                        {optionText}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {indicatorIcon}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3. Small Para Box for Bangla Explanation (Strictly formatted: 4 words Bangla separated by comma) */}
            <div className="flex-shrink-0 bg-slate-900/90 border border-indigo-950/70 rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                  বাংলা অর্থ (Explanation)
                </span>
                {!hasAnswered && (
                  <button
                    onClick={() => setShowManualExplanation((prev) => !prev)}
                    className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showExplanation ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showExplanation ? 'Hide' : 'Peek'}</span>
                  </button>
                )}
              </div>

              {/* Explanation Content Box */}
              {showExplanation ? (
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
                  <p className="font-bangla text-xs sm:text-[13px] text-slate-200 leading-relaxed font-normal">
                    {currentQ.explanationBangla}
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => setShowManualExplanation(true)}
                  className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl px-2.5 py-1.5 text-center cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <p className="font-bangla text-[11px] text-slate-500 italic">
                    উত্তর নির্বাচন করুন বা অর্থ দেখতে এখানে ট্যাপ করুন
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <HelpCircle className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">কোন প্রশ্ন পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500 mt-1">ফিল্টার রিসেট করে আবার চেষ্টা করুন</p>
            <button
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              সব প্রশ্ন দেখুন
            </button>
          </div>
        )}

        {/* BOTTOM FIXED CONTROLS BAR (Height ~52px) */}
        <footer className="flex-shrink-0 flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-1.5 shadow-md mt-1">
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentIndex === 0
                ? 'text-slate-600 bg-slate-950/40 cursor-not-allowed'
                : 'text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Center: Reset / Toggle Explanation / Peek Button */}
          <div className="flex items-center gap-1.5">
            {hasAnswered ? (
              <button
                onClick={handleResetCurrent}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Retry this question"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-bangla">পুনরায়</span>
              </button>
            ) : (
              <button
                onClick={() => setShowManualExplanation((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  showExplanation
                    ? 'text-indigo-300 bg-indigo-950/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                }`}
              >
                {showExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="font-bangla">{showExplanation ? 'লুকান' : 'অর্থ'}</span>
              </button>
            )}

            {/* Auto Explanation toggle */}
            <button
              onClick={() => setAutoShowExplanation((prev) => !prev)}
              className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors cursor-pointer font-bangla ${
                autoShowExplanation
                  ? 'border-indigo-500/50 text-indigo-300 bg-indigo-950/30'
                  : 'border-slate-800 text-slate-500 bg-slate-950'
              }`}
              title="উত্তর দেওয়ার সাথে সাথে স্বয়ংক্রিয় অর্থ দেখান"
            >
              স্বয়ংক্রিয়
            </button>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={currentIndex === filteredQuestions.length - 1}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentIndex === filteredQuestions.length - 1
                ? 'text-slate-600 bg-slate-950/40 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-sm shadow-indigo-600/30'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </div>

      {/* JUMP TO QUESTION MODAL */}
      <AnimatePresence>
        {showJumpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-100">প্রশ্ন নির্বাচন করুন (Jump)</h3>
                </div>
                <button
                  onClick={() => setShowJumpModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search in Modal */}
              <div className="relative my-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="শব্দ বা প্রশ্ন খুঁজুন (e.g. deliberate)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Grid of Questions */}
              <div className="flex-1 overflow-y-auto pr-1 my-1 grid grid-cols-5 gap-1.5 max-h-[45vh]">
                {filteredQuestions.map((q, idx) => {
                  const ans = selectedAnswers[q.id];
                  const isCurrent = idx === currentIndex;
                  const isQCorrect = ans ? ans === q.correctAnswer : null;

                  let cellStyle = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700';
                  if (isQCorrect === true) {
                    cellStyle = 'bg-emerald-950/40 text-emerald-300 border-emerald-600/50';
                  } else if (isQCorrect === false) {
                    cellStyle = 'bg-rose-950/40 text-rose-300 border-rose-600/50';
                  }

                  if (isCurrent) {
                    cellStyle += ' ring-2 ring-indigo-500';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowJumpModal(false);
                      }}
                      className={`h-9 rounded-xl border flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer ${cellStyle}`}
                    >
                      <span>{q.id}</span>
                    </button>
                  );
                })}
              </div>

              {/* Footer status summary */}
              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> সঠিক
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> ভুল
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedAnswers({});
                    localStorage.removeItem('mv_selected_answers');
                  }}
                  className="text-slate-500 hover:text-rose-400 transition-colors font-bangla"
                >
                  সব মুছুন
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* STATS & PROGRESS MODAL */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-100 font-bangla">পরিসংখ্যান ও অগ্রগতি</h3>
                </div>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-4">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                    Total Answered
                  </span>
                  <div className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">
                    {totalAttempted} / {VOCABULARY_QUESTIONS.length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                    Accuracy Rate
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {accuracy}%
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                    Correct Answers
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {totalCorrect}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                    Bookmarks
                  </span>
                  <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
                    {bookmarkedIds.length}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 mb-3 text-xs text-slate-300 font-bangla space-y-1">
                <p className="font-semibold text-slate-100">কীবোর্ড শর্টকাট (Desktop):</p>
                <p className="text-[11px] text-slate-400">• A, B, C, D বা 1, 2, 3, 4 : উত্তর নির্বাচন</p>
                <p className="text-[11px] text-slate-400">• Arrow Right / Left : পরবর্তী / পূর্ববর্তী প্রশ্ন</p>
                <p className="text-[11px] text-slate-400">• Space : বাংলা অর্থ প্রদর্শন / লুকানো</p>
              </div>

              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                অনুশীলন চালিয়ে যান
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
