'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ref, push, update, remove, onValue } from 'firebase/database'
import { db, TIME_SLOTS, SlotAnswer, getWeekKey, formatWeekLabel, ScheduleResponse } from '@/lib/firebase'

type ResponseEntry = ScheduleResponse & { id: string }

function AnswerIcon({ answer }: { answer: SlotAnswer | '' }) {
  if (answer === '○') return (
    <div className="flex items-center justify-center h-9">
      <div className="w-7 h-7 rounded-full border-[3px] border-green-500 bg-green-50" />
    </div>
  )
  if (answer === '△') return (
    <div className="flex items-center justify-center h-9">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <polygon points="13,3 25,23 1,23" stroke="#f59e0b" strokeWidth="2.5" fill="#fef3c7" />
      </svg>
    </div>
  )
  if (answer === '×') return (
    <div className="flex items-center justify-center h-9">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <line x1="5" y1="5" x2="21" y2="21" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="21" y1="5" x2="5" y2="21" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
  return <div className="flex items-center justify-center h-9 text-gray-300 text-xs">-</div>
}

const SLOT_BG: Record<SlotAnswer | '', string> = {
  '○': 'bg-green-50', '△': 'bg-yellow-50', '×': '', '': '',
}

type PageState = 'input' | 'submitted' | 'editing'

export default function SchedulePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [weekKey, setWeekKey] = useState('')
  const [responses, setResponses] = useState<ResponseEntry[]>([])
  const [slots, setSlots] = useState<Record<string, SlotAnswer>>(() => {
    const init: Record<string, SlotAnswer> = {}
    TIME_SLOTS.forEach((s) => { init[s.id] = '' })
    return init
  })
  const [memo, setMemo] = useState('')
  const [pageState, setPageState] = useState<PageState>('input')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 名前チェックを初回1回だけ行うフラグ
  const initialCheckDone = useRef(false)
  const nameRef = useRef('')

  useEffect(() => {
    const savedName = sessionStorage.getItem('kaatsu_name')
    if (!savedName) { router.push('/'); return }
    setName(savedName)
    nameRef.current = savedName
    setWeekKey(getWeekKey())
  }, [router])

  // Firebase リアルタイム購読
  useEffect(() => {
    if (!weekKey) return
    initialCheckDone.current = false // weekKeyが変わったらリセット

    const unsubscribe = onValue(ref(db, `kaatsu/responses/${weekKey}`), (snapshot) => {
      const data = snapshot.val()
      if (!data) { setResponses([]); return }

      const entries: ResponseEntry[] = Object.entries(data).map(([id, val]) => ({
        id, ...(val as ScheduleResponse),
      }))
      entries.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      setResponses(entries)

      // ★ 初回ロード時：同じ名前の回答が既にあれば自動リンク
      if (!initialCheckDone.current && nameRef.current) {
        initialCheckDone.current = true
        const myEntry = entries.find((e) => e.name === nameRef.current)
        if (myEntry) {
          setEntryId(myEntry.id)
          setPageState('submitted')
        }
      }
    })
    return () => unsubscribe()
  }, [weekKey])

  const filledCount = TIME_SLOTS.filter((s) => slots[s.id] !== '').length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const unanswered = TIME_SLOTS.filter((s) => slots[s.id] === '')
    if (unanswered.length > 0) {
      setError('すべての時間帯を選んでください')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // 修正時は元のsubmittedAtを保持して行の位置を変えない
      const originalSubmittedAt = (pageState === 'editing' && entryId)
        ? (responses.find((r) => r.id === entryId)?.submittedAt ?? new Date().toISOString())
        : new Date().toISOString()
      const payload = { name, submittedAt: originalSubmittedAt, slots, memo: memo.trim() }
      if (pageState === 'editing' && entryId) {
        await update(ref(db, `kaatsu/responses/${weekKey}/${entryId}`), payload)
      } else {
        const result = await push(ref(db, `kaatsu/responses/${weekKey}`), payload)
        setEntryId(result.key!)
      }
      setPageState('submitted')
    } catch (err) {
      console.error(err)
      setError('送信に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = () => {
    const myEntry = responses.find((r) => r.id === entryId)
    if (myEntry) {
      const restored: Record<string, SlotAnswer> = {}
      TIME_SLOTS.forEach((s) => { restored[s.id] = (myEntry.slots[s.id] ?? '') as SlotAnswer })
      setSlots(restored)
      setMemo(myEntry.memo ?? '')
    }
    setPageState('editing')
    setError('')
  }

  const handleDelete = async () => {
    if (!entryId || !weekKey) return
    if (!window.confirm('回答を削除してよろしいですか？')) return
    try {
      await remove(ref(db, `kaatsu/responses/${weekKey}/${entryId}`))
      setEntryId(null)
      setPageState('input')
      setSlots(() => {
        const init: Record<string, SlotAnswer> = {}
        TIME_SLOTS.forEach((s) => { init[s.id] = '' })
        return init
      })
      setMemo('')
      initialCheckDone.current = false
    } catch (err) {
      console.error(err)
      setError('削除に失敗しました。もう一度お試しください。')
    }
  }

  const counts = TIME_SLOTS.map((slot) => ({
    slotId: slot.id,
    maru: responses.filter((r) => r.slots[slot.id] === '○').length,
    sankaku: responses.filter((r) => r.slots[slot.id] === '△').length,
    batu: responses.filter((r) => r.slots[slot.id] === '×').length,
  }))

  const weekLabel = weekKey ? formatWeekLabel(weekKey) : ''

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">💪 加圧トレーニング</h1>
            <p className="text-sm text-blue-600 font-semibold">{weekLabel}</p>
          </div>
          <p className="text-xl font-bold text-gray-700">
            {responses.length}<span className="text-xs font-normal text-gray-400 ml-1">名回答済み</span>
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 pt-4">
        {/* 凡例 */}
        <div className="flex gap-4 justify-center text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border-2 border-green-500" />参加する</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,11 1,11" stroke="#f59e0b" strokeWidth="1.5" fill="#fef3c7" /></svg>未定
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" /><line x1="10" y1="2" x2="2" y2="10" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" /></svg>参加しない
          </span>
        </div>

        {/* 参加者一覧テーブル */}
        <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ minWidth: '420px' }}>
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left px-3 py-2.5 text-gray-600 font-semibold text-xs w-28">参加者</th>
                  {TIME_SLOTS.map((slot) => (
                    <th key={slot.id} className="text-center px-1 py-2.5 text-gray-600 font-semibold text-xs min-w-[52px]">
                      {slot.id}〜
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr><td colSpan={TIME_SLOTS.length + 1} className="text-center py-8 text-gray-400 text-sm">まだ回答がありません</td></tr>
                ) : responses.map((r, idx) => (
                  <tr key={r.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} ${r.id === entryId ? 'ring-2 ring-inset ring-blue-300' : ''}`}>
                    <td className="px-3 py-1.5 align-top">
                      <div className="font-medium text-amber-600 text-sm leading-tight">{r.name}</div>
                      {r.memo && (
                        <div
                          className="text-gray-400 mt-0.5 leading-snug"
                          style={{
                            fontSize: '10px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            maxWidth: '96px',
                          }}
                        >
                          {r.memo}
                        </div>
                      )}
                    </td>
                    {TIME_SLOTS.map((slot) => {
                      const ans = (r.slots[slot.id] ?? '') as SlotAnswer | ''
                      return (
                        <td key={slot.id} className={`px-1 py-1 text-center align-middle ${SLOT_BG[ans]}`}>
                          <AnswerIcon answer={ans} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              {responses.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-blue-50">
                    <td className="px-3 py-2 text-xs font-bold text-blue-700">集計</td>
                    {counts.map((c) => (
                      <td key={c.slotId} className="px-1 py-2 text-center">
                        <div className="text-xs space-y-0.5">
                          <div className="text-green-600 font-bold">○{c.maru}</div>
                          <div className="text-amber-500 font-bold">△{c.sankaku}</div>
                          <div className="text-gray-400 font-bold">×{c.batu}</div>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 送信完了 */}
        {pageState === 'submitted' ? (
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-bold text-gray-800 mb-1">送信完了！</p>
            <p className="text-sm text-gray-500 mb-4">{name}さんの回答を受け付けました。</p>
            <div className="flex flex-col gap-2 items-center">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleEdit}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                >
                  ✏️ 回答を修正する
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-xl text-sm transition-colors"
                >
                  別の名前で入力
                </button>
              </div>
              <button
                onClick={handleDelete}
                className="px-5 py-2 text-red-400 hover:text-red-600 text-sm transition-colors"
              >
                🗑️ 回答を削除する
              </button>
            </div>
          </div>
        ) : (
          /* 入力フォーム（新規 or 修正） */
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className={`px-4 py-3 ${pageState === 'editing' ? 'bg-orange-500' : 'bg-blue-600'}`}>
              <p className="text-white font-bold text-sm">
                {pageState === 'editing' ? '✏️ ' : '📝 '}
                {name}さんの回答を{pageState === 'editing' ? '修正' : '入力'}してください
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '420px' }}>
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 text-gray-500 text-xs w-28">時間帯</th>
                      {TIME_SLOTS.map((slot) => (
                        <th key={slot.id} className="text-center px-1 py-2 text-gray-600 text-xs min-w-[52px]">
                          {slot.id}〜
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-4 text-xs text-gray-500 font-medium">回答</td>
                      {TIME_SLOTS.map((slot) => (
                        <td key={slot.id} className="px-1 py-4 text-center">
                          <select
                            value={slots[slot.id]}
                            onChange={(e) => setSlots((prev) => ({ ...prev, [slot.id]: e.target.value as SlotAnswer }))}
                            className={`w-12 border rounded-lg px-0.5 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-center appearance-none cursor-pointer ${
                              slots[slot.id] === '○' ? 'text-green-600 border-green-300 bg-green-50'
                              : slots[slot.id] === '△' ? 'text-amber-500 border-amber-300 bg-yellow-50'
                              : slots[slot.id] === '×' ? 'text-gray-400 border-gray-200 bg-white'
                              : 'text-gray-300 border-gray-200 bg-white'
                            }`}
                          >
                            <option value="" disabled>？</option>
                            <option value="○">○</option>
                            <option value="△">△</option>
                            <option value="×">×</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 備考欄 */}
              <div className="px-4 pb-2 pt-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">備考（任意）</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="例：19:00以降なら遅れます"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {filledCount < TIME_SLOTS.length && (
                <p className="text-center text-xs text-gray-400 pb-1">
                  あと {TIME_SLOTS.length - filledCount} 項目選択してください
                </p>
              )}
              {error && <p className="text-red-500 text-xs text-center pb-1">{error}</p>}

              <div className="px-4 pb-4 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-colors text-base ${
                    pageState === 'editing'
                      ? 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                  }`}
                >
                  {submitting ? '送信中...' : pageState === 'editing' ? '更新する ✓' : '送信する ✓'}
                </button>
                {pageState === 'editing' && (
                  <button
                    type="button"
                    onClick={() => setPageState('submitted')}
                    className="w-full mt-2 text-gray-400 text-sm py-2 hover:text-gray-600"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="text-center mt-5">
          <button onClick={() => router.push('/')} className="text-gray-400 text-xs hover:text-gray-600">
            ← 名前の入力に戻る
          </button>
        </div>
      </div>
    </main>
  )
}
