'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'

type News = { id: string; title: string; summary: string; url: string; source: string; category: string; tags: string[]; published_at: string; collected_at: string }
type Stream = { id: string; title: string; channel_name: string; platform: string; url: string; thumbnail: string; category: string; tags: string[]; is_live: boolean; started_at: string }
type Post = { id: string; title: string; content: string; url: string; community: string; views: number; comments: number; sentiment: string; sentiment_reason: string; keyword: string; posted_at: string; collected_at: string }

const COLORS: Record<string, string> = {
  '자사': '#3b82f6', '경쟁사': '#ef4444', '업계': '#22c55e',
  '드림에이지': '#1d4ed8', '아키텍트': '#3b82f6', '알케론': '#93c5fd',
  '포트나이트': '#b91c1c', '리그오브레전드': '#ef4444', '이터널리턴': '#f87171', '배틀그라운드': '#dc2626', '발로란트': '#fca5a5',
  '모바일게임': '#15803d', '콘솔게임': '#22c55e', '스팀': '#4ade80', '신작': '#86efac', '서비스종료': '#bbf7d0', 'PC게임': '#34d399', '사전예약': '#6ee7b7', '런칭': '#a7f3d0',
}
const SENTIMENT_COLORS: Record<string, string> = { '긍정': '#22c55e', '부정': '#ef4444', '중립': '#6b7280' }
const PLATFORM_COLORS: Record<string, string> = { '유튜브': '#ef4444', '치지직': '#3b82f6', 'SOOP': '#f59e0b' }
const COMMUNITY_COLORS: Record<string, string> = { '인벤': '#f59e0b', '루리웹': '#3b82f6', '디시인사이드': '#ef4444', '네이버카페': '#22c55e', '아카라이브': '#8b5cf6', '디스이즈게임': '#ec4899' }
const SEGMENTS: Record<string, string[]> = {
  '자사': ['드림에이지', '아키텍트', '알케론'],
  '경쟁사': ['포트나이트', '리그오브레전드', '이터널리턴', '배틀그라운드', '발로란트'],
  '업계': ['모바일게임', '콘솔게임', '스팀', '신작', '서비스종료', 'PC게임', '사전예약', '런칭'],
}
const SOURCE_TYPES = ['전체', '구글 뉴스', '네이버 뉴스', '네이버 블로그']
const SOURCE_MAP: Record<string, string> = { '구글 뉴스': 'Google News', '네이버 뉴스': '네이버 -', '네이버 블로그': '네이버블로그' }
const CAT_LABELS: Record<string, string> = { '자사': '🏢', '경쟁사': '⚔️', '업계': '🌐' }
const COMM_KEYWORDS: Record<string, string[]> = {
  '자사': ['알케론', 'arkheron', 'Arkheron'],
  '경쟁사': ['포트나이트', '이터널리턴', '배틀그라운드', '발로란트', '리그오브레전드'],
}

function getDateFilter(dateMode: string, selectedDate: string, rangeFrom: string, rangeTo: string) {
  if (dateMode === 'single') {
    return { from: selectedDate + 'T00:00:00', to: selectedDate + 'T23:59:59' }
  }
  return { from: rangeFrom + 'T00:00:00', to: rangeTo + 'T23:59:59' }
}

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() || ''
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'news' | 'streams' | 'community'>('news')
  const [news, setNews] = useState<News[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [segment, setSegment] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sourceType, setSourceType] = useState('전체')
  const [streamCategory, setStreamCategory] = useState('전체')
  const [streamPlatform, setStreamPlatform] = useState('전체')
  const [streamSearch, setStreamSearch] = useState('')
  const [streamType, setStreamType] = useState('전체')
  const [streamSegment, setStreamSegment] = useState('')
  const [commKeyword, setCommKeyword] = useState('자사')
  const [commSentiment, setCommSentiment] = useState('전체')
  const [commCommunity, setCommCommunity] = useState('전체')
  const [commSearch, setCommSearch] = useState('')
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rangeFrom, setRangeFrom] = useState(new Date().toISOString().split('T')[0])
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().split('T')[0])
  const [newsLimit, setNewsLimit] = useState(24)
  const [streamLimit, setStreamLimit] = useState(24)
  const [postLimit, setPostLimit] = useState(24)
  const newsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: newsData }, { data: streamData }, { data: postData }] = await Promise.all([
      supabase.from('news').select('*').order('published_at', { ascending: false }).limit(1000),
      supabase.from('streams').select('*').order('started_at', { ascending: false }).limit(500),
      supabase.from('community_posts').select('*').order('collected_at', { ascending: false }).limit(2000),
    ])
    setNews(newsData || [])
    setStreams(streamData || [])
    setPosts(postData || [])
    setLoading(false)
  }

  function handleClick(cat: string, seg?: string) {
    setCategory(cat); setSegment(seg || '')
    newsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const { from: newsFrom, to: newsTo } = getDateFilter(dateMode, selectedDate, rangeFrom, rangeTo)
  const filteredNews = news.filter(n => {
    const matchCat = category === '전체' || n.category === category
    const matchSeg = !segment || n.tags?.includes(segment) || n.title?.includes(segment)
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase())
    const matchSource = sourceType === '전체' || n.source?.includes(SOURCE_MAP[sourceType])
    const dateVal = n.published_at || n.collected_at || ''
    const matchDate = dateVal >= newsFrom && dateVal <= newsTo
    return matchCat && matchSeg && matchSearch && matchSource && matchDate
  })

  const { from: streamFrom, to: streamTo } = getDateFilter(dateMode, selectedDate, rangeFrom, rangeTo)
  const filteredStreams = streams.filter(s => {
    const matchCat = streamCategory === '전체' || s.category === streamCategory
    const matchPlatform = streamPlatform === '전체' || s.platform === streamPlatform
    const matchSearch = s.title?.toLowerCase().includes(streamSearch.toLowerCase()) || s.channel_name?.toLowerCase().includes(streamSearch.toLowerCase())
    const matchType = streamType === '전체' || (streamType === '생방송' && s.is_live) || (streamType === 'VOD' && !s.is_live)
    const matchSeg = !streamSegment || s.tags?.includes(streamSegment) || s.title?.includes(streamSegment)
    const dateVal = s.started_at || ''
    const matchDate = dateVal >= streamFrom && dateVal <= streamTo
    return matchCat && matchPlatform && matchSearch && matchType && matchSeg && matchDate
  })

  const currentKeywords = COMM_KEYWORDS[commKeyword] || []
  const keywordPosts = posts.filter(p => currentKeywords.some(kw => p.keyword === kw || p.title?.includes(kw)))

  const { from: postFrom, to: postTo } = getDateFilter(dateMode, selectedDate, rangeFrom, rangeTo)
  const filteredPosts = keywordPosts.filter(p => {
    const matchSentiment = commSentiment === '전체' || p.sentiment === commSentiment
    const matchCommunity = commCommunity === '전체' || p.community === commCommunity
    const matchSearch = p.title?.toLowerCase().includes(commSearch.toLowerCase())
    const dateVal = p.posted_at || p.collected_at || ''
    const matchDate = dateVal >= postFrom && dateVal <= postTo
    return matchSentiment && matchCommunity && matchSearch && matchDate
  })

  const categoryCount = ['자사', '경쟁사', '업계'].map(cat => ({
    name: cat, value: news.filter(n => n.category === cat).length,
    segments: SEGMENTS[cat].map(seg => ({ name: seg, value: news.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg))).length }))
  }))

  const segmentsByCategory = Object.entries(SEGMENTS).map(([cat, segs]) => ({
    cat, data: segs.map(seg => ({ name: seg, value: news.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg))).length }))
  }))

  const streamPlatformCount = ['유튜브', '치지직', 'SOOP'].map(p => ({ name: p, value: streams.filter(s => s.platform === p).length }))
  const streamCategoryCount = ['자사', '경쟁사', '업계'].map(cat => ({ name: cat, value: streams.filter(s => s.category === cat).length }))
  const liveCount = streams.filter(s => s.is_live).length

  const sentimentCount = ['긍정', '부정', '중립'].map(s => ({ name: s, value: keywordPosts.filter(p => p.sentiment === s).length }))
  const communityCount = Object.keys(COMMUNITY_COLORS).map(c => ({ name: c, value: keywordPosts.filter(p => p.community === c).length })).filter(c => c.value > 0)

  const dailyTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    const dayPosts = keywordPosts.filter(p => p.collected_at?.startsWith(dateStr))
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      전체: dayPosts.length,
      긍정: dayPosts.filter(p => p.sentiment === '긍정').length,
      부정: dayPosts.filter(p => p.sentiment === '부정').length,
      중립: dayPosts.filter(p => p.sentiment === '중립').length,
    }
  })

  const keywordBreakdown = currentKeywords.map(kw => ({
    name: kw,
    value: posts.filter(p => p.keyword === kw || p.title?.includes(kw)).length
  })).filter(k => k.value > 0)

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">업계 동향 모니터링</h1>
          <p className="text-gray-400 text-sm">게임 업계 주요 정보를 매일 자동 수집합니다</p>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('news')} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'news' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>📰 뉴스 · 블로그</button>
          <button onClick={() => setActiveTab('streams')} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'streams' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>🎥 방송 · 영상</button>
          <button onClick={() => setActiveTab('community')} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'community' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>💬 커뮤니티 리포트</button>
        </div>

        {/* 날짜 필터 */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-800 p-4 rounded-2xl border border-gray-700">
          <div className="flex gap-1 bg-gray-700 p-1 rounded-lg">
            <button onClick={() => setDateMode('single')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateMode === 'single' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>📅 날짜 선택</button>
            <button onClick={() => setDateMode('range')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateMode === 'range' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>📆 기간 선택</button>
          </div>
          <div className="flex gap-1">
            {[{label:'오늘', days:0},{label:'3일간', days:3},{label:'7일간', days:7}].map(({label, days}) => {
              const today = new Date().toISOString().split('T')[0];
              const d = new Date(); d.setDate(d.getDate() - days);
              const dateStr = d.toISOString().split('T')[0];
              return (
                <button key={label} onClick={() => {
                  if (days === 0) {
                    setDateMode('single'); setSelectedDate(today);
                  } else {
                    setDateMode('range'); setRangeFrom(dateStr); setRangeTo(today);
                  }
                }} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors">{label}</button>
              )
            })}
          </div>
          {dateMode === 'single' ? (
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 text-sm" />
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 text-sm" />
              <span className="text-gray-500">~</span>
              <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 text-sm" />
            </div>
          )}
          <span className="text-xs text-gray-500 ml-auto">{dateMode === 'single' ? selectedDate : `${rangeFrom} ~ ${rangeTo}`}</span>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-40">불러오는 중...</div>
        ) : activeTab === 'news' ? (
          <>
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
                          <span className="text-xs text-gray-300 group-hover:text-white">{seg.name}</span>
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

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">카테고리 비율</h2>
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
                <h2 className="text-sm font-semibold text-gray-400 mb-3">세그먼트별 뉴스량</h2>
                <div className="space-y-3 overflow-y-auto max-h-52">
                  {segmentsByCategory.map(({ cat, data }) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold mb-1" style={{ color: COLORS[cat] }}>{CAT_LABELS[cat]} {cat}</p>
                      <ResponsiveContainer width="100%" height={data.length * 24}>
                        <BarChart data={data} layout="vertical" onClick={(d: any) => { if (d?.activeLabel) handleClick(cat, d.activeLabel) }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
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
                {(search || segment || sourceType !== '전체') && (
                  <button onClick={() => { setSearch(''); setSegment(''); setSourceType('전체') }} className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">초기화</button>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-3">{filteredNews.length}건 표시 중</p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {filteredNews.slice(0, newsLimit).map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: COLORS[item.category] + '33', color: COLORS[item.category] }}>{item.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">{item.source?.includes('Google News') ? '구글' : item.source?.includes('네이버블로그') ? 'N블로그' : item.source?.includes('네이버') ? 'N뉴스' : item.source?.replace('Google News - ', '').replace('네이버 - ', '').replace('네이버블로그 - ', '')}</span>
                    <span className="text-xs text-gray-500 ml-auto">{item.published_at ? new Date(item.published_at).toLocaleDateString('ko-KR') : ''}</span>
                  </div>
                  <h2 className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">{item.title}</h2>
                  {item.summary && <p className="text-gray-500 text-xs line-clamp-2">{stripHtml(item.summary)}</p>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (COLORS[tag] || '#374151') + '44', color: COLORS[tag] || '#9ca3af' }}>#{tag}</span>)}
                    </div>
                  )}
                </a>
              ))}
            </div>
            {filteredNews.length > newsLimit && (
              <button onClick={() => setNewsLimit(prev => prev + 24)} className="w-full mt-4 py-3 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700 transition-colors border border-gray-700">
                더보기 ({filteredNews.length - newsLimit}개 남음)
              </button>
            )}
          </>
        ) : activeTab === 'streams' ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">🔴 현재 라이브</p>
                <p className="text-3xl font-bold text-red-400">{liveCount}건</p>
              </div>
              {streamPlatformCount.map(p => (
                <div key={p.name} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-1">{p.name}</p>
                  <p className="text-3xl font-bold" style={{ color: PLATFORM_COLORS[p.name] }}>{p.value}건</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">플랫폼별 비율</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={streamPlatformCount} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}`} onClick={(d: any) => setStreamPlatform(d.name)} style={{ cursor: 'pointer' }}>
                      {streamPlatformCount.map((entry) => <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">카테고리별 비율</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={streamCategoryCount} onClick={(d: any) => { if (d?.activeLabel) { setStreamCategory(d.activeLabel); setStreamSegment('') }}}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {streamCategoryCount.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="text-xs text-gray-500 self-center">카테고리</span>
                {['전체', '자사', '경쟁사', '업계'].map(cat => (
                  <button key={cat} onClick={() => { setStreamCategory(cat); setStreamSegment('') }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${streamCategory === cat && !streamSegment ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat}</button>
                ))}
              </div>
              {streamCategory !== '전체' && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="text-xs text-gray-500 self-center">세그먼트</span>
                  {SEGMENTS[streamCategory]?.map(seg => (
                    <button key={seg} onClick={() => setStreamSegment(seg === streamSegment ? '' : seg)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${streamSegment === seg ? 'text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={streamSegment === seg ? { backgroundColor: COLORS[seg] } : {}}>{seg}</button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="text-xs text-gray-500 self-center">플랫폼</span>
                {['전체', '유튜브', '치지직', 'SOOP'].map(p => (
                  <button key={p} onClick={() => setStreamPlatform(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${streamPlatform === p ? 'text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={streamPlatform === p && p !== '전체' ? { backgroundColor: PLATFORM_COLORS[p] } : streamPlatform === p ? { backgroundColor: '#374151', color: 'white' } : {}}>{p}</button>
                ))}
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-xs text-gray-500 self-center">유형</span>
                {['전체', '생방송', 'VOD'].map(t => (
                  <button key={t} onClick={() => setStreamType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${streamType === t ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{t === '생방송' ? '🔴 생방송' : t}</button>
                ))}
              </div>
              <input type="text" placeholder="채널명 또는 제목 검색..." value={streamSearch} onChange={e => setStreamSearch(e.target.value)} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 text-sm" />
              <p className="text-gray-500 text-xs mt-3">{filteredStreams.length}건 표시 중</p>
            </div>

            <div className="grid grid-cols-6 gap-3">
              {filteredStreams.slice(0, streamLimit).map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="relative">
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" className="w-full h-32 object-cover" />
                      : <div className="w-full h-32 bg-gray-700 flex items-center justify-center"><span className="text-gray-500 text-xs">No Image</span></div>
                    }
                    {item.is_live && <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium animate-pulse">🔴 LIVE</span>}
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}>{item.platform}</span>
                  </div>
                  <div className="p-3">
                    <h2 className="text-white text-xs font-medium leading-snug mb-1 line-clamp-2">{item.title}</h2>
                    <p className="text-gray-500 text-xs">{item.channel_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: COLORS[item.category] + '33', color: COLORS[item.category] }}>{item.category}</span>
                      <span className="text-xs text-gray-600">{item.started_at ? new Date(item.started_at).toLocaleDateString('ko-KR') : ''}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {filteredStreams.length > streamLimit && (
              <button onClick={() => setStreamLimit(prev => prev + 24)} className="w-full mt-4 py-3 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700 transition-colors border border-gray-700">
                더보기 ({filteredStreams.length - streamLimit}개 남음)
              </button>
            )}
          </>
        ) : (
          <>
            {/* 커뮤니티 리포트 탭 */}
            <div className="flex gap-2 mb-6">
              {Object.keys(COMM_KEYWORDS).map(kw => (
                <button key={kw} onClick={() => { setCommKeyword(kw); setCommSentiment('전체'); setCommCommunity('전체') }} className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors border ${commKeyword === kw ? 'border-transparent text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`} style={commKeyword === kw ? { backgroundColor: kw === '자사' ? '#1d4ed8' : '#b91c1c' } : {}}>
                  {kw === '자사' ? '🏢 자사 (알케론)' : '⚔️ 경쟁작'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">💬 총 언급</p>
                <p className="text-3xl font-bold text-white">{keywordPosts.length}건</p>
              </div>
              {sentimentCount.map(s => (
                <div key={s.name} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-1">{s.name === '긍정' ? '😊' : s.name === '부정' ? '😠' : '😐'} {s.name}</p>
                  <p className="text-3xl font-bold" style={{ color: SENTIMENT_COLORS[s.name] }}>{s.value}건</p>
                  <p className="text-xs text-gray-500 mt-1">{keywordPosts.length > 0 ? Math.round(s.value / keywordPosts.length * 100) : 0}%</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">감성 비율</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sentimentCount} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} ${value}`} onClick={(d: any) => setCommSentiment(d.name)} style={{ cursor: 'pointer' }}>
                      {sentimentCount.map((entry) => <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">커뮤니티별 언급량</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={communityCount} onClick={(d: any) => { if (d?.activeLabel) setCommCommunity(d.activeLabel) }}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {communityCount.map((entry) => <Cell key={entry.name} fill={COMMUNITY_COLORS[entry.name] || '#6b7280'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">키워드별 언급량</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={keywordBreakdown} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">📈 일별 언급량 추이 (7일)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="전체" stroke="#ffffff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="긍정" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="부정" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="중립" stroke="#6b7280" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="text-xs text-gray-500 self-center">감성</span>
                {['전체', '긍정', '부정', '중립'].map(s => (
                  <button key={s} onClick={() => setCommSentiment(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${commSentiment === s ? 'text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={commSentiment === s && s !== '전체' ? { backgroundColor: SENTIMENT_COLORS[s] } : commSentiment === s ? { backgroundColor: '#374151', color: 'white' } : {}}>{s}</button>
                ))}
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-xs text-gray-500 self-center">커뮤니티</span>
                {['전체', ...Object.keys(COMMUNITY_COLORS)].map(c => (
                  <button key={c} onClick={() => setCommCommunity(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${commCommunity === c ? 'text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={commCommunity === c && c !== '전체' ? { backgroundColor: COMMUNITY_COLORS[c] } : commCommunity === c ? { backgroundColor: '#374151', color: 'white' } : {}}>{c}</button>
                ))}
              </div>
              <input type="text" placeholder="게시글 검색..." value={commSearch} onChange={e => setCommSearch(e.target.value)} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 text-sm" />
              <p className="text-gray-500 text-xs mt-3">{filteredPosts.length}건 표시 중</p>
            </div>

            <div className="space-y-3">
              {filteredPosts.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: SENTIMENT_COLORS[item.sentiment] }}>{item.sentiment === '긍정' ? '😊' : item.sentiment === '부정' ? '😠' : '😐'} {item.sentiment}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: (COMMUNITY_COLORS[item.community] || '#6b7280') + '33', color: COMMUNITY_COLORS[item.community] || '#9ca3af' }}>{item.community}</span>
                        <span className="text-xs text-gray-500">{item.keyword}</span>
                        {item.views > 0 && <span className="text-xs text-gray-500">👀 {item.views.toLocaleString()}</span>}
                        {item.comments > 0 && <span className="text-xs text-gray-500">💬 {item.comments.toLocaleString()}</span>}
                      </div>
                      <h2 className="text-white font-medium leading-snug mb-1">{item.title}</h2>
                      {item.sentiment_reason && <p className="text-gray-500 text-xs">분석: {item.sentiment_reason}</p>}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{item.posted_at ? new Date(item.posted_at).toLocaleDateString('ko-KR') : ''}</div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
