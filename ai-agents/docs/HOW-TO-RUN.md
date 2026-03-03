# Как запустить агента

---

## Подготовка (один раз)

### 1. Заполни файл .env
Открой файл `ai-agents/.env` и впиши свои ключи:
```
OPENAI_API_KEY=sk-тут-твой-ключ-openai
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ-тут-твой-ключ-supabase
SERPAPI_KEY=тут-твой-ключ-serpapi
OPENAI_MODEL=gpt-4o
LOG_LEVEL=info
```

### 2. Создай таблицы в Supabase
- Открой Supabase Dashboard → SQL Editor
- Скопируй содержимое файла `sql/001_initial_schema.sql`
- Нажми "Run"

---

## Запуск Agent #1 (Niche Researcher)

### Открой терминал и введи:
```
cd c:\Users\mrazb\Documents\Projects\ai-agents
npm run agent:niche
```

### Что ты увидишь:
```
[2026-02-27T10:00:00.000Z] [INFO] === Niche Researcher Agent: Starting Cycle ===
[2026-02-27T10:00:00.100Z] [INFO] Cycle abc-123 created
[2026-02-27T10:00:01.000Z] [INFO] Searching: "trending online business ideas 2026"
[2026-02-27T10:00:02.000Z] [INFO] Found 15 snippets for "trending online business ideas 2026"
...
[2026-02-27T10:00:30.000Z] [INFO] Generated 50 niche ideas via GPT-4o
[2026-02-27T10:00:31.000Z] [INFO] Deduplication: 50 -> 48 (removed 2 duplicates)
[2026-02-27T10:00:31.100Z] [INFO] Filtering: 48 -> 22 passed (26 rejected)
[2026-02-27T10:00:32.000Z] [INFO] Saved 10 niches to Supabase
[2026-02-27T10:00:32.100Z] [INFO] === Cycle Complete: 10 niches saved ===
[2026-02-27T10:00:32.200Z] [INFO]   #1 [87] AI Resume Optimization SaaS — margin:85% growth:25% ai:95%
[2026-02-27T10:00:32.200Z] [INFO]   #2 [82] Automated Email Course Platform — margin:90% growth:20% ai:90%
...
```

### Где посмотреть результаты:
- Открой Supabase Dashboard → Table Editor → таблица `niches`
- Там будут 10 новых записей с оценками

---

## Если что-то пошло не так

| Ошибка | Причина | Решение |
|--------|---------|---------|
| "Missing required environment variable" | Не заполнен .env файл | Заполни все поля в .env |
| "401 Unauthorized" | Неверный API ключ | Проверь ключи в .env |
| "Cycle failed" | Ошибка во время работы агента | Читай error_message в таблице cycles |
