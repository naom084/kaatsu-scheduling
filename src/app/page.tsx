'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatWeekLabel, getWeekKey } from '@/lib/firebase'

export default function HomePage() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const weekLabel = formatWeekLabel(getWeekKey())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('お名前を入力してください')
      return
    }
    sessionStorage.setItem('kaatsu_name', trimmed)
    router.push('/schedule')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💪</div>
          <h1 className="text-xl font-bold text-gray-800">加圧トレーニング</h1>
          <p className="text-blue-600 font-semibold mt-1">{weekLabel}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お名前を入力してください
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="例：田中 なおみ"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            参加状況を確認・入力する →
          </button>
        </form>
      </div>
    </main>
  )
}
