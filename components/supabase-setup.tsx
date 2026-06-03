import Link from "next/link";

export function SupabaseSetup() {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
      <p className="text-sm font-medium text-matcha">セットアップが必要です</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Supabaseの環境変数を設定してください</h1>
      <p className="mt-3 max-w-2xl leading-7 text-sumi/75">
        `.env.example` を参考に `.env.local` を作成し、Supabase URL と anon key を入れると予約データを表示できます。
        その後、`supabase/schema.sql` をSupabase SQL editorで実行してください。
      </p>
      <Link className="mt-5 inline-flex rounded-md bg-ink px-4 py-3 text-sm font-medium text-white" href="/login">
        ログイン画面を見る
      </Link>
    </section>
  );
}
