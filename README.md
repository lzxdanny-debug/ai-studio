# AI 多模态创作平台

基于 [Mountsea API](https://shanhaiapi.com/) 构建的一站式 AI 多模态创作平台，支持视频、图像、音乐、AI 对话四大功能模块。

## 技术栈

- **前端**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **后端**: NestJS 10+ + TypeORM
- **数据库**: PostgreSQL 16
- **缓存/队列**: Redis 7 + BullMQ
- **包管理**: pnpm workspace (monorepo)

## 项目结构

```
.
├── apps/
│   ├── web/          # Next.js 前端
│   └── api/          # NestJS 后端
├── packages/
│   └── shared/       # 共享 TypeScript 类型
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example apps/api/.env
# 编辑 apps/api/.env，填写 Mountsea API Key 等配置
```

### 3. 启动数据库和 Redis

```bash
pnpm docker:up
```

### 4. 初始化数据库

```bash
pnpm --filter api migration:run
```

### 5. 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm dev:api   # NestJS on :3001
pnpm dev:web   # Next.js on :3000
```

## 功能模块

| 模块 | 支持模型 | 功能 |
|------|---------|------|
| 视频生成 | Sora2, Veo3, Grok | 文生视频、图生视频 |
| 图像生成 | Nano Banana, Grok | 文生图、图生图 |
| 音乐生成 | Suno, Lyria 3 Pro | 文生音乐、歌词生成 |
| AI 对话 | GPT-5, Claude 4, Gemini | 流式多模型对话 |

## API 文档

启动后端后访问：http://localhost:3001/api/docs

## 积分体系

| 套餐 | 积分 | 价格 |
|------|------|------|
| 基础版 | 10,000 | ¥100 |
| 标准版 | 50,000 | ¥500 |
| 专业版 | 200,000 | ¥2,000 |
| 企业版 | 500,000 | ¥4,500 (9折) |
| 旗舰版 | 1,000,000 | ¥8,000 (8折) |
