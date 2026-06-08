# Yoyaku

オンラインレッスン向けの予約管理 MVP です。講師は今月・来月の空き時間と固定レッスン URL を設定し、生徒は 30 分枠を選んで予約できます。

## Setup

1. Supabase で新しいプロジェクトを作成します。
2. 既存テストデータを消す場合は `supabase/reset_public_schema.sql` を SQL editor で実行します。
3. `supabase/schema.sql` を SQL editor で実行します。
4. `.env.example` を参考に `.env.local` を作成します。
5. Supabase の Project Settings > API Keys から `service_role` key を `.env.local` に追加します。
6. Resend で API key を作成し、`RESEND_API_KEY` と `AUTH_EMAIL_FROM` を `.env.local` に追加します。
7. Cloudflare Turnstile で widget を作成し、`NEXT_PUBLIC_TURNSTILE_SITE_KEY` と `TURNSTILE_SECRET_KEY` を追加します。
8. 講師にしたいユーザーの `profiles.role` を `teacher` に更新します。

```bash
npm.cmd install
npm.cmd run dev
```

## Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
AUTH_EMAIL_FROM=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
APP_URL=
```

## Routes

- `/login`
- `/teachers`
- `/teachers/[teacherId]`
- `/student/bookings`
- `/teacher/bookings`
- `/teacher/availability`
- `/teacher/settings`

## Rules

- レッスン時間は 30 分固定です。
- 空き時間は日付ごとに設定します。同じ日に複数の不連続な時間帯を設定できます。
- 予約は作成時に即時確定します。
- 生徒は開始 12 時間前まで予約をキャンセルできます。
- 日時表示と予約生成は `Asia/Tokyo` 前提です。
- ログインリンク送信は Turnstile と簡易レート制限で保護します。
