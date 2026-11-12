import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  CornerDownRight,
  ListPlus,
  RefreshCw,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { AppDatabase, ChecklistItem } from '../types.ts';

interface NextDayPlannerModalProps {
  open: boolean;
  onClose: () => void;
  db: AppDatabase;
  onPlanNextDay: (payload: {
    carryoverItems: { id: string; taskText: string; remarks: string; priority: boolean }[];
    standardRoutineItemIds: string[];
  }) => Promise<void>;
  onNotifyToast: (msg: string) => void;
  onNavigateToChecklist?: () => void;
}

export const NextDayPlannerModal: React.FC<NextDayPlannerModalProps> = ({
  open,
  onClose,
  db,
  onPlanNextDay,
  onNotifyToast,
  onNavigateToChecklist,
}) => {
  if (!open) return null;

  // Filter daily checklist items
  const dailyChecklistItems = useMemo(() => {
    return (db.checklists || []).filter((item) => item.cadence === 'daily');
  }, [db.checklists]);

  // Today's pending items
  const pendingItems = useMemo(() => {
    return dailyChecklistItems.filter((item) => item.status === 'Pending');
  }, [dailyChecklistItems]);

  // State for carryover selections
  const [selectedCarryoverIds, setSelectedCarryoverIds] = useState<Set<string>>(() => {
    return new Set(pendingItems.map((i) => i.id));
  });

  const [carryoverRemarks, setCarryoverRemarks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    pendingItems.forEach((item) => {
      map[item.id] = item.remarks || '';
    });
    return map;
  });

  const [priorityFlags, setPriorityFlags] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    pendingItems.forEach((item) => {
      map[item.id] = true; // default carryover tasks as high priority
    });
    return map;
  });

  // Routine items selection
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(() => {
    return new Set(dailyChecklistItems.map((i) => i.id));
  });

  const [submitting, setSubmitting] = useState(false);

  const toggleCarryover = (id: string) => {
    setSelectedCarryoverIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePriority = (id: string) => {
    setPriorityFlags((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleRoutine = (id: string) => {
    setSelectedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllRoutine = () => {
    setSelectedRoutineIds(new Set(dailyChecklistItems.map((i) => i.id)));
  };

  const handleDeselectAllRoutine = () => {
    setSelectedRoutineIds(new Set());
  };

  const handleExecutePlanner = async () => {
    setSubmitting(true);
    try {
      const carryoverPayload = Array.from(selectedCarryoverIds).map((id) => {
        const item = pendingItems.find((p) => p.id === id);
        return {
          id,
          taskText: item?.taskText || '',
          remarks: carryoverRemarks[id] || item?.remarks || '',
          priority: Boolean(priorityFlags[id]),
        };
      });

      const routinePayload = Array.from(selectedRoutineIds);

      await onPlanNextDay({
        carryoverItems: carryoverPayload,
        standardRoutineItemIds: routinePayload,
      });

      onNotifyToast(
        `পরবর্তী দিনের চেকলিস্ট সফলভাবে তৈরি হয়েছে! (${carryoverPayload.length}টি ক্যারি-ওভার + ${routinePayload.length}টি রুটিন দায়িত্ব)`
      );
      onClose();
      if (onNavigateToChecklist) {
        onNavigateToChecklist();
      }
    } catch {
      onNotifyToast('চেকলিস্ট প্ল্যানার প্রয়োগ করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-start justify-between border-b border-indigo-900/60 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>SpeedNet Smart Carryover Planner</span>
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              <span>পরবর্তী দিনের চেকলিস্ট প্ল্যানার ও ক্যারি-ওভার সাজেশন</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              আজকের অসমাপ্ত পেন্ডিং কাজগুলো বাছাই করে জরুরি ক্যারি-ওভার হিসেবে যুক্ত করুন এবং আগামী দিনের রুটিন রেসপনসিবিলিটি সিলেক্ট করে নতুন দিনের চেকলিস্ট সাজান।
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* SECTION 1: TODAY'S PENDING TASKS CARRYOVER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-950">
                    আজকের অসমাপ্ত ও পেন্ডিং কাজসমূহ ({pendingItems.length}টি পেন্ডিং)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    যে কাজগুলো আগামীকাল অগ্রাধিকার দিয়ে সম্পন্ন করতে চান সেগুলোতে টিক দিয়ে রাখুন।
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {selectedCarryoverIds.size}টি নির্বাচিত
              </span>
            </div>

            {pendingItems.length === 0 ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-emerald-950">
                  অভিনন্দন! আজকের কোনো কাজ পেন্ডিং নেই।
                </div>
                <div className="text-[11px] text-emerald-700">
                  সকল দৈনিক দায়িত্ব সম্পন্ন হয়েছে। নিচের রুটিন সাজেশন থেকে সরাসরি নতুন দিনের চেকলিস্ট সাজিয়ে নিতে পারেন।
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {pendingItems.map((item) => {
                  const isChecked = selectedCarryoverIds.has(item.id);
                  const isPriority = Boolean(priorityFlags[item.id]);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCarryover(item.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600 font-mono">
                              ক্যাটাগরি {item.categoryNumber}: {item.categoryName}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePriority(item.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                isPriority
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {isPriority ? '★ জরুরি প্রায়োরিটি' : 'সাধারণ ক্যারি-ওভার'}
                            </button>
                          </div>

                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            {item.taskText}
                          </div>

                          {/* Editable carryover remarks */}
                          <div className="pt-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mb-0.5">
                              <CornerDownRight className="h-3 w-3 text-amber-600" />
                              <span>পেন্ডিং থাকার কারণ বা আগামীকালের নির্দেশনা:</span>
                            </div>
                            <input
                              type="text"
                              value={carryoverRemarks[item.id] || ''}
                              onChange={(e) =>
                                setCarryoverRemarks((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder="কেন আটকে ছিল বা কালকে কী করতে হবে..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: TOMORROW'S STANDARD ROUTINE RESPONSIBILITIES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                  <Compass className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-950">
                    আগামী দিনের স্ট্যান্ডার্ড রুটিন দায়িত্ব সাজেশন ({dailyChecklistItems.length}টি দায়িত্ব)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    প্রতিদিনের মৌলিক ৭টি ক্যাটাগরির রুটিন কাজ নতুন দিনের জন্য ফ্রেশভাবে সক্রিয় হবে।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllRoutine}
                  className="text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  সবগুলো নিন
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleDeselectAllRoutine}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  ক্লিয়ার
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pr-1">
              {dailyChecklistItems.map((item) => {
                const isSelected = selectedRoutineIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRoutine(item.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-blue-800 font-mono">
                        Cat {item.categoryNumber}
                      </div>
                      <div className="font-medium line-clamp-2 leading-tight">
                        {item.taskText.replace(/^\[Carryover.*?\]\s*/, '')}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-mono">
            <span className="font-bold text-amber-800">{selectedCarryoverIds.size}টি ক্যারি-ওভার</span>{' '}
            + <span className="font-bold text-blue-800">{selectedRoutineIds.size}টি রুটিন কাজ</span>{' '}
            যুক্ত হবে
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleExecutePlanner}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-amber-300 ${submitting ? 'animate-spin' : ''}`} />
              <span>নতুন দিনের চেকলিস্ট সক্রিয় করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
