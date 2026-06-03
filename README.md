# Yoyaku

オンラインレッスン向けの予約管理MVPです。講師は今月・来月の空き時間と固定レッスンURLを設定し、生徒は30分枠を選んで即時予約できます。

## Setup

1. Supabaseで新規プロジェクトを作成します。
2. 既存テストデータを消す場合は `supabase/reset_public_schema.sql` をSQL editorで実行します。
3. `supabase/schema.sql` をSQL editorで実行します。
4. `.env.example` を参考に `.env.local` を作成します。
5. SupabaseのProject Settings > API Keysから `service_role` key を `.env.local` に追加します。
6. ResendでAPI keyを作成し、`RESEND_API_KEY` と `AUTH_EMAIL_FROM` を `.env.local` に追加します。ログインメールはResendから送信します。
7. 講師にしたいユーザーの `profiles.role` を `teacher` に更新します。

```bash
npm.cmd install
npm.cmd run dev
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

- レッスン時間は30分固定です。
- 空き時間は日付ごとに設定します。1日に複数の不連続な時間帯を設定できます。
- 予約は作成時に自動確定します。
- 生徒は開始12時間前まで予約をキャンセルできます。
- 日時表示と予約生成は `Asia/Tokyo` 前提です。
