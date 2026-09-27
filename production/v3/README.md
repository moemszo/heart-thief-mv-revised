# v3 — プロ仕様の再編集版

`ハート泥棒_MV_v3.mp4`（118.8秒 / 1920×1080 / 30fps / H.264 High + AAC 256kb/s）を作る制作ソースです。
素材は `assets/final/` の画像、`media/audio/ハート泥棒.mp3`、提供歌詞とLRCの時刻だけを使っています。

## v2からの主な変更

| 課題（v2） | v3での対応 |
|---|---|
| 無地の暗い背景に斜めの帯、カード状の枠に人物を貼った構図 | 4枚の背景を全画面に敷き、被写界深度（ぼかし3段階）とパララックス付きカメラで奥行きを作る |
| 人物の輪郭がそのまま背景から浮く | 人物ごとに色付きのリムライト、接地影、スポットライト・光漏れ・ボケ玉・舞台照明で同じ光の中に置く |
| 一定の揺れ | ショットごとのカメラワーク（押し込み・引き・パン・ロール）と、キックに合わせたごく小さな拍の呼吸 |
| 切り替えのタイミング | 曲から検出したキック（`beats.json`）にカット点を合わせる。フラッシュ、ホイップパン、ズームブラー、グリッチ、黒味、クロスフェードを場面の役割で使い分け |
| 白一色で黒背景を抜いた字幕 | JIZURAの透過PNG経路で、キャラクターの配色（白・マゼンタ・シアン）のまま書き出し、ショットごとの空きに配置。薄い暗幕と影で可読性を確保 |
| 仕上げ | ブルーム、自己オーバーレイによるコントラスト、場面ごとのグレーディング、周辺減光、フィルムグレイン |

構成（65ショット）は `edit.json` に書き出されます。

- イントロ：リングとタイトル
- Aメロ：リング・おまじないの小物とAの寄り、Bの登場、手前にAのシルエット
- Bメロ：スポットライトの舞台、1拍ごとに寄るビルドアップ
- サビ：ハートのステージ、Bの全身→腰上→顔、観客のシルエット、りんご
- 間奏：2人のダンス、分割パネル、白いシルエット
- 2番：夜の部屋とスマートフォン、いいねの並ぶ投稿、不安の場面はグリッチと減色
- アウトロ：2人の見せ場とエンドカード

## 字幕（JIZURA）

字幕は [JIZURA](https://852wa.github.io/JIZURA/) の描画エンジンそのもので作っています。
`jizura_export.cjs` は、JIZURAの公開リポジトリ（[852wa/JIZURA](https://github.com/852wa/JIZURA)。公開サイトと同じ `index.html`）をヘッドレスChromiumで開きます。
そのうえで曲とプロジェクトJSONをページの読み込み処理に渡し、「透過PNG（ZIP・背景なし）」と同じ描画経路で全フレームを書き出します。

- プロジェクト：`subtitles/ハート泥棒_字幕_v3.jizura.json`（`make_jizura_project.py` で生成）。JIZURAの「開く」でそのまま読み込めます。
- スタイル：ポップ・マゼンタ。配色は上書きで、文字が白、アクセントがA のマゼンタ（#FF4FA8）、色ズレがシアン（#35E6FF）。書体は Mochiy Pop One と M PLUS Rounded 1c です。
- 行の時刻：提供LRCのまま（`typeset:false`、`snap:false`）。
- 行ごとの演出：Aメロは発光・にじみ、Bメロは語ごとのスラムとスタンプ、サビはズーム・ポップ・螺旋と縁取り、2番はチャット・カウンター・グリッチです。
- 透過字幕を再利用しやすいよう、`media/video/JIZURA_字幕素材_v3_透過.webm`（VP9 + アルファ）も収録しています。

## 実行

```sh
npm ci
pip install numpy pillow
npm i -g playwright   # Chromium が必要
git clone --depth 1 https://github.com/852wa/JIZURA /tmp/JIZURA
JIZURA_DIR=/tmp/JIZURA production/v3/build.sh
```

手順を分けて実行する場合：

```sh
python3 production/v3/analyze_beats.py                 # beats.json（キック時刻・音量の包絡）
python3 production/v3/make_jizura_project.py           # JIZURAプロジェクトJSON
JIZURA_DIR=/tmp/JIZURA node production/v3/jizura_export.cjs --out=renders/v3/lyrics
python3 production/v3/measure_lyrics.py renders/v3/lyrics
node production/v3/render.cjs --lyrics=renders/v3/lyrics --stills=shots   # 各ショットの静止画
node production/v3/render.cjs --lyrics=renders/v3/lyrics --out=renders/v3/parts/p0.mkv
production/v3/encode.sh renders/v3/parts ハート泥棒_MV_v3.mp4
```

中間映像は x264 4:4:4 の高画質（QP4）で作ります。最終書き出しは2パスの `-preset slower -tune animation` です。
GitHubの1ファイル100MB制限に収めるため、映像ビットレートは既定で6Mb/sにしています（`VBR` 環境変数で変更できます）。
