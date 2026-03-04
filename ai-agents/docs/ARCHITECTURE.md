# Архитектура системы AI Agents

Автономная система поиска, валидации и конкурентного анализа бизнес-ниш. Три AI-агента работают конвейером через Supabase. Управление через веб-дашборд.

---

## Конвейер агентов

```
Signal Detector (niche-researcher)
    → Business Validator
    → Competitive Intelligence
```

Агенты общаются **только через базу данных** (Supabase PostgreSQL). Прямой связи между агентами нет.

```
Signal Detector → сохраняет signals + pain_clusters + niches
                        ↓
Business Validator ← берёт niche_id → сохраняет validations
                                            ↓
Competitive Intel  ← берёт validation_id → сохраняет competitive_analyses
```

Каждый запуск создаёт запись в `cycles` для отслеживания истории.

---

## Agent #1 — Signal Detector (niche-researcher)

**Пайплайн v2 (6 шагов):**

```
1. Collect   — Reddit (5 сабов × 3 термина) + Google Search (6 запросов) + Google Trends (3 сида)
       ↓
2. Extract   — LLM batch-нормализует сырые сигналы в структурированные pain signals
       ↓
3. Cluster   — LLM группирует похожие боли (min 2 сигнала, min 2 источника)
       ↓
4. Formulate — LLM создаёт бизнес-идеи из каждого кластера
       ↓
5. Score     — Evidence-based скоринг (evidence_weight=0.5, business_weight=0.5)
       ↓
6. Deduplicate — Фильтрация дубликатов по существующим нишам в БД
       ↓
       ТОП-10 → таблицы signals, pain_clusters, niches
```

**Модель**: Claude Sonnet 4.5 (через OpenRouter)
**Таблицы БД**: signals, pain_clusters, niches
**Файлы**:
```
src/agents/niche-researcher/
├── index.ts          — CLI точка входа, оркестрация 6 шагов
├── collect/          — Сбор данных
│   ├── index.ts      — Параллельный запуск всех коллекторов
│   ├── reddit.ts     — Reddit поиск через SerpAPI
│   ├── search.ts     — Google Search через SerpAPI
│   ├── trends.ts     — Google Trends через SerpAPI
│   └── types.ts      — RawSignal интерфейс
├── extract.ts        — Нормализация сигналов через LLM
├── cluster.ts        — Кластеризация болей через LLM
├── formulate.ts      — Генерация ниш из кластеров через LLM
├── score.ts          — Скоринг и ранжирование
├── deduplicate.ts    — Дедупликация по имени (case-insensitive)
├── schemas.ts        — Zod-схемы (NormalizedSignal, PainCluster)
└── store.ts          — CRUD: saveSignals, saveClusters, saveNichesV2
```

---

## Agent #2 — Business Validator

**Один шаг — глубокая валидация ниши:**

```
14 поисковых запросов (SerpAPI) по нише
    ↓
Claude Sonnet анализирует все результаты по 7 блокам:
  1. Market Demand       — спрос, размер рынка, тренды
  2. Competitive Landscape — конкуренты, стартапы, фандинг
  3. Monetization        — SaaS-ценообразование, бизнес-модели
  4. AI Automation       — релевантные AI-инструменты
  5. Organic Traffic     — SEO, ключевые слова, контент-пробелы
  6. Unit Economics      — стартовые затраты, маржа соло-фаундера
  7. Risk Assessment     — регуляторные, рыночные риски
    ↓
Каждый блок: score/max_score, status (GREEN/YELLOW/RED), analysis, key_findings, sources, data_gaps
    ↓
Вердикт: GO (≥72) | CONDITIONAL_GO (45-71) | NO_GO (<45)
    ↓
+ strategic_recommendations: immediate_actions, mvp_hypothesis, target_customer, kill_criteria
    ↓
Сохраняется → таблица validations
```

**Модель**: Claude Sonnet 4.5 (через OpenRouter)
**Файлы**:
```
src/agents/business-validator/
├── index.ts     — CLI: --niche-id <uuid> или --idea "текст"
├── validate.ts  — Основная логика валидации
├── prompt.ts    — Системный промпт + JSON-инструкции
├── search.ts    — Построение 14 запросов + SerpAPI
├── parse.ts     — Zod-схема ValidationReport
└── store.ts     — CRUD: fetchNiche, saveValidation, fetchAgentConfig
```

---

## Agent #3 — Competitive Intelligence

**Три фазы:**

```
Фаза 1 — Discovery
  5-6 запросов SerpAPI → Claude находит 3-5 прямых конкурентов
      ↓
Фаза 2 — Deep Dive
  По каждому конкуренту: 8 запросов SerpAPI → Claude строит CompetitorProfile:
  - Продукт: core features, USPs
  - ЦА, позиционирование
  - Ценообразование: модель, тарифы, средняя цена
  - Маркетинг: каналы, контент-стратегия
  - Сильные/слабые стороны, отзывы клиентов
      ↓
Фаза 3 — Synthesis
  Все профили + валидация → стратегический playbook:
  - Вектора атаки (effort/impact матрица)
  - Матрица приоритетов фич (MUST/SHOULD/NICE_TO_HAVE)
  - Рекомендации по ценообразованию
  - Go-to-Market стратегия
  - Ключевые риски
  - Общая оценка рынка
      ↓
Сохраняется → таблица competitive_analyses
```

**Модель**: Claude Sonnet 4.5 (через OpenRouter)
**~50-60 SerpAPI запросов** за один полный анализ
**Файлы**:
```
src/agents/competitive-intel/
├── index.ts       — CLI: --validation-id <uuid>
├── discover.ts    — Фаза 1: обнаружение конкурентов
├── deep-dive.ts   — Фаза 2: глубокий анализ каждого
├── synthesize.ts  — Фаза 3: стратегический playbook
├── prompt.ts      — Промпты для всех 3 фаз
├── parse.ts       — Zod-схемы CompetitorProfile, SynthesisResult
├── search.ts      — Построение запросов + SerpAPI
└── store.ts       — CRUD: fetchValidation, saveCompetitiveAnalysis
```

---

## Shared модули (src/shared/)

```
config.ts         — ENV-переменные, конфиг моделей (OpenRouter, SerpAPI, Supabase)
openai.ts         — OpenAI SDK клиент (baseURL = OpenRouter)
supabase.ts       — Supabase клиент (service_key)
serpapi-client.ts — SerpAPI с ротацией ключей (SERPAPI_KEYS=key1,key2,key3)
logger.ts         — Логирование в консоль
types.ts          — Общие типы: Niche, Validation, CompetitorProfile, CompetitiveAnalysis, Cycle
```

---

## Веб-дашборд (web/)

### Стек
- **Next.js 16.1.6** — App Router, Turbopack
- **React 19.2.3**
- **Tailwind CSS v4** — PostCSS, `@theme inline` в globals.css
- **SWR 2.4.1** — data fetching с кэшированием
- **Recharts 3.7** — графики (RadarChart для ниш)
- **Lucide React** — иконки
- **Шрифт**: Inter (Google Fonts)
- **Язык**: полностью на русском

### Навигация — Floating Nav (3 иконки без подложки)

Файл: `web/src/components/layout/floating-nav.tsx`

3 иконки по центру вверху экрана (`fixed top-5 left-1/2 z-[60]`), без текста, без подложки:

| Иконка | Куда ведёт | Поведение |
|--------|-----------|-----------|
| `Cpu` | `/` | Командный центр |
| `Lightbulb` | `/niches` | Список ниш |
| `Bot` | dropdown | При hover выпадает меню с 3 агентами |

Dropdown агентов:
- `Radar` Signal Detector → `/agents/niche-researcher`
- `ShieldCheck` Business Validator → `/agents/business-validator`
- `Swords` Competitive Intel → `/agents/competitive-intel`
- Открывается на `onMouseEnter`, закрывается через 150ms после `onMouseLeave`
- Absolute positioned (`left-1/2 -translate-x-1/2`), обёртка Bot иконки `w-9 h-9` чтобы dropdown не сдвигал соседние иконки
- Стиль `glass-card` + `animate-fade-in`

Стиль иконок:
- Активная: `text-accent` + cyan glow `drop-shadow`
- Неактивная: `text-muted-foreground/50`, при hover → `text-matrix-green` + green glow
- CSS класс `nav-glitch-icon` — glitch-анимация при hover (hue-rotate + translate, без clip-path чтобы не ломать pointer-events)

### Layout

Файл: `web/src/app/layout.tsx`

```
<html lang="ru" className="dark">
  <body>
    <div className="mesh-gradient" />        ← dot grid pattern
    <div className="mesh-gradient-extra" />  ← vignette
    <FloatingNav />                          ← 3 иконки вверху
    <main className="relative z-10">
      {children}
    </main>
  </body>
</html>
```

### Страницы

#### `/` — Командный Центр
Файл: `web/src/app/page.tsx`

- Фон: `MatrixRain` (canvas, 30fps, зелёные символы — "01アイウエオ...ABCDEF...")
- Idle: opacity 0.25, speed 0.15
- Running: opacity 0.9, speed 1.0 + `RunningOverlay` (Glitch Takeover)
- Running определяется по наличию `cycle` со статусом `running` моложе 2 часов
- Polling: SWR refreshInterval 5_000ms

**Glitch Takeover** (`running-overlay.tsx`):
- Canvas-эффект поверх Matrix Rain (`mix-blend-mode: screen`, `z-[5]`)
- 3 слоя: scan line (cyan, top→bottom), chromatic aberration strips (red+cyan bands), pixelated noise blocks (matrix-green + cyan)
- Периодические full-screen flash (вероятность 0.005 за кадр)
- `pointer-events: none`

#### `/niches` — Список ниш
Файл: `web/src/app/niches/page.tsx`

- Вверху слева: число ниш (с `nav-glitch-icon` эффектом)
- Вверху справа: иконка корзины (`Trash2`) → переключает trash mode
- Фильтры: "В работе" / "Отклонённые" (toggle кнопки) + сортировка по дате (↑↓)
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`
- Trash mode: active ниши старше 7 дней, которые НЕ в избранном

**Карточка ниши** (`niche-card.tsx`):
- Компактный квадрат (`aspect-square`, `p-3`, `glass-card`)
- Содержимое: название (line-clamp-2, text-xs), score (text-2xl, цветовой), дата (dd.mm.yy, text-[10px])
- Heart иконка в правом верхнем углу — toggle избранное (красная заливка если активна)

**Избранное** (`use-favorites.ts`):
- localStorage (`niche-favorites` key), `Set<string>` ID-шек
- Синхронизация между вкладками через `StorageEvent`
- Нет изменений в БД — полностью клиентское

#### `/niches/[id]` — Детали ниши
Файл: `web/src/app/niches/[id]/page.tsx`

Разделы:
1. **Инфо** — ScoreCircle, название, уровень конкуренции, количество сигналов
2. **RadarChart** + описание + evidence_summary
3. **Метрики** — 8 карточек (рост, маржа, рынок, AI, капитал, время, трафик, уверенность)
4. **Risk flags** — бейджи
5. **Источники** — ссылки
6. **Action bar** — "Валидировать", "В архив", "Отклонить" (+ "Восстановить")
7. **Validation** (expandable) — если есть валидация: VerdictBadge, блоки анализа, рекомендации
8. **Competitors** (expandable) — если есть анализ: профили конкурентов, стратегический playbook

Кнопки:
- "Валидировать" → `POST /api/validate` → spawns business-validator
- "Анализ конкурентов" → `POST /api/analyze-competitors` → spawns competitive-intel

#### `/agents/[agentName]` — Конфигурация агента
Файл: `web/src/app/agents/[agentName]/page.tsx`

- Системный промпт (textarea, monospace)
- Версия промпта (для A/B сравнения)
- Веса скоринга (слайдеры, сумма = 100%)
- Фильтры (boolean toggles + number inputs)
- Настройки поиска (queries_per_run, results_per_query)
- Настройки вывода (min_score, top_n)
- Кнопки: Запустить, Сохранить, Активен/Неактивен
- RoboticEyes фоновая анимация

### API Routes

| Route | Метод | Что делает |
|-------|-------|-----------|
| `/api/agents` | GET | Список агентов из agent_configs |
| `/api/agents/[name]/config` | GET, PUT | Конфиг агента (system_prompt, weights, filters...) |
| `/api/agents/[name]/run` | POST | **Запуск агента**: создаёт cycle в Supabase → spawn child process → возвращает cycleId |
| `/api/cycles` | GET | Все циклы (сортировка по дате) |
| `/api/niches` | GET | Ниши с фильтрами (?status=, ?sort=, ?order=) |
| `/api/niches/[id]` | GET, PATCH | Деталь ниши / обновление статуса |
| `/api/validations` | GET | Все валидации |
| `/api/validations/[id]` | GET | Деталь валидации |
| `/api/competitors` | GET | Конкурентные анализы (?validationId=) |
| `/api/competitors/[id]` | GET | Деталь анализа |
| `/api/stats` | GET | totalNiches, avgScore, bestNiche, totalCycles |
| `/api/validate` | POST | Запуск business-validator (body: { nicheId }) |
| `/api/analyze-competitors` | POST | Запуск competitive-intel (body: { validationId }) |

### Механизм запуска агентов из UI

**Мгновенное отображение running-состояния:**

1. Пользователь нажимает "Запустить" на странице агента
2. `triggerRun()` → `POST /api/agents/[name]/run`
3. API route **сразу создаёт cycle** в Supabase (status: 'running') — ДО запуска процесса
4. Spawn: `npm run agent:niche` (detached, shell=true, CYCLE_ID в env)
5. Возвращает cycleId → `globalMutate('/api/cycles')` сразу ревалидирует SWR кэш
6. Главная страница (/) подхватывает running cycle → показывает Glitch Takeover
7. Агент при старте проверяет `process.env.CYCLE_ID` — если есть, переиспользует (update вместо insert)
8. Polling cycles каждые 5 секунд (SWR refreshInterval)

### SWR Hooks

| Hook | Endpoint | refreshInterval |
|------|----------|-----------------|
| `useCycles` | /api/cycles | 5s |
| `useNiches` | /api/niches | 30s |
| `useNiche` | /api/niches/[id] | — |
| `useNicheValidation` | /api/validations?nicheId= | — |
| `useNicheCompetitors` | /api/competitors?validationId= | — |
| `useAgentConfig` | /api/agents/[name]/config | — |
| `useAgents` | /api/agents | — |
| `useStats` | /api/stats | — |
| `useFavorites` | localStorage | — |

### Стилизация

**Тема** (globals.css `@theme inline`):
- Background: `#09090b`
- Foreground: `#f4f4f5`
- Card: `#18181b`
- Accent: `#06b6d4` (cyan)
- Matrix green: `#00ff41`
- Destructive: `#ef4444`

**Glassmorphism** (`.glass-card`):
- `bg-rgba(24,24,27,0.6)`, `backdrop-filter: blur(16px)`
- Gradient border на hover (cyan → purple)
- `translateY(-1px)` + box-shadow на hover

**CSS-анимации**: fade-in, slide-up, glow-pulse, shimmer, card-appear (stagger), drill-in, bar-grow, score-pulse, sheet-slide-in, nav-glitch, neon-wave

---

## База данных (Supabase PostgreSQL)

### Миграции

| # | Файл | Что создаёт |
|---|------|------------|
| 001 | `sql/001_initial_schema.sql` | cycles, niches (unique niche_name), rejections |
| 002 | `web/sql/002_agent_configs.sql` | agent_configs (JSONB config, system_prompt, is_active) |
| 003 | `sql/003_prompt_versioning.sql` | prompt_version на cycles, prompt_versions, prompt_comparison view |
| 004 | `sql/004_pain_points.sql` | LEGACY — pain_points (не используется) |
| 005 | `sql/005_pain_accumulation.sql` | LEGACY — merge logic для pain_points |
| 006 | `sql/006_validations.sql` | validations + business-validator config |
| 007 | `sql/007_competitive_analyses.sql` | competitive_analyses + competitive-intel config |
| 008 | `sql/008_signal_detector.sql` | signals, pain_clusters (v2 Signal Detector) |

### Ключевые таблицы

**cycles**: `id, agent_name, started_at, completed_at, status (running/completed/failed), error_message, niches_generated, niches_after_dedup, niches_after_filter, niches_saved, search_queries_used, prompt_version, signals_collected, signals_normalized, clusters_formed`

**niches**: `id, niche_name (unique ci), description, why_attractive, margin_potential, startup_capital, time_to_revenue, market_size, market_growth, ai_automation_score, competition_level, organic_traffic_potential, confidence_level, risk_flags[], sources[], total_score, cycle_id, status (active/rejected/archived), evidence_summary, signal_count, unique_source_count, avg_pain_intensity, existing_competitors[], cluster_id, sample_signals[]`

**signals**: `id, cycle_id, pain_description, who_has_pain, pain_intensity (1-5), willingness_to_pay (explicit/implied/unknown), industry_vertical, existing_solutions[], source_type, source_url, source_metadata (JSONB), raw_text, cluster_id`

**pain_clusters**: `id, cycle_id, cluster_name, pain_summary, signal_count, unique_source_count, avg_pain_intensity, has_willingness_to_pay, industry_vertical, existing_solutions[], niche_id`

**validations**: `id, niche_id, idea, market, verdict (GO/CONDITIONAL_GO/NO_GO), total_score, confidence_level, opportunity_headline, critical_insight, report (JSONB: blocks + strategic_recommendations), searches_performed[], model_used, tokens_used, cycle_id, status`

**competitive_analyses**: `id, validation_id, idea, market, competitors (JSONB[]), synthesis (JSONB), total_searches, model_used, tokens_used, searches_performed[], cycle_id, status`

**agent_configs**: `id, agent_name (unique), display_name, description, system_prompt, config (JSONB), is_active, last_run_at`

---

## ENV переменные

Файл: `.env.example`

```
OPENAI_API_KEY=           # OpenRouter API ключ
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=gpt-4o       # Дефолтная модель (не используется напрямую — каждый агент берёт свою)

VALIDATOR_MODEL=anthropic/claude-sonnet-4-5
COMPETITIVE_MODEL=anthropic/claude-sonnet-4-5
RESEARCHER_MODEL=anthropic/claude-sonnet-4-5

SUPABASE_URL=
SUPABASE_SERVICE_KEY=

SERPAPI_KEYS=key1,key2,key3  # Запятая-разделитель, авторотация

LOG_LEVEL=info
```

Web dashboard (web/.env.local): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (server-side, НЕ NEXT_PUBLIC_)

---

## NPM Scripts

**Root** (package.json):
```
agent:niche       — tsx src/agents/niche-researcher/index.ts
agent:validate    — tsx src/agents/business-validator/index.ts
agent:competitive — tsx src/agents/competitive-intel/index.ts
typecheck         — tsc --noEmit
```

**Web** (web/package.json):
```
dev   — next dev --turbopack (port 3000)
build — next build
start — next start
```

---

## Запуск

```bash
# Backend агенты (из корня ai-agents/)
npm run agent:niche
npm run agent:validate -- --niche-id <uuid>
npm run agent:competitive -- --validation-id <uuid>  # или npx tsx ...

# Frontend (из web/)
cd web && npm run dev   # → http://localhost:3000
```

---

## Структура проекта (полная)

```
ai-agents/
├── docs/
│   └── ARCHITECTURE.md         ← ВЫ ЗДЕСЬ
│
├── sql/
│   ├── 001_initial_schema.sql
│   ├── 003_prompt_versioning.sql
│   ├── 004_pain_points.sql     (legacy)
│   ├── 005_pain_accumulation.sql (legacy)
│   ├── 006_validations.sql
│   ├── 007_competitive_analyses.sql
│   └── 008_signal_detector.sql
│
├── src/
│   ├── shared/
│   │   ├── config.ts           — ENV + модели
│   │   ├── openai.ts           — OpenAI SDK (OpenRouter)
│   │   ├── supabase.ts         — Supabase клиент
│   │   ├── serpapi-client.ts   — SerpAPI + ротация ключей
│   │   ├── logger.ts
│   │   └── types.ts            — Niche, Validation, CompetitorProfile, Cycle
│   │
│   └── agents/
│       ├── niche-researcher/
│       │   ├── index.ts
│       │   ├── collect/         — reddit.ts, search.ts, trends.ts, types.ts
│       │   ├── extract.ts
│       │   ├── cluster.ts
│       │   ├── formulate.ts
│       │   ├── score.ts
│       │   ├── deduplicate.ts
│       │   ├── schemas.ts
│       │   └── store.ts
│       │
│       ├── business-validator/
│       │   ├── index.ts, validate.ts, prompt.ts, search.ts, parse.ts, store.ts
│       │
│       └── competitive-intel/
│           ├── index.ts, discover.ts, deep-dive.ts, synthesize.ts, prompt.ts, search.ts, parse.ts, store.ts
│
├── web/
│   ├── sql/
│   │   └── 002_agent_configs.sql
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       — RootLayout (ru, dark, FloatingNav, mesh-gradient)
│       │   ├── page.tsx         — Командный центр (MatrixRain + Glitch)
│       │   ├── globals.css      — Tailwind v4 theme + все анимации
│       │   ├── agents/[agentName]/page.tsx  — Конфиг агента
│       │   ├── niches/page.tsx              — Список ниш
│       │   ├── niches/[id]/page.tsx         — Детали ниши
│       │   └── api/
│       │       ├── agents/route.ts
│       │       ├── agents/[name]/config/route.ts
│       │       ├── agents/[name]/run/route.ts   — Запуск с pre-created cycle
│       │       ├── cycles/route.ts
│       │       ├── niches/route.ts
│       │       ├── niches/[id]/route.ts
│       │       ├── validations/route.ts
│       │       ├── validations/[id]/route.ts
│       │       ├── competitors/route.ts
│       │       ├── competitors/[id]/route.ts
│       │       ├── stats/route.ts
│       │       ├── validate/route.ts
│       │       └── analyze-competitors/route.ts
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── floating-nav.tsx       — 3 иконки + Bot dropdown (hover)
│       │   ├── command-center/
│       │   │   ├── matrix-rain.tsx        — Canvas Matrix Rain
│       │   │   ├── running-overlay.tsx    — Canvas Glitch Takeover
│       │   │   └── robotic-eyes.tsx       — Фон страницы агента
│       │   ├── agents/
│       │   │   ├── config-section.tsx
│       │   │   └── weight-slider.tsx
│       │   ├── niches/
│       │   │   ├── niche-card.tsx         — Компактный квадрат + heart
│       │   │   ├── niche-radar-chart.tsx
│       │   │   └── risk-flag-badge.tsx
│       │   ├── niche-detail/
│       │   │   ├── competitor-card.tsx
│       │   │   ├── score-circle.tsx
│       │   │   └── score-bar.tsx
│       │   └── validations/
│       │       └── verdict-badge.tsx
│       │
│       ├── hooks/
│       │   ├── use-agents.ts
│       │   ├── use-agent-config.ts   — + triggerRun + globalMutate('/api/cycles')
│       │   ├── use-cycles.ts         — refreshInterval: 5_000
│       │   ├── use-niches.ts
│       │   ├── use-niche.ts
│       │   ├── use-niche-validation.ts
│       │   ├── use-niche-competitors.ts
│       │   ├── use-stats.ts
│       │   └── use-favorites.ts      — localStorage, cross-tab sync
│       │
│       └── lib/
│           ├── types.ts      — Frontend типы
│           ├── fetcher.ts    — SWR fetcher (throws on non-200)
│           ├── supabase.ts   — Supabase клиент (для API routes)
│           └── utils.ts      — cn(), formatNumber()
│
├── package.json               — Backend deps + scripts
├── tsconfig.json
└── .env.example
```

---

## Технологии

| Технология | Версия | Зачем |
|-----------|--------|-------|
| TypeScript | 5.9 | Язык всего проекта |
| tsx | 4.21 | Рантайм агентов |
| OpenAI SDK | 6.25 | LLM-вызовы через OpenRouter |
| Supabase JS | 2.98 | PostgreSQL клиент |
| SerpAPI | 2.2 | Google Search, Reddit Search, Google Trends |
| Zod | 3.25 | JSON-валидация ответов LLM |
| dotenv | 17.3 | ENV для бэкенда |
| Next.js | 16.1.6 | Веб-дашборд (App Router, Turbopack) |
| React | 19.2.3 | UI |
| Tailwind CSS | v4 | Стилизация (PostCSS, @theme inline) |
| SWR | 2.4.1 | Data fetching + кэширование |
| Recharts | 3.7 | Графики (RadarChart для ниш) |
| Lucide React | — | Иконки |
