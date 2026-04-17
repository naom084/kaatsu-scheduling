import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '加圧トレーニング 参加希望入力',
  description: '加圧トレーニングの参加希望時間帯を入力するアプリです',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
