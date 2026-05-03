'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type News = { id: string; title: string; summary: string; url: string; source: string; category: string; tags: string[]; published_at: string; collected_at: string }

const COLORS: Record<string, string> = {
  '자사': '#3b82f6', '경쟁사': '#ef4444', '업계': '#22c55e',
  '드림에이지': '#1d4ed8', '아키텍트': '#3b82f6', '알케론': '#93c5fd',
  '포트나이트': '#b91c1c', '리그오브레전드': '#ef4444', '이터널리턴': '#f87171', '배틀그라운드': '#dc2626', '발로란트': '#fca5a5',
  '모바일게임': '#15803d', '콘솔게임': '#22c55e', '스팀': '#4ade80', '신작': '#86efac', '서비스종료': '#bbf7d0',
}

const SEGMENTS: Record<string, string[]> = {
  '자사': ['드림에이지', '아키텍트', '알케론'],
  '경쟁사': ['포트나이트', '리그오브레전드', '이터널리턴', '배틀그라운드', '발로란트'],
  '업계': ['모바일게임', '콘솔게임', '스팀', '신작', '서비스종료', 'PC게임', '사전예약', '런칭'],
}

const SOURCE_TYPES = ['전체', '구글 뉴스', '네이버 뉴스', '네이버 블로그']
const SOURCE_MAP: Record<string, string> = {
  '구글 뉴스': 'Google News',
  '네이버 뉴스': '네이버 -',
  '네이버 블로그': '네이버블로그',
}

const CAT_LABELS: Record<string, string> = { '자사': '🏢', '경쟁사': '⚔️', '업계': '🌐' }

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() || ''
}

export default function Home() {
  const [news, setNews] = useState<News[]>([])
  const [category, setCategory] = useState('전체')
  const [segment, setSegment] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sourceType, setSourceType] = useState('전체')
  const newsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchNews() }, [])

  async function fetchNews() {
    setLoading(true)
    const { data } = await supabase.from('news').select('*').order('published_at', { ascending: false }).limit(500)
    setNews(data || [])
    setLoading(false)
  }

  function handleClick(cat: string, seg?: string) {
    setCategory(cat)
    setSegment(seg || '')
    newsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filtered = news.filter(n => {
    const matchCat = category === '전체' || n.category === category
    const matchSeg = !segment || n.tags?.includes(segment) || n.title?.includes(segment)
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase())
    const matchFrom = !dateFrom || new Date(n.published_at) >= new Date(dateFrom)
    const matchTo = !dateTo || new Date(n.published_at) <= new Date(dateTo + 'T23:59:59')
    const matchSource = sourceType === '전체' || n.source?.includes(SOURCE_MAP[sourceType])
    return matchCat && matchSeg && matchSearch && matchFrom && matchTo && matchSource
  })

  const categoryCount = ['자사', '경쟁사', '업계'].map(cat => ({
    name: cat,
    value: news.filter(n => n.category === cat).length,
    segments: SEGMENTS[cat].map(seg => ({
      name: seg,
      value: news.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg) || (seg === '스팀' && (n.title?.includes('STEAM') || n.tags?.includes('STEAM'))))).length
    }))
  }))

  const segmentsByCategory = Object.entries(SEGMENTS).map(([cat, segs]) => ({
    cat,
    data: segs.map(seg => ({
      name: seg,
      value: news.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg) || (seg === '스팀' && (n.title?.includes('STEAM') || n.tags?.includes('STEAM'))))).length
    }))
  }))

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">업계 동향 모니터링</h1>
          <p className="text-gray-400 text-sm">게임 업계 주요 뉴스를 매일 자동 수집합니다 · 총 {news.length}건</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-40">불러오는 중...</div>
        ) : (
          <>
            {/* 상단 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {categoryCount.map(c => (
                <div key={c.name} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                  <button onClick={() => handleClick(c.name)} className="w-full text-left mb-3 group">
                    <p className="text-gray-400 text-sm mb-1">{CAT_LABELS[c.name]} {c.name}</p>
                    <p className="text-3xl font-bold group-hover:opacity-80 transition-opacity" style={{ color: COLORS[c.name] }}>{c.value}건</p>
                  </button>
                  <div className="space-y-1.5 border-t border-gray-700 pt-3">
                    {c.segments.map(seg => (
                      <button key={seg.name} onClick={() => handleClick(c.name, seg.name)} className="w-full flex items-center justify-between hover:bg-gray-700 rounded-lg px-2 py-1 transition-colors group">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[seg.name] }}></div>
                          <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{seg.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.max(8, (seg.value / Math.max(c.value, 1)) * 60)}px`, backgroundColor: COLORS[seg.name] + '88' }}></div>
                          <span className="text-xs font-medium" style={{ color: COLORS[seg.name] }}>{seg.value}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 카테고리 비율 + 세그먼트별 3개 그래프 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">카테고리 비율 (클릭 → 해당 뉴스)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryCount} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}`} onClick={(d: any) => handleClick(d.name)} style={{ cursor: 'pointer' }}>
                      {categoryCount.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">세그먼트별 뉴스량 (클릭 → 해당 뉴스)</h2>
                <div className="space-y-4">
                  {segmentsByCategory.map(({ cat, data }) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold mb-1" style={{ color: COLORS[cat] }}>{CAT_LABELS[cat]} {cat}</p>
                      <ResponsiveContainer width="100%" height={data.length * 28}>
                        <BarChart data={data} layout="vertical" onClick={(d) => { if (d?.activeLabel) handleClick(cat, d.activeLabel) }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}>
                            {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 필터 */}
            <div ref={newsRef} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="flex gap-2 flex-wrap">
                  {['전체', '자사', '경쟁사', '업계'].map(cat => (
                    <button key={cat} onClick={() => { setCategory(cat); setSegment('') }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat && !segment ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat}</button>
                  ))}
                </div>
                {category !== '전체' && (
                  <div className="flex gap-2 flex-wrap">
                    {SEGMENTS[category]?.map(seg => (
                      <button key={seg} onClick={() => setSegment(seg === segment ? '' : seg)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${segment === seg ? 'text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={segment === seg ? { backgroundColor: COLORS[seg] } : {}}>{seg}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {SOURCE_TYPES.map(st => (
                  <button key={st} onClick={() => setSourceType(st)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceType === st ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{st}</button>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="뉴스 검색..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48 bg-gray-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 text-sm" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 text-sm" />
                <span className="text-gray-500 self-center">~</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 text-sm" />
                {(dateFrom || dateTo || search || segment || sourceType !== '전체') && (
                  <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setSegment(''); setSourceType('전체') }} className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">초기화</button>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-3">{filtered.length}건 표시 중</p>
            </div>

            {/* 뉴스 목록 */}
            <div className="space-y-3">
              {filtered.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: COLORS[item.category] + '33', color: COLORS[item.category] }}>{item.category}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                          {item.source?.includes('Google News') ? '구글 뉴스' : item.source?.includes('네이버블로그') ? '네이버 블로그' : item.source?.includes('네이버') ? '네이버 뉴스' : item.source}
                        </span>
                        <span className="text-xs text-gray-500">{item.source?.replace('Google News - ', '').replace('네이버 - ', '').replace('네이버블로그 - ', '')}</span>
                      </div>
                      <h2 className="text-white font-medium leading-snug mb-1">{item.title}</h2>
                      {item.summary && <p className="text-gray-400 text-sm line-clamp-2">{stripHtml(item.summary)}</p>}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{item.published_at ? new Date(item.published_at).toLocaleDateString('ko-KR') : ''}</div>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (COLORS[tag] || '#374151') + '44', color: COLORS[tag] || '#9ca3af' }}>#{tag}</span>)}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
