import React, { useRef } from 'react';
import { Copy, Download, Server, Upload, X } from 'lucide-react';
import type { AppDatabase, ServerInfo } from '../types.ts';

interface ServerGuideModalProps {
  open: boolean;
  onClose: () => void;
  serverInfo: ServerInfo | null;
  db: AppDatabase;
  onImportBackup: (data: AppDatabase) => Promise<void>;
  onNotifyToast: (msg: string) => void;
}

export const ServerGuideModal: React.FC<ServerGuideModalProps> = ({
  open,
  onClose,
  serverInfo,
  db,
  onImportBackup,
  onNotifyToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      onNotifyToast(`কপি করা হয়েছে: ${url}`);
    } catch {
      onNotifyToast('কপি করা সম্ভব হয়নি।');
    }
  };

  const handleDownloadBackup = () => {
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speednet_coo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotifyToast('ডাটাবেস ব্যাকআপ ফাইল ডাউনলোড হয়েছে।');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppDatabase;
      await onImportBackup(parsed);
      onNotifyToast('ব্যাকআপ ডাটাবেস সফলভাবে রিস্টোর হয়েছে!');
    } catch {
      onNotifyToast('সঠিক ব্যাকআপ JSON ফাইল নির্বাচন করুন।');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                লোকাল সার্ভার, LAN IP অ্যাক্সেস ও ডাটা ব্যাকআপ
              </h2>
              <p className="text-xs text-slate-500">
                অফিস পিসিতে লোকালি হোস্ট করে IP দিয়ে যেকোনো জায়গা থেকে মনিটরিং করার নির্দেশিকা
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Access URLs */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700">
            বর্তমান সক্রিয় সার্ভার অ্যাড্রেস ও ডাটাবেস স্ট্যাটাস
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Current Web / Cloud Link:</span>
              <div className="flex items-center gap-2 font-mono text-slate-900">
                <span className="truncate max-w-[280px]">{currentOrigin}</span>
                <button
                  type="button"
                  onClick={() => copyUrl(currentOrigin)}
                  className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {serverInfo?.lanUrls.map((lan, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Detected Server IP ({idx + 1}):</span>
                <div className="flex items-center gap-2 font-mono text-blue-700 font-semibold">
                  <span>{lan}</span>
                  <button
                    type="button"
                    onClick={() => copyUrl(lan)}
                    className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                    title="Copy LAN IP"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 text-slate-500">
              <span>Database File: <code className="font-mono text-slate-700">{serverInfo?.dbFilePath || 'data/speednet_coo_db.json'}</code></span>
              <span className="font-mono tabular-nums">Port: {serverInfo?.port || 3000} (0.0.0.0)</span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Local Hosting Guide */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-800">
            অফিস PC বা MikroTik Real IP-তে লোকাল হোস্ট করার নিয়ম:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">
            <li>
              প্রজেক্ট ফোল্ডারটি অফিসের যেকোনো PC/Server-এ রেখে টার্মিনালে প্রথমবার{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">
                npm install
              </code>{' '}
              এবং চালু করতে{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">
                npm run dev
              </code>{' '}
              রান করুন।
            </li>
            <li>
              সার্ভারটি স্বয়ংক্রিয়ভাবে <code className="font-mono">0.0.0.0:3000</code> পোর্টে চালু হবে এবং সকল ডাটা{' '}
              <code className="font-mono">data/speednet_coo_db.json</code> ফাইলে স্থায়ীভাবে সেভ থাকবে।
            </li>
            <li>
              অফিস রাউটারের Wi-Fi বা LAN-এ যুক্ত যেকোনো মোবাইল বা ল্যাপটপের ব্রাউজারে অফিস PC-এর IP (যেমন:{' '}
              <code className="font-mono text-blue-700">http://192.168.1.100:3000</code>) লিখলেই ড্যাশবোর্ড ওপেন হবে।
            </li>
            <li>
              অফিসের বাইরে থেকে যেকোনো জায়গা থেকে দেখতে আপনার ISP/MikroTik রাউটারে একটি <strong>Real IP Port Forwarding</strong> (Port <code className="font-mono">3000</code>) অথবা VPN সেট করলেই যেকোনো জায়গা থেকে লাইভ কাজ ও রিপোর্ট আপডেট করতে পারবেন।
            </li>
          </ol>
        </div>

        {/* Backup & Restore Actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            যেকোনো সময় সম্পূর্ণ ডাটা ব্যাকআপ ডাউনলোড বা অন্য পিসিতে রিস্টোর করুন:
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>ব্যাকআপ রিস্টোর (Import)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ডাটা ব্যাকআপ ডাউনলোড</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
