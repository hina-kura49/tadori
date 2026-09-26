# Tadori

<img src="apps/mobile/assets/icon.png" alt="Tadoriのアイコン：深緑を背景に、本と学びの道を組み合わせたシンボル" width="128" height="128" />

**誰かが作った学びの道を、辿る。**

技術書・ビジネス書を「順番」と「できるようになること」でつなぐ、学習RoadmapのモバイルMVPです。ホームにはメインRoadmapの今読む一冊を表示します。各本のCheckpointに到達すると、次の一冊へ進みます。

## Run

Node.js 22以上（開発確認：24）、pnpm 10、iOS SimulatorまたはAndroid Emulatorを使用します。
リポジトリはpnpmワークスペースで、`apps/mobile`（Expo）・`apps/web`（Vite + React）・`apps/api`（Hono）をまとめて管理します。

```sh
pnpm install
pnpm start
# iOS: Expoのターミナルで i、Android: a
# ExpoのWebプレビュー（ポート指定）
pnpm --filter @tadori/mobile web -- --port 8087
```

### Web版（apps/web）

ブラウザ向けのWeb版です。APIへは同じオリジンの `/_api` を経由して繋ぎ、ログインはCookieで保持します。

```sh
# ローカルのPostgres（Docker）に繋いだAPIを http://localhost:4000 で起動
./scripts/local-api.sh --seed   # 初回だけ --seed でサンプルデータも入れる
# 別のターミナルで Web を http://localhost:5173 で起動（/_api を localhost:4000 へ中継）
pnpm web
```

`apps/api/.env` が本番DBを指していても、`scripts/local-api.sh` はDBの接続先をローカルへ上書きします。
本番はCloudflare Pagesで配信し、`apps/web/functions/_api/[[path]].ts` がRenderのAPIへ中継します（[手順](docs/web/deployment.md)）。

Expo SDK 55に対応するExpo Go、またはdevelopment buildで開いてください。今回の確認環境では、XcodeのシミュレーターGUIはDeviceHubという名称です。

初回起動でName・Username・興味カテゴリを設定します。Nameは日本語対応、Usernameは半角英小文字・数字・`_`の3〜24文字です。Explore → Roadmap → Start Roadmapで開始できます。初期状態では学習を勝手に開始しません。

```sh
pnpm typecheck                # 全アプリ
pnpm test
pnpm --filter @tadori/mobile build   # ExpoのWeb production export
pnpm --filter @tadori/web build      # Web版
# 開発サーバーを8087で起動した状態で、Chromeを利用する操作テスト
cd apps/mobile
pnpm exec playwright test
```

## Directory Structure

```text
apps/mobile/
  app/                    Expo Routerの薄いrouteファイル
    (tabs)/               Today / Explore / Create / Circles / Me
    onboarding.tsx
    roadmaps/[slug].tsx    Learning Path
    roadmaps/new.tsx
    books/[id].tsx         進捗更新（本文Readerではない）
    circles/[id].tsx
    circles/new.tsx
    profile/[username].tsx
    r/[slug].tsx           共有URLのalias
    settings/
  src/
    api/                  HTTP client、repository、seed
    components/           共通UI、RoadmapCard、本の登録
    features/             画面単位のUIとform schema
    hooks/                TanStack Queryの取得・mutation
    lib/                  進捗計算、通知、画像保存、共有URL、端末保存
    types/                domain model
  tests/                  進捗・入力・保存・Deep Linkのunit tests
  e2e/                    ユーザーフローのPlaywright tests
  global.css              NativeWind entry
  app.json                scheme / platform links / plugins
```

## Architecture

`Route → Feature → Query / Mutation hook → Repository → Mock storage or HTTP client`。

- React Native / Expo Router / TypeScript。
- TanStack Queryで読込、再試行、キャッシュ、更新後の再取得を管理。
- React Hook Form + ZodでOnboarding・作成入力を検証。Checkpointは必須。
- NativeWindでベーススタイル、共通のtheme tokenとReact Native stylesで細部を表現。
- Lucide React Native、Gesture Handler、Reanimated、Draggable FlatList。
- MockはAsyncStorageの`tadori.database.v1`に保存。Webでも同じ利用体験でリロード後に復元。
- 同時書込は直列化し、進捗と登録データの更新消失を防ぐ。
- 認証tokenはnativeではexpo-secure-store。Webの実APIはHttpOnly session cookieを想定。
- 本の進捗はRoadmapのStep単位。同じ本でも別RoadmapのCheckpointを独立して進められる。
- 完了冊数は全Step完了状態から計算し、プロフィールの本の完了数はbook IDで重複除外。
- 現在地は最初の未完了Step。先の本も開けるため、順番を飛ばしても現在地は破綻しない。

## Design System

Editorial × Product Tool。Warm White `#FAFAF8` / Ink `#171717` / Secondary `#737373` / Border `#E5E5E5` / **Deep Teal `#234E49`**。

アプリアイコンは、本と学びの道を組み合わせた深緑のシンボルです。[アイコン画像](apps/mobile/assets/icon.png)を、[Expo設定](apps/mobile/app.json)のアプリアイコンとWebのfaviconに指定しています。画像は内蔵 image_gen で生成し、[生成プロンプト](apps/mobile/assets/icon-prompt.md)も保存しています。

英語の見出しと日本語の説明を組み合わせ、見出しにserif、操作と本文にplatform system fontを使用。余白・細いborder・文字サイズで階層を表現。Primary Actionの高さは52pt、icon buttonは44pt。フォームはキーボード表示に対応し、スクロールして操作できます。

**外部の書影は自動取得しません。** Seedには本のタイトル・著者などのmetadataだけを用意しています。画像未登録時は、統一色のシンプルなタイトルカードを表示します。ユーザーは本の登録時に自分で画像を選択できます。画像選択は任意で、画像なしでも登録・学習が可能です。

画像はnativeではアプリのdocumentsへコピー、Webでは選択画像のdata URIをローカル保存。3MB以下に制限します。API接続時は画像upload endpointへ送信し、返されたHTTPS URLを登録します。Roadmap作成・Circleの本選択から登録できます。

## Navigation Structure

| Tab | 役割 |
| --- | --- |
| Today | メインRoadmapの現在の本、進捗、Checkpoint、次の一冊 |
| Explore | 公開Roadmapの検索、7カテゴリによる絞込 |
| Create | Roadmap / Circle作成の入口 |
| Circles | 参加Circle・公開Circleの学習状況と予定 |
| Me | 進行中・完走・作成Roadmap、学習領域、共有 |

Roadmap DetailはSTART → 完了 / 現在 / 後続Step → COMPLETEの縦型Learning Path。Reading Progressでは0〜100%で更新し、Checkpointに到達したらComplete。Todayは全Roadmap完了時に次の学びを促します。

作成時のStepは長押しでDrag & Drop可能。上下ボタンによる並べ替えも提供します。Category / Difficulty / Visibilityと各本の選書理由・Checkpoint・期間を保存します。

Loading Skeleton、Empty、Error + 再読込、主要一覧と詳細のPull to Refreshを用意。失敗したmutationはエラーを表示して入力を保持します。完全なoffline同期や競合解決は未実装です。

## API Integration Points

デフォルトはローカルMock。`apps/mobile/.env`に以下を設定するとHTTP transportへ切り替えます。

```env
EXPO_PUBLIC_API_URL=https://your-hono-api.example
```

秘密鍵やtokenは`EXPO_PUBLIC_*`に置きません。Honoサーバー自体はこのリポジトリには含みません。型は`src/types/domain.ts`、契約は[docs/api-contract.md](docs/api-contract.md)を参照してください。

現在のMVPはdashboard snapshotを一括取得し、検索・カテゴリ絞込は端末側で実行します。サーバーは閲覧可能なRoadmap / Circle / Profileのみをsnapshotへ返す必要があります。公開プロフィールの学習統計を他の端末で取得する拡張は将来の専用endpointを想定しています。

## Notification Design

- Study Reminder: enabled、HH:mm、曜日（Expoの1=日〜7=土）、任意のroadmapId。
- 初期状態はOFF。ユーザーがONにして保存した時に通知許可を求め、曜日ごとのweekly local notificationを予約。
- 再設定時はTadoriのStudy通知だけを置換。新しい予約が失敗したら新規分を取り消し、既存予約を維持。
- Circle / Progress / Inviteの設定を保存。実Push配信はbackendが設定に従って行います。
- EAS projectIdが設定されたnative buildからExpo Push Tokenを取得し、`POST /v1/me/devices`へ登録する接続点を用意。
- 通知の`data.url`はTadoriの対応pathだけを許可。起動中・cold startの両方を処理し、同一responseの二重遷移を防止。
- Webではlocal notification予約を行わず、その設定がnativeアプリ向けであることを表示。
- Push配信はAPNs / FCM credential、EAS projectId、実backendの設定が必要。Expo GoはPushの本番検証環境ではありません。

通知文面は設定保存時の現在の本を使用します。サーバーからのCircleの予定変更・完了イベント・招待配信はAPI接続後の領域です。

## Deep Link Design

```text
tadori://roadmaps/backend-engineering
tadori://circles/backend-circle
tadori://profile/kurashina
https://tadori.app/r/backend-engineering
https://tadori.app/profile/kurashina
https://tadori.app/circles/backend-circle
```

Expo Routerのfile routesと`scheme: tadori`、iOS associatedDomains、Android intentFiltersを設定済み。Expo Goでは開発URL（例：`exp://127.0.0.1:8087/--/roadmaps/backend-engineering`）で確認できます。

Universal Linksの実運用には、所有ドメインでのWeb配信と`.well-known/apple-app-site-association` / `assetlinks.json`の公開、Apple Team IDとAndroid署名fingerprint、署名済みアプリが必要です。**tadori.appへの公開・ドメイン検証は行っていません。** Mockのユーザー登録データはその端末だけにあるため、別端末への共有はbackend接続後に成立します。

## Seed / Mock Data

- Backend Engineering Foundations: Webを支える技術 → 達人に学ぶDB設計 徹底指南書 → SQLアンチパターン → Clean Architecture。
- Product Management Basics: INSPIRED → The Mom Test → Continuous Discovery Habits → Lean Analytics。
- Businessの顧客理解Roadmap、2つの公開Circle。
- 全StepにCheckpointと選書理由を付与。進捗は未開始から開始します。
- Circle参加、作成、Roadmap作成、本の登録、プロフィールBio・通知設定をローカル保存。
- Circleの共同進捗・メンバー・予定はMock snapshot。実時間の多人数同期はbackendで実装します。

## Future Features

Hono APIと認証、書込権限のサーバー検証、ユーザー画像upload storage、ページネーション、公開プロフィールの統計取得、Circle招待の受諾フロー、共同進捗の集計、バックエンドPush配信、署名済みdevelopment / production build、Universal Linkドメイン配信。

## Not Implemented in V1

電子書籍Reader、EPUB / PDF、AI / AI推薦 / 本文要約、MCP、細かな読書ログ、ハイライト、星評価、レビュー、フォロワー、Like、SNS Feed、DM、チャット、課金。

## Reference documentation

[Expo Router](https://docs.expo.dev/versions/v55.0.0/sdk/router/)、[Expo Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/)、[Expo ImagePicker](https://docs.expo.dev/versions/v55.0.0/sdk/imagepicker/)、[NativeWind](https://www.nativewind.dev/docs/getting-started/installation)。

## Validation

- TypeScript: `npm run typecheck` 成功。
- Vitest: 13 tests成功（進捗遷移、完走、入力検証、同時書込、Circle参加制約、本の登録、Deep Link許可範囲）。
- Playwright / Chrome: 4シナリオ成功（初回登録〜学習進捗、Roadmap作成・並べ替え〜Circle作成、初回入力エラー表示、ユーザー画像登録と再読込）。並べ替えは上下操作で順序とCheckpoint対応の維持を確認。
- Web production export成功。Expo SDKのローカル互換バージョンチェック成功。
- iPhone 17 Pro / iOS 26.5 Simulator / Expo Goで起動と表示確認。初回ボタンのnative style適用とCreateの行高不足を修正。
- iOSでのDrag & Dropの実操作、画像pickerの実機権限、通知の時刻発火、Android端末、Universal Linkのdomain association、Push配信の実機試験は未実施。

スクリーンショット：`artifacts/today-mobile.png`、`artifacts/roadmap-mobile.png`（Web）、`artifacts/create-ios.png`（iOS）。

## Path-focused UI update

5タブは色だけでなく、道・ノード・現在地の共通表現で構成しています。

- Today: 空状態にも始点→Roadmap選択→Checkpointの道を表示。学習中はStep railと現在の一冊を表示。
- Explore: 本を順番に並べ、その下に番号と接続線を表示。入口は「See path」。
- Create: 中央に寄せた軽い2択。大きな説明カードを廃止。
- Circles: メンバーのイニシャル、各Stepのメンバー配置、いま読む本、次回日時を優先。保存済みMock Circleには明示的なメンバー進捗を補完。未共有メンバーの進捗は推測しません。自分の参加Circleには自分の学習進捗を反映。
- Me: 名前とBioをコンパクトにまとめ、領域ごとに枝分かれするYour pathを主役に。完了冊数は補助情報。
- Reading Progress: RoadmapのStep→本・著者→選書理由と到達点→状態と行動。未開始では進捗入力を隠し、開始後のUpdate Progressで編集シートを開きます。

### Profile image sharing

Meの共有ボタン → `/profile/share` → 学習カードをプレビュー → 「画像を共有する」。`react-native-view-shot`でカードのみをPNG化し、`expo-sharing`でOSの共有シートに渡します。共有アプリの選択・送信はユーザーが行います。未公開のプロフィールURLを画像に入れず、本人の名前・ユーザー名・学習領域とCheckpoint状況を使用します。未開始の領域も未開始として表示します。

Webはテキスト共有にフォールバックします。画像共有のプレビュー表示はiOS Simulatorで確認済みです。LINE / Instagramをインストールした実機への受渡しと各投稿形式は未検証で、特定SNSへの直接投稿・Stories専用連携は実装していません。

追加検証: メンバー進捗の単体テストを含む15件が成功。新しい5タブ・明示的な進捗編集・共有プレビューの操作シナリオも追加しています。画面例は`artifacts/*-path.png`と`artifacts/reading-before.png` / `reading-after.png`に保存。

タブ最上部のナビゲーション見出しは `AppHeader` に統一しています。Today / Explore / Create / Circles / Me はセリフ体28・行高38・通常ウェイト、ヘッダー行の最小高44。サブコピーはサンセリフ13・行高21とし、ロードマップ名などのコンテンツ見出しとは役割を分けています。

画面名・主要見出し・主操作は英語、説明・入力支援・エラーは日本語を基本とします。Todayは本→到達点→主操作の順に表示し、未開始時の0%表示を省きます。Exploreの説明は2行まで。Circle一覧は現在の本・メンバー・現在地の要約・次回予定に絞り、個人別の進捗図は詳細画面で確認できます。

Meは画面全体を動かしません。前回表示時から進捗が増えたノードだけが一度反応し、接続線の進捗が伸びます。未開始・単なるタブ移動・共有画像では動かさず、OSのモーション軽減設定に従います。青いフローティングボタンはExpo Goの開発用UIです。本番アプリの設定ボタンとは別です。

### First path onboarding

初回体験は `Welcome → Interests (2〜3分野) → Explore → Roadmap登録 → Today → 関連Circle (任意) → Me → Today`。実際のロードマップ・学習登録・プロフィールを使い、スライドではなく通常画面上の小さな案内で進めます。

- 興味に合う短い公開Roadmapを優先して最大5件表示。カテゴリ検索で他の道も選べます。
- 登録直後はTodayに移動。選んだ道・現在の本・Checkpointを確認してからCircleを案内します。
- Circleは選択したRoadmapまたはその本に関連する公開／参加済みのものだけを紹介。人数は実データから表示し、参加は必須にしません。関連Circleがない場合もMeへ進めます。
- 名前を登録時に入力済みなら再入力は不要。最後のMeで未設定の名前・ユーザー名だけ補います。未認証のmock利用では、最初は仮プロフィールで学習を始め、Meで名前を一度だけ入力します。
- `useJourney` が案内状態を永続化し、未完了なら次回起動時に該当画面へ復帰。APIユーザーはユーザーIDごと、mockは端末単位で保存します。従来の設定済みプロフィールは新しい案内を開始しません。
- 登録・進捗・Circle参加・プロフィールは既存repositoryを使用。案内段階自体は端末保存のため複数端末間では同期しません。
