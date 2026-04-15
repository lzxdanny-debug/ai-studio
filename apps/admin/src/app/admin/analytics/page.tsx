'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Eye, Users, Globe, Monitor } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary { pv: number; uv: number }
interface TrendItem { date: string; pv: number; uv: number }
interface PageItem { path: string; pv: number; uv: number }
interface SourceItem { source: string; count: number }
interface DeviceItem { deviceType: string; count: number }
interface GeoItem { country: string; count: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
  { label: '全部', value: 0 },
];

const SOURCE_LABELS: Record<string, string> = {
  direct: '直接访问',
  search: '搜索引擎',
  social: '社交媒体',
  external: '外部链接',
};

const SOURCE_COLORS: Record<string, string> = {
  direct: '#6366f1',
  search: '#10b981',
  social: '#f59e0b',
  external: '#06b6d4',
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: '桌面端',
  mobile: '移动端',
  tablet: '平板',
};

const DEVICE_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

const COUNTRY_NAMES: Record<string, string> = {
  CN: '中国', US: '美国', JP: '日本', KR: '韩国', SG: '新加坡',
  GB: '英国', DE: '德国', FR: '法国', CA: '加拿大', AU: '澳大利亚',
  HK: '香港', TW: '台湾', IN: '印度', BR: '巴西', RU: '俄罗斯',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-2xl p-5', className)}>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, iconBg }: {
  label: string; value: string | number;
  icon: React.ElementType; color: string; iconBg: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-48 text-sm text-slate-400">暂无数据</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);

  const q = (key: string, params?: string) =>
    `/analytics/admin/${key}?days=${days}${params ? `&${params}` : ''}`;

  const qOpts = { refetchInterval: 60_000 };

  const { data: summary, isLoading: sl } = useQuery<Summary>({
    queryKey: ['analytics', 'summary', days],
    queryFn: () => apiClient.get(q('summary')) as any,
    ...qOpts,
  });

  const { data: trend, isLoading: tl } = useQuery<TrendItem[]>({
    queryKey: ['analytics', 'trend', days],
    queryFn: () => apiClient.get(`/analytics/admin/trend?days=${Math.max(days || 14, 14)}`) as any,
    ...qOpts,
  });

  const { data: pages, isLoading: pl } = useQuery<PageItem[]>({
    queryKey: ['analytics', 'pages', days],
    queryFn: () => apiClient.get(q('pages', 'limit=10')) as any,
    ...qOpts,
  });

  const { data: sources, isLoading: sol } = useQuery<SourceItem[]>({
    queryKey: ['analytics', 'sources', days],
    queryFn: () => apiClient.get(q('sources')) as any,
    ...qOpts,
  });

  const { data: devices, isLoading: dl } = useQuery<DeviceItem[]>({
    queryKey: ['analytics', 'devices', days],
    queryFn: () => apiClient.get(q('devices')) as any,
    ...qOpts,
  });

  const { data: geo, isLoading: gl } = useQuery<GeoItem[]>({
    queryKey: ['analytics', 'geo', days],
    queryFn: () => apiClient.get(q('geo', 'limit=10')) as any,
    ...qOpts,
  });

  const trendData = (trend ?? []).map((d) => ({ ...d, date: formatDate(d.date) }));

  const sourceData = (sources ?? []).map((s) => ({
    name: SOURCE_LABELS[s.source] ?? s.source,
    value: s.count,
    color: SOURCE_COLORS[s.source] ?? '#94a3b8',
  }));

  const deviceData = (devices ?? []).map((d) => ({
    name: DEVICE_LABELS[d.deviceType] ?? d.deviceType,
    value: d.count,
  }));

  const geoData = (geo ?? []).map((g) => ({
    name: COUNTRY_NAMES[g.country] ?? g.country,
    count: g.count,
  }));

  const pageData = (pages ?? []).slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100">
      <div className="p-6 space-y-5">

        {/* 页面标题 + 时间筛选 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">流量统计</h1>
            <p className="text-sm text-slate-500 mt-1">网站访问数据分析</p>
          </div>
          <div className="flex gap-1">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  days === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="页面浏览量 (PV)"
            value={sl ? '—' : (summary?.pv ?? 0).toLocaleString()}
            icon={Eye}
            color="text-purple-600"
            iconBg="bg-purple-50"
          />
          <StatCard
            label="独立访客 (UV)"
            value={sl ? '—' : (summary?.uv ?? 0).toLocaleString()}
            icon={Users}
            color="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="来源渠道数"
            value={sol ? '—' : (sources?.length ?? 0)}
            icon={Globe}
            color="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="访问国家/地区数"
            value={gl ? '—' : (geo?.length ?? 0)}
            icon={Monitor}
            color="text-cyan-600"
            iconBg="bg-cyan-50"
          />
        </div>

        {/* PV/UV 趋势折线图 */}
        <ChartCard title={`PV / UV 趋势（近 ${Math.max(days || 14, 14)} 天）`}>
          {tl ? <Spinner /> : trendData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#475569', fontWeight: 600 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="pv" name="PV" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="uv" name="UV" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 中间两列 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 来源分布饼图 */}
          <ChartCard title="访客来源分布">
            {sol ? <Spinner /> : sourceData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" nameKey="name">
                    {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 设备类型饼图 */}
          <ChartCard title="设备类型分布">
            {dl ? <Spinner /> : deviceData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" nameKey="name">
                    {deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* 下方两列 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top 页面横向柱状图 */}
          <ChartCard title="Top 页面访问量">
            {pl ? <Spinner /> : pageData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={pageData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="path"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + '…' : v}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pv" name="PV" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="uv" name="UV" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 国家/地区柱状图 */}
          <ChartCard title="访客国家/地区 Top 10">
            {gl ? <Spinner /> : geoData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <Globe className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">暂无地理数据</p>
                <p className="text-xs text-slate-300">开发环境本地 IP 无法解析地理位置</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={geoData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="访问量" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
