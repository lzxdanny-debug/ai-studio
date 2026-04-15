'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FileVideo,
  MessageSquare,
  TrendingUp,
  Globe,
  CheckCircle,
  UserPlus,
  Zap,
} from 'lucide-react';
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
import apiClient from '@/lib/api';
import { cn } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalComments: number;
  newUsersToday: number;
  newTasksToday: number;
  completedTasks: number;
  publicTasks: number;
}

interface Trends {
  daily: { date: string; newUsers: number; newTasks: number }[];
  typeDistribution: { type: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
}

type StatusItem = { status: string; count: number };

const STATUS_DAYS_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  iconBg,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  image: '图片',
  video: '视频',
  music: '音乐',
  text: '文本',
};

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成',
  failed: '失败',
  pending: '等待中',
  processing: '处理中',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  failed: '#ef4444',
  pending: '#f59e0b',
  processing: '#3b82f6',
  cancelled: '#94a3b8',
};

const TYPE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ec4899'];

const CHART_LINE_COLORS = {
  newUsers: '#6366f1',
  newTasks: '#06b6d4',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminDashboard() {
  const [statusDays, setStatusDays] = useState(0);

  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErr } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get('/admin/stats') as any,
    refetchInterval: 30_000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<Trends>({
    queryKey: ['admin', 'trends'],
    queryFn: () => apiClient.get('/admin/trends') as any,
    refetchInterval: 60_000,
  });

  const { data: statusDist, isLoading: statusLoading } = useQuery<StatusItem[]>({
    queryKey: ['admin', 'trends', 'status', statusDays],
    queryFn: () => apiClient.get(`/admin/trends/status?days=${statusDays}`) as any,
    refetchInterval: 60_000,
  });

  const isLoading = statsLoading && trendsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-100">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (statsError) {
    const statusCode = (statsErr as any)?.statusCode;
    const isAuth = statusCode === 401 || String((statsErr as any)?.message).includes('登录');
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-100">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800 mb-1">数据加载失败</p>
            <p className="text-sm text-slate-500">
              {isAuth ? '登录已过期，请重新登录' : ((statsErr as any)?.message || '请求失败，请稍后重试')}
            </p>
          </div>
          {isAuth ? (
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('admin_access_token');
                  localStorage.removeItem('admin_refresh_token');
                  localStorage.removeItem('admin-auth');
                } catch { /* ignore */ }
                window.location.href = '/login';
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              重新登录
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
            >
              刷新重试
            </button>
          )}
        </div>
      </div>
    );
  }

  const completionRate = stats?.totalTasks
    ? Math.round(((stats.completedTasks ?? 0) / stats.totalTasks) * 100)
    : 0;

  const todayRate = stats?.totalTasks
    ? Math.round(((stats.newTasksToday ?? 0) / Math.max(stats.totalTasks, 1)) * 1000) / 10
    : 0;

  const cards = [
    {
      label: '总用户数',
      value: (stats?.totalUsers ?? 0).toLocaleString(),
      sub: `今日新增 ${stats?.newUsersToday ?? 0} 人`,
      icon: Users,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      label: '总任务数',
      value: (stats?.totalTasks ?? 0).toLocaleString(),
      sub: `今日新增 ${stats?.newTasksToday ?? 0} 个`,
      icon: FileVideo,
      color: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
    {
      label: '已完成任务',
      value: (stats?.completedTasks ?? 0).toLocaleString(),
      sub: `完成率 ${completionRate}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      label: '公开内容',
      value: (stats?.publicTasks ?? 0).toLocaleString(),
      sub: '已在探索页展示',
      icon: Globe,
      color: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
    },
    {
      label: '总评论数',
      value: (stats?.totalComments ?? 0).toLocaleString(),
      icon: MessageSquare,
      color: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      label: '今日新用户',
      value: stats?.newUsersToday ?? 0,
      icon: UserPlus,
      color: 'text-pink-600',
      iconBg: 'bg-pink-50',
    },
    {
      label: '今日任务',
      value: stats?.newTasksToday ?? 0,
      icon: Zap,
      color: 'text-orange-600',
      iconBg: 'bg-orange-50',
    },
    {
      label: '今日活跃度',
      value: `${todayRate}%`,
      sub: '今日任务占总量比',
      icon: TrendingUp,
      color: 'text-violet-600',
      iconBg: 'bg-violet-50',
    },
  ];

  const dailyData = (trends?.daily ?? []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  const typeData = (trends?.typeDistribution ?? []).map((t) => ({
    name: TYPE_LABELS[t.type] ?? t.type,
    value: t.count,
  }));

  const statusData = (statusDist ?? trends?.statusDistribution ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100">
      <div className="p-6 space-y-6">

        {/* 页面标题 */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">仪表盘</h1>
          <p className="text-sm text-slate-500 mt-1">平台数据实时概览</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* 趋势折线图 */}
        <ChartCard title="近 14 天增长趋势">
          {trendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : dailyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: '#475569', fontWeight: 600 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="新增用户"
                  stroke={CHART_LINE_COLORS.newUsers}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_LINE_COLORS.newUsers }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="newTasks"
                  name="新增任务"
                  stroke={CHART_LINE_COLORS.newTasks}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_LINE_COLORS.newTasks }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 底部两列图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 任务状态分布饼图 */}
          <ChartCard title="任务状态分布">
            {/* 时间筛选 */}
            <div className="flex gap-1 mb-4 -mt-1">
              {STATUS_DAYS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusDays(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    statusDays === opt.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {statusLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 任务类型分布柱状图 */}
          <ChartCard title="任务类型分布">
            {trendsLoading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : typeData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-slate-400">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={typeData}
                  margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" name="数量" radius={[6, 6, 0, 0]}>
                    {typeData.map((_, index) => (
                      <Cell key={index} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

        </div>

      </div>
    </div>
  );
}
