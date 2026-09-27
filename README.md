# ハート泥棒_MV_演出改訂

[完成MVを開く・ダウンロード](./ハート泥棒_MV_演出改訂版.mp4)

118.8秒 / 1920×1080 / 30fps / H.264 + AACステレオ。60カットの2D素材合成MVです。

## Claude Codeで引き継ぐ

[CLAUDE.md：制作条件・素材の場所・実行手順](./CLAUDE.md) を最初に読んでください。

```sh
git clone https://github.com/moemszo/heart-thief-mv-revised.git
cd heart-thief-mv-revised
npm ci
npm run render:preview
npm run render:mv
```

Node.js 20以降とFFmpegが必要です。日本語フォントはライセンス付きで同梱しています。
`.gitignore` は個人設定・秘密情報の除外に変更済みです。画像・MP3・MP4・原文プロンプト・会話・制作ソースは公開しています。

**MP3：[ファイルを確認](./media/audio/ハート泥棒.mp3) / [音声を直接開く・保存](https://raw.githubusercontent.com/moemszo/heart-thief-mv-revised/main/media/audio/%E3%83%8F%E3%83%BC%E3%83%88%E6%B3%A5%E6%A3%92.mp3)**

## 素材・制作記録

- [セッションコンテキスト全文・原文プロンプト](./SESSION_CONTEXT.md)
- [全画像のプレビュー一覧](./assets/GALLERY.md) / [最終素材32枚](./assets/final/) / [生成途中の画像](./assets/iterations/) / [全保存画像の対応表](./assets/generated_image_manifest.json)
- [提供曲MP3（公開用メタデータ処理済み）](./media/audio/ハート泥棒.mp3)
- [JIZURA字幕素材MP4](./media/video/JIZURA_字幕素材.mp4) / [途中確認用MP4](./media/video/previews/)
- [初版・字幕前MP4（Release）](https://github.com/moemszo/heart-thief-mv-revised/releases/download/session-archive-v1/heart-thief-mv-v1-before-lyrics.mp4)
- [JIZURA編集用データ・LRC](./subtitles/) / [演出分析と変更点](./docs/演出分析と変更点.md)
- [タイムラインと制作ソース](./production/) / [メディア一覧・SHA-256](./media/MANIFEST.json)
- [公開範囲と伏せ字について](./session/REDACTION_POLICY.md)

字幕は [JIZURA](https://852wa.github.io/JIZURA/) で制作しました。生成途中の画像は完成素材ではなく、採用しなかった試行も含みます。

初版MP4は約114MBあるため、[GitHubの通常Gitファイル上限](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)に合わせてReleaseへ収録しています。完成版はこのリポジトリ直下です。
