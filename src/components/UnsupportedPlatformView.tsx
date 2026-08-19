import { AlertOctagon, Terminal } from 'lucide-react';

interface Props {
  platformName?: string;
}

export default function UnsupportedPlatformView({ platformName = 'Unsupported OS' }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center mx-auto">
          <AlertOctagon size={32} />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25">
            Platform Notice
          </span>
          <h2 className="text-xl font-bold text-white">Unsupported Operating System</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The System Maintenance &amp; Optimization Suite is engineered specifically for native <strong className="text-white">Windows 10/11</strong> (WinSuite) and <strong className="text-white">macOS 12+</strong> (MacSuite).
          </p>
          <p className="text-xs text-slate-500 font-mono pt-2">
            Detected environment: {platformName}
          </p>
        </div>
        <div className="pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono text-slate-400 space-y-1">
            <p className="text-slate-200 font-bold flex items-center gap-1.5"><Terminal size={13} /> Supported Environments:</p>
            <p>• Windows 10 &amp; 11 (x64 / ARM64)</p>
            <p>• macOS Monterey, Ventura, Sonoma, Sequoia (Apple Silicon &amp; Intel)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
