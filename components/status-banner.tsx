type StatusBannerProps = {
  message?: string;
  tone?: "success" | "error";
};

export function StatusBanner({ message, tone = "success" }: StatusBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        tone === "error"
          ? "rounded-md border border-sakura/30 bg-sakura/10 px-3 py-2 text-sm text-ink"
          : "rounded-md border border-matcha/25 bg-matcha/10 px-3 py-2 text-sm text-ink"
      }
    >
      {message}
    </p>
  );
}
