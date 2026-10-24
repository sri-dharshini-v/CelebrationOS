import { readFileSync } from 'node:fs';

const catalogue = JSON.parse(
  readFileSync(new URL('../public/locales/languages.json', import.meta.url), 'utf8')
);

export const LANGUAGE_CATALOG = catalogue.languages;
export const FALLBACK_LANGUAGE = catalogue.fallbackLanguage;
export const PRIMARY_LANGUAGE_IDS = new Set(catalogue.primaryLanguageIds);
const LANGUAGE_BY_ID = new Map(
  LANGUAGE_CATALOG.map(language => [language.id, language])
);
if (
  PRIMARY_LANGUAGE_IDS.size !== catalogue.primaryLanguageIds.length ||
  !PRIMARY_LANGUAGE_IDS.has(FALLBACK_LANGUAGE)
) {
  throw new Error('The primary language list must be unique and include the fallback language.');
}
export const PRIMARY_LANGUAGE_CATALOG = catalogue.primaryLanguageIds.map(languageId => {
  const language = LANGUAGE_BY_ID.get(languageId);
  if (!language) {
    throw new Error(`Primary language "${languageId}" is missing from the language catalogue.`);
  }
  return language;
});

export function getLanguage(languageId) {
  return typeof languageId === 'string' && PRIMARY_LANGUAGE_IDS.has(languageId)
    ? LANGUAGE_BY_ID.get(languageId)
    : undefined;
}
