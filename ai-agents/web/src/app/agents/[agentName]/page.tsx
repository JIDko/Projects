'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Play,
  Power,
  PowerOff,
  RotateCcw,
} from 'lucide-react';
import { useAgentConfig } from '@/hooks/use-agent-config';
import { WeightSlider } from '@/components/agents/weight-slider';
import { ConfigSection } from '@/components/agents/config-section';

interface WeightsConfig {
  [key: string]: number;
}

/* ─── Russian labels for every known config field ─── */
const FIELD_LABELS: Record<string, string> = {
  // niche-researcher weights
  margin: 'Маржинальность',
  growth: 'Рост рынка',
  ai_automation: 'AI-автоматизация',
  competition: 'Конкуренция',
  entry_barrier: 'Барьер входа',
  scalability: 'Масштабируемость',
  // niche-researcher filters
  min_market_growth: 'Мин. рост рынка (%)',
  require_digital: 'Только цифровой бизнес',
  require_white_market: 'Только белый рынок',
  require_english: 'Англоязычный рынок',
  // niche-researcher search
  queries_per_run: 'Запросов за запуск',
  results_per_query: 'Результатов на запрос',
  // competitive-intel
  searches_per_competitor: 'Поисков на конкурента',
  model: 'Модель',
  // scoring
  min_score: 'Мин. балл',
  min_score_to_save: 'Мин. балл для сохранения',
  top_n: 'Топ N для сохранения',
};

/* ─── Section descriptions per agent ─── */
const SECTION_META: Record<string, Record<string, { title: string; description: string }>> = {
  'niche-researcher': {
    filters: { title: 'Жёсткие фильтры', description: 'Ниши, не прошедшие проверку, сразу отклоняются' },
    search: { title: 'Настройки поиска', description: 'Количество запросов и результатов за один запуск' },
    scoring: { title: 'Настройки вывода', description: 'Управление сохранением найденных ниш' },
  },
  'competitive-intel': {
    filters: { title: 'Фильтры', description: 'Параметры анализа конкурентов' },
    search: { title: 'Настройки поиска', description: 'Количество поисковых запросов на конкурента' },
    scoring: { title: 'Настройки вывода', description: 'Управление результатами анализа' },
  },
};

const DEFAULT_SECTION_META = {
  filters: { title: 'Фильтры', description: 'Обязательные требования для результатов' },
  search: { title: 'Настройки поиска', description: 'Параметры поиска за один запуск' },
  scoring: { title: 'Настройки вывода', description: 'Управление сохранением результатов' },
};

function getLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSectionMeta(agentName: string, section: string) {
  return SECTION_META[agentName]?.[section] ?? DEFAULT_SECTION_META[section as keyof typeof DEFAULT_SECTION_META] ?? { title: section, description: '' };
}

export default function AgentConfigPage({
  params,
}: {
  params: Promise<{ agentName: string }>;
}) {
  const { agentName } = use(params);
  const { agent, isLoading, updateConfig, triggerRun } = useAgentConfig(agentName);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [weights, setWeights] = useState<WeightsConfig>({});
  const [filters, setFilters] = useState<Record<string, number | boolean>>({});
  const [search, setSearch] = useState<Record<string, number>>({});
  const [scoring, setScoring] = useState<Record<string, number>>({});
  const [promptVersion, setPromptVersion] = useState('v2');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setSystemPrompt(agent.system_prompt ?? '');
      setIsActive(agent.is_active);
      const cfg = agent.config as Record<string, unknown>;
      if (cfg.weights) setWeights(cfg.weights as WeightsConfig);
      if (cfg.filters) setFilters(cfg.filters as Record<string, number | boolean>);
      if (cfg.search) setSearch(cfg.search as Record<string, number>);
      if (cfg.scoring) setScoring(cfg.scoring as Record<string, number>);
      if (cfg.prompt_version) setPromptVersion(cfg.prompt_version as string);
    }
  }, [agent]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        system_prompt: systemPrompt,
        is_active: isActive,
        config: { weights, filters, search, scoring, prompt_version: promptVersion },
      });
      showToast('Конфигурация сохранена');
    } catch {
      showToast('Ошибка сохранения конфигурации');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await triggerRun();
      showToast(result.message ?? 'Агент запущен');
    } catch {
      showToast('Ошибка запуска агента');
    } finally {
      setRunning(false);
    }
  };

  const handleWeightChange = (key: string, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const weightsTotal = Object.values(weights).reduce((s, v) => s + v, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded-2xl" />
        <div className="glass-card p-6 h-48" />
        <div className="glass-card p-6 h-64" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Link href="/agents" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          Назад к агентам
        </Link>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Агент не найден</p>
        </div>
      </div>
    );
  }

  /* ─── Dynamic field renderers ─── */

  const renderBooleanField = (
    key: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <div key={key} className="flex items-center justify-between">
      <label className="text-sm">{getLabel(key)}</label>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-accent' : 'bg-muted'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            value ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );

  const renderNumberField = (
    key: string,
    value: number,
    onChange: (v: number) => void,
    inline = false,
  ) => (
    <div key={key} className={inline ? 'flex items-center justify-between' : 'space-y-2'}>
      <label className={`text-sm ${inline ? '' : 'text-muted-foreground'}`}>{getLabel(key)}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inline ? 'w-20 text-center' : 'w-full'} px-3 py-1.5 bg-muted/20 border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50`}
      />
    </div>
  );

  /* Separate booleans and numbers in filters */
  const filterBooleans = Object.entries(filters).filter(([, v]) => typeof v === 'boolean') as [string, boolean][];
  const filterNumbers = Object.entries(filters).filter(([, v]) => typeof v === 'number') as [string, number][];

  const filtersMeta = getSectionMeta(agentName, 'filters');
  const searchMeta = getSectionMeta(agentName, 'search');
  const scoringMeta = getSectionMeta(agentName, 'scoring');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-medium transition-all duration-300">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/agents"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Агенты
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">
            {agent.display_name}
          </h2>
          <p className="text-muted-foreground text-sm">{agent.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-zinc-600/30 text-zinc-400 hover:bg-zinc-600/40'
            }`}
          >
            {isActive ? (
              <Power className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <PowerOff className="h-4 w-4" strokeWidth={1.5} />
            )}
            {isActive ? 'Активен' : 'Неактивен'}
          </button>

          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {running ? (
              <RotateCcw className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Play className="h-4 w-4" strokeWidth={1.5} />
            )}
            {running ? 'Запуск...' : 'Запустить'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-accent text-background hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* System Prompt */}
      <ConfigSection
        title="Системный промпт"
        description="Основные инструкции для AI-агента"
      >
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 bg-muted/20 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors resize-y font-mono leading-relaxed"
        />
        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Версия промпта</label>
          <input
            type="text"
            value={promptVersion}
            onChange={(e) => setPromptVersion(e.target.value)}
            placeholder="v2"
            className="w-32 px-3 py-1.5 bg-muted/20 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
          />
          <span className="text-xs text-muted-foreground">Записывается в cycles для A/B сравнения</span>
        </div>
      </ConfigSection>

      {/* Scoring Weights */}
      {Object.keys(weights).length > 0 && (
        <ConfigSection
          title="Веса оценки"
          description={`Настройте важность каждого фактора. Итого: ${Math.round(weightsTotal * 100)}% ${
            Math.abs(weightsTotal - 1) > 0.01 ? '(должно быть 100%)' : ''
          }`}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Object.entries(weights).map(([key, value]) => (
              <WeightSlider
                key={key}
                label={getLabel(key)}
                value={value}
                onChange={(v) => handleWeightChange(key, v)}
              />
            ))}
          </div>
        </ConfigSection>
      )}

      {/* Filters — dynamic */}
      {Object.keys(filters).length > 0 && (
        <ConfigSection title={filtersMeta.title} description={filtersMeta.description}>
          <div className="space-y-4">
            {filterNumbers.map(([key, value]) =>
              renderNumberField(key, value, (v) => setFilters((prev) => ({ ...prev, [key]: v })), true),
            )}
            {filterBooleans.map(([key, value]) =>
              renderBooleanField(key, value, (v) => setFilters((prev) => ({ ...prev, [key]: v }))),
            )}
          </div>
        </ConfigSection>
      )}

      {/* Search — dynamic */}
      {Object.keys(search).length > 0 && (
        <ConfigSection title={searchMeta.title} description={searchMeta.description}>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(search).map(([key, value]) =>
              renderNumberField(key, value, (v) => setSearch((prev) => ({ ...prev, [key]: v }))),
            )}
          </div>
        </ConfigSection>
      )}

      {/* Scoring — dynamic */}
      {Object.keys(scoring).length > 0 && (
        <ConfigSection title={scoringMeta.title} description={scoringMeta.description}>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(scoring).map(([key, value]) =>
              renderNumberField(key, value, (v) => setScoring((prev) => ({ ...prev, [key]: v }))),
            )}
          </div>
        </ConfigSection>
      )}
    </div>
  );
}
