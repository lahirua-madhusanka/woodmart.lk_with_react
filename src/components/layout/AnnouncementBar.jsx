import { ShieldCheck, Sparkles } from "lucide-react";

function AnnouncementBar() {
  return (
    <div className="hidden bg-brand-dark py-2 text-xs text-white md:block">
      <div className="container-pad flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={14} /> 7-day easy returns
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-brand-light">
          <Sparkles size={14} /> New arrivals now live
        </span>
      </div>
    </div>
  );
}

export default AnnouncementBar;