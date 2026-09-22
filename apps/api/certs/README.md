# Supabase CA

`supabase-ca-2021.crt` は公開CA証明書で、秘密鍵ではありません。

- 取得日: 2026-09-22
- 配布元: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- 配布URLの確認元: https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json （`ssl:certificate_url`）
- 有効期限: 2031-04-26

`sslmode=verify-full` と `sslrootcert` で利用します。更新時はSupabase公式Dashboardまたは公式配布元から取得し、検証を無効化せず接続確認してください。
