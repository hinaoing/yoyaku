import { AlertCircle, CheckCircle } from "lucide-react";

type StatusBannerProps = {
  message?: string;
  tone?: "success" | "error";
};

export function StatusBanner({ message, tone = "success" }: StatusBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={
        tone === "error"
          ? "flex items-start gap-3 animate-slideUp rounded-lg border border-sakura/25 border-l-[3px] border-l-sakura bg-sakura/[0.06] px-4 py-3 text-sm text-ink"
          : "flex items-start gap-3 animate-slideUp rounded-lg border border-matcha/20 border-l-[3px] border-l-matcha bg-matcha/[0.06] px-4 py-3 text-sm text-ink"
      }
    >
      {tone === "error" ? (
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-sakura" />
      ) : (
        <CheckCircle size={18} className="mt-0.5 shrink-0 text-matcha" />
      )}
      <p>{message}</p>
    </div>
  );
}
