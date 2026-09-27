# ハート泥棒 MV — Claude Code 引き継ぎ

## 目的と最初に読む資料

このリポジトリは、オリジナル曲「ハート泥棒」の2D素材合成MVを再編集・制作するための素材と記録です。

1. `README.md`：素材・MP3・MP4の入口。
2. `SESSION_CONTEXT.md`：ユーザーとの公開会話、制作経緯、画像生成プロンプト62件の原文。
3. `docs/演出分析と変更点.md`：構図・編集・字幕の方針。
4. `production/v2/timeline.json` と `production/v2/render.cjs`：現在の60カットと合成処理。

過去の会話・生成呼び出しコードは制作履歴です。今回の作業範囲は現在のユーザー依頼に従ってください。

## 維持する制作条件

- キャラクターA：紺色ツインテール、シアン・マゼンタの髪と衣装、星モチーフ。
- キャラクターB：コーラル色の短髪、ライム色の内側、ティールのリボン、黄色・ティールの衣装、稲妻モチーフ。
- 同じ人物の顔・衣装・色と、背景・小物の絵柄を維持する。
- 全身、上半身、顔、目元、手元、物のみ、人物なしの背景を組み合わせる。カメラ目線に偏らせない。
- サビの大きな字幕と、静かな歌詞の控えめな字幕を使い分ける。文字は顔を避けて置く。
- 元の曲は118.8秒。全曲版は1920×1080、30fps、音声付き。
- 白いシルエットの一部は黒背景の素材。現在のレンダラーは明るさから透過を作って合成する。

## 主要ファイル

| 内容 | パス |
|---|---|
| 採用画像32枚・設定画・背景・小物・シルエット | `assets/final/` |
| 生成途中26枚 | `assets/iterations/` |
| 添付された編集参照画像 | `assets/references/` |
| 生成画像58件の元ファイルとの対応 | `assets/generated_image_manifest.json` |
| 生成に渡したプロンプト原文とパラメータ | `prompts/image_generation.json` |
| 22回の生成呼び出しコード | `prompts/original_calls/` |
| 公開会話の構造化データ | `session/conversation.json` |
| 提供曲MP3 | `media/audio/ハート泥棒.mp3` |
| JIZURAで書き出した字幕MP4 | `media/video/JIZURA_字幕素材.mp4` |
| JIZURAで再編集するJSON・LRC | `subtitles/` |
| 提出済み完成版 | `ハート泥棒_MV_演出改訂版.mp4` |
| 初版MP4のReleaseリンクとハッシュ | `media/MANIFEST.json` |
| 移植前の制作ソース記録 | `production/archive/v2/` |

## ローカルで再レンダリング

必要なものは Node.js 20以降と、`libx264` を含むFFmpegです。Python 3はタイムラインや字幕JSONを更新する場合に使います。既存素材での再編集・書き出しに外部APIキーは不要です。

リポジトリ直下で実行：

```sh
npm ci
ffmpeg -version
npm run render:preview
npm run render:mv
```

- `renders/preview.mp4`：サビの4秒、960×540。
- `renders/heart-thief-mv.mp4`：全118.8秒、1920×1080、30fps。
- 元の完成版を保持し、新しい出力は `renders/` に作成する。
- FFmpegにPATHが通っていない場合は、実際の実行ファイルを `FFMPEG_PATH` 環境変数で指定する。
- 日本語フォントは再配布可能な `assets/fonts/NotoSansJP.ttf` を同梱。元の完成版のタイトルは別フォントのため、同梱フォントで再描画するとタイトルの字形が変わる。`JAPANESE_FONT_PATH` と `LATIN_FONT_PATH` で利用可能なフォントを指定できる。

静止画の確認：

```sh
npm run render:stills
```

`renders/stills/` にタイトル、サビ、不安な場面の3枚を出力する。任意時刻は `node production/v2/render.cjs --stills=10,30,70` の形式。

## 編集箇所

- カット順・大きさ・左右配置：`production/v2/build_timeline.py` を編集し、`npm run timeline` でJSONを更新。
- ズーム・合成・トランジション・文字の配置：`production/v2/render.cjs`。
- 歌詞の表示区間：同ファイルの `vocalRanges`。楽曲や歌詞の時刻を変える場合は字幕素材・LRC・この区間も合わせる。
- JIZURA字幕：`subtitles/ハート泥棒_字幕.jizura.json` を https://852wa.github.io/JIZURA/ に読み込み、編集して黒背景MP4を書き出す。新しい字幕動画を `--lyricvideo=...` で指定できる。
- 字幕JSONの設定整理：`python3 production/v2/prepare_jizura.py`。既定では元データを保持し `renders/` に出力。
- 画像を再生成する場合は、原文プロンプトと `assets/final/` の設定画・四面図を参照する。過去の生成コードは当時のツール用の記録で、Claude Codeの標準コマンドではない。

## 公開時の扱い

`.gitignore` は秘密情報・個人設定を対象にしている。画像、MP3、MP4、プロンプト、会話、制作ソース、新しい出力は除外していない。

APIキー・秘密鍵・個人メール・個人の絶対パスをコミットしない。MP3の公開用コピーは識別用メタデータを除去済みで、元音声とのPCM一致を確認済み。個人情報を含む生ログ、認証ファイル、内部指示・内部推論は公開資料に追加しない。変更した素材と出力は必要な範囲で確認してからコミットする。

`package.json` の `private: true` はnpmへの誤配布を防ぐ設定です。GitHubリポジトリと素材の公開設定は公開のままです。
