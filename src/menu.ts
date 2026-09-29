// Cardápio semanal: base de pratos + gerador por regras (sem serviço externo).
import type { Profile } from './store';

export type Restriction = 'vegetariano' | 'vegano' | 'lactose' | 'gluten' | 'ovo' | 'peixes' | 'oleaginosas' | 'suina';
export type SlotId = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche' | 'jantar' | 'ceia';
export type Activity = 'sedentario' | 'leve' | 'moderado' | 'intenso';
export type FoodPrefs = { likes: string[]; avoid: string[]; restrictions: Restriction[]; mealsPerDay: number; activity: Activity; seed: number };

export const activityOptions: { id: Activity; label: string; hint: string; factor: number }[] = [
  { id: 'sedentario', label: 'Sedentário', hint: 'Pouco ou nenhum exercício', factor: 1.2 },
  { id: 'leve', label: 'Leve', hint: 'Caminhadas ou exercício 1–3x por semana', factor: 1.375 },
  { id: 'moderado', label: 'Moderado', hint: 'Exercício 3–5x por semana', factor: 1.55 },
  { id: 'intenso', label: 'Intenso', hint: 'Exercício 6–7x por semana', factor: 1.725 },
];

export const restrictionOptions: { id: Restriction; label: string }[] = [
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'lactose', label: 'Sem lactose' },
  { id: 'gluten', label: 'Sem glúten' },
  { id: 'ovo', label: 'Sem ovo' },
  { id: 'peixes', label: 'Sem peixes e frutos do mar' },
  { id: 'oleaginosas', label: 'Sem amendoim e castanhas' },
  { id: 'suina', label: 'Sem carne suína' },
];

export const slotLabels: Record<SlotId, string> = {
  cafe: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
};

/** Refeições do dia e fatia das calorias diárias de cada uma, conforme a quantidade escolhida. */
const slotPlans: Record<number, [SlotId, number][]> = {
  3: [['cafe', 0.3], ['almoco', 0.4], ['jantar', 0.3]],
  4: [['cafe', 0.25], ['almoco', 0.35], ['lanche', 0.15], ['jantar', 0.25]],
  5: [['cafe', 0.22], ['lanche_manha', 0.1], ['almoco', 0.33], ['lanche', 0.12], ['jantar', 0.23]],
  6: [['cafe', 0.2], ['lanche_manha', 0.1], ['almoco', 0.3], ['lanche', 0.12], ['jantar', 0.2], ['ceia', 0.08]],
};
export const mealCountOptions = [3, 4, 5, 6];
export const slotsFor = (n = 4) => (slotPlans[n] ?? slotPlans[4]).map(([id, share]) => ({ id, share, label: slotLabels[id] }));

type Flag = 'carne' | 'peixe' | 'suina' | 'ovo' | 'lactose' | 'gluten' | 'oleaginosas';
type Dish = { name: string; kcal: number; protein: number; flags: Flag[] };
type Kind = 'cafe' | 'principal' | 'jantar' | 'lanche';
const kindOf: Record<SlotId, Kind> = { cafe: 'cafe', lanche_manha: 'lanche', almoco: 'principal', lanche: 'lanche', jantar: 'jantar', ceia: 'lanche' };

const d = (name: string, kcal: number, protein: number, flags: Flag[] = []): Dish => ({ name, kcal, protein, flags });

const dishes: Record<Kind, Dish[]> = {
  cafe: [
    d('Omelete de 2 ovos com espinafre e tomate + 1 fatia de pão integral', 320, 19, ['ovo', 'gluten']),
    d('Iogurte natural com aveia, morango e chia', 280, 14, ['lactose', 'gluten']),
    d('Tapioca com queijo branco e tomate + café com leite', 330, 16, ['lactose']),
    d('Crepioca (ovo + tapioca) com frango desfiado', 310, 24, ['ovo', 'carne']),
    d('Pão integral com pasta de grão-de-bico e tomate + 1 fruta', 300, 11, ['gluten']),
    d('Mingau de aveia com bebida vegetal, banana e canela', 290, 8, ['gluten']),
    d('Cuscuz nordestino com ovo mexido e café', 330, 15, ['ovo']),
    d('Vitamina de banana com leite, aveia e pasta de amendoim', 340, 16, ['lactose', 'gluten', 'oleaginosas']),
    d('Tapioca com pasta de amendoim e banana', 320, 8, ['oleaginosas']),
    d('Cuscuz com tofu mexido, tomate e cheiro-verde', 300, 16),
    d('Panqueca de banana com ovo e aveia + mamão', 300, 14, ['ovo', 'gluten']),
    d('Salada de frutas com iogurte vegetal e sementes de girassol', 260, 7),
    d('Pão de queijo (2 unid.) + mamão com chia + café', 310, 9, ['lactose', 'ovo']),
  ],
  principal: [
    d('Arroz integral, feijão, frango grelhado e salada de folhas com cenoura', 520, 38, ['carne']),
    d('Arroz, feijão, bife de patinho acebolado e abobrinha refogada', 540, 36, ['carne']),
    d('Peixe assado com batata-doce e brócolis', 480, 35, ['carne', 'peixe']),
    d('Escondidinho de mandioca com carne moída magra + salada', 550, 32, ['carne', 'lactose']),
    d('Macarrão integral ao sugo com frango desfiado + salada', 530, 34, ['carne', 'gluten']),
    d('Arroz, lentilha, tofu grelhado e legumes salteados', 500, 26),
    d('Strogonoff de frango light com arroz e salada', 540, 35, ['carne', 'lactose']),
    d('Omelete de forno com legumes, arroz integral e salada', 460, 24, ['ovo']),
    d('Quinoa com grão-de-bico, legumes assados e molho de tahine', 490, 20),
    d('Arroz, feijão, lombo suíno assado e couve refogada', 560, 36, ['carne', 'suina']),
    d('Camarão ao alho com arroz integral e legumes', 470, 32, ['carne', 'peixe']),
    d('Feijão preto com legumes, arroz integral, couve e farofa de linhaça', 500, 20),
    d('Frango ao curry com arroz e legumes', 520, 36, ['carne']),
    d('Carne de panela com mandioquinha, cenoura e salada', 530, 34, ['carne']),
  ],
  jantar: [
    d('Sopa de legumes com frango desfiado', 360, 26, ['carne']),
    d('Salada completa com atum, ovo, grão-de-bico e folhas', 400, 32, ['carne', 'peixe', 'ovo']),
    d('Wrap integral com frango, alface e tomate', 390, 28, ['carne', 'gluten']),
    d('Omelete de queijo com salada verde', 350, 24, ['ovo', 'lactose']),
    d('Tilápia grelhada com purê de abóbora e vagem', 380, 32, ['carne', 'peixe']),
    d('Creme de abóbora com gengibre + tofu grelhado', 340, 18),
    d('Carne moída magra com abobrinha refogada e arroz integral', 420, 30, ['carne']),
    d('Salada morna de lentilha com legumes e azeite', 380, 18),
    d('Frango grelhado com legumes assados', 380, 34, ['carne']),
    d('Caldo de feijão com legumes e cheiro-verde', 350, 16),
    d('Tapioca recheada com frango e queijo branco', 390, 28, ['carne', 'lactose']),
    d('Berinjela recheada com grão-de-bico ao molho de tomate', 360, 15),
    d('Filé de frango ao limão com salada de grão-de-bico', 400, 36, ['carne']),
  ],
  lanche: [
    d('1 maçã + 10 castanhas-de-caju', 180, 4, ['oleaginosas']),
    d('Iogurte natural com canela', 120, 8, ['lactose']),
    d('1 ovo cozido + 1 fruta', 150, 7, ['ovo']),
    d('Queijo branco (2 fatias) com tomate-cereja', 140, 10, ['lactose']),
    d('Banana com pasta de amendoim', 190, 5, ['oleaginosas']),
    d('Homus com palitos de cenoura e pepino', 150, 5),
    d('Frutas vermelhas com iogurte vegetal', 130, 3),
    d('Pipoca de panela sem manteiga (2 xícaras)', 120, 3),
    d('2 torradas integrais com ricota + chá', 160, 8, ['gluten', 'lactose']),
    d('Edamame cozido', 150, 12),
    d('Mamão com chia', 110, 3),
    d('Shake de whey com água e morango', 140, 22, ['lactose']),
    d('Chá de camomila + 1 kiwi', 60, 1),
    d('Pera + 1 fatia de queijo minas', 150, 7, ['lactose']),
  ],
};

const blocked: Record<Restriction, Flag[]> = {
  vegetariano: ['carne'],
  vegano: ['carne', 'ovo', 'lactose'],
  lactose: ['lactose'],
  gluten: ['gluten'],
  ovo: ['ovo'],
  peixes: ['peixe'],
  oleaginosas: ['oleaginosas'],
  suina: ['suina'],
};

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Ingredientes implícitos: "omelete" contém ovo, "strogonoff" contém leite etc. */
const hidden: Partial<Record<Flag, string>> = { ovo: 'ovo', peixe: 'peixe frutos do mar', lactose: 'leite laticinio lactose', oleaginosas: 'castanha amendoim', gluten: 'trigo gluten', suina: 'porco suino' };
const dishText = (dish: Dish) => norm(`${dish.name} ${dish.flags.map((f) => hidden[f] ?? '').join(' ')}`);
/** Singular simples por palavra: "ovos" → "ovo", "pães" → "pao", "castanhas" → "castanha". */
const stemWord = (w: string) => (w.length > 3 ? w.replace(/(oes|aes)$/, 'ao').replace(/s$/, '') : w);
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean).map(stemWord);
export const stem = (s: string) => words(s).join(' ');
/**
 * O termo precisa aparecer como palavra(s) inteira(s) no prato: "banana" encontra "banana com pasta de amendoim",
 * "grão-de-bico" encontra "pasta de grão-de-bico", "ovo" encontra "omelete" (ingrediente implícito),
 * mas "chá" não encontra "chia" e "sal" não encontra "salada".
 */
const mentions = (dish: Dish, term: string) => {
  const t = words(term);
  if (!t.length || t.join('').length < 2) return false;
  const d = words(dishText(dish));
  return d.some((_, i) => t.every((w, j) => d[i + j] === w));
};

export const foodSuggestions = ['Frango', 'Ovo', 'Peixe', 'Carne', 'Tofu', 'Iogurte', 'Queijo', 'Banana', 'Tapioca', 'Aveia', 'Batata-doce', 'Grão-de-bico', 'Lentilha', 'Abóbora', 'Brócolis', 'Cuscuz', 'Mandioca', 'Camarão', 'Atum', 'Amendoim'];

export type Targets = { bmr: number; tdee: number; kcal: number; protein: number; deficit: number; notes: string[] };

/**
 * Metas diárias estimadas.
 * - TMB por Mifflin-St Jeor (peso, altura, idade, sexo).
 * - Gasto total = TMB × fator de atividade.
 * - Meta = gasto total − 300 kcal, nunca abaixo da TMB nem do piso de segurança (1.200 kcal; 1.500 kcal para homens),
 *   e sem déficit para menores de 18 anos ou IMC abaixo de 18,5.
 * - Proteína: 2 g/kg do peso de referência (peso atual, limitado ao peso de IMC 25).
 */
export function nutritionTargets(p: Profile, kg: number, activity: Activity = 'leve'): Targets {
  const base = 10 * kg + 6.25 * p.height - 5 * p.age;
  const bmr = Math.round(p.sex === 'feminino' ? base - 161 : p.sex === 'masculino' ? base + 5 : base - 78);
  const factor = activityOptions.find((a) => a.id === activity)?.factor ?? 1.375;
  const tdee = Math.round(bmr * factor);
  const bmi = kg / (p.height / 100) ** 2;
  const notes: string[] = [];
  let kcal: number;
  if (p.age < 18 || bmi < 18.5) {
    kcal = tdee;
    notes.push(p.age < 18 ? 'Por ser menor de 18 anos, a meta mantém o gasto estimado, sem déficit.' : 'Com IMC abaixo de 18,5, a meta mantém o gasto estimado, sem déficit.');
  } else {
    const floor = Math.max(bmr, p.sex === 'masculino' ? 1500 : 1200);
    kcal = Math.min(tdee, Math.max(tdee - 300, floor));
    if (kcal > tdee - 300) notes.push('A meta foi ajustada para não ficar abaixo de um mínimo seguro.');
  }
  const refKg = Math.min(kg, 25 * (p.height / 100) ** 2);
  const protein = Math.round((2 * refKg) / 5) * 5;
  return { bmr, tdee, kcal, protein, deficit: tdee - kcal, notes };
}

// PRNG determinístico: o mesmo seed gera o mesmo cardápio (troca ao pedir "gerar novo").
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export type MenuMeal = { slot: SlotId; label: string; target: number; proteinTarget: number; dish?: Dish; portion: number; kcal: number; protein: number };
export type MenuDay = { meals: MenuMeal[]; kcal: number; protein: number };

/** Porção sugerida (80% a 130% da receita base) para aproximar a meta calórica da refeição. */
const portionFor = (dish: Dish, target: number) => Math.min(1.3, Math.max(0.8, Math.round((target / dish.kcal) * 10) / 10));

export function buildWeekMenu(prefs: FoodPrefs, t: Targets): MenuDay[] {
  const random = rng(prefs.seed * 7919 + 17);
  const flagsOut = new Set(prefs.restrictions.flatMap((r) => blocked[r]));
  const allowed = (dish: Dish) => !dish.flags.some((f) => flagsOut.has(f)) && !prefs.avoid.some((a) => mentions(dish, a));
  const used = new Map<string, number>();
  const slots = slotsFor(prefs.mealsPerDay);

  return Array.from({ length: 7 }, () => {
    const meals = slots.map(({ id, share, label }): MenuMeal => {
      const target = Math.round(t.kcal * share);
      const proteinTarget = Math.round(t.protein * share);
      const pool = dishes[kindOf[id]].filter(allowed);
      let best: Dish | undefined;
      let bestScore = -Infinity;
      for (const dish of pool) {
        const portion = portionFor(dish, target);
        const likes = prefs.likes.filter((l) => mentions(dish, l)).length;
        const score =
          likes * 2.5 -
          (used.get(dish.name) ?? 0) * 4 -
          Math.abs(dish.kcal * portion - target) / 120 +
          Math.min(1, (dish.protein * portion) / Math.max(1, proteinTarget)) * 4 + // prioriza proteína
          random() * 1.5;
        if (score > bestScore) { bestScore = score; best = dish; }
      }
      if (!best) return { slot: id, label, target, proteinTarget, portion: 1, kcal: 0, protein: 0 };
      used.set(best.name, (used.get(best.name) ?? 0) + 1);
      const portion = portionFor(best, target);
      return { slot: id, label, target, proteinTarget, dish: best, portion, kcal: Math.round(best.kcal * portion), protein: Math.round(best.protein * portion) };
    });
    return { meals, kcal: meals.reduce((a, m) => a + m.kcal, 0), protein: meals.reduce((a, m) => a + m.protein, 0) };
  });
}
