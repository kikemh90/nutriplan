
export function midpoint(range) {
  if (typeof range?.calc === "number") return range.calc;
  return Math.round((Number(range?.min || 0) + Number(range?.max || 0)) / 2);
}

export function recipeSnapshot(recipe, servings = 1) {
  const n = recipe.nutrition || {};
  const w = recipe.weeklyMetadata || {};
  return {
    recipeId: recipe.id,
    recipeVersion: recipe.version || 1,
    recipeName: recipe.name,
    servings,
    nutrition: {
      calories: midpoint(n.calories) * servings,
      proteinG: midpoint(n.proteinG) * servings,
      carbsG: midpoint(n.carbsG) * servings,
      fatG: midpoint(n.fatG) * servings,
      fiberG: midpoint(n.fiberG) * servings,
      vegetablesG: Number(n.vegetablesG || 0) * servings,
      fruitServings: Number(n.fruitServings || 0) * servings
    },
    weeklyMetadata: {
      fishServings: Number(w.fishServings || 0) * servings,
      priorityOilyFishServings: Number(w.priorityOilyFishServings || 0) * servings,
      seafoodServings: Number(w.seafoodServings || 0) * servings,
      legumeServings: Number(w.legumeServings || 0) * servings,
      redMeatServings: Number(w.redMeatServings || 0) * servings,
      poultryServings: Number(w.poultryServings || 0) * servings,
      eggUnits: Number(w.eggUnits || 0) * servings,
      nutsServings: Number(w.nutsServings || 0) * servings
    }
  };
}

export function resolveEntry(entry, recipeById, {historical=false}={}) {
  // Calendar entries keep a snapshot from the moment they are added/updated.
  // Current/future snapshots are refreshed explicitly when the catalog changes.
  if (entry.snapshot) return entry.snapshot;
  const recipe = recipeById.get(entry.recipeId);
  if (!recipe) return null;
  return recipeSnapshot(recipe, Number(entry.servings || 1));
}

export function sumResolvedEntries(entries, recipeById, {historical=false}={}) {
  const total = emptyTotals();
  const missingRecipeIds = [];
  for (const entry of entries || []) {
    const snap = resolveEntry(entry, recipeById, {historical});
    if (!snap) {
      if (entry?.recipeId) missingRecipeIds.push(entry.recipeId);
      continue;
    }
    addSnapshot(total, snap);
  }
  return {...total, missingRecipeIds:[...new Set(missingRecipeIds)]};
}

export function assessDaily(total, rules, {complete=true}={}) {
  if (!complete && rules.policy?.doNotFlagIncompleteDays) {
    return {status:"incomplete", metrics:{}};
  }
  const d = rules.daily;
  return {status:"ready", metrics:{
    calories: band(total.calories, d.calories.softLow, d.calories.targetMin, d.calories.targetMax, d.calories.softHigh),
    protein: minimumBand(total.proteinG, d.proteinG.nearMin, d.proteinG.goodMin),
    fiber: minimumBand(total.fiberG, d.fiberG.nearMin, d.fiberG.goodMin),
    vegetables: minimumBand(total.vegetablesG, d.vegetablesG.nearMin, d.vegetablesG.goodMin),
    fruit: minimumBand(total.fruitServings, d.fruitServings.nearMin, d.fruitServings.goodMin),
    water: null
  }};
}

export function inferDayComplete(day) {
  if (typeof day?.complete === "boolean") return day.complete;
  const slots = new Set((day?.entries || []).map(e => e.slot));
  return slots.has("comida") && slots.has("cena");
}

export function assessWeekObject(week, recipeById, rules, {historical=false}={}) {
  const rows = [];
  for (const [date, day] of Object.entries(week.days || {})) {
    const total = sumResolvedEntries(day.entries || [], recipeById, {historical});
    const complete = historical ? true : inferDayComplete(day);
    rows.push({date, total, complete});
  }
  return assessWeekly(rows, rules, {historical});
}

export function assessWeekly(dayRows, rules, {historical=false}={}) {
  // También acepta un array de totales simples para tests o migraciones.
  const rows = (dayRows || []).map((x, i) =>
    x && Object.prototype.hasOwnProperty.call(x, "total")
      ? x
      : {date:String(i), total:x || emptyTotals(), complete:true}
  );

  const completed = rows.filter(r => r.complete);
  const source = completed.length ? completed : rows;

  const averages = {};
  for (const f of ["calories","proteinG","fiberG","vegetablesG","fruitServings"]) {
    averages[f] = source.length
      ? source.reduce((a,r)=>a+Number(r.total?.[f]||0),0) / source.length
      : 0;
  }

  const frequencies = {};
  for (const f of ["fishServings","priorityOilyFishServings","seafoodServings","legumeServings","redMeatServings","nutsServings"]) {
    frequencies[f] = rows.reduce((a,r)=>a+Number(r.total?.[f]||0),0);
  }

  const plannedDays = rows.filter(r => (r.total?.calories||0) > 0 || r.complete).length;
  const completeDays = rows.filter(r => r.complete).length;
  const targetDays = 7;
  const weekComplete = historical || completeDays >= targetDays;

  const d = rules.daily;
  const averageStatus = weekComplete ? {
    calories: band(averages.calories, d.calories.softLow, d.calories.targetMin, d.calories.targetMax, d.calories.softHigh),
    protein: minimumBand(averages.proteinG, d.proteinG.nearMin, d.proteinG.goodMin),
    fiber: minimumBand(averages.fiberG, d.fiberG.nearMin, d.fiberG.goodMin),
    vegetables: minimumBand(averages.vegetablesG, d.vegetablesG.nearMin, d.vegetablesG.goodMin),
    fruit: minimumBand(averages.fruitServings, d.fruitServings.nearMin, d.fruitServings.goodMin)
  } : null;

  const w = rules.weekly;
  const frequencyStatus = weekComplete ? {
    fish: minimumBand(frequencies.fishServings, Math.max(0,w.fishServings.min-1), w.fishServings.min),
    oilyFish: minimumBand(frequencies.priorityOilyFishServings, Math.max(0,w.priorityOilyFishServings.min-1), w.priorityOilyFishServings.min),
    seafood: minimumBand(frequencies.seafoodServings, 0, w.seafoodServings.min),
    legumes: minimumBand(frequencies.legumeServings, Math.max(0,w.legumeServings.min-1), w.legumeServings.min),
    redMeat: maximumBand(frequencies.redMeatServings, w.redMeatServings.max, w.redMeatServings.max+1),
    nuts: minimumBand(frequencies.nutsServings, Math.max(0,w.nutsServings.min-1), w.nutsServings.min)
  } : null;

  return {
    status: weekComplete ? "ready" : "incomplete",
    coverage: {plannedDays, completeDays, targetDays},
    averages,
    averageStatus,
    frequencies,
    frequencyStatus
  };
}

export function closeWeek(week, recipeById, rules) {
  const missing = collectMissingRecipeIds(week, recipeById);
  if (missing.length) {
    throw new Error(`No se puede cerrar la semana: faltan recetas en el catálogo: ${missing.join(", ")}`);
  }

  const closed = structuredClone(week);
  closed.status = "closed";
  closed.closedAt = new Date().toISOString();
  closed.rulesVersion = rules.rulesVersion;

  for (const day of Object.values(closed.days || {})) {
    day.complete = true;
    day.entries = (day.entries || []).map(entry => {
      if (entry.snapshot) return entry;
      const recipe = recipeById.get(entry.recipeId);
      return {
        ...entry,
        snapshot: recipeSnapshot(recipe, Number(entry.servings || 1))
      };
    });
  }

  closed.originalAssessment = assessWeekObject(closed, recipeById, rules, {historical:true});
  return closed;
}

export function reevaluateHistoricalWeek(week, recipeById, currentRules) {
  return {
    originalRulesVersion: week.rulesVersion || null,
    currentRulesVersion: currentRules.rulesVersion,
    originalAssessment: week.originalAssessment || null,
    currentAssessment: assessWeekObject(week, recipeById, currentRules, {historical:true})
  };
}

export function collectMissingRecipeIds(week, recipeById) {
  const missing = new Set();
  for (const day of Object.values(week.days || {})) {
    for (const entry of day.entries || []) {
      if (entry.snapshot) continue;
      if (entry.recipeId && !recipeById.has(entry.recipeId)) missing.add(entry.recipeId);
    }
  }
  return [...missing];
}

function emptyTotals() {
  return {
    calories:0, proteinG:0, carbsG:0, fatG:0, fiberG:0, vegetablesG:0, fruitServings:0,
    fishServings:0, priorityOilyFishServings:0, seafoodServings:0, legumeServings:0,
    redMeatServings:0, poultryServings:0, eggUnits:0, nutsServings:0
  };
}
function addSnapshot(total, snap) {
  for (const [k,v] of Object.entries(snap.nutrition || {})) if (k in total) total[k] += Number(v || 0);
  for (const [k,v] of Object.entries(snap.weeklyMetadata || {})) if (k in total) total[k] += Number(v || 0);
}
function minimumBand(value, nearMin, goodMin) {
  return value >= goodMin ? "good" : value >= nearMin ? "near" : "attention";
}
function maximumBand(value, goodMax, nearMax) {
  return value <= goodMax ? "good" : value <= nearMax ? "near" : "attention";
}
function band(value, hardLow, goodLow, goodHigh, hardHigh) {
  return value >= goodLow && value <= goodHigh
    ? "good"
    : value >= hardLow && value <= hardHigh
      ? "near"
      : "attention";
}
