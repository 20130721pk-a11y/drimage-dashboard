'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts'

type NewsKeyword = { keyword: string; category: string; count: number }
type News = { id: string; title: string; summary: string; url: string; source: string; category: string; tags: string[]; published_at: string; collected_at: string }
type Stream = { id: string; title: string; channel_name: string; platform: string; url: string; thumbnail: string; category: string; tags: string[]; is_live: boolean; started_at: string; viewer_count: number }
type Post = { id: string; title: string; content: string; url: string; community: string; views: number; comments: number; sentiment: string; sentiment_reason: string; keyword: string; posted_at: string; collected_at: string }

const COLORS: Record<string, string> = {
  '자사': '#6366f1', '경쟁사': '#ef4444', '업계': '#10b981',
  '드림에이지': '#4f46e5', '아키텍트': '#6366f1', '알케론': '#a5b4fc',
  '포트나이트': '#b91c1c', '리그오브레전드': '#ef4444', '이터널리턴': '#f87171', '배틀그라운드': '#dc2626', '발로란트': '#fca5a5',
  '모바일게임': '#059669', '콘솔게임': '#10b981', '스팀': '#34d399', '신작': '#6ee7b7', '서비스종료': '#a7f3d0', 'PC게임': '#34d399', '사전예약': '#6ee7b7', '런칭': '#a7f3d0',
}
const SENTIMENT_COLORS: Record<string, string> = { '긍정': '#10b981', '부정': '#ef4444', '중립': '#6b7280' }
const PLATFORM_COLORS: Record<string, string> = { '유튜브': '#ef4444', '치지직': '#6366f1', 'SOOP': '#f59e0b' }
const PLATFORM_ICONS: Record<string, string> = {
  '유튜브': '<svg viewBox="0 0 24 24" fill="#ef4444"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>',
  '치지직': '<svg viewBox="0 0 24 24" fill="#6366f1"><path d="M4 3h16v13l-8 5-8-5V3zm4 4v5l4 2.5L16 12V7H8z"/></svg>',
  'SOOP': '<svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
}

const COMMUNITY_COLORS: Record<string, string> = { '인벤': '#f59e0b', '루리웹': '#6366f1', '디시인사이드': '#ef4444', '네이버카페': '#10b981', '아카라이브': '#8b5cf6', '디스이즈게임': '#ec4899' }
const SEGMENTS: Record<string, string[]> = {
  '자사': ['드림에이지', '아키텍트', '알케론'],
  '경쟁사': ['포트나이트', '리그오브레전드', '이터널리턴', '배틀그라운드', '발로란트'],
  '업계': ['모바일게임', '콘솔게임', '스팀', '신작', '서비스종료', 'PC게임', '사전예약', '런칭'],
}
const SOURCE_MAP: Record<string, string> = { '구글 뉴스': 'Google News', '네이버 뉴스': '네이버 -', '네이버 블로그': '네이버블로그' }
const COMM_KEYWORDS: Record<string, string[]> = {
  '자사': ['알케론', 'arkheron', 'Arkheron'],
  '경쟁사': ['포트나이트', '이터널리턴', '배틀그라운드', '발로란트', '리그오브레전드'],
}

function WordCloud({ words, onWordClick, selectedWord }: { words: {name: string, count: number, cat: string}[], onWordClick?: (word: string) => void, selectedWord?: string }) {
  if (!words.length) return null
  const maxCount = words[0]?.count || 1
  const width = 500
  const height = 220
  const placed: {x:number,y:number,w:number,h:number}[] = []

  function overlaps(a: {x:number,y:number,w:number,h:number}, b: {x:number,y:number,w:number,h:number}) {
    return !(a.x + a.w/2 < b.x - b.w/2 || a.x - a.w/2 > b.x + b.w/2 || a.y + a.h/2 < b.y - b.h/2 || a.y - a.h/2 > b.y + b.h/2)
  }

  const items = words.slice(0, 25).map((kw, i) => {
    const size = Math.max(11, Math.round(11 + (kw.count / maxCount) * 22))
    const text = kw.name
    const w = text.length * size * 0.65 + 16
    const h = size + 12
    const color = ({"자사":"#a5b4fc","경쟁사":"#fca5a5","업계":"#6ee7b7"} as any)[kw.cat] || '#94a3b8'
    let x = 0, y = 0, found = false
    const cx = width / 2, cy = height / 2
    for (let r = 0; r < 200; r += 3) {
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        const tx = cx + r * Math.cos(a + i * 0.5)
        const ty = cy + r * Math.sin(a + i * 0.5) * 0.6
        if (tx - w/2 < 4 || tx + w/2 > width - 4 || ty - h/2 < 4 || ty + h/2 > height - 4) continue
        const box = {x:tx, y:ty, w, h}
        if (!placed.some(p => overlaps(p, box))) {
          x = tx; y = ty; found = true; placed.push(box); break
        }
      }
      if (found) break
    }
    if (!found) return null
    return { text, x, y, size, color, kw }
  }).filter(Boolean)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{overflow:'visible'}}>
      {items.map((item: any, i: number) => (
        <g key={item.kw.name} className="cursor-pointer" style={{transition:'opacity 0.2s'}} onClick={() => onWordClick?.(item.kw.name)} >
          <rect x={item.x - item.size * item.text.length * 0.32 - 8} y={item.y - item.size/2 - 5} width={item.text.length * item.size * 0.65 + 16} height={item.size + 10} rx="4" fill={selectedWord === item.kw.name ? item.color + '44' : item.color + '22'} stroke={selectedWord === item.kw.name ? item.color : 'none'} strokeWidth="1.5" />
          <text x={item.x} y={item.y + item.size * 0.35} textAnchor="middle" fontSize={item.size} fontWeight={item.count === words[0]?.count ? 700 : item.count > words[0]?.count * 0.5 ? 600 : 400} fill={item.color} fontFamily="system-ui, sans-serif">
            {item.text}
          </text>
        </g>
      ))}
    </svg>
  )
}

function stripHtml(html: string) {
  return html?.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() || ''
}
function getDateFilter(dateMode: string, selectedDate: string, rangeFrom: string, rangeTo: string) {
  if (dateMode === 'single') return { from: selectedDate + 'T00:00:00', to: selectedDate + 'T23:59:59' }
  return { from: rangeFrom + 'T00:00:00', to: rangeTo + 'T23:59:59' }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'news' | 'streams' | 'community'>('news')
  const [news, setNews] = useState<News[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rangeFrom, setRangeFrom] = useState(new Date().toISOString().split('T')[0])
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('전체')
  const [segment, setSegment] = useState('')
  const [search, setSearch] = useState('')
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
  const [newsLimit, setNewsLimit] = useState(24)
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [keywordNewsMap, setKeywordNewsMap] = useState<Record<string, string[]>>({})
  const [streamLimit, setStreamLimit] = useState(24)
  const [postLimit, setPostLimit] = useState(24)
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')
  const [selectedStreamKeyword, setSelectedStreamKeyword] = useState<string>('')
  const [selectedCommKeyword, setSelectedCommKeyword] = useState<string>('')
  const [channelSort, setChannelSort] = useState<'count'|'viewers'>('count')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAll() }, [])
  // 날짜 변경 시 또는 초기 로딩 완료 시 키워드 재조회
  useEffect(() => { fetchKeywords(df, dt) }, [dateMode, selectedDate, rangeFrom, rangeTo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!loading) fetchKeywords(df, dt) }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true)
    const [{ data: n }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('news').select('*').order('published_at', { ascending: false }).limit(1000),
      supabase.from('streams').select('*').order('started_at', { ascending: false }).limit(500),
      supabase.from('community_posts').select('*').order('collected_at', { ascending: false }).limit(2000),
    ])
    setNews(n || [])
    setStreams(s || [])
    setPosts(p || [])
    setLoading(false)
  }

  // 선택한 날짜 범위의 키워드만 조회 - 날짜 변경 시 재호출됨
  async function fetchKeywords(from: string, to: string) {
    const { data: kw } = await supabase
      .from('news_keywords')
      .select('news_id, keyword, category')
      .gte('collected_at', from)
      .lte('collected_at', to)
      .order('collected_at', { ascending: false })
      .limit(5000)
    const kwFreq: Record<string, {count:number, cat:string}> = {}
    const kwNewsMap: Record<string, string[]> = {}
    ;(kw || []).forEach((r: any) => {
      if (!kwFreq[r.keyword]) kwFreq[r.keyword] = { count: 0, cat: r.category }
      kwFreq[r.keyword].count++
      if (r.news_id) {
        if (!kwNewsMap[r.keyword]) kwNewsMap[r.keyword] = []
        if (!kwNewsMap[r.keyword].includes(r.news_id)) kwNewsMap[r.keyword].push(r.news_id)
      }
    })
    setNewsKeywords(Object.entries(kwFreq).map(([keyword, {count, cat}]) => ({ keyword, count, category: cat })).sort((a,b) => b.count - a.count))
    setKeywordNewsMap(kwNewsMap)
  }

  function scrollToList() {
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function handleNewsClick(cat: string, seg?: string) {
    setCategory(cat); setSegment(seg || ''); setActiveTab('news'); scrollToList()
  }
  function handleStreamClick(cat?: string, platform?: string) {
    if (cat) setStreamCategory(cat)
    if (platform) setStreamPlatform(platform)
    setActiveTab('streams'); scrollToList()
  }
  function handleCommClick(sentiment?: string, community?: string) {
    if (sentiment) setCommSentiment(sentiment)
    if (community) setCommCommunity(community)
    setActiveTab('community'); scrollToList()
  }

  const { from: df, to: dt } = getDateFilter(dateMode, selectedDate, rangeFrom, rangeTo)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const filteredNews = useMemo(() => news.filter(n => {
    const matchCat = category === '전체' || n.category === category
    const matchSeg = !segment || n.tags?.includes(segment) || n.title?.includes(segment)
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase())
    const matchSource = sourceType === '전체' || n.source?.includes(SOURCE_MAP[sourceType])
    const matchKeyword = !selectedKeyword || (keywordNewsMap[selectedKeyword] ? keywordNewsMap[selectedKeyword].includes(n.id) : n.title?.includes(selectedKeyword) || n.summary?.includes(selectedKeyword) || n.tags?.includes(selectedKeyword))
    const dateVal = n.published_at || n.collected_at || ''
    return matchCat && matchSeg && matchSearch && matchSource && matchKeyword && dateVal >= df && dateVal <= dt
  }), [news, category, segment, search, sourceType, selectedKeyword, df, dt])

  const filteredStreams = useMemo(() => streams.filter(s => {
    const matchCat = streamCategory === '전체' || s.category === streamCategory
    const matchPlatform = streamPlatform === '전체' || s.platform === streamPlatform
    const matchSearch = s.title?.toLowerCase().includes(streamSearch.toLowerCase()) || s.channel_name?.toLowerCase().includes(streamSearch.toLowerCase())
    const matchType = streamType === '전체' || (streamType === '생방송' && s.is_live) || (streamType === 'VOD' && !s.is_live)
    const matchSeg = !streamSegment || s.tags?.includes(streamSegment) || s.title?.includes(streamSegment)
    const matchStreamKw = !selectedStreamKeyword || s.tags?.includes(selectedStreamKeyword) || s.title?.includes(selectedStreamKeyword)
    const dateVal = s.started_at || ''
    const matchDate = s.is_live || (dateVal >= df && dateVal <= dt)
    return matchCat && matchPlatform && matchSearch && matchType && matchSeg && matchDate && matchStreamKw
  }), [streams, streamCategory, streamPlatform, streamSearch, streamType, streamSegment, df, dt, selectedStreamKeyword])

  const currentKeywords = COMM_KEYWORDS[commKeyword] || []
  const keywordPosts = posts.filter(p => currentKeywords.some(kw => p.keyword === kw || p.title?.includes(kw)))
  const filteredPosts = useMemo(() => keywordPosts.filter(p => {
    const matchSentiment = commSentiment === '전체' || p.sentiment === commSentiment
    const matchCommunity = commCommunity === '전체' || p.community === commCommunity
    const matchSearch = p.title?.toLowerCase().includes(commSearch.toLowerCase())
    const matchCommKw = !selectedCommKeyword || p.title?.includes(selectedCommKeyword) || p.content?.includes(selectedCommKeyword)
    const dateVal = p.posted_at || p.collected_at || ''
    return matchSentiment && matchCommunity && matchSearch && matchCommKw && dateVal >= df && dateVal <= dt
  }), [keywordPosts, commSentiment, commCommunity, commSearch, df, dt, selectedCommKeyword])

  // 뉴스 통계 - 모두 filteredNews 기준으로 통일
  const yestFrom = yesterday + 'T00:00:00'
  const yestTo = yesterday + 'T23:59:59'
  const newsCatCount = ['자사', '경쟁사', '업계'].map(cat => {
    const periodCnt = filteredNews.filter(n => n.category === cat).length
    const yestCnt = news.filter(n => {
      if (n.category !== cat) return false
      const dv = n.published_at || n.collected_at || ''
      return dv >= yestFrom && dv <= yestTo
    }).length
    return {
      name: cat,
      total: news.filter(n => n.category === cat).length,
      todayCnt: periodCnt,
      diff: periodCnt - yestCnt,
      segments: SEGMENTS[cat].map(seg => ({
        name: seg,
        value: filteredNews.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg))).length
      }))
    }
  })
  const newsSegData = Object.entries(SEGMENTS).flatMap(([cat, segs]) => segs.map(seg => ({
    name: seg,
    value: filteredNews.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg))).length,
    cat
  })))
  const news7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return { date: `${d.getMonth()+1}/${d.getDate()}`, count: news.filter(n => (n.collected_at||'').startsWith(ds)).length }
  })

  // 키워드 빈도 분석 - filteredNews 기준 (소스명/커뮤니티명 제외)
  // 세그먼트 선택 시 filteredNews 제목 기반으로 키워드 추출
  const keywordFreq = (() => {
    if (segment) {
      // 세그먼트 선택 시 해당 뉴스 제목에서 키워드 직접 추출
      const segNews = filteredNews
      const freq: Record<string, number> = {}
      segNews.forEach(n => {
        (n.tags || []).forEach(tag => {
          if (tag.length >= 2 && tag !== segment) {
            freq[tag] = (freq[tag] || 0) + 1
          }
        })
      })
      return Object.entries(freq)
        .map(([name, count]) => ({ name, count, cat: category }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)
    }
    return newsKeywords
      .filter(k => category === '전체' || k.category === category)
      .slice(0, 30)
      .map(k => ({ name: k.keyword, count: k.count, cat: k.category }))
  })()

  // 소스별 비중 - filteredNews 기준
  const sourceFreq = (() => {
    const freq: Record<string, number> = {}
    filteredNews.forEach(n => {
      const src = n.source?.includes('Google News') ? '구글 뉴스'
        : n.source?.includes('네이버블로그') ? '네이버 블로그'
        : n.source?.includes('네이버') ? '네이버 뉴스'
        : n.source?.includes('루리웹') ? '루리웹'
        : n.source?.includes('인벤') ? '인벤'
        : '기타'
      freq[src] = (freq[src] || 0) + 1
    })
    return Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  })()

  // 소스별 상세 분포
  const sourceDetail = (() => {
    const freq: Record<string, number> = {}
    filteredNews.forEach(n => {
      const src = n.source?.includes('Google News') ? '구글 뉴스'
        : n.source?.includes('네이버블로그') ? '네이버 블로그'
        : n.source?.includes('네이버') ? '네이버 뉴스'
        : '기타'
      freq[src] = (freq[src] || 0) + 1
    })
    const total = filteredNews.length || 1
    return Object.entries(freq).map(([name, value]) => ({
      name, value, pct: Math.round(value/total*100)
    })).sort((a,b) => b.value - a.value)
  })()

  // 요일별 발행 패턴
  const dayNames = ['일','월','화','수','목','금','토']
  const weekdayData = dayNames.map((day, i) => ({
    day,
    자사: filteredNews.filter(n => { const d = n.published_at||n.collected_at; return d && new Date(d).getDay()===i && n.category==='자사' }).length,
    경쟁사: filteredNews.filter(n => { const d = n.published_at||n.collected_at; return d && new Date(d).getDay()===i && n.category==='경쟁사' }).length,
    업계: filteredNews.filter(n => { const d = n.published_at||n.collected_at; return d && new Date(d).getDay()===i && n.category==='업계' }).length,
  }))

  // 급상승 키워드 (어제 대비 오늘 증가량)
  const risingKeywords = (() => {
    const todayNews2 = news.filter(n => (n.collected_at||'').startsWith(today))
    const yestNews2 = news.filter(n => (n.collected_at||'').startsWith(yesterday))
    const extract = (articles: typeof news) => {
      const freq: Record<string,number> = {}
      articles.forEach(n => {
        (n.tags||[]).forEach(t => { if(t.length>=2) freq[t]=(freq[t]||0)+1 })
      })
      return freq
    }
    const tFreq = extract(todayNews2)
    const yFreq = extract(yestNews2)
    return Object.entries(tFreq)
      .map(([kw, cnt]) => ({ name: kw, today: cnt, yesterday: yFreq[kw]||0, rise: cnt-(yFreq[kw]||0) }))
      .filter(k => k.rise > 0 && k.today >= 1)
      .sort((a,b) => b.rise - a.rise)
      .slice(0, 8)
  })()

  // 시간대별 발행량 - filteredNews 기준
  const hourlyNews = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}시`,
    h,
    count: filteredNews.filter(n => {
      const d = n.published_at || n.collected_at
      if (!d) return false
      const kstHour = (new Date(d).getUTCHours() + 9) % 24
      return kstHour === h
    }).length
  }))

  // 하이라이트 - filteredNews 기준
  const highlightNews = (() => {
    if (!filteredNews.length) return null
    const freqMap: Record<string, number> = {}
    keywordFreq.forEach((k: any) => { freqMap[k.name] = k.count })
    const newsOnly = filteredNews.filter((n: any) => !n.source?.includes('블로그'))
    const pool = newsOnly.length > 0 ? newsOnly : filteredNews
    return [...pool].sort((a, b) => {
      const score = (n: any) => {
        const catScore = n.category === '자사' ? 200 : n.category === '경쟁사' ? 100 : 0
        const freqScore = (n.tags || []).reduce((sum: number, tag: string) => sum + (freqMap[tag] || 0), 0)
        return catScore + freqScore
      }
      return score(b) - score(a)
    })[0]
  })()
  const topKeywords = keywordFreq.slice(0, 6)
  
  // 기간 레이블
  const periodLabel = dateMode === 'single' ? selectedDate : `${rangeFrom} ~ ${rangeTo}`

  // 방송 통계
  const streamPlatCount = ['유튜브', '치지직', 'SOOP'].map(p => ({
    name: p,
    value: streams.filter(s => s.platform === p && (s.started_at||'') >= df && (s.started_at||'') <= dt).length,
    live: streams.filter(s => s.platform === p && s.is_live && (s.started_at||'') >= df && (s.started_at||'') <= dt).length,
    vod: streams.filter(s => s.platform === p && !s.is_live && (s.started_at||'') >= df && (s.started_at||'') <= dt).length,
  }))
  const liveCount = streams.filter(s => s.is_live).length
  const streamCatCount = ['자사', '경쟁사', '업계'].map(cat => ({ name: cat, value: streams.filter(s => s.category === cat && (s.started_at||'') >= df && (s.started_at||'') <= dt).length }))

  // 커뮤니티 통계
  const dateFilteredKeywordPosts = keywordPosts.filter(p => {
    const dv = p.posted_at || p.collected_at || ''
    return dv >= df && dv <= dt
  })
  const sentimentCount = ['긍정', '부정', '중립'].map(s => ({ name: s, value: dateFilteredKeywordPosts.filter(p => p.sentiment === s).length }))
  const commCount = Object.keys(COMMUNITY_COLORS).map(c => ({ name: c, value: dateFilteredKeywordPosts.filter(p => p.community === c).length })).filter(c => c.value > 0)
  const vsData = Object.entries(COMM_KEYWORDS).map(([label, kws]) => {
    const kp = posts.filter(p => kws.some(kw => p.keyword === kw || p.title?.includes(kw)))
    return { name: label === '자사' ? '알케론' : '경쟁작', 긍정: kp.filter(p => p.sentiment === '긍정').length, 부정: kp.filter(p => p.sentiment === '부정').length, 중립: kp.filter(p => p.sentiment === '중립').length }
  })
  const comm7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const dp = keywordPosts.filter(p => (p.collected_at||'').startsWith(ds))
    return { date: `${d.getMonth()+1}/${d.getDate()}`, 긍정: dp.filter(p => p.sentiment==='긍정').length, 부정: dp.filter(p => p.sentiment==='부정').length, 중립: dp.filter(p => p.sentiment==='중립').length }
  })

  // 방송 요일별 패턴
  const streamWeekdayData = useMemo(() => {
    const dayNames = ['일','월','화','수','목','금','토']
    return dayNames.map((day, i) => ({
      day,
      유튜브: filteredStreams.filter(s => { const d = s.started_at; return d && new Date(d).getDay()===i && s.platform==='유튜브' }).length,
      치지직: filteredStreams.filter(s => { const d = s.started_at; return d && new Date(d).getDay()===i && s.platform==='치지직' }).length,
      SOOP: filteredStreams.filter(s => { const d = s.started_at; return d && new Date(d).getDay()===i && s.platform==='SOOP' }).length,
    }))
  }, [filteredStreams])

  // 방송 키워드 빈도
  const streamKeywordFreq = useMemo(() => {
    const freq: Record<string, number> = {}
    filteredStreams.forEach(s => {
      (s.tags || []).forEach(tag => {
        if (tag.length >= 2) freq[tag] = (freq[tag] || 0) + 1
      })
      // 제목에서도 추출
      const words: string[] = s.title?.match(/[가-힣a-zA-Z]{2,}/g) || []
      words.forEach(w => {
        if (!['라이브','방송','게임','live','game','stream'].includes(w.toLowerCase()))
          freq[w] = (freq[w] || 0) + 1
      })
    })
    // 키워드별 카테고리 매핑 (스트림 카테고리 기준)
    const catMap: Record<string, string> = {}
    filteredStreams.forEach(s => {
      const cat = s.category || '업계'
      ;(s.tags || []).forEach(t => { if (!catMap[t]) catMap[t] = cat })
      const ws: string[] = s.title?.match(/[가-힣a-zA-Z]{2,}/g) || []
      ws.forEach(w => { if (!catMap[w]) catMap[w] = cat })
    })
    return Object.entries(freq).map(([name, count]) => ({ name, count, cat: catMap[name] || '업계' })).sort((a,b)=>b.count-a.count).slice(0,25)
  }, [filteredStreams])

  // 방송 횟수 TOP 5
  const commKeywordFreq = useMemo(() => {
    const freq: Record<string, number> = {}
    filteredPosts.forEach(p => {
      const words = (p.title || '').match(/[가-힣a-zA-Z]{2,}/g) || []
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    })
    return Object.entries(freq).map(([name, count]) => ({ name, count, cat: '커뮤니티' })).sort((a,b) => b.count - a.count).slice(0, 20)
  }, [filteredPosts])

  const topChannelsByCount = (() => {
    const freq: Record<string, {count:number, platform:string, live:number, viewers:number}> = {}
    filteredStreams.forEach(s => {
      if (!s.channel_name) return
      if (!freq[s.channel_name]) freq[s.channel_name] = { count:0, platform:s.platform, live:0, viewers:0 }
      freq[s.channel_name].count++
      if (s.is_live) freq[s.channel_name].live++
      freq[s.channel_name].viewers += s.viewer_count || 0
    })
    return Object.entries(freq).map(([name, v]) => ({ name, ...v })).sort((a,b)=>b.count-a.count).slice(0,5)
  })()

  // 시청자 수 TOP 5
  const topChannelsByViewers = (() => {
    const freq: Record<string, {count:number, platform:string, live:number, viewers:number}> = {}
    filteredStreams.forEach(s => {
      if (!s.channel_name) return
      if (!freq[s.channel_name]) freq[s.channel_name] = { count:0, platform:s.platform, live:0, viewers:0 }
      freq[s.channel_name].count++
      if (s.is_live) freq[s.channel_name].live++
      freq[s.channel_name].viewers += s.viewer_count || 0
    })
    return Object.entries(freq).map(([name, v]) => ({ name, ...v })).filter(c=>c.viewers>0).sort((a,b)=>b.viewers-a.viewers).slice(0,5)
  })()

  // 신규 채널 (최근 7일 내 처음 등장)
  const recentChannels = new Set(filteredStreams.map(s=>s.channel_name).filter(Boolean))
  const allChannels = new Set(streams.map(s=>s.channel_name).filter(Boolean))
  const prevChannels = new Set(streams.filter(s=>{
    const d = s.started_at || ''
    return d < df
  }).map(s=>s.channel_name).filter(Boolean))
  const newChannels = [...recentChannels].filter(c => !prevChannels.has(c))

  const posRate = dateFilteredKeywordPosts.length > 0 ? Math.round(sentimentCount[0].value / dateFilteredKeywordPosts.length * 100) : 0
  const negRate = dateFilteredKeywordPosts.length > 0 ? Math.round(sentimentCount[1].value / dateFilteredKeywordPosts.length * 100) : 0

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">업계 동향 모니터링</h1>
          <p className="text-xs text-gray-500">DRIMAGE · 게임 업계 인텔리전스</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            {(['news','streams','community'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                {tab === 'news' ? '📰 뉴스' : tab === 'streams' ? '🎥 방송' : '💬 커뮤니티'}
              </button>
            ))}
          </div>
          {/* 날짜 필터 */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg">
            <div className="flex gap-1">
              <button onClick={() => setDateMode('single')} className={`text-xs px-2 py-1 rounded ${dateMode==='single' ? 'bg-gray-600 text-white' : 'text-gray-500'}`}>날짜</button>
              <button onClick={() => setDateMode('range')} className={`text-xs px-2 py-1 rounded ${dateMode==='range' ? 'bg-gray-600 text-white' : 'text-gray-500'}`}>기간</button>
            </div>
            {['오늘','3일간','7일간'].map((label, i) => {
              const days = [0, 3, 7][i]
              return (
                <button key={label} onClick={() => {
                  const t = new Date().toISOString().split('T')[0]
                  const d = new Date(); d.setDate(d.getDate() - days)
                  const ds = d.toISOString().split('T')[0]
                  if (days === 0) { setDateMode('single'); setSelectedDate(t) }
                  else { setDateMode('range'); setRangeFrom(ds); setRangeTo(t) }
                }} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">{label}</button>
              )
            })}
            {dateMode === 'single'
              ? <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-700 text-white px-2 py-1 rounded text-xs outline-none" />
              : <div className="flex items-center gap-1"><input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="bg-gray-700 text-white px-2 py-1 rounded text-xs outline-none" /><span className="text-gray-500 text-xs">~</span><input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="bg-gray-700 text-white px-2 py-1 rounded text-xs outline-none" /></div>
            }
          </div>
        </div>
      </div>

      <div className="w-[90%] mx-auto py-6">
        {loading ? (
          <div className="flex items-center justify-center py-40 text-gray-500">데이터 불러오는 중...</div>
        ) : (
          <>
            {/* ===== 뉴스 탭 ===== */}
            {activeTab === 'news' && (
              <>
                {/* 벤토 박스 Summary */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 카테고리 3개 카드 */}
                  {newsCatCount.map(c => (
                    <button key={c.name} onClick={() => handleNewsClick(c.name)} className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-500 transition-all text-left group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-medium">{c.name} 뉴스</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.diff > 0 ? 'bg-green-900 text-green-400' : c.diff < 0 ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-500'}`}>
                          {c.diff > 0 ? `▲${c.diff}` : c.diff < 0 ? `▼${Math.abs(c.diff)}` : '±0'}
                        </span>
                      </div>
                      <p className="text-4xl font-bold mb-1 group-hover:opacity-80" style={{ color: COLORS[c.name] }}>{c.todayCnt}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                      <p className="text-xs text-gray-600">전체 누적 {c.total}건</p>
                      <div className="mt-3 space-y-1">
                        {c.segments.slice(0,3).map(seg => (
                          <div key={seg.name} className="flex items-center gap-2">
                            <div className="h-1 rounded-full flex-1 bg-gray-700">
                              <div className="h-1 rounded-full" style={{ width: `${c.total > 0 ? (seg.value/c.todayCnt*100) : 0}%`, backgroundColor: COLORS[seg.name] || COLORS[c.name] }}></div>
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right truncate">{seg.name} {seg.value}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}

                  {/* 7일 트렌드 - col-span-4로 확장 */}
                  <div className="col-span-6 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📈 7일간 카테고리별 추이</p>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={(() => {
                        return Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i))
                          const ds = d.toISOString().split('T')[0]
                          return {
                            date: `${d.getMonth()+1}/${d.getDate()}`,
                            자사: news.filter(n => n.category==='자사' && (n.collected_at||'').startsWith(ds)).length,
                            경쟁사: news.filter(n => n.category==='경쟁사' && (n.collected_at||'').startsWith(ds)).length,
                            업계: news.filter(n => n.category==='업계' && (n.collected_at||'').startsWith(ds)).length,
                          }
                        })
                      })()}>
                        <defs>
                          <linearGradient id="gradOwn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradInd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="자사" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradOwn)" />
                        <Area type="monotone" dataKey="경쟁사" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradComp)" />
                        <Area type="monotone" dataKey="업계" stroke="#10b981" strokeWidth={1.5} fill="url(#gradInd)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {['자사','경쟁사','업계'].map(c => <div key={c} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:COLORS[c]}}></div><span className="text-xs text-gray-500">{c}</span></div>)}
                    </div>
                  </div>
                </div>

                {/* 오늘의 하이라이트 */}
                {highlightNews && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-gray-900 to-gray-900 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-500 text-white">🔥 오늘의 하이라이트</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={highlightNews.url} target="_blank" rel="noopener noreferrer" className="text-white font-semibold text-base hover:text-indigo-300 transition-colors line-clamp-1">{highlightNews.title}</a>
                        <p className="text-gray-400 text-sm mt-1 line-clamp-1">{highlightNews.summary ? highlightNews.summary.replace(/<[^>]*>/g,'').trim() : ''}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {(highlightNews.tags||[]).slice(0,5).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (COLORS[tag]||'#4f46e5')+'33', color: COLORS[tag]||'#a5b4fc' }}>#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-500">{periodLabel} 수집</p>
                        <p className="text-2xl font-bold text-indigo-400">{filteredNews.length}<span className="text-sm text-gray-500 ml-1">건</span></p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">주요 키워드</p>
                        {risingKeywords.length > 0 && <p className="text-xs text-orange-400">🔥 급상승</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {risingKeywords.length > 0 ? risingKeywords.map((kw) => (
                          <button key={kw.name} onClick={() => { const cat = Object.entries(SEGMENTS).find(([,s])=>s.includes(kw.name))?.[0]||'전체'; handleNewsClick(cat, kw.name) }} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 bg-orange-900/40 text-orange-300 border border-orange-500/30">
                            ▲{kw.rise} {kw.name} <span className="font-bold opacity-70">{kw.today}</span>
                          </button>
                        )) : topKeywords.map((kw, i) => (
                          <button key={kw.name} onClick={() => { const cat = Object.entries(SEGMENTS).find(([,s])=>s.includes(kw.name))?.[0]||'전체'; handleNewsClick(cat, kw.name) }} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105" style={{ backgroundColor: (COLORS[kw.name]||'#4f46e5')+'22', color: COLORS[kw.name]||'#a5b4fc', border: `1px solid ${(COLORS[kw.name]||'#4f46e5')}44` }}>
                            <span className="opacity-60">#{i+1}</span> {kw.name} <span className="font-bold">{kw.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 시각화 섹션 - 3개로 통합 정리 */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 키워드 워드클라우드 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">☁️ 키워드 워드클라우드</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <WordCloud words={keywordFreq} onWordClick={(word: string) => {
                      setSelectedKeyword(selectedKeyword === word ? '' : word)
                      scrollToList()
                    }} selectedWord={selectedKeyword} />
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700 flex-wrap">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-400"></div><span className="text-xs text-gray-500">자사</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div><span className="text-xs text-gray-500">경쟁사</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span className="text-xs text-gray-500">업계</span></div>
                      <div className="ml-auto flex gap-3 flex-wrap">
                        {sourceFreq.map((s, i) => (
                          <div key={s.name} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i%5] }}></div>
                            <span className="text-xs text-gray-500">{s.name} {s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>



                  {/* 요일별 발행 패턴 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📅 요일별 발행 패턴</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                        <span className="text-xs text-indigo-400 font-medium">
                          최다: {weekdayData.reduce((a,b)=>(a.자사+a.경쟁사+a.업계)>(b.자사+b.경쟁사+b.업계)?a:b).day}요일
                        </span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={weekdayData} barCategoryGap="20%">
                        <XAxis dataKey="day" tick={{fill:'#9ca3af',fontSize:12}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any,n:any)=>[`${v}건`,n]}/>
                        <Bar dataKey="자사" stackId="a" fill="#6366f1"/>
                        <Bar dataKey="경쟁사" stackId="a" fill="#ef4444"/>
                        <Bar dataKey="업계" stackId="a" fill="#10b981" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-3">
                        {['자사','경쟁사','업계'].map(c=><div key={c} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:COLORS[c]}}></div><span className="text-xs text-gray-500">{c}</span></div>)}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-600">
                        {weekdayData.map(d=>(
                          <span key={d.day} className={d.자사+d.경쟁사+d.업계===Math.max(...weekdayData.map(x=>x.자사+x.경쟁사+x.업계))?'text-indigo-400 font-medium':''}>
                            {d.day} {d.자사+d.경쟁사+d.업계}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 시간대별 발행량 + 소스 분포 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">⏰ 시간대별 발행량</p>
                      <p className="text-xs text-indigo-400 font-medium">피크 {hourlyNews.reduce((a,b)=>a.count>b.count?a:b).hour}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={hourlyNews} barCategoryGap="5%">
                        <XAxis dataKey="hour" tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} interval={3}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} width={20}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any)=>[`${v}건`,'발행량']}/>
                        <Bar dataKey="count" radius={[3,3,0,0]}>
                          {hourlyNews.map(h=>{
                            const max=Math.max(...hourlyNews.map(x=>x.count),1)
                            return <Cell key={h.h} fill={h.count>0?`rgba(99,102,241,${0.3+(h.count/max)*0.7})`:'#1f2937'}/>
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[['새벽','0-6시',0,6,'#6366f1'],['오전','6-12시',6,12,'#10b981'],['오후','12-18시',12,18,'#f59e0b'],['저녁','18-24시',18,24,'#ef4444']].map(([label,time,from,to,color]:any)=>(
                        <div key={label} className="bg-gray-700/50 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">{label}</p>
                          <p className="text-xs text-gray-600">{time}</p>
                          <p className="font-bold mt-1" style={{color, fontSize:'15px'}}>{hourlyNews.filter(h=>h.h>=from&&h.h<to).reduce((a,b)=>a+b.count,0)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-600 mb-2">📡 소스별 ({periodLabel})</p>
                      <div className="space-y-1.5">
                        {sourceDetail.map((s,i)=>(
                          <div key={s.name} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-20 truncate">{s.name}</span>
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                              <div className="h-1.5 rounded-full" style={{width:`${s.pct}%`,backgroundColor:['#6366f1','#10b981','#f59e0b','#ef4444'][i%4]}}></div>
                            </div>
                            <span className="text-xs text-gray-400 w-16 text-right">{s.value}건 {s.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 필터 */}
                <div ref={listRef} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-4">
                  <div className="flex items-center gap-4">
                    {/* 카테고리 */}
                    <div className="flex gap-1 bg-gray-700 p-1 rounded-xl">
                      {['전체','자사','경쟁사','업계'].map(cat => (
                        <button key={cat} onClick={() => { setCategory(cat); setSegment('') }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category===cat&&!segment ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* 세그먼트 */}
                    {category !== '전체' && (
                      <div className="flex gap-1">
                        {SEGMENTS[category]?.map(seg => (
                          <button key={seg} onClick={() => setSegment(seg===segment?'':seg)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${segment===seg?'text-white shadow':'bg-gray-700/50 text-gray-400 hover:bg-gray-700'}`}
                            style={segment===seg?{backgroundColor:COLORS[seg]}:{}}>
                            {seg}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 선택된 키워드 */}
                    {selectedKeyword && (
                      <button onClick={() => setSelectedKeyword('')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/50 transition-colors">
                        ☁️ {selectedKeyword} <span className="opacity-60 ml-1">✕</span>
                      </button>
                    )}

                    {/* 우측 영역 */}
                    <div className="flex items-center gap-2 ml-auto">
                      {/* 소스 필터 - 아이콘 포함 */}
                      <div className="flex gap-1 bg-gray-700 p-1 rounded-xl">
                        {[
                          { key: '전체', label: '전체', icon: '📋' },
                          { key: '구글 뉴스', label: 'Google', icon: '🔍' },
                          { key: '네이버 뉴스', label: 'Naver', icon: '🟢' },
                          { key: '네이버 블로그', label: 'Blog', icon: '✏️' },
                        ].map(st => (
                          <button key={st.key} onClick={() => setSourceType(st.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sourceType===st.key ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                            <span>{st.icon}</span>
                            <span>{st.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* 검색창 */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔎</span>
                        <input type="text" placeholder="뉴스 검색..." value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="bg-gray-700 text-white pl-8 pr-3 py-1.5 rounded-xl outline-none border border-gray-600 focus:border-indigo-500 text-xs w-44 transition-colors" />
                      </div>

                      {/* 초기화 */}
                      {(search||segment||sourceType!=='전체'||selectedKeyword) && (
                        <button onClick={() => {setSearch('');setSegment('');setSourceType('전체');setSelectedKeyword('')}}
                          className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-xl text-xs hover:bg-gray-600 hover:text-white transition-colors">
                          초기화
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">{filteredNews.length}건 표시 중</p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {filteredNews.slice(0, newsLimit).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-indigo-500 transition-all hover:-translate-y-0.5">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: COLORS[item.category]+'22', color: COLORS[item.category] }}>{item.category}</span>
                        <span className="text-xs text-gray-600 ml-auto">{item.published_at ? new Date(item.published_at).toLocaleDateString('ko-KR') : ''}</span>
                      </div>
                      <h2 className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">{item.title}</h2>
                      {item.summary && <p className="text-gray-600 text-xs line-clamp-2">{stripHtml(item.summary)}</p>}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.tags?.slice(0,2).map(tag => <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: (COLORS[tag]||'#374151')+'33', color: COLORS[tag]||'#9ca3af' }}>#{tag}</span>)}
                      </div>
                    </a>
                  ))}
                </div>
                {filteredNews.length > newsLimit && (
                  <button onClick={() => setNewsLimit(p => p+24)} className="w-full mt-4 py-3 bg-gray-800 text-gray-500 rounded-xl text-xs hover:bg-gray-700 border border-gray-700">더보기 ({filteredNews.length - newsLimit}건)</button>
                )}
              </>
            )}

            {/* ===== 방송 탭 ===== */}
            {activeTab === 'streams' && (
              <>
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 라이브 강조 */}
                  <button onClick={() => handleStreamClick(undefined, undefined)} className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-red-900 hover:border-red-500 transition-all text-left group">
                    <p className="text-xs text-gray-500 mb-3">🔴 현재 라이브</p>
                    <p className="text-5xl font-bold text-red-400 group-hover:text-red-300">{liveCount}<span className="text-lg font-normal ml-1">건</span></p>
                    <div className="mt-3 space-y-1">
                      {streamPlatCount.map(p => (
                        <div key={p.name} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{p.name}</span>
                          <span className="text-red-400">{p.live} LIVE</span>
                        </div>
                      ))}
                    </div>
                  </button>

                  {/* 플랫폼 카드 */}
                  {streamPlatCount.map(p => (
                    <button key={p.name} onClick={() => handleStreamClick(undefined, p.name)} className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-500 transition-all text-left group">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-5 h-5 flex-shrink-0" dangerouslySetInnerHTML={{__html: PLATFORM_ICONS[p.name] || ''}} />
                        <span className="text-xs font-semibold" style={{color: PLATFORM_COLORS[p.name]}}>{p.name}</span>
                      </div>
                      <p className="text-4xl font-bold group-hover:opacity-80" style={{ color: PLATFORM_COLORS[p.name] }}>{p.value}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                      <div className="mt-3 flex gap-3 text-xs">
                        <span style={{color: PLATFORM_COLORS[p.name]}}>🔴 {p.live}</span>
                        <span className="text-gray-500">📹 {p.vod}</span>
                      </div>
                    </button>
                  ))}

                  {/* 카테고리 파이차트 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 font-medium mb-2">카테고리별 비율</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={streamCatCount} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" label={({name,value})=>`${name} ${value}`} labelLine={false} onClick={(d:any)=>handleStreamClick(d.name)} style={{cursor:'pointer'}}>
                          {streamCatCount.map(e => <Cell key={e.name} fill={COLORS[e.name]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize:'12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* VOD 총계 */}
                  <div className="col-span-1 bg-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col justify-between">
                    <p className="text-xs text-gray-500">총 VOD</p>
                    <p className="text-4xl font-bold text-white">{streams.filter(s=>!s.is_live).length}</p>
                    <p className="text-xs text-gray-600">누적</p>
                  </div>
                </div>

                {/* 방송 시각화 섹션 */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 키워드 워드클라우드 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">☁️ 방송 키워드</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <WordCloud words={streamKeywordFreq} onWordClick={(word: string) => { setSelectedStreamKeyword(selectedStreamKeyword === word ? '' : word); scrollToList() }} selectedWord={selectedStreamKeyword} />
                  </div>

                  {/* 인기 채널 TOP 5 - 탭 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">🏆 인기 채널 TOP 5</p>
                      <div className="flex gap-1 bg-gray-700 p-0.5 rounded-lg">
                        <button onClick={() => setChannelSort('count')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${channelSort==='count'?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>방송 횟수</button>
                        <button onClick={() => setChannelSort('viewers')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${channelSort==='viewers'?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>시청자 수</button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {(channelSort==='count' ? topChannelsByCount : topChannelsByViewers).map((ch, i) => (
                        <div key={ch.name} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 text-center ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{ch.name}</p>
                            <p className="text-xs" style={{color:PLATFORM_COLORS[ch.platform]}}>{ch.platform}</p>
                          </div>
                          <div className="text-right">
                            {channelSort==='count'
                              ? <p className="text-xs text-gray-300 font-medium">{ch.count}건</p>
                              : <p className="text-xs text-blue-400 font-medium">{ch.viewers.toLocaleString()}명</p>
                            }
                            {ch.live > 0 && <p className="text-xs text-red-400">🔴 LIVE</p>}
                          </div>
                        </div>
                      ))}
                      {(channelSort==='viewers' && topChannelsByViewers.length === 0) && (
                        <p className="text-xs text-gray-600 text-center py-4">시청자 수 데이터 수집 중...</p>
                      )}
                    </div>
                  </div>

                  {/* 신규 채널 */}
                  <div className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 font-medium mb-3">✨ 신규 채널</p>
                    <p className="text-4xl font-bold text-emerald-400 mb-1">{newChannels.length}<span className="text-lg text-gray-500 font-normal ml-1">개</span></p>
                    <p className="text-xs text-gray-600 mb-4">{periodLabel} 기간 첫 등장</p>
                    <div className="space-y-1.5">
                      {newChannels.slice(0,4).map(ch => (
                        <div key={ch} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          <span className="text-xs text-gray-400 truncate">{ch}</span>
                        </div>
                      ))}
                      {newChannels.length > 4 && <p className="text-xs text-gray-600">+{newChannels.length-4}개 더</p>}
                    </div>
                  </div>

                  {/* 7일간 플랫폼별 추이 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📈 7일간 플랫폼별 추이</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={Array.from({length:7},(_,i)=>{
                        const d=new Date(); d.setDate(d.getDate()-(6-i))
                        const ds=d.toISOString().split('T')[0]
                        return {
                          date:`${d.getMonth()+1}/${d.getDate()}`,
                          유튜브: streams.filter(s=>s.platform==='유튜브'&&(s.started_at||'').startsWith(ds)).length,
                          치지직: streams.filter(s=>s.platform==='치지직'&&(s.started_at||'').startsWith(ds)).length,
                        }
                      })}>
                        <defs>
                          <linearGradient id="gradYT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradCZ" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        <Area type="monotone" dataKey="유튜브" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradYT)"/>
                        <Area type="monotone" dataKey="치지직" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradCZ)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {['유튜브','치지직'].map(p=><div key={p} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PLATFORM_COLORS[p]}}></div><span className="text-xs text-gray-500">{p}</span></div>)}
                    </div>
                  </div>

                  {/* 카테고리별 라이브 vs VOD */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500 font-medium">📊 카테고리별 라이브 vs VOD</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={['자사','경쟁사','업계'].map(cat=>({
                        name: cat,
                        라이브: filteredStreams.filter(s=>s.category===cat&&s.is_live).length,
                        VOD: filteredStreams.filter(s=>s.category===cat&&!s.is_live).length,
                      }))} onClick={(d:any)=>{if(d?.activeLabel)handleStreamClick(d.activeLabel)}}>
                        <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        <Bar dataKey="라이브" stackId="a" fill="#ef4444" radius={[0,0,0,0]}/>
                        <Bar dataKey="VOD" stackId="a" fill="#6366f1" radius={[4,4,0,0]}/>
                        <Legend wrapperStyle={{fontSize:'11px'}}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 시간대별 방송량 히트맵 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500 font-medium">⏰ 시간대별 방송량</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    {(() => {
                      const hourly = Array.from({length:24},(_,h)=>({
                        h, count: filteredStreams.filter(s=>{
                          const d=s.started_at; return d&&new Date(d).getHours()===h
                        }).length
                      }))
                      const max = Math.max(...hourly.map(x=>x.count),1)
                      const peak = hourly.reduce((a,b)=>a.count>b.count?a:b)
                      return (
                        <>
                          <div className="grid grid-cols-6 gap-1 mb-2">
                            {hourly.map(h=>{
                              const intensity=h.count/max
                              return (
                                <div key={h.h} className="flex flex-col items-center gap-1">
                                  <div className="w-full h-8 rounded" style={{backgroundColor:intensity>0?`rgba(239,68,68,${0.15+intensity*0.85})`:'#1f2937'}} title={`${h.h}시 ${h.count}건`}></div>
                                  {h.h%4===0&&<span className="text-xs text-gray-600">{h.h}</span>}
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-2 text-center">
                            <span className="text-xs text-gray-500">피크: {peak.h}시 ({peak.count}건)</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-4" ref={listRef}>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-1">
                      {['전체','자사','경쟁사','업계'].map(cat => (
                        <button key={cat} onClick={() => {setStreamCategory(cat);setStreamSegment('')}} className={`px-3 py-1.5 rounded-full text-xs font-medium ${streamCategory===cat&&!streamSegment?'bg-white text-gray-900':'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat}</button>
                      ))}
                    </div>
                    {streamCategory!=='전체' && SEGMENTS[streamCategory]?.map(seg => (
                      <button key={seg} onClick={() => setStreamSegment(seg===streamSegment?'':seg)} className={`px-3 py-1.5 rounded-full text-xs ${streamSegment===seg?'text-white':'bg-gray-700 text-gray-400'}`} style={streamSegment===seg?{backgroundColor:COLORS[seg]}:{}}>{seg}</button>
                    ))}
                    <div className="flex gap-1 ml-auto">
                      {['전체','유튜브','치지직','SOOP'].map(p => (
                        <button key={p} onClick={() => setStreamPlatform(p)} className={`px-3 py-1.5 rounded-lg text-xs ${streamPlatform===p?'text-white':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={streamPlatform===p&&p!=='전체'?{backgroundColor:PLATFORM_COLORS[p]}:streamPlatform===p?{backgroundColor:'#374151',color:'white'}:{}}>{p}</button>
                      ))}
                      {['전체','생방송','VOD'].map(t => (
                        <button key={t} onClick={() => setStreamType(t)} className={`px-3 py-1.5 rounded-lg text-xs ${streamType===t?'bg-red-600 text-white':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{t==='생방송'?'🔴 생방송':t}</button>
                      ))}
                    </div>
                    <input type="text" placeholder="검색..." value={streamSearch} onChange={e => setStreamSearch(e.target.value)} className="bg-gray-700 text-white px-3 py-1.5 rounded-lg outline-none border border-gray-600 text-xs w-40" />
                    {selectedStreamKeyword && <button onClick={() => setSelectedStreamKeyword('')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-300 border border-indigo-500/50">☁️ {selectedStreamKeyword} <span className="opacity-60">✕</span></button>}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{filteredStreams.length}건 표시 중</p>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  {filteredStreams.slice(0, streamLimit).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all hover:-translate-y-0.5">
                      <div className="relative">
                        {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-28 object-cover" /> : <div className="w-full h-28 bg-gray-700 flex items-center justify-center"><span className="text-gray-600 text-xs">No Image</span></div>}
                        {item.is_live && <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium animate-pulse">🔴 LIVE</span>}
                        <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}>{item.platform}</span>
                      </div>
                      <div className="p-3">
                        <h2 className="text-white text-xs font-medium leading-snug mb-1 line-clamp-2">{item.title}</h2>
                        <p className="text-gray-500 text-xs">{item.channel_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: COLORS[item.category]+'22', color: COLORS[item.category] }}>{item.category}</span>
                          <span className="text-xs text-gray-700">{item.started_at ? new Date(item.started_at).toLocaleDateString('ko-KR') : ''}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                {filteredStreams.length > streamLimit && (
                  <button onClick={() => setStreamLimit(p => p+24)} className="w-full mt-4 py-3 bg-gray-800 text-gray-500 rounded-xl text-xs hover:bg-gray-700 border border-gray-700">더보기 ({filteredStreams.length - streamLimit}건)</button>
                )}
              </>
            )}

            {/* ===== 커뮤니티 탭 ===== */}
            {activeTab === 'community' && (
              <>
                {/* 자사/경쟁작 토글 */}
                <div className="flex gap-2 mb-4">
                  {Object.keys(COMM_KEYWORDS).map(kw => (
                    <button key={kw} onClick={() => {setCommKeyword(kw);setCommSentiment('전체');setCommCommunity('전체')}} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all border ${commKeyword===kw?'border-transparent text-white shadow-lg':'border-gray-700 text-gray-400 hover:text-white'}`} style={commKeyword===kw?{backgroundColor:kw==='자사'?'#4f46e5':'#dc2626'}:{}}>
                      {kw === '자사' ? '🏢 자사 (알케론)' : '⚔️ 경쟁작'}
                    </button>
                  ))}
                </div>

                {/* 벤토 Summary */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 총 언급 */}
                  <div className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 mb-3">💬 총 언급</p>
                    <p className="text-5xl font-bold text-white">{dateFilteredKeywordPosts.length}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                    <p className="text-xs text-gray-600 mt-2">오늘 {keywordPosts.filter(p=>(p.collected_at||'').startsWith(today)).length}건</p>
                  </div>

                  {/* 감성 카드 3개 */}
                  {sentimentCount.map(s => (
                    <button key={s.name} onClick={() => handleCommClick(s.name)} className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-500 transition-all text-left group">
                      <p className="text-xs text-gray-500 mb-3">{s.name==='긍정'?'😊':s.name==='부정'?'😠':'😐'} {s.name}</p>
                      <p className="text-4xl font-bold group-hover:opacity-80" style={{ color: SENTIMENT_COLORS[s.name] }}>{s.value}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                      <p className="text-2xl font-bold mt-1" style={{ color: SENTIMENT_COLORS[s.name] }}>{dateFilteredKeywordPosts.length>0?Math.round(s.value/dateFilteredKeywordPosts.length*100):0}<span className="text-xs font-normal">%</span></p>
                    </button>
                  ))}

                  {/* 7일 추이 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 font-medium mb-2">📈 7일간 감성 추이</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={comm7d}>
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize:'12px' }} />
                        <Line type="monotone" dataKey="긍정" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="부정" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="중립" stroke="#6b7280" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 커뮤니티 하이라이트 */}
                {(() => {
                  const topPost = [...dateFilteredKeywordPosts].sort((a,b)=>(b.views||0)-(a.views||0))[0]
                  if (!topPost) return null
                  return (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-gray-900 to-gray-900 p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{backgroundColor:SENTIMENT_COLORS[topPost.sentiment]}}>
                            🔥 {topPost.sentiment === '긍정' ? '😊' : topPost.sentiment === '부정' ? '😠' : '😐'} TOP 게시글
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={topPost.url} target="_blank" rel="noopener noreferrer" className="text-white font-semibold text-base hover:text-indigo-300 transition-colors line-clamp-1">{topPost.title}</a>
                          <p className="text-gray-400 text-sm mt-1">{topPost.community} · {topPost.sentiment_reason}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-500">{periodLabel} 수집</p>
                          <p className="text-2xl font-bold text-indigo-400">{dateFilteredKeywordPosts.length}<span className="text-sm text-gray-500 ml-1">건</span></p>
                          {topPost.views>0 && <p className="text-xs text-gray-500 mt-1">👀 {topPost.views.toLocaleString()}</p>}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-indigo-500/20 flex gap-2 flex-wrap">
                        {['긍정','부정','중립'].map(s=>(
                          <button key={s} onClick={()=>handleCommClick(s)} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105" style={{backgroundColor:SENTIMENT_COLORS[s]+'22',color:SENTIMENT_COLORS[s],border:`1px solid ${SENTIMENT_COLORS[s]}44`}}>
                            {s==='긍정'?'😊':s==='부정'?'😠':'😐'} {s} <span className="font-bold">{sentimentCount.find(x=>x.name===s)?.value||0}건</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* 2번째 row */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 커뮤니티별 언급량 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">커뮤니티별 언급량</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={commCount} onClick={(d:any)=>{if(d?.activeLabel)handleCommClick(undefined,d.activeLabel)}}>
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize:'12px' }} />
                        <Bar dataKey="value" radius={[4,4,0,0]} style={{cursor:'pointer'}}>
                          {commCount.map(e => <Cell key={e.name} fill={COMMUNITY_COLORS[e.name]||'#6b7280'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 자사 vs 경쟁작 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3"><p className="text-xs text-gray-500 font-medium">🆚 자사 vs 경쟁작 감성</p><p className="text-xs text-gray-600">{periodLabel} 기준</p></div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={vsData}>
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize:'12px' }} />
                        <Bar dataKey="긍정" stackId="a" fill="#10b981" />
                        <Bar dataKey="중립" stackId="a" fill="#6b7280" />
                        <Bar dataKey="부정" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 긍정/부정 요약 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4"><p className="text-xs text-gray-500 font-medium">감성 요약</p><p className="text-xs text-gray-600">{periodLabel} 기준</p></div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-green-400">긍정</span>
                          <span className="text-green-400">{posRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: `${posRate}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-red-400">부정</span>
                          <span className="text-red-400">{negRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full">
                          <div className="h-2 bg-red-500 rounded-full" style={{ width: `${negRate}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">중립</span>
                          <span className="text-gray-400">{100-posRate-negRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full">
                          <div className="h-2 bg-gray-500 rounded-full" style={{ width: `${100-posRate-negRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 필터 */}
                {/* 방송 하이라이트 */}
                {(() => {
                  const topStream = filteredStreams.filter(s=>s.is_live)[0] || filteredStreams[0]
                  if (!topStream) return null
                  return (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-red-500/30 bg-gradient-to-r from-red-950/50 via-gray-900 to-gray-900 p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500 text-white">🔴 TOP 방송</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={topStream.url} target="_blank" rel="noopener noreferrer" className="text-white font-semibold text-base hover:text-red-300 transition-colors line-clamp-1">{topStream.title}</a>
                          <p className="text-gray-400 text-sm mt-1">{topStream.channel_name} · <span style={{color:PLATFORM_COLORS[topStream.platform]}}>{topStream.platform}</span></p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-500">{periodLabel} 수집</p>
                          <p className="text-2xl font-bold text-red-400">{filteredStreams.length}<span className="text-sm text-gray-500 ml-1">건</span></p>
                          <p className="text-xs text-gray-500 mt-1">🔴 라이브 {filteredStreams.filter(s=>s.is_live).length}건</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-red-500/20 flex gap-4">
                        {['자사','경쟁사','업계'].map(cat => (
                          <button key={cat} onClick={() => handleStreamClick(cat)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105" style={{backgroundColor:COLORS[cat]+'22', color:COLORS[cat], border:`1px solid ${COLORS[cat]}44`}}>
                            {cat} <span className="font-bold">{filteredStreams.filter(s=>s.category===cat).length}건</span>
                          </button>
                        ))}
                        <div className="ml-auto flex gap-3">
                          {['유튜브','치지직','SOOP'].map(p => (
                            <button key={p} onClick={() => handleStreamClick(undefined, p)} className="text-xs px-2 py-1 rounded-lg transition-all hover:scale-105" style={{backgroundColor:PLATFORM_COLORS[p]+'22', color:PLATFORM_COLORS[p]}}>
                              {p} {filteredStreams.filter(s=>s.platform===p).length}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 방송 시각화 섹션 */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 키워드 워드클라우드 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">☁️ 방송 키워드</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <WordCloud words={commKeywordFreq} onWordClick={(word: string) => { setSelectedCommKeyword(selectedCommKeyword === word ? '' : word); scrollToList() }} selectedWord={selectedCommKeyword} />
                  </div>

                  {/* 인기 채널 TOP 5 - 탭 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">🏆 인기 채널 TOP 5</p>
                      <div className="flex gap-1 bg-gray-700 p-0.5 rounded-lg">
                        <button onClick={() => setChannelSort('count')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${channelSort==='count'?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>방송 횟수</button>
                        <button onClick={() => setChannelSort('viewers')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${channelSort==='viewers'?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>시청자 수</button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {(channelSort==='count' ? topChannelsByCount : topChannelsByViewers).map((ch, i) => (
                        <div key={ch.name} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 text-center ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{ch.name}</p>
                            <p className="text-xs" style={{color:PLATFORM_COLORS[ch.platform]}}>{ch.platform}</p>
                          </div>
                          <div className="text-right">
                            {channelSort==='count'
                              ? <p className="text-xs text-gray-300 font-medium">{ch.count}건</p>
                              : <p className="text-xs text-blue-400 font-medium">{ch.viewers.toLocaleString()}명</p>
                            }
                            {ch.live > 0 && <p className="text-xs text-red-400">🔴 LIVE</p>}
                          </div>
                        </div>
                      ))}
                      {(channelSort==='viewers' && topChannelsByViewers.length === 0) && (
                        <p className="text-xs text-gray-600 text-center py-4">시청자 수 데이터 수집 중...</p>
                      )}
                    </div>
                  </div>

                  {/* 신규 채널 */}
                  <div className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 font-medium mb-3">✨ 신규 채널</p>
                    <p className="text-4xl font-bold text-emerald-400 mb-1">{newChannels.length}<span className="text-lg text-gray-500 font-normal ml-1">개</span></p>
                    <p className="text-xs text-gray-600 mb-4">{periodLabel} 기간 첫 등장</p>
                    <div className="space-y-1.5">
                      {newChannels.slice(0,4).map(ch => (
                        <div key={ch} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          <span className="text-xs text-gray-400 truncate">{ch}</span>
                        </div>
                      ))}
                      {newChannels.length > 4 && <p className="text-xs text-gray-600">+{newChannels.length-4}개 더</p>}
                    </div>
                  </div>

                  {/* 7일간 플랫폼별 추이 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📈 7일간 플랫폼별 추이</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={Array.from({length:7},(_,i)=>{
                        const d=new Date(); d.setDate(d.getDate()-(6-i))
                        const ds=d.toISOString().split('T')[0]
                        return {
                          date:`${d.getMonth()+1}/${d.getDate()}`,
                          유튜브: streams.filter(s=>s.platform==='유튜브'&&(s.started_at||'').startsWith(ds)).length,
                          치지직: streams.filter(s=>s.platform==='치지직'&&(s.started_at||'').startsWith(ds)).length,
                        }
                      })}>
                        <defs>
                          <linearGradient id="gradYT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradCZ" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        <Area type="monotone" dataKey="유튜브" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradYT)"/>
                        <Area type="monotone" dataKey="치지직" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradCZ)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {['유튜브','치지직'].map(p=><div key={p} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PLATFORM_COLORS[p]}}></div><span className="text-xs text-gray-500">{p}</span></div>)}
                    </div>
                  </div>

                  {/* 카테고리별 라이브 vs VOD */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500 font-medium">📊 카테고리별 라이브 vs VOD</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={['자사','경쟁사','업계'].map(cat=>({
                        name: cat,
                        라이브: filteredStreams.filter(s=>s.category===cat&&s.is_live).length,
                        VOD: filteredStreams.filter(s=>s.category===cat&&!s.is_live).length,
                      }))} onClick={(d:any)=>{if(d?.activeLabel)handleStreamClick(d.activeLabel)}}>
                        <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        <Bar dataKey="라이브" stackId="a" fill="#ef4444" radius={[0,0,0,0]}/>
                        <Bar dataKey="VOD" stackId="a" fill="#6366f1" radius={[4,4,0,0]}/>
                        <Legend wrapperStyle={{fontSize:'11px'}}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 시간대별 방송량 히트맵 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500 font-medium">⏰ 시간대별 방송량</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    {(() => {
                      const hourly = Array.from({length:24},(_,h)=>({
                        h, count: filteredStreams.filter(s=>{
                          const d=s.started_at; return d&&new Date(d).getHours()===h
                        }).length
                      }))
                      const max = Math.max(...hourly.map(x=>x.count),1)
                      const peak = hourly.reduce((a,b)=>a.count>b.count?a:b)
                      return (
                        <>
                          <div className="grid grid-cols-6 gap-1 mb-2">
                            {hourly.map(h=>{
                              const intensity=h.count/max
                              return (
                                <div key={h.h} className="flex flex-col items-center gap-1">
                                  <div className="w-full h-8 rounded" style={{backgroundColor:intensity>0?`rgba(239,68,68,${0.15+intensity*0.85})`:'#1f2937'}} title={`${h.h}시 ${h.count}건`}></div>
                                  {h.h%4===0&&<span className="text-xs text-gray-600">{h.h}</span>}
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-2 text-center">
                            <span className="text-xs text-gray-500">피크: {peak.h}시 ({peak.count}건)</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-4" ref={listRef}>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-1">
                      {['전체','긍정','부정','중립'].map(s => (
                        <button key={s} onClick={() => setCommSentiment(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${commSentiment===s?'text-white':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={commSentiment===s&&s!=='전체'?{backgroundColor:SENTIMENT_COLORS[s]}:commSentiment===s?{backgroundColor:'#374151',color:'white'}:{}}>{s}</button>
                      ))}
                    </div>
                    <div className="flex gap-1 ml-auto flex-wrap">
                      {['전체',...Object.keys(COMMUNITY_COLORS)].map(c => (
                        <button key={c} onClick={() => setCommCommunity(c)} className={`px-3 py-1.5 rounded-lg text-xs ${commCommunity===c?'text-white':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={commCommunity===c&&c!=='전체'?{backgroundColor:COMMUNITY_COLORS[c]}:commCommunity===c?{backgroundColor:'#374151',color:'white'}:{}}>{c}</button>
                      ))}
                    </div>
                    <input type="text" placeholder="검색..." value={commSearch} onChange={e => setCommSearch(e.target.value)} className="bg-gray-700 text-white px-3 py-1.5 rounded-lg outline-none border border-gray-600 text-xs w-40" />
                    {selectedCommKeyword && <button onClick={() => setSelectedCommKeyword('')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-300 border border-indigo-500/50">☁️ {selectedCommKeyword} <span className="opacity-60">✕</span></button>}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{filteredPosts.length}건 표시 중</p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {filteredPosts.slice(0, postLimit).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 rounded-xl p-4 border-l-4 border border-gray-700 hover:border-gray-500 transition-all hover:-translate-y-0.5" style={{ borderLeftColor: SENTIMENT_COLORS[item.sentiment] }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: SENTIMENT_COLORS[item.sentiment] }}>{item.sentiment==='긍정'?'😊':item.sentiment==='부정'?'😠':'😐'} {item.sentiment}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium ml-auto" style={{ backgroundColor: (COMMUNITY_COLORS[item.community]||'#6b7280')+'33', color: COMMUNITY_COLORS[item.community]||'#9ca3af' }}>{item.community}</span>
                      </div>
                      <h2 className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">{item.title}</h2>
                      {item.sentiment_reason && <p className="text-gray-600 text-xs line-clamp-1">{item.sentiment_reason}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {item.views > 0 && <span className="text-xs text-gray-700">👀 {item.views.toLocaleString()}</span>}
                        {item.comments > 0 && <span className="text-xs text-gray-700">💬 {item.comments.toLocaleString()}</span>}
                        <span className="text-xs text-gray-700 ml-auto">{item.collected_at ? new Date(item.collected_at).toLocaleDateString('ko-KR') : ''}</span>
                      </div>
                    </a>
                  ))}
                </div>
                {filteredPosts.length > postLimit && (
                  <button onClick={() => setPostLimit(p => p+24)} className="w-full mt-4 py-3 bg-gray-800 text-gray-500 rounded-xl text-xs hover:bg-gray-700 border border-gray-700">더보기 ({filteredPosts.length - postLimit}건)</button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
