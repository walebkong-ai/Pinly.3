type SearchField = {
  value?: string | null;
  weight?: number;
};

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getSearchTerms(query: string) {
  return normalizeSearchText(query)
    .split(" ")
    .map((term) => term.trim())
    .filter(Boolean);
}

function tokenize(value: string) {
  return value.split(/[\s,._:/\\|()[\]{}-]+/).filter(Boolean);
}

function scoreFieldMatch(fieldValue: string, query: string, weight: number) {
  const tokens = tokenize(fieldValue);

  if (fieldValue === query) {
    return 40 * weight;
  }

  if (fieldValue.startsWith(query)) {
    return 28 * weight;
  }

  if (tokens.some((token) => token.startsWith(query))) {
    return 20 * weight;
  }

  if (fieldValue.includes(query)) {
    return 12 * weight;
  }

  return 0;
}

function scoreTermMatch(fieldValue: string, term: string, weight: number) {
  const tokens = tokenize(fieldValue);

  if (fieldValue === term) {
    return 16 * weight;
  }

  if (fieldValue.startsWith(term)) {
    return 12 * weight;
  }

  if (tokens.some((token) => token.startsWith(term))) {
    return 9 * weight;
  }

  if (fieldValue.includes(term)) {
    return 5 * weight;
  }

  return 0;
}

export function scoreWeightedSearch(fields: SearchField[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return 0;
  }

  const normalizedFields = fields
    .map((field) => ({
      value: normalizeSearchText(field.value ?? ""),
      weight: field.weight ?? 1
    }))
    .filter((field) => field.value.length > 0);

  if (normalizedFields.length === 0) {
    return 0;
  }

  const terms = getSearchTerms(normalizedQuery);
  let score = 0;

  for (const term of terms) {
    let bestTermScore = 0;

    for (const field of normalizedFields) {
      bestTermScore = Math.max(bestTermScore, scoreTermMatch(field.value, term, field.weight));
    }

    if (bestTermScore === 0) {
      return 0;
    }

    score += bestTermScore;
  }

  let bestFullQueryScore = 0;

  for (const field of normalizedFields) {
    bestFullQueryScore = Math.max(
      bestFullQueryScore,
      scoreFieldMatch(field.value, normalizedQuery, field.weight)
    );
  }

  return Math.round(score + bestFullQueryScore);
}

export function rankBySearch<T>(
  items: T[],
  query: string,
  getFields: (item: T) => SearchField[],
  getTieBreaker?: (item: T) => number
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreWeightedSearch(getFields(item), normalizedQuery),
      tieBreaker: getTieBreaker ? getTieBreaker(item) : 0
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.tieBreaker !== left.tieBreaker) {
        return right.tieBreaker - left.tieBreaker;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.item);
}
