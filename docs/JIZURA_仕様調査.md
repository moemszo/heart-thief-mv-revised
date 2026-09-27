# JIZURA プロジェクトJSONと字幕書き出し

対象は公式公開リポジトリ `852wa/JIZURA` のコミット `8da975fb362d966b065217618aedafd5a35a39e0`。以下はソースコードの静的確認で、画面操作や書き出し実行は含まない。

## JSONの要点

保存JSONのトップレベルはプロジェクト状態で、`version`, `lyrics`, `title`, `artist`, `style`, `keyBg`, `aspect`, `res`, `fps`, `fx`, `timing`, `overrides` などを持つ。既定値は [`src/08_planner.js:12-37`](jizura_source/src/08_planner.js#L12)、読み込み時は既定値に取り込んで不足設定を補完する（[`src/12_ui.js:102-128`](jizura_source/src/12_ui.js#L102)）。保存ボタンはプロジェクトJSONを `.jizura.json` で保存し、AE用JSONは別形式（[`src/12_ui.js:1626-1627`](jizura_source/src/12_ui.js#L1626)）。

歌詞・間奏の配列番号と `overrides` のキーは、コメント行などを除いた解析済み項目のゼロ始まりindex。各通常行に `cuts: 1` を指定すると、歌詞を分割せず1カットに固定できる（[`src/08_planner.js:306-315`](jizura_source/src/08_planner.js#L306)）。1行の指定形は次のとおり。`layout`, `enter`, `hold`, `exit`, `treat`, `decor`, `bg`, `cam` は実装で認識されるキー（[`src/08_planner.js:345-381`](jizura_source/src/08_planner.js#L345)）。

```json
{
  "lyrics": "[00:01.00]夜明けの色を覚えてる\n[00:03.50]心を盗んで！",
  "title": "",
  "artist": "",
  "style": "noir",
  "keyBg": "black",
  "aspect": "16:9",
  "res": 1080,
  "fps": 30,
  "includeAudio": false,
  "typeset": false,
  "centerFree": false,
  "fx": { "motion": 0.42 },
  "timing": { "tail": 0.9, "snap": false },
  "overrides": {
    "0": { "cuts": 1, "layout": "center", "enter": "blur", "hold": "still", "exit": "blur", "treat": "softShadow", "decor": [], "bg": "none", "cam": "push" },
    "1": { "cuts": 1, "layout": "center", "enter": "pop", "hold": "wave", "exit": "explode", "treat": "outlineFill", "decor": [], "bg": "none", "cam": "push" }
  }
}
```

この例のLRC時刻は開始時刻。全解析項目に時刻がある場合はLRCを使用し、手動の `timing.lineTimes[index]` があればその値がLRCより優先される。1項目でもLRCが欠けると全行LRC扱いにならず、欠落行を含めて自動推定経路に入る（[`src/08_planner.js:171-202`](jizura_source/src/08_planner.js#L171)）。LRCは `[分:秒.小数]歌詞` の形式（[`src/08_planner.js:58-68`](jizura_source/src/08_planner.js#L58)）。`typeset:true` は全開始・終了を0.2秒早めるため、LRCをそのまま使う用途では `false` にする（[`src/08_planner.js:220-225`](jizura_source/src/08_planner.js#L220)）。

通常行の終了は原則次行の開始時刻。最終行だけ字数から1.5〜5.2秒の範囲で推定し、`timing.tail` が追加される。音声長が渡されれば、最終行の終了+0.2秒と音声長の長い方まで計画する（[`src/08_planner.js:193-202`](jizura_source/src/08_planner.js#L193)）。通常の歌詞表示は `visEnd` で最大時間も制限され、次行まで1.3秒を超える空きがあれば自動間奏カットが追加される（[`src/08_planner.js:292-295`](jizura_source/src/08_planner.js#L292)、[`src/08_planner.js:527-532`](jizura_source/src/08_planner.js#L527)）。タイトルまたはLRCの `ti` / `ar` メタデータがあり、先頭行開始が1.1秒以降ならタイトルカットも追加される（[`src/08_planner.js:218-220`](jizura_source/src/08_planner.js#L218)、[`src/08_planner.js:264-269`](jizura_source/src/08_planner.js#L264)）。22項目に対し23カットになった場合は、タイトルカットか自動間奏のどちらかが余分に入った可能性がある。内訳は生成プランの `cuts` を確認する。

`[間奏 8]` は歌詞なしの間奏として認識され、秒数なしなら自動経路で4秒扱い（[`src/08_planner.js:61-68`](jizura_source/src/08_planner.js#L61)）。全項目にLRC時刻を付けた場合、非最終行の終了は次項目開始なので、間奏の秒数を8秒にするなら次のLRC開始を間奏開始+8秒に置く。秒数指定は非最終行のLRC終了計算には直接反映されない（[`src/08_planner.js:176-198`](jizura_source/src/08_planner.js#L176)）。

## 手法IDと推奨

単純な `overrides` で指定できるのは手法ID。数値パラメーターは各手法の `plan()` がseedに基づいて生成する。具体値を固定する場合は `lockedCuts` のスナップショット経路を使う（[`src/08_planner.js:318-325`](jizura_source/src/08_planner.js#L318)、[`src/08_planner.js:378`](jizura_source/src/08_planner.js#L378)）。推奨IDとコード上の値は次のとおり。

| 種別 | ID | 用途と値 |
|---|---|---|
| layout | `center` | 中央配置。中心座標には最大で横±5%、縦±6%のseed差がある。フォント幅・字間も生成される（[`src/06_layouts.js:128-140`](jizura_source/src/06_layouts.js#L128)）。 |
| enter | `blur` | 静かな行向け。ブラー26から減衰し、透明度を上げる（[`src/05_anim.js:131-140`](jizura_source/src/05_anim.js#L131)）。 |
| enter | `pop` | サビ向け。文字ごとに最大28度のseed付き回転から収束（[`src/05_anim.js:82-92`](jizura_source/src/05_anim.js#L82)）。 |
| hold | `still` | 保持中は動かさない（[`src/05_anim.js:197-200`](jizura_source/src/05_anim.js#L197)）。 |
| hold | `wave` | サビ向け。保持量に対して縦振幅0.07×文字サイズ、回転±5度（[`src/05_anim.js:224-229`](jizura_source/src/05_anim.js#L224)）。 |
| exit | `blur` | 柔らかい退場。最大30ブラー（[`src/05_anim.js:330-337`](jizura_source/src/05_anim.js#L330)）。 |
| exit | `explode` | 強いサビ向け。破片の広がりは画面長辺の0.9×(0.5+0.6×motion)（[`src/05_anim.js:246-263`](jizura_source/src/05_anim.js#L246)）。 |
| treat | `softShadow` | 静かな行の可読性補助。ぼかし0.08〜0.14、縦ずれ0.03〜0.07×文字サイズ（[`src/11p_looks.js:161-168`](jizura_source/src/11p_looks.js#L161)）。 |
| treat | `outlineFill` | サビ用の縁取り。幅0.075〜0.12×文字サイズ、コントラストに合うアクセント色（[`src/11p_looks.js:107-115`](jizura_source/src/11p_looks.js#L107)）。 |
| treat | `fadeChars` | 余韻。終端などの文字アルファ下限0.3〜0.4（[`src/11p_treattrans.js:588-599`](jizura_source/src/11p_treattrans.js#L588)）。 |

静かな行は `center + blur + still + blur + softShadow`、サビは `center + pop + wave + explode + outlineFill` を推奨。`fx.motion` は0〜1のスライダーで、0.25〜0.45なら全体を控えめにしやすい。`koma:0` は出力fpsごとに描画、既定12は24fps基準のコマ数指定（[`src/08_planner.js:42`](jizura_source/src/08_planner.js#L42)、[`src/12_ui.js:1133-1145`](jizura_source/src/12_ui.js#L1133)）。行末 `!` は強調フラグになり、`fx.flash` と `enabled.fx.flash` が有効ならフラッシュ、`enabled.fx.shake` が有効なら揺れも候補になる。字幕領域を動かしたくないなら `!` を外し、`enabled.fx.shake:false` を設定する（[`src/08_planner.js:73-76`](jizura_source/src/08_planner.js#L73)、[`src/08_planner.js:498-510`](jizura_source/src/08_planner.js#L498)）。

## カメラ

`camera:'still'` は登録IDではない。明示的な固定寄りカメラIDは `cam:'push'`。これはズームだけで、`fx.motion:0.42` ならカット末に最大約1.26%寄り、`motion:0` なら倍率1で止まる（[`src/05b_registry.js:28-32`](jizura_source/src/05b_registry.js#L28)、描画変換 [`src/09_render.js:171-180`](jizura_source/src/09_render.js#L171)）。`overrides[i].cam` で行単位に固定できる（[`src/08_planner.js:381-383`](jizura_source/src/08_planner.js#L381)）。カメラの `shakeHard`, `dutch`, `panL`, `panR`, `driftDiag` などは別IDで登録されているため、自動選択を避けるには `cam:'push'` を各行に明記する。

行が `lock:true` だと `lockedCuts` のカメラ指定が後段で復元される。ロックを解除するか、各1カット行に `cutTech:{"0":{"cam":"push"}}` を使う。カット単位の `cutTech` はロック読込後に適用される（[`src/08_planner.js:393-400`](jizura_source/src/08_planner.js#L393)、[`src/08_planner.js:426-428`](jizura_source/src/08_planner.js#L426)、UI保存形 [`src/12_ui.js:815-825`](jizura_source/src/12_ui.js#L815)）。カメラ固定とは別に画面効果の揺れがあるため厳密な領域固定では `enabled.fx.shake:false` も使う。

## 書き出し、背景、中央空け

プロジェクトの `keyBg` は `off` / `green` / `black`。`black` は白文字・グレーの効果を黒背景に描き、スクリーン合成や輝度キー用。`green` は `#00FF00` を背景にしてクロマキー用（[`src/04_styles.js:178-191`](jizura_source/src/04_styles.js#L178)、最終フレーム処理 [`src/09_render.js:222-245`](jizura_source/src/09_render.js#L222)）。MP4はキャンバスをalpha無効で作るため透過動画ではない（[`src/11_export.js:142-158`](jizura_source/src/11_export.js#L142)）。音声なしMP4は `includeAudio:false` にする（[`src/11_export.js:142-151`](jizura_source/src/11_export.js#L142)）。

透明PNGは `透過PNG（ZIP・背景なし）`、背景/前景を分ける場合は `透過PNG 前景／後景（ZIP）`。実装は各フレームの透過オプションを有効にする（[`app/body.html:253-255`](jizura_source/app/body.html#L253)、[`src/11_export.js:244-264`](jizura_source/src/11_export.js#L244)）。書き出しの選択肢は16:9、解像度720/1080/1440/2160、24/30/60fps。合成背景はグリーンまたはブラック（[`app/body.html:238-248`](jizura_source/app/body.html#L238)）。黒/緑キーモードでは明るい文字色とグレー効果だけになり、質感や背景模様は外れる。

`centerFree:false` は全画面内の通常配置。`true` はキャラクターを中央に重ねる用途で、横画面なら左右、縦画面なら上下に領域を分け、歌詞も2つに分けて表示する（[`src/08_planner.js:232-237`](jizura_source/src/08_planner.js#L232)、[`src/08_planner.js:338-342`](jizura_source/src/08_planner.js#L338)、UI説明 [`app/body.html:246-247`](jizura_source/app/body.html#L246)）。書き出し字幕を後で任意位置へ合成する用途では `false` を選ぶ。

スタイル `noir` はdisplayフォント候補に `gothic_black`（Noto Sans JP Black）、bodyに `gothic_med`（Noto Sans JP Medium）を含む（[`src/04_styles.js:11-20`](jizura_source/src/04_styles.js#L11)、フォント定義 [`src/02_fonts.js:11-15`](jizura_source/src/02_fonts.js#L11)）。役割ごとのフォント指定は `fonts.display`, `fonts.serif`, `fonts.body`。

## UI入口名

- JSON読み込み：ヘッダーの **開く**（[`app/body.html:26`](jizura_source/app/body.html#L26)、読み込み [`src/12_ui.js:1636-1640`](jizura_source/src/12_ui.js#L1636)）。
- JSON保存：ヘッダーの **保存**（[`app/body.html:27`](jizura_source/app/body.html#L27)、保存形式 [`src/12_ui.js:1626`](jizura_source/src/12_ui.js#L1626)）。
- 通常MP4：**書き出し**タブ → **MP4 を書き出す**。大容量時は **MP4（大きな動画用・ファイルに直接保存）**（[`app/body.html:178-183`](jizura_source/app/body.html#L178)、[`app/body.html:250-255`](jizura_source/app/body.html#L250)）。
- 連番または透明PNG：同じ **書き出し**タブの **連番PNG（ZIP）**、**透過PNG（ZIP・背景なし）**、**透過PNG 前景／後景（ZIP）**。
- After Effects向けJSONは **AE用に書き出し**で、通常のJIZURAプロジェクト保存とは別物（[`app/body.html:28`](jizura_source/app/body.html#L28)、[`src/12_ui.js:1626-1627`](jizura_source/src/12_ui.js#L1626)）。
