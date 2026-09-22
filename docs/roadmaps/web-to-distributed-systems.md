# TypeScriptから分散システムへ

2026-09-22にSupabase本番DBへ公開（PUBLIC）で登録済み。作成者は「蔵品日向」。Slug: `web-to-distributed-systems`。10冊・10ステップを登録し、公開APIからの取得も確認済み。学習開始は本人がアプリで操作する。

[登録用データ](web-to-distributed-systems.json)は `roadmap`、書籍情報を含む順序付き`steps`で構成する。APIへ一括送信する形式ではない。書籍作成／既存書籍の照合後に実IDを`step.bookId`へ設定し、ロードマップ作成後に順にStepを登録する。書籍のISBNで既存データを照合し、OSTEPは著者・タイトルで照合する。所要日数は未設定。学習開始と完了は本人が操作する。

自分のWebアプリが、コード・DB・通信・OSの上でなぜ動くかを説明し、規模が大きくなったときの故障とトレードオフを考えられるようになる。TypeScriptの基礎文法と小さなアプリの実装経験を前提に、10分野を辿る。本で学ぶ→開発用のTadoriまたは練習アプリで実験→結果を説明する。完了は読了率ではなく各Checkpointの実演と説明で判断する。AIは利用可。ただし生成物の根拠と失敗ケースを自分で説明する。HTTP基礎はAPI設計の前、Networkは後から深掘りする。設計と実装は途中でも往復してよい。資格教材は知識の抜けを確認する補助として使う。実験にはローカルのテストデータを用いる。

書誌情報は2026-09-22に出版社・著者サイトで確認。以下の課題と到達条件はTadori向けに作成した学習案で、出版社の認定基準ではない。必読は関連範囲とし、全ページ読了を必須にはしない。資格取得は完了条件にしない。

## 1. TypeScript

教材：[Effective TypeScript 第2版](https://www.oreilly.co.jp/books/9784814401093/)（Dan Vanderkam）

型設計、型推論、any/unknown、ジェネリックの項目を優先する。TadoriのAPIレスポンスをunknownで受け、実行時検証から判別可能なunionへ変換する。成功・失敗を表すResult<T, E>と網羅的な分岐を実装する。

**Checkpoint:** unknownを検証して絞り込み、generics・unionでAPIの成功と失敗を型安全に扱える。異常な入力を拒否するテストが通り、型アサーションで検証を省略していない。型が実行時には消えること、構造的型付けと型推論の根拠を説明できる。

## 2. SQL

教材：[達人に学ぶSQL徹底指南書 第2版](https://www.shoeisha.co.jp/book/detail/9784798157825)（ミック）

結合・集約・サブクエリ・ウィンドウ関数を優先する。CTEも使い、Tadoriのテストデータから月別の学習開始人数と前月比、人気ロードマップ上位10件を生SQLで集計する。SQL未経験ならSELECTとJOINの基礎を先に補う。

**Checkpoint:** JOIN、GROUP BY/HAVING、サブクエリ、CTE、Window Functionで集計を実装し、ゼロ件・NULL・同率・月境界・前月ゼロの期待値を確認できる。EXPLAIN ANALYZEのSeq ScanとIndex Scan、推定行数と実測行数を読み分けられる。

## 3. HTTP基礎

教材：[Webを支える技術](https://gihyo.jp/book/2010/978-4-7741-4204-3)（山本 陽平）

URI・HTTP・RESTを中心に読む。HTTP/3や現在のブラウザ挙動はMDNで補う。開発用APIをcurlとブラウザNetworkタブで観察し、メソッド・ステータス・ヘッダー・認証・キャッシュ・CORSを記録する。補助: https://developer.mozilla.org/ja/docs/Web/HTTP

**Checkpoint:** 1つの通信をDNS・接続・TLS・HTTPに分けて説明できる。HTTP/1.1・2のTCP利用とHTTP/3のQUIC利用を区別できる。GET/POST/PUT/PATCH/DELETE、冪等性、CookieとAuthorization、Cache-Control、CORSの役割を実際のリクエストで説明できる。

## 4. API設計

教材：[Web API: The Good Parts](https://www.oreilly.co.jp/books/9784873116860/)（水野 貴明）

エンドポイント・レスポンス・HTTPの利用・変更管理・安全性を読む。Tadoriのロードマップ作成と学習開始を題材にAPI契約を記述して実装する。古い認証方式やセキュリティヘッダーをそのまま採用せず、利用ライブラリの現行資料と照合する。

**Checkpoint:** 認証と所有者の認可、入力検証、統一エラー、ページネーション、検索・並べ替え、重複送信、互換性の方針を説明できる。未認証・他人の編集・不正入力・同時送信をテストし、採用したHTTPメソッドとステータスの理由を説明できる。

## 5. DB設計

教材：[達人に学ぶDB設計徹底指南書 第2版](https://www.shoeisha.co.jp/book/detail/9784798186627)（ミック）

論理設計・正規化・物理設計・制約を優先する。User、Book、Roadmap、Step、学習登録、進捗のER図とDDLを作る。本の再利用と、同じ本でもStepごとに異なるCheckpointを表現する。

**Checkpoint:** ER図からDDLを作成し、1:N/N:M・PK/FK・UNIQUE・CHECK・NULL・削除規則・インデックスの理由を説明できる。二重の学習登録を制約で防ぎ、途中失敗時のロールバックを実証できる。主な読み書きとトランザクション境界を説明できる。

## 6. Network

教材：[マスタリングTCP/IP 入門編 第6版](https://www.ohmsha.co.jp/book/9784274224478.html)（井上 直也、村山 公保、竹下 隆史、荒井 透、苅田 幸雄）

IP・TCP/UDP・DNS・ルーティング・セキュリティを中心に読む。開発用APIへの通信をcurl、dig、ping、tracerouteで観察し、Linuxではssで待受ポートを確認する。localhostと別ホストへの通信経路を図にする。

**Checkpoint:** IP・port・socket・TCP/UDP・DNS・NAT・routing・TLSを通信経路に結び付けて説明できる。名前解決失敗、接続拒否、タイムアウト、HTTPエラーを切り分けられる。pingに応答しないことだけでサービス停止と断定しない。

## 7. OS / Linux

教材：[Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/)（Remzi H. Arpaci-Dusseau、Andrea C. Arpaci-Dusseau）

Processes、Address Spaces、Paging、Concurrency and Threads、Locks、I/O、Files and Directoriesを優先する。Linux操作が初めてなら『新しいLinuxの教科書 第2版』（三宅英明・大角祐介）を先に併読: https://www.sbcr.jp/product/4815624316/ 。ローカルLinux VMでNode.jsを動かし、ps/top、/proc、lsof/ss、straceで観察する。

**Checkpoint:** Node.jsのPID・メモリ・FD・待受socket・権限を調査できる。process/thread、仮想メモリ、system call、context switch、並行と並列を説明できる。CPUを占有する処理が応答を止める実験を行い、event loopとOSの役割を区別して説明できる。

## 8. DB内部

教材：[詳説 データベース](https://www.oreilly.co.jp/books/9784873119540/)（Alex Petrov）

まず第I部のストレージエンジンを読む。PostgreSQL固有のMVCC・WAL・ロック・分離レベル・実行計画は、利用バージョンの公式マニュアルで補う: https://www.postgresql.org/docs/ 。開発用DBの2接続で競合と可視性を観察する。

**Checkpoint:** B-tree・page・buffer・WAL・MVCCを使って読み書きの流れを説明できる。2接続でRead CommittedとSerializableの差を再現し、再試行の必要性を説明できる。EXPLAIN (ANALYZE, BUFFERS)で索引の前後を比較し、索引の書込コストとUPDATE後のVACUUMの役割を説明できる。

## 9. Software Architecture

教材：[ソフトウェアアーキテクチャの基礎 第2版](https://www.oreilly.co.jp/books/9784814401550/)（Mark Richards、Neal Ford）

モジュール性・品質特性・各アーキテクチャスタイル・意思決定を読む。Tadoriの認証・ロードマップ・学習進捗を題材に境界と依存関係を描き、現状維持を含む設計案を比較する。設計の基礎はこの段階を待たず実装中にも学ぶ。

**Checkpoint:** Layered、Modular Monolith、Hexagonal、Microservices、Event Drivenを同一軸の排他的な選択肢とせず、構成・境界・通信の違いとして整理できる。品質要求に対する選択、代替案、犠牲、見直し条件をADRに記録し、1つの境界変更をテスト付きで実装できる。

## 10. Distributed Systems

教材：[データ指向アプリケーションデザイン](https://www.oreilly.co.jp/books/9784873118703/)（Martin Kleppmann）

日本語版を教材として使用。複製・パーティショニング・トランザクション・分散システムの障害・一貫性と合意を優先し、その後ストリーム処理へ進む。練習用Queue/Workerで重複配信・応答消失・再試行を起こし、冪等な処理を検証する。

**Checkpoint:** replication lag、network partition、leader障害、重複配信による故障を図示できる。CAPの議論がネットワーク分断時の保証に関わること、consensusとreplicationの違い、exactly-onceの保証範囲を説明できる。再試行でも効果が二重にならない実験と、整合性・可用性・遅延の設計判断を示せる。
