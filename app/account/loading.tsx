import { FormFieldLoading, PageTitleLoading, SubmitButtonLoading } from "@/components/loading-card";

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-softPulse space-y-6">
      <PageTitleLoading withDescription />
      <div className="grid gap-6 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <div className="size-20 rounded-full bg-matcha/10" />
          <div>
            <div className="h-4 w-24 rounded-full bg-sumi/[0.08]" />
            <div className="mt-2 h-4 w-48 rounded-full bg-sumi/[0.07]" />
          </div>
        </div>
        <FormFieldLoading />
        <div className="grid gap-2">
          <div className="h-4 w-28 rounded-full bg-sumi/[0.08]" />
          <div className="h-14 rounded-lg border border-dashed border-ink/15 bg-paper/60" />
          <div className="h-[50px] rounded-lg border border-ink/10 bg-white" />
        </div>
        <SubmitButtonLoading />
      </div>
    </div>
  );
}
