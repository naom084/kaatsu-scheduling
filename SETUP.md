# 加圧トレーニング 参加希望入力アプリ セットアップ手順

## 1. フォルダの配置

このフォルダ（`kaatsu-scheduling`）を `~/Downloads/files/` に移動してください。

```
~/Downloads/files/kaatsu-scheduling/
```

## 2. Firebase の設定

ichigo-farm の `.env.local` をそのままコピーしてください。

```bash
cp ~/Downloads/files/ichigo-farm/.env.local ~/Downloads/files/kaatsu-scheduling/.env.local
```

（Firebase の同じプロジェクト・同じ環境変数を使います。データのパスが違うため干渉しません）

## 3. パッケージのインストール

```bash
cd ~/Downloads/files/kaatsu-scheduling
npm install
```

## 4. 動作確認（任意）

```bash
npm run dev
# → http://localhost:3000 で確認
```

## 5. Vercel にデプロイ

```bash
vercel --prod
```

初回は `vercel link` で新しいプロジェクトとして登録してください。

---

## アプリの使い方

| ページ | URL | 説明 |
|--------|-----|------|
| 参加者入力 | `/` | 名前入力 → 時間帯選択 → 送信 |
| 集計画面 | `/admin` | 全員の回答一覧と集計を確認 |

## 時間帯の変更方法

`src/lib/firebase.ts` の `TIME_SLOTS` 配列を編集してください：

```typescript
export const TIME_SLOTS = [
  { id: '18:00', label: '18:00〜18:30' },
  { id: '18:30', label: '18:30〜19:00' },
  // ← ここを追加・変更・削除してOK
]
```

## データのリセットについて

データは毎週木曜日を起点として自動的に切り替わります。
手動リセットは不要です（過去のデータは Firebase に保存されたまま）。
