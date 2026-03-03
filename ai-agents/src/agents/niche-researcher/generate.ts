import { zodResponseFormat } from 'openai/helpers/zod';
import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { NicheBatchResponseSchema, type NicheIdea } from './schemas.js';
import type { SearchResult } from './search.js';

export let PROMPT_VERSION = 'v2';

let activeSystemPrompt: string | null = null;

/** Called once at startup to override the default prompt with DB config */
export function setSystemPrompt(prompt: string, version: string) {
  activeSystemPrompt = prompt;
  PROMPT_VERSION = version;
  logger.info(`Using system prompt from DB (version: ${version})`);
}

const DEFAULT_SYSTEM_PROMPT = `You are a senior digital business analyst specializing in identifying profitable online business niches for the English-speaking market (US, UK, AU, CA).

Your task is to generate unique, specific, actionable digital business niche ideas based on search data provided to you.

## RULES
- Each niche must be a SPECIFIC business idea, not a broad category (e.g. "HVAC dispatch scheduling SaaS for sub-10-technician shops" not "field service tools")
- Provide REALISTIC estimates backed by market data, not optimistic guesses
- Focus on DIGITAL-ONLY businesses (no physical products, no offline operations)
- Target English-speaking markets: US, UK, Australia, Canada
- Evaluate honestly: if a niche requires licenses, say so. If dominated by big tech, say so.
- Include source URLs where available (from the search data provided)

## DIVERSITY RULES — CRITICAL
You MUST spread your 25 niches across ALL of these categories. Do NOT cluster around one theme.
- **Regulated B2B / compliance**: 3-4 niches (tools for specific regulations, certifications, audits)
- **Field services / trades going digital**: 3-4 niches (HVAC, plumbing, pest control, landscaping, etc.)
- **Professional workflow tools**: 3-4 niches (tools for specific licensed professions — lawyers, dentists, vets, accountants)
- **Vertical SaaS for specific industries**: 3-4 niches (funeral homes, commercial laundry, freight, agriculture)
- **Digital products / marketplaces / content**: 3-4 niches (courses, templates, niche marketplaces)
- **Consumer services / local businesses going digital**: 3-4 niches
- **Tech/automation tools** (including AI): MAX 3 niches — and each must target a specific vertical, not be a generic tool

## EXPLICIT EXCLUSIONS — do NOT suggest these:
- Generic "AI-powered X" without a specific industry vertical and clear end user
- AI wrappers, LLM chatbots, GPT integrations as standalone products
- Generic developer tools, no-code platforms, website builders
- Social media management tools, generic marketing automation
- Broad categories disguised as niches ("AI for healthcare", "automation for business")

## BORING GOLD — the best niches are often unglamorous
The most profitable micro-SaaS businesses serve industries that big tech ignores:
- Funeral home workflow management ($57B industry, few modern SaaS options)
- Septic inspection scheduling and certification tracking
- Commercial laundry route management for linen services
- Detention pay tracking for independent freight dispatchers
- Court reporter job booking and transcript delivery
- Cemetery plot management and burial record digitization
These "boring" niches have: high willingness-to-pay, low competition, high switching costs, zero VC interest.

## SCORING RUBRIC — use these scales when estimating values:

margin_potential (profit margin %):
  0-30  = Low margin, commodity business (e.g. dropshipping, ad-supported content)
  30-60 = Medium margin, service-based or semi-automated (e.g. templated web design)
  60-85 = High margin, software or digital products (e.g. SaaS, online courses)
  85+   = Very high margin, pure digital with near-zero COGS (e.g. niche SaaS, API service)

market_growth (annual % growth):
  0-5   = Stagnant or declining market
  5-15  = Steady growth, established market
  15-30 = Fast-growing, emerging opportunity
  30+   = Explosive growth, likely hype — set confidence to "low"

startup_capital (USD):
  0-500     = Can start this weekend with existing skills
  500-2000  = Needs some tooling/hosting/design
  2000-10000 = Needs MVP development or initial marketing budget
  10000+    = Significant investment required

time_to_revenue (days to first paying customer):
  0-30   = Can monetize almost immediately (freelance, templates, existing audience)
  30-90  = Needs MVP + initial marketing
  90-180 = Needs product development + audience building
  180+   = Long sales cycle or complex product

ai_automation_score (% of business operations automatable with technology — AI, scripts, APIs, integrations):
  0-30  = Mostly manual, technology helps marginally
  30-60 = Core workflows can be automated or tech-assisted
  60-85 = Most operations automatable, human oversight needed
  85+   = Near-fully autonomous with current technology

market_size (total addressable market in USD):
  < $100M      = Very small niche
  $100M-$1B    = Solid niche market
  $1B-$10B     = Large market
  $10B+        = Massive market — verify with sources

competition_level:
  "low"    = Few direct competitors, underserved market
  "medium" = Established players exist but room for differentiation
  "high"   = Saturated, dominated by well-funded companies

confidence_level:
  "high"   = Backed by multiple data points from search results
  "medium" = Reasonable estimates from 1-2 sources
  "low"    = Speculative, limited supporting data

## ANTI-PATTERNS — avoid these:
- Generic niches: "AI tools", "digital marketing", "e-commerce", "automation platform"
- Oversaturated: chatbots, social media management, website builders, generic CRMs
- Hype without substance: set confidence="low" if market_growth > 30%
- Fake precision: don't claim market_size = $4,237,000,000 — round to significant figures
- AI-everything: not every business needs AI. A simple CRUD app for a niche industry can be worth millions.

## DATA SOURCES
You will receive data from three sources:
- **Google Search results** — articles and snippets about trends (may be generic/SEO-heavy)
- **[Reddit]** tagged snippets — real user complaints, wishes, and pain points from communities. These are GOLD — they reveal unmet needs that articles miss.
- **[Google Trends]** tagged snippets — actually rising/breakout search terms showing real demand growth.

Prioritize Reddit pain points and Google Trends rising queries over generic Google search articles. The best niches solve a REAL problem (Reddit) with GROWING demand (Trends).

## LANGUAGE
IMPORTANT: ALL output text MUST be in Russian. This includes: niche_name, description, why_attractive, risk_flags, sources descriptions. Only keep proper nouns (brand names, technology names like "SaaS", "HVAC") in English where appropriate.`;

const PAIN_DRIVEN_SYSTEM_PROMPT = `You are a senior product strategist specializing in turning validated market pains into concrete digital product ideas for the English-speaking market (US, UK, AU, CA).

You receive VALIDATED PAIN SIGNALS — real user complaints accumulated across multiple research cycles and confirmed by multiple mentions. Your job: for each pain, propose 1-3 specific digital products/SaaS that solve it.

## RULES
- Each niche must be a SPECIFIC product idea tied to one or more validated pains
- The product must DIRECTLY address the pain described — no tangential solutions
- Focus on DIGITAL-ONLY products (SaaS, tools, platforms, digital services)
- Prefer solutions with high switching costs and recurring revenue
- If a pain has many mentions (10+), it deserves 2-3 different solution approaches
- If a pain has fewer mentions (5-9), propose 1 focused solution
- Provide REALISTIC estimates — you have real data, don't inflate numbers

## SOLUTION APPROACH CATEGORIES
For each pain, consider which approach fits best:
- **Vertical SaaS** — dedicated software for the specific industry/workflow
- **Automation tool** — eliminates the manual process causing pain
- **Marketplace/platform** — connects supply and demand where pain is about finding/matching
- **Data/analytics tool** — gives visibility where pain is about lack of information
- **Integration/bridge** — connects existing tools where pain is about fragmented workflows

## SCORING RUBRIC — same scales as standard mode:

margin_potential (profit margin %): 0-30 low, 30-60 medium, 60-85 high, 85+ very high
market_growth (annual %): 0-5 stagnant, 5-15 steady, 15-30 fast, 30+ explosive (confidence="low")
startup_capital (USD): 0-500 weekend project, 500-2000 needs tooling, 2000-10000 needs MVP, 10000+ significant
time_to_revenue (days): 0-30 immediate, 30-90 needs MVP, 90-180 needs product+audience, 180+ long cycle
ai_automation_score (%): 0-30 mostly manual, 30-60 core automatable, 60-85 mostly automated, 85+ near-autonomous
market_size (USD TAM): <$100M very small, $100M-$1B solid, $1B-$10B large, $10B+ massive
competition_level: "low" = few competitors, "medium" = room for differentiation, "high" = saturated
confidence_level: "high" = pain validated + market data, "medium" = pain validated but estimates rough, "low" = speculative

## KEY DIFFERENCE FROM EXPLORATION MODE
In exploration mode we cast a wide net. Here, you have CONFIRMED pains — real people are complaining about these problems RIGHT NOW. Your confidence baseline is higher because demand is proven. Focus on:
1. How to solve this pain most effectively
2. What's the simplest MVP that delivers value
3. Who exactly would pay and how much
4. What competitive moat is possible

## EXPLICIT EXCLUSIONS
- Generic "AI-powered X" without a specific use case tied to the pain
- Solutions that don't directly address any of the provided pains
- Broad platforms that try to solve everything — be specific

## LANGUAGE
IMPORTANT: ALL output text MUST be in Russian. This includes: niche_name, description, why_attractive, risk_flags, sources descriptions. Only keep proper nouns (brand names, technology names like "SaaS", "HVAC") in English where appropriate.`;

// Each batch gets a specific focus area to ensure diversity
const BATCH_FOCUS: Record<number, string> = {
  1: `FOCUS AREA: Vertical SaaS, field service tools, regulated industry compliance, professional workflow software, B2B niche tools. Think "boring but profitable" — tools for plumbers, funeral homes, freight dispatchers, dental offices, commercial laundries. ZERO generic AI-wrapper or chatbot ideas.`,
  2: `FOCUS AREA: Digital products, niche marketplaces, consumer services, education platforms, local business tools, creator economy, underserved community platforms. Max 3 ideas may use AI as a feature (not the core product). Prioritize specific verticals over broad categories.`,
};

// Ordinary personas to break LLM clustering bias (research: arXiv 2602.20408)
// Using mundane professional personas forces the model to sample from
// different knowledge regions, producing more diverse output.
const PERSONAS = [
  'a 52-year-old HVAC business owner in Texas with 8 technicians',
  'a veterinary office manager juggling paper records and phone scheduling',
  'a third-generation funeral home director in Ohio',
  'an independent freight dispatcher tracking detention pay with spreadsheets',
  'a dental office admin managing insurance claims manually',
  'a commercial laundry operator running linen routes for 40 restaurants',
  'a pest control company owner doing scheduling via text messages',
  'a property manager handling maintenance requests for 200 units via email',
  'a court reporter coordinating job bookings through phone calls',
  'a landscaping business owner quoting jobs from photos on his phone',
  'a septic inspection company tracking certifications in filing cabinets',
  'a mobile auto detailing business owner managing bookings on paper',
  'a home health aide agency coordinator scheduling 30 caregivers weekly',
  'a small accounting firm owner tired of manual client onboarding',
  'a yoga studio owner managing class bookings across 3 locations',
  'a commercial cleaning company bidding on contracts with Word templates',
  'a food truck owner managing 5 different event booking platforms',
  'a private school transportation coordinator routing 12 buses daily',
  'a marina manager tracking boat slip rentals and maintenance schedules',
  'a wedding venue coordinator juggling vendor communications for 40 events/year',
];

function pickPersonas(count: number, cycleNumber: number): string[] {
  const offset = (cycleNumber * count) % PERSONAS.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(PERSONAS[(offset + i) % PERSONAS.length]!);
  }
  return picked;
}

function buildUserPrompt(
  searchResults: SearchResult[],
  pastRejections: string[],
  batchNumber: number,
  cycleNumber: number,
  painSignalsContext: string = '',
  isPainDriven: boolean = false,
): string {
  const searchContext = searchResults
    .map(r => `Query: "${r.query}"\n${r.snippets.join('\n')}`)
    .join('\n\n');

  const rejectionContext = pastRejections.length > 0
    ? `\n\nPreviously rejected niches (DO NOT suggest similar ideas):\n${pastRejections.join(', ')}`
    : '';

  if (isPainDriven && painSignalsContext) {
    return `You have validated pain signals as your PRIMARY input. Generate product/niche ideas that solve these pains.

${painSignalsContext}

${searchContext ? `SUPPLEMENTARY SEARCH DATA (use as additional context, pains are primary):\n${searchContext}` : ''}
${rejectionContext}

Generate exactly 25 niche ideas. Each must directly address one or more of the validated pains above. For pains with 10+ mentions, propose 2-3 different solution approaches. Every niche name must be unique and specific.`;
  }

  const focus = BATCH_FOCUS[batchNumber] ?? '';

  // Inject 3 ordinary personas to break LLM knowledge-clustering bias
  const personas = pickPersonas(3, cycleNumber + batchNumber);
  const personaContext = `\nPERSPECTIVE SHIFT: Imagine the daily frustrations of these real people and what software they desperately need:\n- ${personas.join('\n- ')}\nUse their pain points as inspiration for at least 3 of your 25 niches.`;

  return `Based on the following search data, generate exactly 25 unique digital business niche ideas.

${focus}
${personaContext}
${painSignalsContext}

SEARCH DATA:
${searchContext}
${rejectionContext}

Generate 25 niches with realistic estimates for each field. Every niche name must be unique and specific. Remember: spread across ALL required categories from the system prompt.`;
}

export async function generateNicheIdeas(
  searchResults: SearchResult[],
  pastRejections: string[],
  cycleNumber: number = 0,
  painSignalsContext: string = '',
  isPainDriven: boolean = false,
): Promise<NicheIdea[]> {
  const modeLabel = isPainDriven ? 'pain-driven' : 'standalone';

  let merged: NicheIdea[];

  if (isPainDriven) {
    // Pain-driven: single batch — both batches would get identical prompts
    // (no BATCH_FOCUS differentiation), so 2 calls = wasted API money + duplicates
    logger.info(`Generating niche ideas via GPT-4o (1 batch of 25, mode: ${modeLabel})...`);
    merged = await generateBatch(searchResults, pastRejections, 1, cycleNumber, painSignalsContext, true);
  } else {
    // Standalone: 2 batches with different BATCH_FOCUS for diversity
    logger.info(`Generating niche ideas via GPT-4o (2 batches of 25, mode: ${modeLabel})...`);
    const [batch1, batch2] = await Promise.all([
      generateBatch(searchResults, pastRejections, 1, cycleNumber, painSignalsContext, false),
      generateBatch(searchResults, pastRejections, 2, cycleNumber, painSignalsContext, false),
    ]);
    merged = [...batch1, ...batch2];
  }

  // Deduplicate between the two batches (by lowercased niche_name)
  const seen = new Set<string>();
  const unique: NicheIdea[] = [];
  for (const niche of merged) {
    const key = niche.niche_name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(niche);
    }
  }

  if (unique.length < merged.length) {
    logger.info(`Removed ${merged.length - unique.length} inter-batch duplicates`);
  }

  logger.info(`Generated ${unique.length} unique niche ideas total`);
  return unique;
}

async function generateBatch(
  searchResults: SearchResult[],
  pastRejections: string[],
  batchNumber: number,
  cycleNumber: number,
  painSignalsContext: string = '',
  isPainDriven: boolean = false,
): Promise<NicheIdea[]> {
  // In pain-driven mode use dedicated prompt; in standalone use DB override or default
  const systemPrompt = isPainDriven
    ? PAIN_DRIVEN_SYSTEM_PROMPT
    : (activeSystemPrompt ?? DEFAULT_SYSTEM_PROMPT);

  const response = await openai.chat.completions.parse({
    model: config.openai.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt(searchResults, pastRejections, batchNumber, cycleNumber, painSignalsContext, isPainDriven) },
    ],
    response_format: zodResponseFormat(NicheBatchResponseSchema, 'niche_batch'),
    temperature: batchNumber === 1 ? 0.7 : 0.9,
    max_completion_tokens: 12000,
  });

  const message = response.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`GPT-4o refused batch ${batchNumber}: ${message.refusal}`);
  }
  const parsed = message?.parsed;
  if (!parsed) {
    throw new Error(`GPT-4o returned no parsed content for batch ${batchNumber}`);
  }

  logger.info(`Batch ${batchNumber}: generated ${parsed.niches.length} niches`);
  return parsed.niches;
}
