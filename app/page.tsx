'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts'

type NewsKeyword = { keyword: string; category: string; count: number }
type News = { id: string; title: string; summary: string; url: string; source: string; category: string; tags: string[]; published_at: string; collected_at: string }
type Stream = { id: string; title: string; channel_name: string; platform: string; url: string; thumbnail: string; category: string; tags: string[]; is_live: boolean; started_at: string; viewer_count: number; collected_at: string }
type Post = { id: string; title: string; content: string; url: string; community: string; views: number; comments: number; sentiment: string; sentiment_reason: string; keyword: string; posted_at: string; collected_at: string }

const COLORS: Record<string, string> = {
  '자사': '#6366f1', '경쟁사': '#ef4444', '업계': '#10b981',
  '드림에이지': '#4f46e5', '아키텍트': '#6366f1', '알케론': '#a5b4fc',
  '포트나이트': '#b91c1c', '리그오브레전드': '#ef4444', '이터널리턴': '#f87171', '배틀그라운드': '#dc2626', '발로란트': '#fca5a5',
  '모바일게임': '#059669', '콘솔게임': '#10b981', '스팀': '#34d399', '신작': '#6ee7b7', '서비스종료': '#a7f3d0', 'PC게임': '#34d399', '사전예약': '#6ee7b7', '런칭': '#a7f3d0',
}
const SENTIMENT_COLORS: Record<string, string> = { '긍정': '#10b981', '부정': '#ef4444', '중립': '#6b7280' }
const SEGMENT_ALIASES: Record<string, string[]> = {
  '드림에이지':    ['드림에이지','drimage','dream age'],
  '알케론':        ['알케론','arkheron'],
  '아키텍트':      ['아키텍트','드림에이지 아키텍트'],
  '포트나이트':    ['포트나이트','fortnite'],
  '리그오브레전드':['리그오브레전드','리그 오브 레전드','league of legends','lol','롤'],
  '이터널리턴':    ['이터널리턴','이터널 리턴','eternal return','eternalreturn','블랙서바이벌'],
  '배틀그라운드':  ['배틀그라운드','pubg','battlegrounds','배그'],
  '발로란트':      ['발로란트','valorant'],
  '오버워치2':      ['오버워치2','오버워치','overwatch2','overwatch'],
  '에이펙스 레전드': ['에이펙스 레전드','에이펙스','apex legends','apex'],
}

const PLATFORM_COLORS: Record<string, string> = { '유튜브': '#ef4444', '치지직': '#02C75A', 'SOOP': '#006EFF' }
const PLATFORM_ICONS: Record<string, string> = {
  '유튜브': '<svg viewBox="0 0 24 24" fill="#ef4444"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>',
  '치지직': '<svg viewBox="0 0 24 24" fill="#02C75A"><path d="M7 2l2 5h3l-5 8 1-5H5L7 2zm4 13l2 5h3l-5-5zm5-8l2 3-2 3h3l2-3-2-3h-3z"/></svg>',
  'SOOP': '<svg viewBox="0 0 24 24" fill="#006EFF"><path d="M12 2C8 2 5 4.5 5 8c0 2 1 3.5 2.5 4.5C5.5 13.5 4 15.5 4 18h2c0-2.5 2-4 4-4h.5C8.5 13 7 11.5 7 8c0-2.8 2.2-4 5-4s5 1.2 5 4c0 3.5-1.5 5-3.5 6h.5c2 0 4 1.5 4 4h2c0-2.5-1.5-4.5-3.5-5.5C18 11.5 19 10 19 8c0-3.5-3-6-7-6z"/></svg>',
}

const COMMUNITY_COLORS: Record<string, string> = { '인벤': '#f59e0b', '루리웹': '#6366f1', '디시인사이드': '#ef4444', '네이버카페': '#10b981', '아카라이브': '#8b5cf6', '에펨코리아': '#3b82f6', '네이트판': '#ec4899' }
const SEGMENTS: Record<string, string[]> = {
  '자사': ['드림에이지', '아키텍트', '알케론'],
  '경쟁사': ['포트나이트', '리그오브레전드', '이터널리턴', '배틀그라운드', '발로란트', '오버워치2', '에이펙스 레전드'],
  '업계': ['신작', '런칭', '사전예약', '얼리액세스', '지스타', '배틀로얄 신작', 'MMORPG 신작', '게임스컴', '도쿄게임쇼', 'GDC', '크로스플랫폼 게임', '스팀 인기 게임'],
}
const COMMUNITY_META: Record<string, {category: string, gender: string, age: string}> = {
  '인벤':       { category: '웹진',     gender: '혼합',    age: '20-30대' },
  '루리웹':     { category: '웹진',     gender: '혼합',    age: '20-30대' },
  '디시인사이드':{ category: '게임특화', gender: '남성중심', age: '10-30대' },
  '아카라이브': { category: '게임특화', gender: '혼합',    age: '10-20대' },
  '네이버카페': { category: '유저특화', gender: '혼합',    age: '다양'    },
  '에펨코리아': { category: '유저특화', gender: '남성중심', age: '20-30대' },
  '네이트판':   { category: '유저특화', gender: '여성중심', age: '20-30대' },
}
const CATEGORY_COLORS: Record<string, string> = {
  '웹진': '#6366f1', '게임특화': '#ef4444', '유저특화': '#10b981', '인플루언서': '#f59e0b'
}
const GENDER_COLORS: Record<string, string> = {
  '남성중심': '#3b82f6', '여성중심': '#ec4899', '혼합': '#8b5cf6'
}

const SOURCE_MAP: Record<string, string> = { '구글 뉴스': 'Google News', '네이버 뉴스': '네이버 -', '네이버 블로그': '네이버블로그' }
const COMM_KEYWORDS: Record<string, string[]> = {
  '자사': ['드림에이지', '알케론', 'arkheron', 'Arkheron', '아키텍트', '드림에이지 아키텍트'],
  '경쟁사': ['포트나이트', '이터널리턴', '배틀그라운드', '발로란트', '리그오브레전드', '오버워치2', '에이펙스 레전드'],
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
  const toUTC = (d: string, t: string) => new Date(d + 'T' + t + '+09:00').toISOString().replace('.000Z', '')
  if (dateMode === 'single') return { from: toUTC(selectedDate, '00:00:00'), to: toUTC(selectedDate, '23:59:59') }
  return { from: toUTC(rangeFrom, '00:00:00'), to: toUTC(rangeTo, '23:59:59') }
}

function getKSTDate(offsetDays = 0) {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  if (offsetDays) kst.setDate(kst.getDate() + offsetDays)
  return kst.toISOString().split('T')[0]
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'news' | 'streams' | 'community'>('news')
  const [news, setNews] = useState<News[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [dateMode, setDateMode] = useState<'single' | 'range'>('range')
  const [selectedDate, setSelectedDate] = useState(getKSTDate())
  const [rangeFrom, setRangeFrom] = useState(() => getKSTDate(-7))
  const [rangeTo, setRangeTo] = useState(getKSTDate())
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
  const [platformModal, setPlatformModal] = useState<string | null>(null)
  const [coverChannelModal, setCoverChannelModal] = useState<boolean>(false)
  const [streamInfoTab, setStreamInfoTab] = useState<'keywords'|'multi'>('keywords')
  const [influencerModal, setInfluencerModal] = useState<boolean>(false)
  const [influencerCatTab, setInfluencerCatTab] = useState<'전체'|'자사'|'경쟁사'>('전체')
  const [influencerTier, setInfluencerTier] = useState<'S'|'A'|'B'|'C'>('S')
  const [coverageModal, setCoverageModal] = useState<string | null>(null)
  const [selectedCommKeyword, setSelectedCommKeyword] = useState<string>('')
  const [commKwDetailTab, setCommKwDetailTab] = useState<string>('드림에이지')
  const [commChannelPopup, setCommChannelPopup] = useState<string>('')
  const [newsSourcePopup, setNewsSourcePopup] = useState<string>('')
  const [commSubKeyword, setCommSubKeyword] = useState<string>('전체')
  const [commCategoryFilter, setCommCategoryFilter] = useState<string>('전체')
  const [channelSort, setChannelSort] = useState<'count'|'viewers'>('count')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAll() }, [])
  // 날짜 변경 시 또는 초기 로딩 완료 시 키워드 재조회
  useEffect(() => { fetchKeywords(df, dt) }, [dateMode, selectedDate, rangeFrom, rangeTo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!loading) fetchKeywords(df, dt) }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'streams') { setDateMode('single'); setSelectedDate(getKSTDate()) } else { setDateMode('range'); setRangeFrom(getKSTDate(-7)); setRangeTo(getKSTDate()) } }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true)
    const [{ data: n }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('news').select('*').gte('published_at', new Date(Date.now()-30*24*60*60*1000).toISOString()).order('published_at', { ascending: false }).limit(3000),
      supabase.from('streams').select('*').gte('collected_at', new Date(Date.now()-90*24*60*60*1000).toISOString()).order('collected_at', { ascending: false }).limit(2000),
      supabase.from('community_posts').select('*').gte('collected_at', new Date(Date.now()-90*24*60*60*1000).toISOString()).order('collected_at', { ascending: false }).limit(5000),
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
    const isWebzine = n.source?.includes('인벤') || n.source?.includes('루리웹') || n.source?.includes('thisisgame')
    const matchSource = sourceType === '전체' || 
      (sourceType === '게임웹진' ? isWebzine : !isWebzine && n.source?.includes(SOURCE_MAP[sourceType]))
    const matchKeyword = !selectedKeyword || (keywordNewsMap[selectedKeyword] ? keywordNewsMap[selectedKeyword].includes(n.id) : n.title?.includes(selectedKeyword) || n.summary?.includes(selectedKeyword) || n.tags?.includes(selectedKeyword))
    const dateVal = n.published_at || n.collected_at || ''
    return matchCat && matchSeg && matchSearch && matchSource && matchKeyword && dateVal >= df && dateVal <= dt
  }), [news, category, segment, search, sourceType, selectedKeyword, df, dt])

  const filteredStreams = useMemo(() => streams.filter(s => {
    const matchCat = streamCategory === '전체' || s.category === streamCategory
    const matchPlatform = streamPlatform === '전체' || s.platform === streamPlatform
    const matchSearch = s.title?.toLowerCase().includes(streamSearch.toLowerCase()) || s.channel_name?.toLowerCase().includes(streamSearch.toLowerCase())
    const matchType = streamType === '전체' || (streamType === '생방송' && s.is_live) || (streamType === 'VOD' && !s.is_live)
    const segAliases = SEGMENT_ALIASES[streamSegment] || [streamSegment]
    const matchSeg = !streamSegment || segAliases.some((alias: string) =>
      (s.tags as string[] || []).some((t: string) => t.toLowerCase().includes(alias.toLowerCase())) ||
      (s.title||'').toLowerCase().includes(alias.toLowerCase())
    )
    const matchStreamKw = !selectedStreamKeyword || s.tags?.includes(selectedStreamKeyword) || s.title?.includes(selectedStreamKeyword)
    const dateVal = s.platform === '유튜브' ? (s.collected_at || s.started_at || '') : (s.started_at || s.collected_at || '')
    const matchDate = dateVal >= df && dateVal <= dt
    return matchCat && matchPlatform && matchSearch && matchType && matchSeg && matchDate && matchStreamKw
  }), [streams, streamCategory, streamPlatform, streamSearch, streamType, streamSegment, df, dt, selectedStreamKeyword])

  const COMM_SUB_KEYWORDS: Record<string,string[]> = {
    '드림에이지': ['드림에이지'],
    '알케론': ['알케론','arkheron','Arkheron'],
    '아키텍트': ['아키텍트', '드림에이지 아키텍트'],
    '포트나이트': ['포트나이트'], '이터널리턴': ['이터널리턴'],
    '배틀그라운드': ['배틀그라운드'], '발로란트': ['발로란트'],
    '리그오브레전드': ['리그오브레전드'], '오버워치2': ['오버워치2'], '에이펙스 레전드': ['에이펙스 레전드'],
  }
  const currentKeywords = commSubKeyword !== '전체' && COMM_SUB_KEYWORDS[commSubKeyword]
    ? COMM_SUB_KEYWORDS[commSubKeyword]
    : COMM_KEYWORDS[commKeyword] || []
  const keywordPosts = posts.filter(p => currentKeywords.some(kw => p.keyword === kw || p.title?.includes(kw)))
  const filteredPosts = useMemo(() => keywordPosts.filter(p => {
    const matchSentiment = commSentiment === '전체' || p.sentiment === commSentiment
    const matchCommunity = commCommunity === '전체' || p.community === commCommunity
    const matchSearch = p.title?.toLowerCase().includes(commSearch.toLowerCase())
    const matchCommKw = !selectedCommKeyword || p.title?.includes(selectedCommKeyword) || p.content?.includes(selectedCommKeyword)
    const meta = COMMUNITY_META[p.community] || { category: '', gender: '', age: '' }
    const matchCategory = commCategoryFilter === '전체' || meta.category === commCategoryFilter
    const dateVal = p.posted_at || p.collected_at || ''
    return matchSentiment && matchCommunity && matchSearch && matchCommKw && matchCategory && dateVal >= df && dateVal <= dt
  }), [keywordPosts, commSentiment, commCommunity, commSearch, df, dt, selectedCommKeyword, commCategoryFilter])

  // 뉴스 통계 - 모두 filteredNews 기준으로 통일
  const yestFrom = yesterday + 'T00:00:00'
  const yestTo = yesterday + 'T23:59:59'
  const newsCatCount = ['자사', '경쟁사', '업계'].map(cat => {
    const catDateNews = news.filter(n => { const dv = n.published_at || n.collected_at || ''; return n.category === cat && dv >= df && dv <= dt })
    const periodCnt = catDateNews.length
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
        value: catDateNews.filter(n => n.tags?.includes(seg) || n.title?.includes(seg)).length
      }))
    }
  })
  const newsSegData = Object.entries(SEGMENTS).flatMap(([cat, segs]) => segs.map(seg => ({
    name: seg,
    value: filteredNews.filter(n => n.category === cat && (n.tags?.includes(seg) || n.title?.includes(seg))).length,
    cat
  })))
  const news7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + 9*60*60*1000); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return { date: `${d.getMonth()+1}/${d.getDate()}`, count: news.filter(n => (n.published_at||n.collected_at||'').startsWith(ds)).length }
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
      .filter(k => !['루리웹','인벤','네이버','구글','뉴스','블로그','기사','출처','게임뉴스'].includes(k.keyword))
      .slice(0, 30)
      .map(k => ({ name: k.keyword, count: k.count, cat: k.category }))
  })()

  // 소스별 비중 - filteredNews 기준
  const sourceFreq = (() => {
    const freq: Record<string, number> = {}
    filteredNews.forEach(n => {
      const src = n.source?.includes('인벤') ? '게임웹진'
        : n.source?.includes('루리웹') ? '게임웹진'
        : n.source?.includes('thisisgame') ? '게임웹진'
        : n.source?.includes('Google News') ? '구글 뉴스'
        : n.source?.includes('네이버블로그') ? '네이버 블로그'
        : n.source?.includes('네이버') ? '네이버 뉴스'
        : n.source?.includes('루리웹') ? '기타'
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
      const src = n.source?.includes('인벤') ? '게임웹진'
        : n.source?.includes('루리웹') ? '게임웹진'
        : n.source?.includes('thisisgame') ? '게임웹진'
        : n.source?.includes('Google News') ? '구글 뉴스'
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
  const liveCount = streamPlatCount.reduce((sum, p) => sum + p.live, 0)
  const streamCatCount = ['자사', '경쟁사', '업계'].map(cat => ({ name: cat, value: streams.filter(s => s.category === cat && (s.started_at||'') >= df && (s.started_at||'') <= dt).length }))

  // 커뮤니티 통계
  const dateFilteredKeywordPosts = keywordPosts.filter(p => {
    const dv = p.posted_at || p.collected_at || ''
    return dv >= df && dv <= dt
  })
  // 카테고리 필터까지 적용된 기준 (감성/채널/검색 제외)
  const categoryFilteredPosts = commCategoryFilter === '전체' ? dateFilteredKeywordPosts : dateFilteredKeywordPosts.filter(p => {
    const meta = COMMUNITY_META[p.community] || { category: '', gender: '', age: '' }
    return meta.category === commCategoryFilter
  })
  const sentimentCount = ['긍정', '부정', '중립'].map(s => ({ name: s, value: categoryFilteredPosts.filter(p => p.sentiment === s).length }))
  const commCount = Object.keys(COMMUNITY_COLORS).map(c => ({ name: c, value: categoryFilteredPosts.filter(p => p.community === c).length })).filter(c => c.value > 0)


  // 방송 시간대별 데이터 (KST 기준)
  const streamHourlyData = useMemo(() => Array.from({length: 24}, (_, h) => ({
    hour: `${h}시`, h,
    count: filteredStreams.filter(s => {
      const d = s.started_at
      if (!d) return false
      const kstHour = (new Date(d).getUTCHours() + 9) % 24
      return kstHour === h
    }).length
  })), [filteredStreams])

  // 인플루언서 가치 점수
  const influencerData = useMemo(() => {
    const channelMap: Record<string, {name:string, platform:string, url:string, category:string, streams:any[]}> = {}
    streams.forEach(s => {
      if (!s.channel_name) return
      if (!channelMap[s.channel_name]) channelMap[s.channel_name] = {name:s.channel_name, platform:s.platform||'', url:s.url||'', category:s.category||'', streams:[]}
      channelMap[s.channel_name].streams.push(s)
    })
    return Object.values(channelMap).map(ch => {
      const count = ch.streams.length
      const avgViewers = Math.round(ch.streams.reduce((s:number,x:any)=>s+(x.viewer_count||0),0)/(count||1))
      const lastDate = ch.streams.reduce((a:string,s:any)=>(s.started_at||'')>a?(s.started_at||''):a,'')
      const daysSince = lastDate ? Math.floor((Date.now()-new Date(lastDate).getTime())/86400000) : 999
      const recency = daysSince<=1?50:daysSince<=7?30:daysSince<=14?15:daysSince<=30?5:0
      const score = Math.round(count*10 + avgViewers*0.05 + recency)
      const tier: 'S'|'A'|'B'|'C' = score>=150?'S':score>=80?'A':score>=30?'B':'C'
      return {...ch, count, avgViewers, lastDate, daysSince, score, tier}
    }).sort((a,b)=>b.score-a.score)
  }, [streams])

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

  // 경쟁사 키워드별 7일 추이
  const commComp7d = useMemo(() => Array.from({length:7}, (_, i) => {
    const d = new Date(Date.now() + 9*60*60*1000); d.setDate(d.getDate()-(6-i))
    const ds = d.toISOString().split('T')[0]
    const byKw = (kw: string) => posts.filter(p => p.keyword===kw && (p.posted_at||p.collected_at||'').startsWith(ds)).length
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`,
      포트나이트: byKw('포트나이트'),
      이터널리턴: byKw('이터널리턴'),
      배틀그라운드: byKw('배틀그라운드'),
      발로란트: byKw('발로란트'),
      롤: byKw('리그오브레전드'),
    }
  }), [posts])

  // 자사 키워드별 7일 추이
  const commKeyword7d = useMemo(() => Array.from({length:7}, (_, i) => {
    const d = new Date(Date.now() + 9*60*60*1000); d.setDate(d.getDate()-(6-i))
    const ds = d.toISOString().split('T')[0]
    const byKw = (kws: string[]) => posts.filter(p => kws.some(kw=>p.keyword===kw) && (p.posted_at||p.collected_at||'').startsWith(ds)).length
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`,
      드림에이지: byKw(['드림에이지']),
      알케론: byKw(['알케론','arkheron','Arkheron']),
      아키텍트: byKw(['아키텍트']),
    }
  }), [posts])

  // 최고 반응 게시물 TOP5
  const topCommPosts = useMemo(() =>
    [...categoryFilteredPosts]
      .filter(p => (p.views||0) > 0 || (p.comments||0) > 0)
      .sort((a,b) => ((b.views||0)+(b.comments||0)*5) - ((a.views||0)+(a.comments||0)*5))
      .slice(0, 5),
    [categoryFilteredPosts]
  )

  // 커뮤니티 요일별 패턴
  const commWeekdayData = useMemo(() => {
    const dayNames = ['일','월','화','수','목','금','토']
    return dayNames.map((day, i) => ({
      day,
      웹진: dateFilteredKeywordPosts.filter(p => { const d=p.posted_at||p.collected_at; return d&&new Date(d).getDay()===i&&['인벤','루리웹'].includes(p.community) }).length,
      게임특화: dateFilteredKeywordPosts.filter(p => { const d=p.posted_at||p.collected_at; return d&&new Date(d).getDay()===i&&['디시인사이드','아카라이브'].includes(p.community) }).length,
      유저특화: dateFilteredKeywordPosts.filter(p => { const d=p.posted_at||p.collected_at; return d&&new Date(d).getDay()===i&&['네이버카페','에펨코리아','네이트판'].includes(p.community) }).length,
    }))
  }, [dateFilteredKeywordPosts])

  // 커뮤니티 시간대별 게시물량
  const commHourlyData = useMemo(() => Array.from({length:24}, (_, h) => ({
    hour: `${h}시`, h,
    count: categoryFilteredPosts.filter(p => {
      const d = p.posted_at || p.collected_at
      if (!d) return false
      const kstHour = (new Date(d).getUTCHours()+9)%24
      return kstHour === h
    }).length
  })), [categoryFilteredPosts])

  // 커뮤니티 7일간 카테고리별 추이
  const comm7dByCat = useMemo(() => Array.from({length:7}, (_, i) => {
    const d = new Date(Date.now() + 9*60*60*1000); d.setDate(d.getDate()-(6-i))
    const ds = d.toISOString().split('T')[0]
    const byComm = (comms: string[]) => keywordPosts.filter(p => comms.includes(p.community) && (p.posted_at||p.collected_at||'').startsWith(ds)).length
    return {
      date: `${d.getMonth()+1}/${d.getDate()}`,
      웹진: byComm(['인벤','루리웹']),
      게임특화: byComm(['디시인사이드','아카라이브']),
      유저특화: byComm(['네이버카페','에펨코리아','네이트판']),
    }
  }), [posts])

  const posRate = categoryFilteredPosts.length > 0 ? Math.round(sentimentCount[0].value / categoryFilteredPosts.length * 100) : 0
  const negRate = categoryFilteredPosts.length > 0 ? Math.round(sentimentCount[1].value / categoryFilteredPosts.length * 100) : 0

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">게임 업계 동향 모니터링_알케론 기준</h1>
          <p className="text-xs text-gray-500">DRIMAGE_게임마케팅실</p>
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
                  const t = getKSTDate()
                  const ds = getKSTDate(-days)
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
                  {/* 전체 카드 */}
                  <button onClick={() => { setCategory('전체'); setSegment('') }} className={"col-span-2 bg-gray-800 rounded-2xl p-5 border transition-all text-left group " + (category==='전체'&&!segment ? "border-white" : "border-gray-700 hover:border-gray-500")}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 font-medium">전체 뉴스</span>
                      <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + (category==='전체'&&!segment ? "bg-white text-gray-900" : "bg-gray-700 text-gray-400")}>ALL</span>
                    </div>
                    <p className="text-4xl font-bold mb-1 text-white">{newsCatCount.reduce((s,c)=>s+c.todayCnt,0)}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                    <p className="text-xs text-gray-600 mb-2">전체 누적 {news.length}건</p>
                    <div className="space-y-1">
                      {newsCatCount.map(c => (
                        <div key={c.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:COLORS[c.name]}}></div>
                          <span className="text-xs text-gray-400 flex-1">{c.name}</span>
                          <span className="text-xs font-bold" style={{color:COLORS[c.name]}}>{c.todayCnt}</span>
                        </div>
                      ))}
                    </div>
                  </button>

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
                      <div className="mt-3 flex flex-wrap gap-1">
                        {c.segments.map(seg => (
                          <button key={seg.name} onClick={(e) => { e.stopPropagation(); handleNewsClick(c.name, seg.name) }}
                            className={"text-xs px-2 py-0.5 rounded-full transition-all hover:scale-105 " + (segment === seg.name ? "ring-1 ring-white" : "")}
                            style={{ backgroundColor: (COLORS[seg.name]||COLORS[c.name])+"33", color: COLORS[seg.name]||COLORS[c.name], border: "1px solid " + (COLORS[seg.name]||COLORS[c.name]) + "44" }}>
                            {seg.name} {seg.value}
                          </button>
                        ))}
                      </div>
                    </button>
                  ))}

                  {/* 7일 트렌드 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📈 7일간 카테고리별 추이</p>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={(() => {
                        return Array.from({ length: 7 }, (_, i) => {
                          const _kst=new Date(Date.now()+9*3600000); const _y=_kst.getUTCFullYear(),_mo=_kst.getUTCMonth(),_bd=_kst.getUTCDate();
                          const _d=new Date(Date.UTC(_y,_mo,_bd-(6-i))); const ds=_d.toISOString().split("T")[0];
                          const _dn=new Date(Date.UTC(_y,_mo,_bd-(6-i)+1)); const dsn=_dn.toISOString().split("T")[0];
                          return {
                            date: `${_d.getUTCMonth()+1}/${_d.getUTCDate()}`,
                            자사: news.filter(n=>{const v=n.published_at||n.collected_at||"";return n.category==="자사"&&v>=ds&&v<dsn}).length,
                            경쟁사: news.filter(n=>{const v=n.published_at||n.collected_at||"";return n.category==="경쟁사"&&v>=ds&&v<dsn}).length,
                            업계: news.filter(n=>{const v=n.published_at||n.collected_at||"";return n.category==="업계"&&v>=ds&&v<dsn}).length,
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
                          <div key={s.name} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/40 rounded px-1 -mx-1 transition-colors" onClick={()=>setNewsSourcePopup(s.name)}>
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

                {newsSourcePopup && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setNewsSourcePopup('')}>
                  <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <p className="text-sm font-bold text-white">{newsSourcePopup} <span className="text-gray-500 font-normal text-xs">기사 목록</span></p>
                      <button onClick={()=>setNewsSourcePopup('')} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-2">
                      {filteredNews.filter(n => {
                        const mapped = n.source?.includes('인벤')?'게임웹진':n.source?.includes('루리웹')?'게임웹진':n.source?.includes('thisisgame')?'게임웹진':n.source?.includes('네이버블로그')?'네이버 블로그':n.source?.includes('네이버')?'네이버 뉴스':n.source?.includes('Google News')?'구글 뉴스':'기타'
                        return mapped === newsSourcePopup
                      }).slice(0,50).map(n=>(
                        <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-white line-clamp-2 flex-1">{n.title}</p>
                            <span className={"text-xs px-1.5 py-0.5 rounded flex-shrink-0 "+(n.category==='자사'?'bg-indigo-900/50 text-indigo-400':n.category==='경쟁사'?'bg-red-900/50 text-red-400':'bg-gray-700 text-gray-400')}>{n.category}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{(n.published_at||'').slice(0,10)}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                          { key: '게임웹진', label: 'Webzine', icon: '🎮' },
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
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">☁️ 방송 키워드</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <WordCloud words={streamKeywordFreq} onWordClick={(word: string) => { setSelectedStreamKeyword(selectedStreamKeyword === word ? '' : word); scrollToList() }} selectedWord={selectedStreamKeyword} />
                  </div>

                  {/* 7일간 플랫폼별 추이 (SOOP 추가) */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📈 7일간 플랫폼별 추이</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={Array.from({length:7},(_,i)=>{
                        const d=new Date(Date.now()+9*60*60*1000); d.setDate(d.getDate()-(6-i))
                        const ds=d.toISOString().split('T')[0]
                        return {
                          date:`${d.getMonth()+1}/${d.getDate()}`,
                          유튜브: streams.filter(s=>s.platform==='유튜브'&&(s.started_at||'').startsWith(ds)).length,
                          치지직: streams.filter(s=>s.platform==='치지직'&&(s.started_at||'').startsWith(ds)).length,
                          SOOP: streams.filter(s=>s.platform==='SOOP'&&(s.started_at||'').startsWith(ds)).length,
                        }
                      })}>
                        <defs>
                          <linearGradient id="gradYT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradCZ" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#02C75A" stopOpacity={0.3}/><stop offset="95%" stopColor="#02C75A" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gradSP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#006EFF" stopOpacity={0.3}/><stop offset="95%" stopColor="#006EFF" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        <Area type="monotone" dataKey="유튜브" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradYT)"/>
                        <Area type="monotone" dataKey="치지직" stroke="#02C75A" strokeWidth={1.5} fill="url(#gradCZ)"/>
                        <Area type="monotone" dataKey="SOOP" stroke="#006EFF" strokeWidth={1.5} fill="url(#gradSP)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {['유튜브','치지직','SOOP'].map(p=><div key={p} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PLATFORM_COLORS[p]}}></div><span className="text-xs text-gray-500">{p}</span></div>)}
                    </div>
                  </div>

                  {/* 요일별 방송 패턴 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📅 요일별 방송 패턴</p>
                      <span className="text-xs font-medium" style={{color:PLATFORM_COLORS['유튜브']}}>
                        최다: {streamWeekdayData.reduce((a,b)=>(a.유튜브+a.치지직+a.SOOP)>(b.유튜브+b.치지직+b.SOOP)?a:b).day}요일
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={streamWeekdayData} barCategoryGap="20%">
                        <XAxis dataKey="day" tick={{fill:'#9ca3af',fontSize:12}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any,n:any)=>[`${v}건`,n]}/>
                        <Bar dataKey="유튜브" stackId="a" fill="#ef4444"/>
                        <Bar dataKey="치지직" stackId="a" fill="#02C75A"/>
                        <Bar dataKey="SOOP" stackId="a" fill="#006EFF" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {['유튜브','치지직','SOOP'].map(p=><div key={p} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PLATFORM_COLORS[p]}}></div><span className="text-xs text-gray-500">{p}</span></div>)}
                    </div>
                  </div>

                  {/* 시간대별 방송량 (뉴스탭 스타일) */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">⏰ 시간대별 방송량</p>
                      <p className="text-xs font-medium" style={{color:PLATFORM_COLORS['유튜브']}}>피크 {streamHourlyData.reduce((a,b)=>a.count>b.count?a:b).hour}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={streamHourlyData} barCategoryGap="5%">
                        <XAxis dataKey="hour" tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} interval={3}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} width={20}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any)=>[`${v}건`,'방송량']}/>
                        <Bar dataKey="count" radius={[3,3,0,0]}>
                          {streamHourlyData.map(h=>{
                            const max=Math.max(...streamHourlyData.map(x=>x.count),1)
                            return <Cell key={h.h} fill={h.count>0?`rgba(239,68,68,${0.3+(h.count/max)*0.7})`:'#1f2937'}/>
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[['새벽','0-6시',0,6],['오전','6-12시',6,12],['오후','12-18시',12,18],['저녁','18-24시',18,24]].map(([label,time,from,to]:any)=>(
                        <div key={label} className="bg-gray-700/50 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">{label}</p>
                          <p className="text-xs text-gray-600">{time}</p>
                          <p className="font-bold mt-1 text-red-400" style={{fontSize:'14px'}}>{streamHourlyData.filter(h=>h.h>=from&&h.h<to).reduce((a,b)=>a+b.count,0)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-600 mb-1.5">플랫폼별 비중</p>
                      <div className="space-y-1">
                        {streamPlatCount.map((p,i)=>{
                          const total = streamPlatCount.reduce((s,x)=>s+x.value,0)||1
                          return (
                            <div key={p.name} className="flex items-center gap-2">
                              <span className="text-xs w-12 truncate" style={{color:PLATFORM_COLORS[p.name]}}>{p.name}</span>
                              <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                                <div className="h-1.5 rounded-full" style={{width:`${p.value/total*100}%`,backgroundColor:PLATFORM_COLORS[p.name]}}></div>
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{p.value}건</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 인플루언서 가치 지수 카드 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500 font-medium">🏆 인플루언서 가치 지수</p>
                      <button onClick={() => setInfluencerModal(true)} className="text-xs px-3 py-1 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 transition-colors">전체 보기 →</button>
                    </div>
                    {(() => {
                      const TIER_COLORS: Record<string,string> = {S:'#f59e0b',A:'#8b5cf6',B:'#3b82f6',C:'#6b7280'}
                      const tierCounts = ['S','A','B','C'].map(t=>({tier:t, count:influencerData.filter(c=>c.tier===t).length}))
                      const top3 = influencerData.slice(0,3)
                      return (
                        <>
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {tierCounts.map(({tier,count})=>(
                              <div key={tier} className="bg-gray-700/50 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-700 transition-colors" onClick={()=>{setInfluencerTier(tier as any);setInfluencerModal(true)}}>
                                <p className="text-lg font-bold mb-0.5" style={{color:TIER_COLORS[tier]}}>{tier}</p>
                                <p className="text-white font-semibold text-sm">{count}</p>
                                <p className="text-gray-500 text-xs">명</p>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {top3.map((ch,i)=>(
                              <div key={ch.name} className="flex items-center gap-3 p-2 rounded-xl bg-gray-700/30">
                                <span className={`text-xs font-bold w-4 text-center ${i===0?'text-yellow-400':i===1?'text-gray-300':'text-amber-600'}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-white text-xs font-medium truncate">{ch.name}</p>
                                    <span className="text-xs flex-shrink-0" style={{color:PLATFORM_COLORS[ch.platform]}}>{ch.platform}</span>
                                  </div>
                                  <p className="text-gray-500 text-xs">{ch.count}회 · 평균 {ch.avgViewers.toLocaleString()}명</p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{backgroundColor:TIER_COLORS[ch.tier]+'22',color:TIER_COLORS[ch.tier]}}>{ch.tier}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* ③ 플랫폼별 인플루언서 현황 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📡 플랫폼별 인플루언서 현황</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <div className="space-y-3">
                      {['유튜브','치지직','SOOP'].map(platform => {
                        const platStreams = filteredStreams.filter(s => s.platform === platform)
                        const activeChannels = new Set(platStreams.map(s => s.channel_name).filter(Boolean)).size
                        const prevChs = new Set(streams.filter(s => s.platform === platform && (s.started_at||'') < df).map(s => s.channel_name).filter(Boolean))
                        const newChs = [...new Set(platStreams.map(s => s.channel_name).filter(Boolean))].filter(c => !prevChs.has(c)).length
                        const topChannel = (() => {
                          const freq: Record<string,number> = {}
                          platStreams.forEach(s => { if(s.channel_name) freq[s.channel_name] = (freq[s.channel_name]||0)+1 })
                          const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]
                          return top ? `${top[0]} (${top[1]}회)` : '-'
                        })()
                        return (
                          <div key={platform} className="bg-gray-700/40 rounded-xl p-3 cursor-pointer hover:bg-gray-700/70 transition-colors" onClick={() => setPlatformModal(platform)}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-4 h-4" dangerouslySetInnerHTML={{__html: PLATFORM_ICONS[platform]||''}}/>
                              <span className="text-xs font-semibold" style={{color:PLATFORM_COLORS[platform]}}>{platform}</span>
                              <span className="ml-auto text-xs text-white font-bold">{activeChannels}개 채널</span>
                              {newChs > 0 && <span className="text-xs text-emerald-400">+{newChs} 신규</span>}
                            </div>
                            <p className="text-xs text-gray-400 truncate">TOP: {topChannel}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ④ 경쟁사 커버리지 비교 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">⚔️ 카테고리별 커버리지</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <div className="space-y-3">
                      {['자사','경쟁사','업계'].map(cat => {
                        const catStreams = filteredStreams.filter(s => s.category === cat)
                        const channels = new Set(catStreams.map(s => s.channel_name).filter(Boolean)).size
                        const totalViewers = catStreams.reduce((sum, s) => sum + (s.viewer_count||0), 0)
                        const liveCount = catStreams.filter(s => s.is_live).length
                        const total = filteredStreams.length || 1
                        const pct = Math.round(catStreams.length / total * 100)
                        return (
                          <div key={cat} className="cursor-pointer hover:bg-gray-700/30 rounded-lg p-1 -mx-1 transition-colors" onClick={() => setCoverageModal(cat)}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium" style={{color:COLORS[cat]}}>{cat}</span>
                              <span className="text-gray-400">{catStreams.length}건 · {channels}채널 {liveCount > 0 && <span className="text-red-400">· 🔴{liveCount}</span>}</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full mb-1">
                              <div className="h-2 rounded-full transition-all" style={{width:`${pct}%`, backgroundColor:COLORS[cat]}}></div>
                            </div>
                            {totalViewers > 0 && <p className="text-xs text-gray-600">총 시청자 {totalViewers.toLocaleString()}명</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 인플루언서 가치 지수 모달 */}
                {influencerModal && (() => {
                  const TIER_COLORS: Record<string,string> = {S:'#f59e0b',A:'#8b5cf6',B:'#3b82f6',C:'#6b7280'}
                  const TIER_DESC: Record<string,string> = {S:'핵심 협업 대상',A:'우선 검토 대상',B:'모니터링 유지',C:'잠재 발굴 대상'}
                  const filtered = influencerData.filter(ch =>
                    influencerCatTab === '전체' || ch.category === influencerCatTab
                  ).filter(ch => ch.tier === influencerTier).slice(0,20)
                  const tierCounts = (['S','A','B','C'] as const).map(t=>({
                    tier:t, count: influencerData.filter(ch=>(influencerCatTab==='전체'||ch.category===influencerCatTab)&&ch.tier===t).length
                  }))
                  return (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=>setInfluencerModal(false)}>
                      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                        {/* 헤더 */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                          <div>
                            <h3 className="text-white font-bold text-base">🏆 인플루언서 가치 지수</h3>
                            <p className="text-xs text-gray-500 mt-0.5">방송 빈도 · 시청자 수 · 최근성 기반 협업 가치 산정</p>
                          </div>
                          <button onClick={()=>setInfluencerModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>

                        {/* 카테고리 탭 */}
                        <div className="flex items-center gap-3 px-5 pt-4">
                          <div className="flex gap-1 bg-gray-800 p-0.5 rounded-lg border border-gray-700">
                            {(['전체','자사','경쟁사'] as const).map(cat=>(
                              <button key={cat} onClick={()=>setInfluencerCatTab(cat)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${influencerCatTab===cat?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>
                                {cat}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 ml-auto">총 {influencerData.filter(ch=>influencerCatTab==='전체'||ch.category===influencerCatTab).length}명</p>
                        </div>

                        {/* Tier 탭 */}
                        <div className="flex gap-2 px-5 pt-3 pb-1">
                          {tierCounts.map(({tier,count})=>(
                            <button key={tier} onClick={()=>setInfluencerTier(tier as any)}
                              className={`flex-1 rounded-xl py-2.5 text-center transition-all border ${influencerTier===tier?'border-transparent':'border-gray-700 bg-gray-800/50 hover:bg-gray-800'}`}
                              style={influencerTier===tier?{backgroundColor:TIER_COLORS[tier]+'22',borderColor:TIER_COLORS[tier]+'66'}:{}}>
                              <p className="font-bold text-sm" style={{color:TIER_COLORS[tier]}}>{tier}</p>
                              <p className="text-white text-xs font-semibold">{count}명</p>
                              <p className="text-gray-500 text-xs">{TIER_DESC[tier]}</p>
                            </button>
                          ))}
                        </div>

                        {/* 스트리머 목록 */}
                        <div className="overflow-y-auto flex-1 p-4">
                          {filtered.length === 0
                            ? <div className="text-center py-12">
                                <p className="text-2xl mb-2">📭</p>
                                <p className="text-gray-500 text-sm">{influencerTier} Tier 스트리머 없음</p>
                              </div>
                            : <div className="grid grid-cols-2 gap-2">
                                {filtered.map((ch,i)=>(
                                  <div key={ch.name} className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-gray-600 transition-colors">
                                    <div className="flex items-start gap-2 mb-2">
                                      <span className={`text-xs font-bold w-5 text-center mt-0.5 flex-shrink-0 ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="text-white text-xs font-semibold truncate max-w-[120px]">{ch.name}</p>
                                          <span className="text-xs flex-shrink-0" style={{color:PLATFORM_COLORS[ch.platform]}}>{ch.platform}</span>
                                          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold" style={{backgroundColor:TIER_COLORS[ch.tier]+'22',color:TIER_COLORS[ch.tier]}}>{ch.tier}</span>
                                        </div>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{backgroundColor:COLORS[ch.category]+'22',color:COLORS[ch.category]}}>{ch.category}</span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 text-center mb-2">
                                      <div className="bg-gray-700/50 rounded-lg p-1.5">
                                        <p className="text-white text-xs font-bold">{ch.count}</p>
                                        <p className="text-gray-500 text-xs">방송</p>
                                      </div>
                                      <div className="bg-gray-700/50 rounded-lg p-1.5">
                                        <p className="text-white text-xs font-bold">{ch.avgViewers>0?ch.avgViewers.toLocaleString():'-'}</p>
                                        <p className="text-gray-500 text-xs">평균시청</p>
                                      </div>
                                      <div className="bg-gray-700/50 rounded-lg p-1.5">
                                        <p className="font-bold text-xs" style={{color:TIER_COLORS[ch.tier]}}>{ch.score}</p>
                                        <p className="text-gray-500 text-xs">점수</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <p className="text-gray-600 text-xs">{ch.daysSince===0?'오늘':ch.daysSince===999?'-':`${ch.daysSince}일 전`}</p>
                                      {ch.url && <a href={ch.url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs px-2 py-0.5 rounded-full border hover:opacity-80"
                                        style={{color:PLATFORM_COLORS[ch.platform],borderColor:PLATFORM_COLORS[ch.platform]+'44',backgroundColor:PLATFORM_COLORS[ch.platform]+'11'}}
                                        onClick={e=>e.stopPropagation()}>채널 →</a>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                          }
                        </div>

                        {/* 하단 점수 기준 안내 */}
                        <div className="px-5 py-3 border-t border-gray-800 flex gap-4">
                          <p className="text-xs text-gray-600">📌 점수 = 방송횟수×10 + 평균시청자×0.05 + 최근성보너스</p>
                          <p className="text-xs text-gray-600">· S≥150 · A≥80 · B≥30 · C&lt;30</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 자사 게임 커버 채널 모달 */}
                {coverChannelModal && (() => {
                  const myStreams = filteredStreams.filter(s => s.category === '자사')
                  const channelMap: Record<string, {count:number, viewers:number, latest:string, latestTitle:string, url:string}> = {}
                  myStreams.forEach(s => {
                    if (!s.channel_name) return
                    if (!channelMap[s.channel_name]) channelMap[s.channel_name] = {count:0, viewers:0, latest:'', latestTitle:'', url:s.url||''}
                    channelMap[s.channel_name].count++
                    channelMap[s.channel_name].viewers += s.viewer_count || 0
                    if (!channelMap[s.channel_name].latest || (s.started_at||'') > channelMap[s.channel_name].latest) {
                      channelMap[s.channel_name].latest = s.started_at || ''
                      channelMap[s.channel_name].latestTitle = s.title || ''
                      channelMap[s.channel_name].url = s.url || ''
                    }
                  })
                  const channels = Object.entries(channelMap).map(([name, v]) => ({name, ...v})).sort((a,b)=>b.count-a.count)
                  return (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setCoverChannelModal(false)}>
                      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                          <div>
                            <h3 className="text-white font-semibold">🎮 자사 게임 커버 채널</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{channels.length}개 채널 · {periodLabel}</p>
                          </div>
                          <button onClick={() => setCoverChannelModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3">
                          {channels.length === 0
                            ? <p className="text-gray-500 text-sm text-center py-8">데이터 없음</p>
                            : channels.map((ch, i) => (
                              <div key={ch.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors">
                                <span className={`text-xs font-bold w-5 text-center mt-1 flex-shrink-0 ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white text-sm font-medium truncate">{ch.name}</p>
                                    {ch.url && (
                                      <a href={ch.url} target="_blank" rel="noopener noreferrer"
                                        className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full border border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:opacity-80"
                                        onClick={e => e.stopPropagation()}>채널 →</a>
                                    )}
                                  </div>
                                  {ch.latestTitle && <p className="text-gray-400 text-xs truncate mb-1">최근: {ch.latestTitle}</p>}
                                  <div className="flex gap-3 text-xs text-gray-500">
                                    <span>📺 {ch.count}회 방송</span>
                                    {ch.viewers > 0 && <span>👁 {ch.viewers.toLocaleString()}명</span>}
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 카테고리별 커버리지 모달 */}
                {coverageModal && (() => {
                  const catStreams = filteredStreams.filter(s => s.category === coverageModal)
                  const channelMap: Record<string, {count:number, viewers:number, latest:string, latestTitle:string, url:string, platform:string}> = {}
                  catStreams.forEach(s => {
                    if (!s.channel_name) return
                    if (!channelMap[s.channel_name]) channelMap[s.channel_name] = {count:0, viewers:0, latest:'', latestTitle:'', url:s.url||'', platform:s.platform||''}
                    channelMap[s.channel_name].count++
                    channelMap[s.channel_name].viewers += s.viewer_count || 0
                    if (!channelMap[s.channel_name].latest || (s.started_at||'') > channelMap[s.channel_name].latest) {
                      channelMap[s.channel_name].latest = s.started_at || ''
                      channelMap[s.channel_name].latestTitle = s.title || ''
                      channelMap[s.channel_name].url = s.url || ''
                    }
                  })
                  const channels = Object.entries(channelMap).map(([name, v]) => ({name, ...v})).sort((a,b)=>b.count-a.count)
                  return (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setCoverageModal(null)}>
                      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                          <div>
                            <h3 className="font-semibold" style={{color: COLORS[coverageModal]}}>⚔️ {coverageModal} 커버 채널</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{channels.length}개 채널 · {periodLabel}</p>
                          </div>
                          <button onClick={() => setCoverageModal(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3">
                          {channels.length === 0
                            ? <p className="text-gray-500 text-sm text-center py-8">데이터 없음</p>
                            : channels.map((ch, i) => (
                              <div key={ch.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors">
                                <span className={`text-xs font-bold w-5 text-center mt-1 flex-shrink-0 ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white text-sm font-medium truncate">{ch.name}</p>
                                    <span className="text-xs flex-shrink-0" style={{color:PLATFORM_COLORS[ch.platform]}}>{ch.platform}</span>
                                    {ch.url && (
                                      <a href={ch.url} target="_blank" rel="noopener noreferrer"
                                        className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full border hover:opacity-80"
                                        style={{color:COLORS[coverageModal], borderColor:COLORS[coverageModal]+'44', backgroundColor:COLORS[coverageModal]+'11'}}
                                        onClick={e => e.stopPropagation()}>채널 →</a>
                                    )}
                                  </div>
                                  {ch.latestTitle && <p className="text-gray-400 text-xs truncate mb-1">최근: {ch.latestTitle}</p>}
                                  <div className="flex gap-3 text-xs text-gray-500">
                                    <span>📺 {ch.count}회 방송</span>
                                    {ch.viewers > 0 && <span>👁 {ch.viewers.toLocaleString()}명</span>}
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 플랫폼 인플루언서 모달 */}
                {platformModal && (() => {
                  const platStreams = filteredStreams.filter(s => s.platform === platformModal)
                  const channelMap: Record<string, {count:number, viewers:number, latest:string, latestTitle:string, url:string}> = {}
                  platStreams.forEach(s => {
                    if (!s.channel_name) return
                    if (!channelMap[s.channel_name]) channelMap[s.channel_name] = {count:0, viewers:0, latest:'', latestTitle:'', url:s.url||''}
                    channelMap[s.channel_name].count++
                    channelMap[s.channel_name].viewers += s.viewer_count || 0
                    if (!channelMap[s.channel_name].latest || (s.started_at||'') > channelMap[s.channel_name].latest) {
                      channelMap[s.channel_name].latest = s.started_at || ''
                      channelMap[s.channel_name].latestTitle = s.title || ''
                      channelMap[s.channel_name].url = s.url || ''
                    }
                  })
                  const channels = Object.entries(channelMap).map(([name, v]) => ({name, ...v})).sort((a,b)=>b.count-a.count)
                  return (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPlatformModal(null)}>
                      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5" dangerouslySetInnerHTML={{__html: PLATFORM_ICONS[platformModal]||''}}/>
                            <h3 className="text-white font-semibold" style={{color:PLATFORM_COLORS[platformModal]}}>{platformModal} 인플루언서</h3>
                            <span className="text-xs text-gray-500 ml-1">{channels.length}개 채널</span>
                          </div>
                          <button onClick={() => setPlatformModal(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3">
                          {channels.length === 0
                            ? <p className="text-gray-500 text-sm text-center py-8">데이터 없음</p>
                            : channels.map((ch, i) => (
                              <div key={ch.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors">
                                <span className={`text-xs font-bold w-5 text-center mt-1 flex-shrink-0 ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-gray-600'}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white text-sm font-medium truncate">{ch.name}</p>
                                    {ch.url && (
                                      <a href={ch.url} target="_blank" rel="noopener noreferrer"
                                        className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full border transition-colors hover:opacity-80"
                                        style={{color:PLATFORM_COLORS[platformModal], borderColor:PLATFORM_COLORS[platformModal]+'44', backgroundColor:PLATFORM_COLORS[platformModal]+'11'}}
                                        onClick={e => e.stopPropagation()}>
                                        채널 →
                                      </a>
                                    )}
                                  </div>
                                  {ch.latestTitle && <p className="text-gray-400 text-xs truncate mb-1">최근: {ch.latestTitle}</p>}
                                  <div className="flex gap-3 text-xs text-gray-500">
                                    <span>📺 {ch.count}회 방송</span>
                                    {ch.viewers > 0 && <span>👁 {ch.viewers.toLocaleString()}명</span>}
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )
                })()}

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
                    <button key={kw} onClick={() => {setCommKeyword(kw);setCommSentiment('전체');setCommCommunity('전체');setCommSubKeyword('전체')}} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all border ${commKeyword===kw?'border-transparent text-white shadow-lg':'border-gray-700 text-gray-400 hover:text-white'}`} style={commKeyword===kw?{backgroundColor:kw==='자사'?'#4f46e5':'#dc2626'}:{}}>
                      {kw === '자사' ? '🏢 자사' : '⚔️ 경쟁작'}
                    </button>
                  ))}
                </div>

                {/* 하위 키워드 필터 */}
                {commKeyword === '자사' && (
                  <div className="flex gap-2 mb-4">
                    {['전체','드림에이지','알케론','아키텍트'].map(sub => (
                      <button key={sub} onClick={() => setCommSubKeyword(sub)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${commSubKeyword===sub?'text-white border-transparent':'border-gray-700 text-gray-400 hover:text-white'}`}
                        style={commSubKeyword===sub?{backgroundColor: sub==='드림에이지'?'#6366f1':sub==='알케론'?'#10b981':sub==='아키텍트'?'#f59e0b':'#374151'}:{}}>
                        {sub === '전체' ? '전체' : sub}
                      </button>
                    ))}
                  </div>
                )}
                {commKeyword === '경쟁사' && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {['전체','포트나이트','이터널리턴','배틀그라운드','발로란트','리그오브레전드','오버워치2','에이펙스 레전드'].map(sub => (
                      <button key={sub} onClick={() => setCommSubKeyword(sub)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${commSubKeyword===sub?'bg-red-600 text-white border-transparent':'border-gray-700 text-gray-400 hover:text-white'}`}>
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                {/* 벤토 Summary */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 총 언급 */}
                  <div className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 mb-3">💬 총 언급</p>
                    <p className="text-5xl font-bold text-white">{dateFilteredKeywordPosts.length}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                    <p className="text-xs text-gray-600 mt-2">오늘 {keywordPosts.filter(p=>(p.posted_at||p.collected_at||'').startsWith(today)).length}건</p>
                  </div>

                  {/* 감성 카드 3개 */}
                  {sentimentCount.map(s => (
                    <button key={s.name} onClick={() => handleCommClick(s.name)} className="col-span-2 bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-500 transition-all text-left group">
                      <p className="text-xs text-gray-500 mb-3">{s.name==='긍정'?'😊':s.name==='부정'?'😠':'😐'} {s.name}</p>
                      <p className="text-4xl font-bold group-hover:opacity-80" style={{ color: SENTIMENT_COLORS[s.name] }}>{s.value}<span className="text-lg text-gray-500 font-normal ml-1">건</span></p>
                      <p className="text-2xl font-bold mt-1" style={{ color: SENTIMENT_COLORS[s.name] }}>{dateFilteredKeywordPosts.length>0?Math.round(s.value/dateFilteredKeywordPosts.length*100):0}<span className="text-xs font-normal">%</span></p>
                    </button>
                  ))}

                  {/* 키워드별 7일 추이 */}
                  <div className="col-span-4 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <p className="text-xs text-gray-500 font-medium mb-2">📈 키워드별 7일 추이</p>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={(commKeyword === '자사' ? commKeyword7d : commComp7d) as any[]}>
                        <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                        {commKeyword === '자사' ? (<>
                          <Line type="monotone" dataKey="드림에이지" stroke="#6366f1" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="알케론" stroke="#10b981" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="아키텍트" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                        </>) : (<>
                          <Line type="monotone" dataKey="포트나이트" stroke="#ef4444" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="이터널리턴" stroke="#8b5cf6" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="배틀그라운드" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="발로란트" stroke="#10b981" strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="롤" stroke="#3b82f6" strokeWidth={2} dot={false}/>
                        </>)}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {commKeyword === '자사'
                        ? [['드림에이지','#6366f1'],['알케론','#10b981'],['아키텍트','#f59e0b']].map(([k,col])=>(
                            <div key={k} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:col}}></div><span className="text-xs text-gray-500">{k}</span></div>
                          ))
                        : [['포트나이트','#ef4444'],['이터널리턴','#8b5cf6'],['배틀그라운드','#f59e0b'],['발로란트','#10b981'],['롤','#3b82f6']].map(([k,col])=>(
                            <div key={k} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:col}}></div><span className="text-xs text-gray-500">{k}</span></div>
                          ))
                      }
                    </div>
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

                {/* 2번째 row - 방송탭 스타일 */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* 커뮤니티 워드클라우드 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">☁️ 커뮤니티 키워드</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <WordCloud words={commKeywordFreq} onWordClick={(word: string) => { setSelectedCommKeyword(selectedCommKeyword === word ? '' : word); scrollToList() }} selectedWord={selectedCommKeyword} />
                  </div>

                  {/* 7일간 카테고리별 추이 */}
<div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-1 bg-gray-700 p-0.5 rounded-lg">
                        {(commKeyword==='경쟁사'?['포트나이트','배틀그라운드','발로란트','이터널리턴','리그오브레전드']:['드림에이지','알케론','아키텍트']).map(kw=>(
                          <button key={kw} onClick={()=>setCommKwDetailTab(kw)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${commKwDetailTab===kw?'bg-white text-gray-900':'text-gray-400 hover:text-white'}`}>{kw}</button>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const kwMap: Record<string,string[]> = {'드림에이지':['드림에이지'],'알케론':['알케론','arkheron','Arkheron'],'아키텍트':['아키텍트'],'포트나이트':['포트나이트'],'배틀그라운드':['배틀그라운드','배그'],'발로란트':['발로란트'],'이터널리턴':['이터널리턴'],'리그오브레전드':['리그오브레전드','롤']}
                      const _activeTab = Object.keys(kwMap).includes(commKwDetailTab)?commKwDetailTab:(commKeyword==='경쟁사'?'포트나이트':'드림에이지')
                      const kwPosts = dateFilteredKeywordPosts.filter(p => kwMap[_activeTab]?.some(kw=>p.keyword===kw))
                      const pos = kwPosts.filter(p=>p.sentiment==='긍정').length
                      const neg = kwPosts.filter(p=>p.sentiment==='부정').length
                      const neu = kwPosts.filter(p=>p.sentiment==='중립').length
                      const total = kwPosts.length || 1
                      const commDist = Object.keys(COMMUNITY_COLORS).map(c=>({name:c,cnt:kwPosts.filter(p=>p.community===c).length})).filter(x=>x.cnt>0).sort((a,b)=>b.cnt-a.cnt)
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-2xl font-bold text-white">{kwPosts.length}</p>
                            <p className="text-xs text-gray-500">건 언급</p>
                          </div>
                          {[['긍정',pos,'#10b981'],['부정',neg,'#ef4444'],['중립',neu,'#6b7280']].map(([label,val,col])=>(
                            <div key={label} className="mb-1.5">
                              <div className="flex justify-between text-xs mb-0.5">
                                <span style={{color:col as string}}>{label}</span>
                                <span className="text-gray-500">{val}건 ({Math.round((val as number)/total*100)}%)</span>
                              </div>
                              <div className="h-1.5 bg-gray-700 rounded-full">
                                <div className="h-1.5 rounded-full" style={{width:`${(val as number)/total*100}%`,backgroundColor:col as string}}></div>
                              </div>
                            </div>
                          ))}
                          <div className="mt-3 space-y-1">
                            {commDist.slice(0,3).map(({name,cnt})=>(
                              <div key={name} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:COMMUNITY_COLORS[name]||'#6b7280'}}></span>
                                <span className="text-gray-400 flex-1">{name}</span>
                                <span className="text-gray-500">{cnt}건</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* 요일별 게시물 패턴 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">📅 요일별 게시물 패턴</p>
                      <span className="text-xs text-indigo-400 font-medium">
                        최다: {commWeekdayData.reduce((a,b)=>(a.웹진+a.게임특화+a.유저특화)>(b.웹진+b.게임특화+b.유저특화)?a:b).day}요일
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={commWeekdayData} barCategoryGap="20%">
                        <XAxis dataKey="day" tick={{fill:'#9ca3af',fontSize:12}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any,n:any)=>[`${v}건`,n]}/>
                        <Bar dataKey="웹진" stackId="a" fill="#6366f1"/>
                        <Bar dataKey="게임특화" stackId="a" fill="#ef4444"/>
                        <Bar dataKey="유저특화" stackId="a" fill="#10b981" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      {[['웹진','#6366f1'],['게임특화','#ef4444'],['유저특화','#10b981']].map(([k,col])=>(
                        <div key={k} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:col}}></div><span className="text-xs text-gray-500">{k}</span></div>
                      ))}
                    </div>
                  </div>

                  {/* 시간대별 게시물량 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">⏰ 시간대별 게시물량</p>
                      <p className="text-xs text-indigo-400 font-medium">피크 {commHourlyData.reduce((a,b)=>a.count>b.count?a:b).hour}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={commHourlyData} barCategoryGap="5%">
                        <XAxis dataKey="hour" tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} interval={3}/>
                        <YAxis tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false} width={20}/>
                        <Tooltip contentStyle={{backgroundColor:'#1f2937',border:'none',borderRadius:'8px',fontSize:'11px'}} formatter={(v:any)=>[`${v}건`,'게시물량']}/>
                        <Bar dataKey="count" radius={[3,3,0,0]}>
                          {commHourlyData.map(h=>{
                            const max=Math.max(...commHourlyData.map(x=>x.count),1)
                            return <Cell key={h.h} fill={h.count>0?`rgba(99,102,241,${0.3+(h.count/max)*0.7})`:'#1f2937'}/>
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[['새벽','0-6시',0,6],['오전','6-12시',6,12],['오후','12-18시',12,18],['저녁','18-24시',18,24]].map(([label,time,from,to]:any)=>(
                        <div key={label} className="bg-gray-700/50 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">{label}</p>
                          <p className="text-xs text-gray-600">{time}</p>
                          <p className="font-bold mt-1 text-indigo-400" style={{fontSize:'14px'}}>{commHourlyData.filter(h=>h.h>=from&&h.h<to).reduce((a,b)=>a+b.count,0)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-600 mb-1.5">커뮤니티별 비중</p>
                      <div className="space-y-1">
                        {Object.entries(COMMUNITY_COLORS).filter(([name])=>categoryFilteredPosts.some(p=>p.community===name)).map(([name,color])=>{
                          const cnt = categoryFilteredPosts.filter(p=>p.community===name).length
                          const total = categoryFilteredPosts.length||1
                          return (
                            <div key={name} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/40 rounded px-1 -mx-1 transition-colors" onClick={()=>setCommChannelPopup(name)}>
                              <span className="text-xs w-14 truncate flex-shrink-0" style={{color}}>{name}</span>
                              <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                                <div className="h-1.5 rounded-full" style={{width:`${cnt/total*100}%`,backgroundColor:color}}></div>
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{cnt}건</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {commChannelPopup && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setCommChannelPopup('')}>
                  <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <p className="text-sm font-bold text-white">{commChannelPopup} <span className="text-gray-500 font-normal text-xs">게시물 목록</span></p>
                      <button onClick={()=>setCommChannelPopup('')} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-2">
                      {categoryFilteredPosts.filter(p=>p.community===commChannelPopup).slice(0,50).map(p=>(
                        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-white line-clamp-2 flex-1">{p.title}</p>
                            <span className={"text-xs px-1.5 py-0.5 rounded flex-shrink-0 "+(p.sentiment==='긍정'?'bg-green-900/50 text-green-400':p.sentiment==='부정'?'bg-red-900/50 text-red-400':'bg-gray-700 text-gray-400')}>{p.sentiment||'중립'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{(p.posted_at||p.collected_at||'').slice(0,10)}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* 커뮤니티 인사이트 */}
                <div className="grid grid-cols-12 gap-4 mb-6">

                  {/* ① 이슈 레이더 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">🚨 이슈 레이더</p>
                      <p className="text-xs text-gray-600">부정 급상승 키워드</p>
                    </div>
                    {(() => {
                      const todayNeg = dateFilteredKeywordPosts.filter(p => p.sentiment === "부정")
                      const yestNeg = keywordPosts.filter(p => {
                        const dv = p.posted_at || p.collected_at || ""
                        return p.sentiment === "부정" && dv >= yesterday + "T00:00:00" && dv <= yesterday + "T23:59:59"
                      })
                      const exFreq = (arr: typeof posts) => {
                        const freq: Record<string,number> = {}
                        arr.forEach(p => { (p.title||"").match(/[가-힣]{2,}/g)?.forEach(w => { freq[w]=(freq[w]||0)+1 }) })
                        return freq
                      }
                      const tF = exFreq(todayNeg), yF = exFreq(yestNeg)
                      const rising = Object.entries(tF).map(([kw,cnt])=>({kw,cnt,rise:cnt-(yF[kw]||0)})).filter(k=>k.rise>0).sort((a,b)=>b.rise-a.rise).slice(0,5)
                      if (rising.length === 0) return <div className="flex flex-col items-center justify-center py-8"><p className="text-2xl mb-1">✅</p><p className="text-xs text-gray-500">급상승 이슈 없음</p></div>
                      return <div className="space-y-2">{rising.map((k,i)=>(<div key={k.kw} onClick={() => { setSelectedCommKeyword(selectedCommKeyword === k.kw ? "" : k.kw); scrollToList() }} className="flex items-center gap-2 p-2 rounded-lg bg-red-900/20 border border-red-500/20 cursor-pointer hover:bg-red-900/40 transition-colors"><span className="text-xs text-red-400 font-bold w-3">{i+1}</span><span className="text-xs text-white flex-1 truncate">{k.kw}</span><span className="text-xs font-bold text-red-400">▲{k.rise}</span><span className="text-xs text-gray-500">{k.cnt}건</span></div>))}</div>
                    })()}
                  </div>

                  {/* ② 자사 vs 경쟁사 감성 비교 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">⚔️ 자사 vs 경쟁사</p>
                      <p className="text-xs text-gray-600">감성 비교</p>
                    </div>
                    {(["자사","경쟁사"] as const).map(label => {
                      const arr = posts.filter(p => { const dv=p.posted_at||p.collected_at||""; return COMM_KEYWORDS[label].some(kw=>p.keyword===kw)&&dv>=df&&dv<=dt })
                      const total = arr.length || 1
                      const pos = arr.filter(p=>p.sentiment==="긍정").length
                      const neg = arr.filter(p=>p.sentiment==="부정").length
                      const neu = total - pos - neg
                      const color = label==="자사" ? "#6366f1" : "#ef4444"
                      return (
                        <div key={label} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => { setCommKeyword(label); setCommSentiment("전체"); scrollToList() }}><div className="w-2 h-2 rounded-full" style={{backgroundColor:color}}></div><span className="text-xs font-medium text-white">{label}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-green-400">{Math.round(pos/total*100)}% 긍정</span><span className="text-xs text-gray-600">{arr.length}건</span></div>
                          </div>
                          {([["긍정",pos,"#10b981"],["부정",neg,"#ef4444"],["중립",neu,"#6b7280"]] as [string,number,string][]).map(([s,v,c])=>(
                            <div key={s} className="flex items-center gap-2 mb-1 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => { setCommKeyword(label); setCommSentiment(s); scrollToList() }}>
                              <span className="text-xs w-6 flex-shrink-0" style={{color:c}}>{s}</span>
                              <div className="flex-1 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 rounded-full" style={{width:Math.round(v/total*100)+"%",backgroundColor:c}}></div></div>
                              <span className="text-xs text-gray-500 w-7 text-right">{Math.round(v/total*100)}%</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  {/* ③ 커뮤니티 토픽 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">💬 커뮤니티 토픽</p>
                      <p className="text-xs text-gray-600">{periodLabel} 기준</p>
                    </div>
                    <div className="space-y-2.5">
                      {Object.keys(COMMUNITY_COLORS).map(comm => {
                        const cp = dateFilteredKeywordPosts.filter(p=>p.community===comm)
                        const stops = ["드림에이지","알케론","arkheron","아키텍트","포트나이트","배틀그라운드","발로란트","이터널리턴","리그오브레전드","오버워치","에이펙스","게임","방송","fortnite","valorant","pubg"]
                        const freq: Record<string,number> = {}
                        cp.forEach(p => { (p.title||"").match(/[가-힣]{2,}/g)?.forEach(w => { if(!stops.some(s=>w.includes(s))) freq[w]=(freq[w]||0)+1 }) })
                        const top2 = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,2)
                        const col = COMMUNITY_COLORS[comm]||"#6b7280"
                        return (
                          <div key={comm} className="flex items-start gap-2 cursor-pointer hover:bg-gray-700/30 rounded-lg p-1 -mx-1 transition-colors" onClick={() => { setCommCommunity(commCommunity === comm ? "전체" : comm); scrollToList() }}>
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{backgroundColor:col}}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1"><span className="text-xs font-medium" style={{color:col}}>{comm}</span><span className="text-xs text-gray-600">({cp.length})</span></div>
                              <div className="flex gap-1 flex-wrap mt-0.5">
                                {top2.length===0 ? <span className="text-xs text-gray-600">-</span> : top2.map(([w,c])=>(<span key={w} className="text-xs px-1.5 py-0.5 rounded" style={{backgroundColor:col+"22",color:col}}>{w} {c}</span>))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ④ 화제성 분포 */}
                  <div className="col-span-3 bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">🔥 화제성 분포</p>
                      <p className="text-xs text-gray-600">반응 게시물 기준</p>
                    </div>
                    {(() => {
                      const viral = [...dateFilteredKeywordPosts].filter(p=>(p.views||0)>0||(p.comments||0)>0).sort((a,b)=>((b.views||0)+(b.comments||0)*5)-((a.views||0)+(a.comments||0)*5)).slice(0,4)
                      const noReact = dateFilteredKeywordPosts.filter(p=>(p.views||0)===0&&(p.comments||0)===0).length
                      return (
                        <>
                          <div className="flex gap-3 mb-3">
                            <div className="flex-1 bg-orange-900/20 rounded-lg p-2.5 text-center"><p className="text-xl font-bold text-orange-400">{viral.length}</p><p className="text-xs text-gray-500">화제 게시물</p></div>
                            <div className="flex-1 bg-gray-700/40 rounded-lg p-2.5 text-center"><p className="text-xl font-bold text-gray-400">{noReact}</p><p className="text-xs text-gray-500">반응 없음</p></div>
                          </div>
                          <div className="space-y-1.5">
                            {viral.length===0 ? <p className="text-xs text-gray-600 text-center py-3">반응 데이터 없음</p> : viral.map((p,i)=>(
                              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-gray-700/40 transition-colors">
                                <span className={"text-xs font-bold w-3 flex-shrink-0 "+(i===0?"text-yellow-400":i===1?"text-gray-300":"text-amber-700")}>{i+1}</span>
                                <p className="text-xs text-white flex-1 line-clamp-1">{p.title}</p>
                                {(p.views||0)>0&&<span className="text-xs text-gray-600 flex-shrink-0">👀{p.views}</span>}
                              </a>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                </div>
                <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-4" ref={listRef}>
                  {/* Row 1: 카테고리 */}
                  <div className="flex gap-2 mb-2">
                    {['전체','웹진','게임특화','유저특화'].map(cat => (
                      <button key={cat} onClick={() => { setCommCategoryFilter(cat); setCommCommunity('전체') }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${commCategoryFilter===cat?'text-white border-transparent':'border-gray-600 text-gray-400 hover:text-white'}`}
                        style={commCategoryFilter===cat?{backgroundColor: cat==='전체'?'#374151':CATEGORY_COLORS[cat]}:{}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {/* Row 2: 채널 (카테고리 선택시) */}
                  {commCategoryFilter !== '전체' && (
                    <div className="flex gap-1.5 flex-wrap mb-2 pb-2 border-b border-gray-700">
                      {['전체', ...Object.entries(COMMUNITY_META)
                        .filter(([,m]) => m.category === commCategoryFilter)
                        .map(([k]) => k)
                      ].map(ch => (
                        <button key={ch} onClick={() => setCommCommunity(ch)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${commCommunity===ch?'text-white':'bg-gray-700/50 text-gray-400 hover:text-white'}`}
                          style={commCommunity===ch?{backgroundColor: ch==='전체'?'#4b5563':COMMUNITY_COLORS[ch]||CATEGORY_COLORS[commCategoryFilter]}:{}}>
                          {ch === '전체' ? '전체 채널' : ch}
                        </button>
                      ))}
                    </div>
                  )}
                  {commCategoryFilter === '전체' && <div className="border-b border-gray-700 mb-2"></div>}
                  {/* Row 3: 감성 + 검색 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1">
                      {['전체','긍정','부정','중립'].map(s => (
                        <button key={s} onClick={() => setCommSentiment(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${commSentiment===s?'text-white':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`} style={commSentiment===s&&s!=='전체'?{backgroundColor:SENTIMENT_COLORS[s]}:commSentiment===s?{backgroundColor:'#374151',color:'white'}:{}}>{s}</button>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {selectedCommKeyword && <button onClick={() => setSelectedCommKeyword('')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600/30 text-indigo-300 border border-indigo-500/50">☁️ {selectedCommKeyword} <span className="opacity-60">✕</span></button>}
                      <input type="text" placeholder="검색..." value={commSearch} onChange={e => setCommSearch(e.target.value)} className="bg-gray-700 text-white px-3 py-1.5 rounded-lg outline-none border border-gray-600 text-xs w-40" />
                    </div>
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
