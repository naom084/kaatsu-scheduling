import { initializeApp, getApps } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getDatabase(app)

// ===== 時間帯マスター =====
export const TIME_SLOTS = [
  { id: '18:00', label: '18:00〜18:30' },
  { id: '18:30', label: '18:30〜19:00' },
  { id: '19:00', label: '19:00〜19:30' },
  { id: '19:30', label: '19:30〜20:00' },
  { id: '20:00', label: '20:00〜20:30' },
  { id: '20:30', label: '20:30〜21:00' },
]

// ===== 回答の型 =====
export type SlotAnswer = '○' | '△' | '×' | ''

export interface ScheduleResponse {
  name: string
  submittedAt: string
  slots: Record<string, SlotAnswer>
  memo?: string
}

// ===== 火曜日ベースのウィークキー =====
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day >= 2 ? -(day - 2) : -(day + 5)
  d.setDate(d.getDate() + diff)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ===== 木曜日（トレーニング日）の表示 =====
export function formatWeekLabel(weekKey: string): string {
  const parts = weekKey.split('-')
  const tuesday = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const thursday = new Date(tuesday)
  thursday.setDate(tuesday.getDate() + 2)
  const month = thursday.getMonth() + 1
  const day = thursday.getDate()
  return `${month}月${day}日（木）`
}
