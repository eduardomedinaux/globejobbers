// Quiz público (/quiz) — funil de topo pensado pro celular (tráfego do
// Instagram). Perguntas curtas que engajam, mostram o benefício certo do
// GlobeJobbers a cada resposta e terminam num mini-resultado + captura de
// e-mail ("te mando o link pra abrir no computador").
//
// Regras do projeto que valem aqui:
// - Sem urgência falsa (nada de contador de desconto).
// - Nunca prometer salário/múltiplo nem "aplicamos por você".
// - Número só aparece quando vem de vaga real (cache do Market Intelligence);
//   a versão fixa por área é rotulada como referência, sem percentuais.

export type QuizArea = "design" | "marketing" | "sales" | "cs" | "tech" | "product" | "other";
export type QuizSeniority = "junior" | "mid" | "senior" | "lead";
export type QuizEnglish = "basic" | "intermediate" | "advanced";
export type QuizApplied = "never" | "no_answer" | "interviews";
export type QuizBlocker = "role_name" | "no_reply" | "english" | "where_start";
export type QuizGoal = "dollar" | "remote" | "growth";

export interface QuizAnswers {
  area: QuizArea;
  seniority: QuizSeniority;
  english: QuizEnglish;
  applied: QuizApplied;
  blocker: QuizBlocker;
  goal: QuizGoal;
}

export interface QuizOption<T extends string> {
  value: T;
  label: string;
}

export const AREA_OPTIONS: QuizOption<QuizArea>[] = [
  { value: "design", label: "Design (UX, UI, Produto)" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Vendas (SDR, AE)" },
  { value: "cs", label: "Customer Success" },
  { value: "tech", label: "Tecnologia / Dev" },
  { value: "product", label: "Produto (PM, PO)" },
  { value: "other", label: "Outra área" },
];

export const SENIORITY_OPTIONS: QuizOption<QuizSeniority>[] = [
  { value: "junior", label: "Até 2 anos de experiência" },
  { value: "mid", label: "De 2 a 5 anos" },
  { value: "senior", label: "De 5 a 10 anos" },
  { value: "lead", label: "Mais de 10 anos / liderança" },
];

export const ENGLISH_OPTIONS: QuizOption<QuizEnglish>[] = [
  { value: "basic", label: "Básico: leio, mas travo pra falar" },
  { value: "intermediate", label: "Intermediário: me viro numa conversa" },
  { value: "advanced", label: "Avançado: trabalho em inglês tranquilo" },
];

export const APPLIED_OPTIONS: QuizOption<QuizApplied>[] = [
  { value: "never", label: "Nunca apliquei" },
  { value: "no_answer", label: "Já apliquei e ninguém respondeu" },
  { value: "interviews", label: "Já tive entrevistas" },
];

export const BLOCKER_OPTIONS: QuizOption<QuizBlocker>[] = [
  { value: "role_name", label: "Não sei como meu cargo se chama lá fora" },
  { value: "no_reply", label: "Aplico e ninguém me chama" },
  { value: "english", label: "Meu inglês" },
  { value: "where_start", label: "Não sei por onde começar" },
];

export const GOAL_OPTIONS: QuizOption<QuizGoal>[] = [
  { value: "dollar", label: "Ganhar em dólar" },
  { value: "remote", label: "Trabalhar remoto, de onde eu quiser" },
  { value: "growth", label: "Crescer na carreira" },
];

/** Tela de benefício mostrada logo depois de certas respostas. */
export interface QuizBenefit {
  title: string;
  body: string;
  /** Rótulo acima do título. Padrão: "Como o GlobeJobbers ajuda". */
  eyebrow?: string;
}

export function englishBenefit(v: QuizEnglish): QuizBenefit {
  if (v === "basic") {
    return {
      title: "Dá pra começar antes do inglês ficar perfeito",
      body: "O primeiro filtro é o seu perfil, e ele pode estar pronto em inglês hoje. O GlobeJobbers reescreve sua headline e suas experiências em inglês, e o Interview Prep te ajuda a treinar a entrevista no seu ritmo.",
    };
  }
  if (v === "intermediate") {
    return {
      title: "Intermediário já abre muita porta",
      body: "Recrutador de fora contrata quem se comunica, não quem fala sem sotaque. O que mais pesa é o seu perfil estar claro em inglês, e isso o GlobeJobbers resolve com texto pronto pra copiar.",
    };
  }
  return {
    title: "Seu inglês já é vantagem",
    body: "Agora o que falta é o recrutador te achar. O GlobeJobbers deixa seu LinkedIn e seu currículo com as palavras que as vagas de fora usam.",
  };
}

export function appliedBenefit(v: QuizApplied): QuizBenefit {
  if (v === "never") {
    return {
      title: "Melhor assim: você começa do jeito certo",
      body: "Antes de aplicar, vale ajustar o perfil pras vagas que você quer. É exatamente a ordem que o GlobeJobbers segue: primeiro o alvo, depois o LinkedIn, depois o currículo.",
    };
  }
  if (v === "no_answer") {
    return {
      title: "Muitas vezes o problema não é você",
      body: "É como o seu perfil aparece pro recrutador de fora. O LinkedIn Review compara seu perfil com as vagas que você quer e mostra o que mudar, com o texto pronto.",
    };
  }
  return {
    title: "Você já passou do primeiro filtro",
    body: "Agora é transformar entrevista em proposta. O Interview Prep treina as perguntas que essas vagas costumam fazer, com feedback em cada resposta.",
  };
}

export function blockerBenefit(v: QuizBlocker): QuizBenefit {
  switch (v) {
    case "role_name":
      return {
        title: "Isso é mais comum do que parece",
        body: "O Market Intelligence lê vagas reais e mostra como o mercado de fora chama o seu cargo e o que mais pede. Já já você vê uma prévia disso.",
      };
    case "no_reply":
      return {
        title: "Currículo genérico não passa no filtro",
        body: "O CV Tailor adapta seu currículo pra cada vaga usando as palavras da própria descrição, sem inventar nada que você não fez.",
      };
    case "english":
      return {
        title: "Inglês se treina, e dá pra treinar com foco",
        body: "O Interview Prep simula a entrevista das vagas que você quer e te dá feedback em cada resposta. Seu perfil já pode ficar pronto em inglês enquanto isso.",
      };
    default:
      return {
        title: "O caminho tem 4 passos",
        body: "Escolher o alvo, ajustar o LinkedIn, adaptar o currículo e treinar a entrevista. O GlobeJobbers te leva por cada um, com um checklist no painel.",
      };
  }
}

/** Aviso honesto pra quem tem pouca experiência (história real do workshop). */
export const JUNIOR_NOTE: QuizBenefit = {
  eyebrow: "Uma parte honesta",
  title: "Lá fora, vaga júnior é rara",
  body: "Num workshop, um aluno descobriu ao vivo que quase não tem vaga pra Design Júnior nos EUA. Não é um não: é motivo pra mirar no cargo certo desde o começo.",
};

// --- Mini-resultado -------------------------------------------------------

export interface QuizResultItem {
  term: string;
  /** Só existe quando vem de vagas reais (cache do Market Intelligence). */
  percent?: number;
}

export interface QuizResult {
  source: "market" | "curated";
  /** Quantas vagas reais sustentam os números (só em source = "market"). */
  jobsAnalyzed?: number;
  titles: QuizResultItem[];
  skills: QuizResultItem[];
}

/**
 * Cargos por área usados pra procurar um relatório pronto no cache do
 * Market Intelligence (role_key = cargo em minúsculas, ver cacheKeyRole).
 */
export const AREA_ROLE_KEYS: Record<QuizArea, string[]> = {
  design: ["product designer", "ux designer", "ux/ui designer", "ui/ux designer", "ux ui designer"],
  marketing: ["marketing manager", "growth marketing manager", "digital marketing manager", "performance marketing manager"],
  sales: ["sales development representative", "account executive", "sdr", "business development representative"],
  cs: ["customer success manager", "customer success"],
  tech: ["software engineer", "frontend developer", "frontend engineer", "full stack developer", "backend engineer"],
  product: ["product manager", "product owner"],
  other: [],
};

/**
 * Versão fixa por área: nomes e skills que costumam aparecer nas vagas
 * remotas internacionais. Sem percentuais (não é contagem de vaga real).
 */
export const CURATED_RESULTS: Record<QuizArea, { titles: string[]; skills: string[] }> = {
  design: {
    titles: ["Product Designer", "UX Designer", "UX/UI Designer"],
    skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Usability Testing"],
  },
  marketing: {
    titles: ["Growth Marketing Manager", "Digital Marketing Manager", "Performance Marketing Manager"],
    skills: ["Paid Media (Google e Meta Ads)", "SEO", "HubSpot", "Analytics", "Content Strategy"],
  },
  sales: {
    titles: ["Sales Development Representative (SDR)", "Account Executive (AE)", "Business Development Representative"],
    skills: ["Salesforce", "HubSpot", "Outbound prospecting", "Pipeline management", "Discovery calls"],
  },
  cs: {
    titles: ["Customer Success Manager", "Account Manager", "Onboarding Specialist"],
    skills: ["Onboarding", "Churn reduction", "Renewals e upsell", "Zendesk", "Gainsight"],
  },
  tech: {
    titles: ["Software Engineer", "Frontend Engineer", "Full Stack Developer"],
    skills: ["TypeScript", "React", "Node.js", "AWS", "SQL"],
  },
  product: {
    titles: ["Product Manager", "Senior Product Manager", "Product Owner"],
    skills: ["Product Discovery", "Roadmapping", "Data analysis", "Agile/Scrum", "Stakeholder management"],
  },
  other: {
    titles: [],
    skills: [],
  },
};

export function curatedResult(area: QuizArea): QuizResult {
  const c = CURATED_RESULTS[area];
  return {
    source: "curated",
    titles: c.titles.map((term) => ({ term })),
    skills: c.skills.map((term) => ({ term })),
  };
}

export function isQuizAnswers(x: unknown): x is QuizAnswers {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  const inList = (v: unknown, opts: QuizOption<string>[]) => opts.some((o) => o.value === v);
  return (
    inList(a.area, AREA_OPTIONS) &&
    inList(a.seniority, SENIORITY_OPTIONS) &&
    inList(a.english, ENGLISH_OPTIONS) &&
    inList(a.applied, APPLIED_OPTIONS) &&
    inList(a.blocker, BLOCKER_OPTIONS) &&
    inList(a.goal, GOAL_OPTIONS)
  );
}
