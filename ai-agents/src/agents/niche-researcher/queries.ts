// Rotating search queries for Google via SerpApi.
// Each cycle picks a different subset to get diverse results.
// Intentionally avoids AI-heavy terms — Reddit and Trends cover that space.
// Focus: underserved verticals, boring businesses, manual process gaps.
export const SEARCH_QUERIES = [
  // Underserved industries and manual processes
  'manual processes small businesses still do 2026',
  'industries still using paper and spreadsheets 2026',
  'spreadsheet-heavy workflows businesses hate',
  'legacy software replacement small business',
  'boring profitable software business niches',
  // Field services and trades
  'field service software gap small business',
  'HVAC plumbing pest control software needs',
  'trade business management software underserved',
  // Vertical SaaS and specific industries
  'vertical SaaS underserved industries 2026',
  'funeral home veterinary dental office software gaps',
  'supply chain visibility small business tools',
  'commercial laundry freight logistics software',
  // Regulatory and compliance
  'new regulation compliance software opportunity',
  'compliance tool opportunity new regulation 2026',
  'OSHA safety reporting small business software',
  // Competitor and market signals
  'G2 Capterra worst rated software categories',
  'Upwork recurring automation jobs small business',
  'freelancer pain points software tools',
  'creator economy monetization tools gap',
  // Traction and opportunity signals
  'YC startup batch 2026 trends',
  'Product Hunt top launches this month',
  'indie hacker revenue milestones 2026',
  'bootstrapped SaaS reaching $10k MRR',
  'micro SaaS profitable niche examples 2026',
];

// Pick N queries using cycle number for rotation
export function pickQueries(count: number, cycleNumber: number): string[] {
  const offset = (cycleNumber * count) % SEARCH_QUERIES.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(SEARCH_QUERIES[(offset + i) % SEARCH_QUERIES.length]!);
  }
  return picked;
}
