
const CATALOG_KEY = "nutriplan.catalog.v2";
const RULES_KEY = "nutriplan.rules.v2";
const USER_STATE_KEY = "nutriplan.userState.v2";

export function saveCatalog(catalog){ validateCatalog(catalog); localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); }
export function saveRules(rules){ validateRules(rules); localStorage.setItem(RULES_KEY, JSON.stringify(rules)); }
export function loadCatalog(fallback){ return loadJson(CATALOG_KEY, fallback, validateCatalog); }
export function loadRules(fallback){ return loadJson(RULES_KEY, fallback, validateRules); }
export async function importCatalogFile(file){ const x=JSON.parse(await file.text()); validateCatalog(x); saveCatalog(x); return x; }
export async function importRulesFile(file){ const x=JSON.parse(await file.text()); validateRules(x); saveRules(x); return x; }

export function loadUserState(){
  try { return JSON.parse(localStorage.getItem(USER_STATE_KEY) || JSON.stringify(defaultState())); }
  catch { return defaultState(); }
}
export function saveUserState(state){ localStorage.setItem(USER_STATE_KEY, JSON.stringify(state)); }

export function findMissingRecipeIds(state, catalog){
  const ids=new Set((catalog.recipes||[]).map(r=>r.id)), missing=new Set();
  for(const week of Object.values(state.weeks||{}))
    for(const day of Object.values(week.days||{}))
      for(const entry of day.entries||[])
        if(entry.recipeId && !ids.has(entry.recipeId) && !entry.snapshot) missing.add(entry.recipeId);
  return [...missing];
}

function defaultState(){ return {schemaVersion:2, shoppingList:[], water:{}, weeks:{}}; }
function loadJson(key,fallback,validator){
  const raw=localStorage.getItem(key); if(!raw) return fallback;
  try { const x=JSON.parse(raw); validator(x); return x; } catch { return fallback; }
}
function validateCatalog(x){
  if(!x || x.schemaVersion!==2 || !Array.isArray(x.foods) || !Array.isArray(x.recipes)) throw new Error("Catálogo no compatible.");
  const ids=new Set();
  for(const r of x.recipes){ if(!r.id || ids.has(r.id) || !Number.isInteger(r.version)) throw new Error("Receta inválida o duplicada."); ids.add(r.id); }
}
function validateRules(x){ if(!x || x.schemaVersion!==2 || !x.rulesVersion) throw new Error("Reglas no compatibles."); }
