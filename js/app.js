
import {
  sumResolvedEntries, assessDaily, assessWeekObject, inferDayComplete, recipeSnapshot
} from "./nutrition_engine.js";

const SLOT_LABELS = {
  desayuno:"Desayuno", media_manana:"Media mañana", comida:"Comida",
  merienda:"Merienda", cena:"Cena", extra:"Extra"
};
const SLOT_ORDER = Object.keys(SLOT_LABELS);

const state = {
  catalog:null,
  rules:null,
  user:null,
  recipeById:new Map(),
  customFoodEditId:null,
  customRecipeEditId:null,
  currentWeekStart:startOfWeek(new Date()),
  currentMonthStart:startOfMonth(new Date()),
  calendarMode:"week",
  selectedDayIndex:0,
  modalRecipeId:null,
  modalPresetSlot:null,
  lastShoppingRemoved:null
};

await boot();

async function boot(){
  const [catalogDefault, rulesDefault] = await Promise.all([
    fetch("./data/nutrition_catalog.json").then(r=>r.json()),
    fetch("./data/nutrition_rules.json").then(r=>r.json())
  ]);
  state.catalog = loadJson("nutriplan.catalog.v2", catalogDefault);
  state.rules = loadJson("nutriplan.rules.v2", rulesDefault);
  state.user = loadJson("nutriplan.userState.v2", {schemaVersion:2,shoppingList:[],water:{},weeks:{},customFoods:[],customRecipes:[]});
  state.user.customFoods ||= [];
  state.user.customRecipes ||= [];
  rebuildRecipeMap();
  migrateEditableHistoryModel();
  ensureActiveWeek();
  wireNavigation();
  wireGlobalActions();
  renderGuide();
  renderFoodFilters();
  renderFoods();
  renderRecipeFilters();
  renderRecipes();
  renderWeek();
  renderMatrixFilters();
  renderMatrix();
  renderShopping();
  renderSettingsInfo();
  initPwa();
}

function migrateEditableHistoryModel(){
  state.user.weeks ||= {};
  for(const [key,week] of Object.entries(state.user.weeks)){
    week.status="editable";
    week.startDate ||= key;
    week.rulesVersion ||= state.rules.rulesVersion;
    week.rulesSnapshot ||= structuredClone(state.rules);
    for(const day of Object.values(week.days||{})){
      day.entries ||= [];
      for(const e of day.entries){
        if(e.type==="simple" || e.type==="manual") continue;
        if(!e.snapshot && e.recipeId){
          const recipe=state.recipeById.get(e.recipeId);
          if(recipe) e.snapshot=recipeSnapshot(recipe,Number(e.servings||1));
        }
      }
    }
  }
  saveUser();
}
function saveUser(){
  localStorage.setItem("nutriplan.userState.v2", JSON.stringify(state.user));
}
function loadJson(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):structuredClone(fallback);
  }catch{return structuredClone(fallback)}
}
function weekKey(date){ return date.toISOString().slice(0,10); }
function startOfWeek(d){
  const x=new Date(d); x.setHours(12,0,0,0);
  const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); return x;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfMonth(d){ const x=new Date(d); x.setHours(12,0,0,0); x.setDate(1); return x; }
function addMonths(d,n){ const x=startOfMonth(d); x.setMonth(x.getMonth()+n); return x; }
function dateKey(d){ return d.toISOString().slice(0,10); }
function formatShort(d){ return new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"numeric"}).format(d); }
function formatWeek(d){
  const end=addDays(d,6);
  return `${new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"}).format(d)} – ${new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(end)}`;
}

function ensureActiveWeek(){
  const key=weekKey(state.currentWeekStart);
  if(!state.user.weeks[key]){
    const days={};
    for(let i=0;i<7;i++) days[dateKey(addDays(state.currentWeekStart,i))]={entries:[],complete:false};
    state.user.weeks[key]={
      status:"editable",
      startDate:key,
      days,
      rulesVersion:state.rules.rulesVersion,
      rulesSnapshot:structuredClone(state.rules)
    };
    saveUser();
  }
}
function currentWeek(){
  ensureActiveWeek();
  return state.user.weeks[weekKey(state.currentWeekStart)];
}
function currentDayKey(){ return dateKey(addDays(state.currentWeekStart,state.selectedDayIndex)); }

function wireNavigation(){
  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
      document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    });
  });
}

function wireGlobalActions(){
  document.getElementById("shoppingBtn").onclick=openShopping;
  document.getElementById("settingsBtn").onclick=openSettings;
  document.getElementById("closeShoppingBtn").onclick=closeShopping;
  document.getElementById("closeSettingsBtn").onclick=closeSettings;
  document.getElementById("drawerBackdrop").onclick=()=>{closeShopping();closeSettings()};
  document.getElementById("clearShoppingBtn").onclick=()=>{
    if(confirm("¿Vaciar la lista de compra?")){
      state.lastShoppingRemoved={type:"clear",items:structuredClone(state.user.shoppingList||[])};
      state.user.shoppingList=[]; saveUser(); renderShopping(); renderFoods();
      document.getElementById("undoShoppingBtn").disabled=false;
    }
  };
  document.getElementById("undoShoppingBtn").onclick=undoShopping;

  ["foodSearch","foodGroupFilter","foodClassFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderFoods));
  ["recipeSearch","recipeCategoryFilter","recipeTagFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderRecipes));
  ["matrixSearch","matrixCategoryFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderMatrix));

  document.getElementById("newCustomFoodBtn").onclick=()=>openCustomFoodModal();
  document.getElementById("closeCustomFoodModalBtn").onclick=()=>closeSimpleModal("customFoodModal");
  document.getElementById("saveCustomFoodBtn").onclick=saveCustomFood;
  document.getElementById("newCustomRecipeBtn").onclick=()=>openCustomRecipeModal();
  document.getElementById("closeCustomRecipeModalBtn").onclick=()=>closeSimpleModal("customRecipeModal");
  document.getElementById("saveCustomRecipeBtn").onclick=saveCustomRecipe;
  document.getElementById("closeManualEntryModalBtn").onclick=()=>closeSimpleModal("manualEntryModal");
  document.getElementById("saveManualEntryBtn").onclick=saveManualEntry;
  ["customFoodModal","customRecipeModal","manualEntryModal"].forEach(id=>{
    document.getElementById(id).addEventListener("click",e=>{ if(e.target.id===id) closeSimpleModal(id); });
  });

  document.getElementById("prevWeekBtn").onclick=()=>changeWeek(-7);
  document.getElementById("nextWeekBtn").onclick=()=>changeWeek(7);
  document.getElementById("todayWeekBtn").onclick=()=>{
    state.currentWeekStart=startOfWeek(new Date()); state.selectedDayIndex=0; ensureActiveWeek(); renderWeek();
  };

  document.getElementById("weekViewBtn").onclick=()=>setCalendarMode("week");
  document.getElementById("monthViewBtn").onclick=()=>setCalendarMode("month");
  document.getElementById("prevMonthBtn").onclick=()=>{state.currentMonthStart=addMonths(state.currentMonthStart,-1);renderMonth()};
  document.getElementById("nextMonthBtn").onclick=()=>{state.currentMonthStart=addMonths(state.currentMonthStart,1);renderMonth()};
  document.getElementById("todayMonthBtn").onclick=()=>{state.currentMonthStart=startOfMonth(new Date());renderMonth()};

  document.getElementById("closeModalBtn").onclick=closeModal;
  document.getElementById("modalBackdrop").onclick=closeModal;
  document.getElementById("confirmAddRecipeBtn").onclick=confirmAddRecipe;
  document.getElementById("modalRecipeSearch").oninput=renderModalRecipeOptions;
  document.getElementById("modalRecipeSelect").onchange=()=>{
    state.modalRecipeId=document.getElementById("modalRecipeSelect").value;
    renderModalRecipePreview();
  };

  document.getElementById("addFruitBtn").onclick=addFruitServing;
  document.getElementById("addWaterBtn").onclick=addWater;

  document.getElementById("importCatalogBtn").onclick=()=>document.getElementById("catalogFileInput").click();
  document.getElementById("catalogFileInput").onchange=e=>importCatalogFromFile(e.target.files?.[0]);
  document.getElementById("importRulesBtn").onclick=()=>document.getElementById("rulesFileInput").click();
  document.getElementById("rulesFileInput").onchange=e=>importRulesFromFile(e.target.files?.[0]);
  document.getElementById("exportBackupBtn").onclick=exportBackup;
  document.getElementById("importBackupBtn").onclick=()=>document.getElementById("backupFileInput").click();
  document.getElementById("backupFileInput").onchange=e=>importBackupFromFile(e.target.files?.[0]);
  const updateBtn=document.getElementById("checkUpdateBtn");
  if(updateBtn) updateBtn.onclick=checkForPwaUpdate;
}

function renderGuide(){
  const d=state.rules.daily,w=state.rules.weekly;
  document.getElementById("guideContent").innerHTML=`
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Objetivos diarios aproximados</h3>
        <ul class="guide-list">
          <li>Energía de referencia: ${d.calories.targetMin}-${d.calories.targetMax} kcal.</li>
          <li>Proteína: buena referencia desde ${d.proteinG.goodMin} g/día.</li>
          <li>Fibra: ${d.fiberG.goodMin} g/día o más.</li>
          <li>Verduras: ${d.vegetablesG.goodMin} g/día o más.</li>
          <li>Fruta: ${d.fruitServings.goodMin} raciones/día o más.</li>
          <li>Agua: ${Math.round(d.waterMl.goodMin/100)/10} L/día como objetivo inicial.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Equilibrio semanal</h3>
        <ul class="guide-list">
          <li>Pescado: al menos ${w.fishServings.min} raciones.</li>
          <li>Pescado azul prioritario: al menos ${w.priorityOilyFishServings.min}.</li>
          <li>Marisco: al menos ${w.seafoodServings.min} aparición.</li>
          <li>Legumbres: alrededor de ${w.legumeServings.min} raciones equivalentes.</li>
          <li>Carne roja: intentar no superar ${w.redMeatServings.max}.</li>
          <li>Frutos secos: alrededor de ${w.nutsServings.min} apariciones.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Cómo usar NutriPlan</h3>
        <ul class="guide-list">
          <li>Elige recetas que te apetezcan y deja que la semana, no cada plato, marque el equilibrio.</li>
          <li>No hace falta pesar todo: los cálculos son orientativos.</li>
          <li>Usa whey o lácteos proteicos si un día queda corto de proteína.</li>
          <li>Una comida más indulgente puede encajar perfectamente dentro de una buena semana.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Interpretación</h3>
        <ul class="guide-list">
          <li><strong>Bien:</strong> objetivo razonablemente cubierto.</li>
          <li><strong>Cerca:</strong> pequeña desviación, sin dramatizar.</li>
          <li><strong>Atención:</strong> merece revisar el conjunto.</li>
          <li>Las semanas incompletas no reciben una valoración global negativa.</li>
        </ul>
      </article>
    </div>`;
}


function rebuildRecipeMap(){
  const combined=[...(state.catalog.recipes||[]),...(state.user?.customRecipes||[])];
  state.recipeById=new Map(combined.map(r=>[r.id,r]));
}
function allFoods(){
  return [...(state.catalog.foods||[]),...(state.user?.customFoods||[])];
}
function allRecipes(){
  return [...(state.catalog.recipes||[]),...(state.user?.customRecipes||[])];
}
function uid(prefix){
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}
function openSimpleModal(id){
  const el=document.getElementById(id);
  el.classList.add("open");
  el.setAttribute("aria-hidden","false");
}
function closeSimpleModal(id){
  const el=document.getElementById(id);
  el.classList.remove("open");
  el.setAttribute("aria-hidden","true");
}
function numberOrZero(id){ return Number(document.getElementById(id).value||0); }

function existingFoodGroups(){
  return unique(allFoods().map(x=>x.group).filter(Boolean)).filter(x=>x!=="Otros");
}
function existingRecipeCategories(){
  return unique(allRecipes().map(x=>x.category).filter(Boolean)).filter(x=>x!=="Otros");
}
function populateCustomFoodGroupSelect(selected=null){
  const select=document.getElementById("customFoodGroup");
  const groups=[...existingFoodGroups(),"Otros"];
  select.innerHTML=groups.map(g=>`<option value="${escAttr(g)}">${esc(g)}</option>`).join("");
  select.value=(selected && groups.includes(selected)) ? selected : (groups[0]||"Otros");
}
function populateCustomRecipeCategorySelect(selected=null){
  const select=document.getElementById("customRecipeCategory");
  const categories=[...existingRecipeCategories(),"Otros"];
  select.innerHTML=categories.map(c=>`<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  select.value=(selected && categories.includes(selected)) ? selected : (categories[0]||"Otros");
}

function fillSelect(el, options, firstLabel){
  el.innerHTML=`<option value="">${firstLabel}</option>`+options.map(x=>`<option value="${escAttr(x)}">${esc(x)}</option>`).join("");
}
function renderFoodFilters(){
  const foods=allFoods();
  fillSelect(document.getElementById("foodGroupFilter"), unique(foods.map(x=>x.group)), "Todos los grupos");
  fillSelect(document.getElementById("foodClassFilter"), unique(foods.map(x=>x.classification)), "Todas las categorías");
}
function renderFoods(){
  const q=norm(document.getElementById("foodSearch").value);
  const group=document.getElementById("foodGroupFilter").value;
  const cls=document.getElementById("foodClassFilter").value;
  const selected=new Set((state.user.shoppingList||[]).map(x=>x.foodId));
  const rows=allFoods().filter(f=>{
    const hay=[f.name,f.group,f.classification,f.description,f.portion,...(f.tags||[]),...(f.aliases||[])].join(" ");
    return (!q||norm(hay).includes(q))&&(!group||f.group===group)&&(!cls||f.classification===cls);
  });
  document.getElementById("foodList").innerHTML=rows.map(f=>`
    <article class="card food-row">
      <input class="food-check" type="checkbox" ${selected.has(f.id)?"checked":""} data-food="${escAttr(f.id)}">
      <div class="food-body">
        <div class="card-title">${esc(f.name)}${f.custom?` <span class="pill">Personalizado</span>`:""}</div>
        <div class="food-meta">${esc(f.group)} · ${esc(f.classification)}</div>
        <div class="food-meta"><strong>Ración:</strong> ${esc(f.portion||"Sin definir")}</div>
        <div class="small">${esc(f.description||"")}</div>
        ${f.custom?`<div class="inline-actions"><button class="text-btn" data-edit-food="${escAttr(f.id)}" type="button">Editar</button><button class="text-btn danger" data-delete-food="${escAttr(f.id)}" type="button">Eliminar</button></div>`:""}
      </div>
    </article>`).join("") || `<div class="card muted">No se han encontrado alimentos.</div>`;

  document.querySelectorAll("[data-food]").forEach(ch=>{
    ch.onchange=()=>toggleShoppingFood(ch.dataset.food,ch.checked);
  });
  document.querySelectorAll("[data-edit-food]").forEach(btn=>btn.onclick=()=>openCustomFoodModal(btn.dataset.editFood));
  document.querySelectorAll("[data-delete-food]").forEach(btn=>btn.onclick=()=>deleteCustomFood(btn.dataset.deleteFood));
}

function toggleShoppingFood(foodId,checked){
  state.user.shoppingList ||= [];
  if(checked){
    if(!state.user.shoppingList.some(x=>x.foodId===foodId)){
      state.user.shoppingList.push({foodId,quantity:""});
    }
  }else{
    const idx=state.user.shoppingList.findIndex(x=>x.foodId===foodId);
    if(idx>=0){
      state.lastShoppingRemoved={type:"item",item:state.user.shoppingList[idx],index:idx};
      state.user.shoppingList.splice(idx,1);
      document.getElementById("undoShoppingBtn").disabled=false;
    }
  }
  saveUser(); renderShopping();
}
function renderShopping(){
  state.user.shoppingList ||= [];
  document.getElementById("shoppingCount").textContent=state.user.shoppingList.length;
  const byId=new Map(allFoods().map(x=>[x.id,x]));
  document.getElementById("shoppingList").innerHTML=state.user.shoppingList.map((item,i)=>{
    const f=byId.get(item.foodId);
    return `<div class="shopping-row">
      <button title="Comprado" data-buy="${i}">✓</button>
      <div style="flex:1;min-width:0">
        <strong style="font-size:13px">${esc(f?.name||item.foodId)}</strong>
        <input data-qty="${i}" type="text" value="${escAttr(item.quantity||"")}" placeholder="Cantidad opcional">
      </div>
      <button data-remove="${i}">✕</button>
    </div>`;
  }).join("") || `<div class="card muted">Tu lista está vacía.</div>`;
  document.querySelectorAll("[data-buy],[data-remove]").forEach(btn=>btn.onclick=()=>removeShopping(Number(btn.dataset.buy??btn.dataset.remove)));
  document.querySelectorAll("[data-qty]").forEach(inp=>inp.onchange=()=>{
    state.user.shoppingList[Number(inp.dataset.qty)].quantity=inp.value.trim();saveUser();
  });
}
function removeShopping(i){
  state.lastShoppingRemoved={type:"item",item:state.user.shoppingList[i],index:i};
  state.user.shoppingList.splice(i,1);saveUser();renderShopping();renderFoods();
  document.getElementById("undoShoppingBtn").disabled=false;
}
function undoShopping(){
  const x=state.lastShoppingRemoved;if(!x)return;
  if(x.type==="clear") state.user.shoppingList=x.items;
  else state.user.shoppingList.splice(x.index,0,x.item);
  state.lastShoppingRemoved=null;saveUser();renderShopping();renderFoods();
  document.getElementById("undoShoppingBtn").disabled=true;
}
function openShopping(){document.getElementById("shoppingDrawer").classList.add("open");document.getElementById("drawerBackdrop").classList.add("open")}
function closeShopping(){document.getElementById("shoppingDrawer").classList.remove("open");document.getElementById("drawerBackdrop").classList.remove("open")}

function renderRecipeFilters(){
  const recipes=allRecipes();
  fillSelect(document.getElementById("recipeCategoryFilter"), unique(recipes.map(x=>x.category)), "Todas las categorías");
  const tags=unique(recipes.flatMap(x=>x.tags||[])).filter(x=>x.length<30);
  fillSelect(document.getElementById("recipeTagFilter"), tags, "Todas las etiquetas");
}
function renderRecipes(){
  const q=norm(document.getElementById("recipeSearch").value);
  const cat=document.getElementById("recipeCategoryFilter").value;
  const tag=document.getElementById("recipeTagFilter").value;
  const rows=allRecipes().filter(r=>{
    const ing=(r.ingredients||[]).map(x=>x.name).join(" ");
    const hay=[r.name,r.category,r.preparation,ing,...(r.tags||[])].join(" ");
    return (!q||norm(hay).includes(q))&&(!cat||r.category===cat)&&(!tag||(r.tags||[]).includes(tag));
  });
  document.getElementById("recipeList").innerHTML=rows.map(recipeHtml).join("") || `<div class="card muted">No se han encontrado recetas.</div>`;
  document.querySelectorAll("[data-recipe-toggle]").forEach(btn=>btn.onclick=()=>{
    btn.closest(".recipe-item").classList.toggle("open");
  });
  document.querySelectorAll("[data-add-recipe]").forEach(btn=>btn.onclick=()=>openRecipeModal(btn.dataset.addRecipe));
  document.querySelectorAll("[data-edit-recipe]").forEach(btn=>btn.onclick=()=>openCustomRecipeModal(btn.dataset.editRecipe));
  document.querySelectorAll("[data-delete-recipe]").forEach(btn=>btn.onclick=()=>deleteCustomRecipe(btn.dataset.deleteRecipe));
}
function recipeHtml(r){
  const n=r.nutrition;
  const ingredients=(r.ingredients||[]).map(i=>`<li>${esc(i.name)}: <strong>${esc(i.quantity)} ${esc(i.unit||"")}</strong>${i.note?` <span class="muted">(${esc(i.note)})</span>`:""}</li>`).join("");
  return `<article class="recipe-item">
    <button class="recipe-summary" data-recipe-toggle="${escAttr(r.id)}">
      <div>
        <strong>${esc(r.name)}</strong>${r.custom?` <span class="pill">Personalizada</span>`:""}
        <div class="small muted">${esc(r.category)}</div>
      </div>
      <span class="chev">⌄</span>
    </button>
    <div class="recipe-details">
      <div class="metric-grid">
        ${metricBox("Calorías",`${n.calories.min}-${n.calories.max} kcal`)}
        ${metricBox("Proteína",`${n.proteinG.min}-${n.proteinG.max} g`)}
        ${metricBox("Carbohidratos",`${n.carbsG.min}-${n.carbsG.max} g`)}
        ${metricBox("Grasas",`${n.fatG.min}-${n.fatG.max} g`)}
        ${metricBox("Fibra",`${n.fiberG.min}-${n.fiberG.max} g`)}
        ${metricBox("Verduras",n.vegetablesG?`≈${Math.round(n.vegetablesG)} g`:"—")}
      </div>
      <div class="card-title">Ingredientes</div><ul class="ingredients">${ingredients}</ul>
      <div class="card-title">Preparación</div><p class="small">${esc(r.preparation)}</p>
      ${r.notes?`<p class="small muted">${esc(r.notes)}</p>`:""}
      <div class="pill-row">
        ${(r.tags||[]).slice(0,7).map(t=>`<span class="pill">${esc(t)}</span>`).join("")}
        ${r.timeMinutes?`<span class="pill">≈${r.timeMinutes} min</span>`:""}
        ${r.freezable?`<span class="pill">Congelable</span>`:""}
      </div>
      <button class="primary-btn full" style="margin-top:12px" data-add-recipe="${escAttr(r.id)}">Añadir al calendario</button>
      ${r.custom?`<div class="inline-actions"><button class="text-btn" data-edit-recipe="${escAttr(r.id)}" type="button">Editar</button><button class="text-btn danger" data-delete-recipe="${escAttr(r.id)}" type="button">Eliminar</button></div>`:""}
    </div>
  </article>`;
}
function metricBox(l,v){return `<div class="metric-box"><div class="label">${l}</div><div class="value">${v}</div></div>`}

function populateModalSlot(selectedSlot){
  const select=document.getElementById("modalSlot");
  const slot=selectedSlot && SLOT_LABELS[selectedSlot] ? selectedSlot : "comida";
  select.innerHTML=SLOT_ORDER.map(key =>
    `<option value="${key}" ${key===slot?"selected":""}>${SLOT_LABELS[key]}</option>`
  ).join("");
  select.value=slot;
  select.dataset.initialSlot=slot;
}

function openRecipeModal(recipeId=null, presetDay=null, presetSlot=null){
  state.modalRecipeId=recipeId || allRecipes()[0]?.id || null;

  // If the user clicked a concrete planner slot, that slot is authoritative.
  // Only calls coming from the general Recipes section fall back to "comida".
  const requestedSlot = presetSlot && SLOT_LABELS[presetSlot] ? presetSlot : "comida";
  state.modalPresetSlot=requestedSlot;

  const opts=[];
  for(let i=0;i<7;i++){
    const d=addDays(state.currentWeekStart,i);
    opts.push(`<option value="${i}" ${i===(presetDay??state.selectedDayIndex)?"selected":""}>${new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric"}).format(d)}</option>`);
  }
  document.getElementById("modalDay").innerHTML=opts.join("");

  // Populate Momento from scratch on every opening so no previous/static
  // selection can leak into the new modal session.
  populateModalSlot(requestedSlot);

  document.getElementById("modalRecipeSearch").value="";
  renderModalRecipeOptions();
  renderModalRecipePreview();
  document.getElementById("modalServings").value="1";

  document.getElementById("addRecipeModal").classList.add("open");
  document.getElementById("modalBackdrop").classList.add("open");
}
function renderModalRecipeOptions(){
  const q=norm(document.getElementById("modalRecipeSearch").value);
  const rows=allRecipes().filter(r=>{
    const ing=(r.ingredients||[]).map(x=>x.name).join(" ");
    return !q || norm([r.name,r.category,ing,...(r.tags||[])].join(" ")).includes(q);
  });
  const select=document.getElementById("modalRecipeSelect");
  select.innerHTML=rows.map(r=>`<option value="${escAttr(r.id)}">${esc(r.name)}</option>`).join("");
  if(rows.length){
    if(!rows.some(r=>r.id===state.modalRecipeId)) state.modalRecipeId=rows[0].id;
    select.value=state.modalRecipeId;
  }else{
    state.modalRecipeId=null;
  }
  renderModalRecipePreview();
}
function renderModalRecipePreview(){
  const r=state.recipeById.get(state.modalRecipeId);
  document.getElementById("modalRecipeName").textContent=r?.name||"";
  const p=document.getElementById("modalRecipePreview");
  if(!r){p.innerHTML=`<span class="muted">No hay recetas que coincidan.</span>`;return;}
  p.innerHTML=`≈${r.nutrition.calories.calc} kcal · ≈${r.nutrition.proteinG.calc} g proteína · ${esc(r.category)}`;
}
function closeModal(){document.getElementById("addRecipeModal").classList.remove("open");document.getElementById("modalBackdrop").classList.remove("open")}
function confirmAddRecipe(){
  if(!state.modalRecipeId) return;
  const week=currentWeek();
  const dayIndex=Number(document.getElementById("modalDay").value);
  const dayKey=dateKey(addDays(state.currentWeekStart,dayIndex));
  week.days[dayKey] ||= {entries:[],complete:false};
  const servings=Number(document.getElementById("modalServings").value);
  const recipe=state.recipeById.get(state.modalRecipeId);
  week.days[dayKey].entries.push({
    slot:document.getElementById("modalSlot").value,
    recipeId:state.modalRecipeId,
    servings,
    snapshot:recipe ? recipeSnapshot(recipe,servings) : null
  });
  saveUser();state.selectedDayIndex=dayIndex;closeModal();renderWeek();
}

function changeWeek(delta){
  state.currentWeekStart=addDays(state.currentWeekStart,delta);
  state.selectedDayIndex=0;ensureActiveWeek();renderWeek();
}
function renderWeek(){
  const week=currentWeek();
  if(document.getElementById("weekModeContent")){
    document.getElementById("weekModeContent").hidden=state.calendarMode!=="week";
    document.getElementById("monthModeContent").hidden=state.calendarMode!=="month";
    document.getElementById("weekViewBtn").classList.toggle("active",state.calendarMode==="week");
    document.getElementById("monthViewBtn").classList.toggle("active",state.calendarMode==="month");
  }
  const relation=weekRelation(state.currentWeekStart);
  document.getElementById("view-week").classList.remove("locked-week");
  const badge=relation==="past" ? ' <span class="history-badge">Pasada · editable</span>' :
              relation==="future" ? ' <span class="history-badge">Plan futura</span>' : '';
  document.getElementById("weekLabel").innerHTML=formatWeek(state.currentWeekStart)+badge;
  document.getElementById("dayTabs").innerHTML=Array.from({length:7},(_,i)=>{
    const d=addDays(state.currentWeekStart,i);
    const dk=dateKey(d);
    const day=week.days?.[dk];
    const status=dayCalorieStatus(day,week);
    const dot=status==="incomplete" ? "" : `<span class="day-status-dot ${status}" aria-label="${calorieStatusText(status)}"></span>`;
    return `<button class="day-tab ${i===state.selectedDayIndex?"active":""}" data-day="${i}">
      <strong>${new Intl.DateTimeFormat("es-ES",{weekday:"short"}).format(d).replace(".","")}</strong>
      <small>${d.getDate()}</small>
      ${dot}
    </button>`;
  }).join("");
  document.querySelectorAll("[data-day]").forEach(btn=>btn.onclick=()=>{state.selectedDayIndex=Number(btn.dataset.day);renderWeek()});
  renderDayPlanner(week);
  renderWaterToday();
  renderDayMetrics(week);
  renderWeekMetrics(week);
  const note=document.getElementById("weekEditNote");
  note.textContent = relation==="past"
    ? `Semana pasada y editable. Sus recetas conservan los valores con los que fueron registradas; si cambias una entrada, esa entrada se actualizará con la receta vigente. Evaluación con reglas ${week.rulesVersion||state.rules.rulesVersion}.`
    : relation==="future"
      ? "Semana futura. Puedes modificarla libremente; si actualizas el catálogo o las reglas, esta planificación se recalculará con la versión vigente."
      : "Semana actual. Puedes modificarla en cualquier momento; las métricas se actualizan al instante.";
}
function renderDayPlanner(week){
  const dk=currentDayKey(), day=week.days[dk]||{entries:[],complete:false};
  const html=SLOT_ORDER.map(slot=>{
    const entries=(day.entries||[]).map((e,i)=>({...e,_i:i})).filter(e=>e.slot===slot);
    const waterHtml=slot==="extra" ? waterExtraHtml(dk) : "";
    const content=entries.map(e=>planEntryHtml(e)).join("") + waterHtml;
    return `<section class="slot">
      <div class="slot-head">
        <div class="slot-title">${SLOT_LABELS[slot]}</div>
        <div class="slot-head-actions">
          <button class="slot-add" data-slot-add="${slot}" type="button" title="Añadir receta">＋</button>
          <button class="slot-manual" data-slot-manual="${slot}" type="button" title="Añadir comida manual">✎</button>
        </div>
      </div>
      ${content || `<div class="small muted">Sin añadir</div>`}
    </section>`;
  }).join("");
  document.getElementById("dayPlanner").innerHTML=html+
    `<div class="card"><label style="display:flex;align-items:center;gap:10px">
      <input id="dayCompleteToggle" type="checkbox" ${day.complete?"checked":""}>
      <span><strong>Día completo</strong><br><span class="small muted">Márcalo si ya has terminado de planificar este día.</span></span>
    </label></div>`;
  document.querySelectorAll("[data-slot-add]").forEach(btn=>{
    btn.onclick=()=>{
      const slot=btn.getAttribute("data-slot-add");
      openRecipePickerForSlot(slot);
    };
  });
  document.querySelectorAll("[data-slot-manual]").forEach(btn=>{
    btn.onclick=()=>openManualEntryModal(btn.getAttribute("data-slot-manual"));
  });
  document.querySelectorAll("[data-remove-entry]").forEach(btn=>btn.onclick=()=>removeEntry(Number(btn.dataset.removeEntry)));
  document.querySelectorAll("[data-entry-servings]").forEach(sel=>sel.onchange=()=>updateEntryServings(Number(sel.dataset.entryServings),Number(sel.value)));
  document.querySelectorAll("[data-water-change]").forEach(btn=>btn.onclick=()=>changeWater(Number(btn.dataset.waterChange)));
  document.getElementById("dayCompleteToggle").onchange=e=>{
    week.days[dk].complete=e.target.checked;
    saveUser();
    renderWeek();
    if(state.calendarMode==="month") renderMonth();
  };
}
function planEntryHtml(e){
  if(e.type==="manual"){
    const kcal=Math.round(Number(e.nutrition?.calories||0));
    return `<div class="plan-entry manual-entry">
      <div class="plan-entry-body">
        <div class="plan-entry-name">${esc(e.name||"Comida manual")} <span class="pill">Manual</span></div>
        <div class="plan-entry-meta">${kcal} kcal${e.notes?` · ${esc(e.notes)}`:""}</div>
      </div>
      <div class="plan-entry-actions"><button class="remove-entry" data-remove-entry="${e._i}" type="button">✕</button></div>
    </div>`;
  }
  if(e.type==="simple"){
    const label=e.simpleType==="fruit"?"1 ración de fruta":e.simpleType;
    return `<div class="plan-entry">
      <div class="plan-entry-body"><div class="plan-entry-name">${esc(label)}</div><div class="plan-entry-meta">Añadido rápido</div></div>
      <div class="plan-entry-actions"><button class="remove-entry" data-remove-entry="${e._i}">✕</button></div>
    </div>`;
  }
  const r=state.recipeById.get(e.recipeId);
  const name=e.snapshot?.recipeName || r?.name || `Receta no disponible (${e.recipeId})`;
  const kcal=e.snapshot?.nutrition?.calories ?? (r?Math.round(r.nutrition.calories.calc*e.servings):0);
  return `<div class="plan-entry">
    <div class="plan-entry-body"><div class="plan-entry-name">${esc(name)}</div><div class="plan-entry-meta">≈${Math.round(kcal)} kcal</div></div>
    <div class="plan-entry-actions">
      <select class="qty-select" data-entry-servings="${e._i}">
        ${[.5,1,1.5,2].map(x=>`<option value="${x}" ${x===Number(e.servings)?"selected":""}>${x===.5?"½":x===1.5?"1½":x}</option>`).join("")}
      </select>
      <button class="remove-entry" data-remove-entry="${e._i}">✕</button>
    </div>
  </div>`;
}
function openRecipePickerForSlot(slot){
  const canonical=SLOT_LABELS[slot] ? slot : "comida";
  openRecipeModal(null,state.selectedDayIndex,canonical);
}
function removeEntry(i){
  currentWeek().days[currentDayKey()].entries.splice(i,1);saveUser();renderWeek();
}
function updateEntryServings(i,v){
  const entry=currentWeek().days[currentDayKey()].entries[i];
  entry.servings=v;
  if(entry.recipeId){
    const recipe=state.recipeById.get(entry.recipeId);
    if(recipe) entry.snapshot=recipeSnapshot(recipe,v);
  }
  saveUser();renderWeek();
}

function renderDayMetrics(week){
  const day=week.days[currentDayKey()]||{entries:[],complete:false};
  const total=getDayTotal(day);
  const complete=day.complete===true;
  const result=assessDaily(total,effectiveRulesForWeek(week),{complete});
  const metrics=[
    ["Energía",`${Math.round(total.calories)} kcal`,result.metrics.calories],
    ["Proteína",`${Math.round(total.proteinG)} g`,result.metrics.protein],
    ["Fibra",`${Math.round(total.fiberG)} g`,result.metrics.fiber],
    ["Verduras",`${Math.round(total.vegetablesG)} g`,result.metrics.vegetables],
    ["Fruta",`${round1(total.fruitServings)} raciones`,result.metrics.fruit]
  ];
  document.getElementById("dayMetrics").innerHTML=`
    <section class="summary-card"><h3>Resumen del día</h3>
    ${result.status==="incomplete"?`<div class="small muted" style="margin-bottom:8px">Planificación todavía incompleta: mostramos datos sin juzgar el día.</div>`:""}
    ${metrics.map(x=>statusRow(...x,result.status)).join("")}
    </section>`;
}
function assessWeekWithSimpleItems(week){
  const clone=structuredClone(week);
  for(const day of Object.values(clone.days||{})){
    const transformed=[];
    let fruit=0;
    for(const e of day.entries||[]){
      if(e.type==="simple" && e.simpleType==="fruit"){
        fruit++;
        continue;
      }
      if(e.type==="manual"){
        const n=e.nutrition||{};
        transformed.push({
          recipeId:"__manual__",servings:1,
          snapshot:{
            recipeId:"__manual__",recipeVersion:1,recipeName:e.name||"Comida manual",servings:1,
            nutrition:{
              calories:Number(n.calories||0),proteinG:Number(n.proteinG||0),carbsG:Number(n.carbsG||0),
              fatG:Number(n.fatG||0),fiberG:Number(n.fiberG||0),vegetablesG:Number(n.vegetablesG||0),
              fruitServings:Number(n.fruitServings||0)
            },
            weeklyMetadata:{fishServings:0,priorityOilyFishServings:0,seafoodServings:0,legumeServings:0,redMeatServings:0,poultryServings:0,eggUnits:0,nutsServings:0}
          }
        });
        continue;
      }
      transformed.push(e);
    }
    if(fruit){
      transformed.push({
        recipeId:"__simple_fruit__",servings:1,
        snapshot:{
          recipeId:"__simple_fruit__",recipeVersion:1,recipeName:"Fruta",servings:1,
          nutrition:{calories:0,proteinG:0,carbsG:0,fatG:0,fiberG:0,vegetablesG:0,fruitServings:fruit},
          weeklyMetadata:{fishServings:0,priorityOilyFishServings:0,seafoodServings:0,legumeServings:0,redMeatServings:0,poultryServings:0,eggUnits:0,nutsServings:0}
        }
      });
    }
    day.entries=transformed;
  }
  return assessWeekObject(clone,state.recipeById,effectiveRulesForWeek(week),{historical:true});
}
function renderWeekMetrics(week){
  const result=assessWeekWithSimpleItems(week);
  const a=result.averages,f=result.frequencies;
  const rows=[
    ["Energía media",`${Math.round(a.calories)} kcal/día`,result.averageStatus?.calories],
    ["Proteína media",`${Math.round(a.proteinG)} g/día`,result.averageStatus?.protein],
    ["Fibra media",`${round1(a.fiberG)} g/día`,result.averageStatus?.fiber],
    ["Verduras media",`${Math.round(a.vegetablesG)} g/día`,result.averageStatus?.vegetables],
    ["Fruta media",`${round1(a.fruitServings)} raciones/día`,result.averageStatus?.fruit],
    ["Pescado",`${round1(f.fishServings)} raciones`,result.frequencyStatus?.fish],
    ["Pescado azul prioritario",`${round1(f.priorityOilyFishServings)} raciones`,result.frequencyStatus?.oilyFish],
    ["Marisco",`${round1(f.seafoodServings)} raciones`,result.frequencyStatus?.seafood],
    ["Legumbres",`${round1(f.legumeServings)} raciones`,result.frequencyStatus?.legumes],
    ["Carne roja",`${round1(f.redMeatServings)} raciones`,result.frequencyStatus?.redMeat],
    ["Frutos secos",`${round1(f.nutsServings)} raciones`,result.frequencyStatus?.nuts]
  ];
  document.getElementById("weekMetrics").innerHTML=`
    <section class="summary-card"><h3>Resumen semanal</h3>
      <div class="small muted" style="margin-bottom:8px">${result.coverage.completeDays}/7 días marcados como completos.</div>
      ${result.status==="incomplete"?`<div class="small muted" style="margin-bottom:8px">No se emite una valoración global hasta completar la semana.</div>`:""}
      ${rows.map(x=>statusRow(...x,result.status)).join("")}
    </section>`;
}
function statusRow(label,value,status,overall){
  const s=overall==="incomplete"?"incomplete":(status||"incomplete");
  const txt={good:"Bien",near:"Cerca",attention:"Atención",incomplete:"Pendiente"}[s];
  return `<div class="status-row"><div class="status-label">${label}</div><div class="status-value">${value}</div><div class="status-chip ${s}">${txt}</div></div>`;
}


function addFruitServing(){
  const week=currentWeek();
  const day=week.days[currentDayKey()];
  day.entries ||= [];
  day.entries.push({type:"simple",simpleType:"fruit",slot:"extra"});
  saveUser();renderWeek();
}
function addWater(){
  changeWater(250);
}
function changeWater(delta){
  state.user.water ||= {};
  const dk=currentDayKey();
  state.user.water[dk]=Math.max(0,Number(state.user.water[dk]||0)+delta);
  if(state.user.water[dk]===0) delete state.user.water[dk];
  saveUser();
  renderWeek();
}
function waterExtraHtml(dk){
  const ml=Number(state.user.water?.[dk]||0);
  if(ml<=0) return "";
  return `<div class="plan-entry water-entry">
    <div class="plan-entry-body">
      <div class="plan-entry-name">💧 Agua</div>
      <div class="plan-entry-meta">${formatWater(ml)}</div>
    </div>
    <div class="water-actions">
      <button class="water-step-btn" data-water-change="-250" type="button">−250</button>
      <button class="water-step-btn" data-water-change="250" type="button">+250</button>
    </div>
  </div>`;
}
function formatWater(ml){
  if(ml>=1000) return `${(ml/1000).toFixed(ml%1000===0?0:2).replace(".",",")} L`;
  return `${ml} ml`;
}
function renderWaterToday(){}

function openSettings(){
  renderSettingsInfo();
  document.getElementById("settingsDrawer").classList.add("open");
  document.getElementById("drawerBackdrop").classList.add("open");
}
function closeSettings(){
  document.getElementById("settingsDrawer").classList.remove("open");
  if(!document.getElementById("shoppingDrawer").classList.contains("open"))
    document.getElementById("drawerBackdrop").classList.remove("open");
}
function renderSettingsInfo(){
  document.getElementById("catalogVersionLabel").textContent=state.catalog.catalogVersion||"—";
  document.getElementById("rulesVersionLabel").textContent=state.rules.rulesVersion||"—";
}
async function importCatalogFromFile(file){
  if(!file)return;
  try{
    const next=JSON.parse(await file.text());
    validateCatalogImport(next);
    const activeMissing=findCurrentFutureMissingRecipeIds(next);
    if(activeMissing.length){
      alert(`El catálogo no contiene recetas usadas en la semana actual o futuras: ${activeMissing.join(", ")}. No se importará.`);
      return;
    }
    localStorage.setItem("nutriplan.catalog.v2",JSON.stringify(next));
    state.catalog=next;
    rebuildRecipeMap();
    refreshCurrentAndFutureRecipeSnapshots();
    renderFoodFilters();renderFoods();renderRecipeFilters();renderRecipes();renderMatrixFilters();renderMatrix();renderSettingsInfo();renderWeek();
    alert("Catálogo actualizado. La semana actual y las futuras se han recalculado. Las semanas pasadas conservan sus valores históricos.");
  }catch(err){alert(`No se pudo importar el catálogo: ${err.message||err}`)}
}
async function importRulesFromFile(file){
  if(!file)return;
  try{
    const next=JSON.parse(await file.text());
    if(next.schemaVersion!==2||!next.rulesVersion||!next.daily||!next.weekly) throw new Error("Formato de reglas no compatible.");
    localStorage.setItem("nutriplan.rules.v2",JSON.stringify(next));
    state.rules=next;
    refreshCurrentAndFutureRules();
    renderGuide();renderSettingsInfo();renderWeek();
    alert("Reglas actualizadas para la semana actual y las futuras. Las semanas pasadas mantienen las reglas con las que fueron evaluadas.");
  }catch(err){alert(`No se pudieron importar las reglas: ${err.message||err}`)}
}
function validateCatalogImport(c){
  if(c.schemaVersion!==2||!Array.isArray(c.foods)||!Array.isArray(c.recipes)) throw new Error("Formato de catálogo no compatible.");
  const ids=new Set();
  for(const r of c.recipes){
    if(!r.id||ids.has(r.id)||!Number.isInteger(r.version)) throw new Error("Hay recetas con ID o versión inválidos.");
    ids.add(r.id);
  }
}
function findCurrentFutureMissingRecipeIds(nextCatalog){
  const ids=new Set([...(nextCatalog.recipes||[]).map(r=>r.id),...(state.user.customRecipes||[]).map(r=>r.id)]);
  const missing=new Set();
  const current=startOfWeek(new Date());
  for(const [key,week] of Object.entries(state.user.weeks||{})){
    const ws=new Date(`${week.startDate||key}T12:00:00`);
    if(ws<current) continue;
    for(const day of Object.values(week.days||{})){
      for(const e of day.entries||[]){
        if(e.type==="simple"||e.type==="manual"||e.snapshot) continue;
        if(e.recipeId&&!ids.has(e.recipeId)) missing.add(e.recipeId);
      }
    }
  }
  return [...missing];
}

function weekRelation(weekStart){
  const current=startOfWeek(new Date());
  const a=dateKey(weekStart), b=dateKey(current);
  return a<b ? "past" : a>b ? "future" : "current";
}
function effectiveRulesForWeek(week){
  return weekRelation(new Date(`${week.startDate}T12:00:00`))==="past"
    ? (week.rulesSnapshot || state.rules)
    : state.rules;
}
function refreshCurrentAndFutureRecipeSnapshots(){
  const current=startOfWeek(new Date());
  for(const [key,week] of Object.entries(state.user.weeks||{})){
    const ws=new Date(`${week.startDate||key}T12:00:00`);
    if(ws<current) continue;
    for(const day of Object.values(week.days||{})){
      for(const e of day.entries||[]){
        if(!e.recipeId || e.type==="simple" || e.type==="manual") continue;
        const recipe=state.recipeById.get(e.recipeId);
        if(recipe) e.snapshot=recipeSnapshot(recipe,Number(e.servings||1));
      }
    }
  }
  saveUser();
}
function refreshCurrentAndFutureRules(){
  const current=startOfWeek(new Date());
  for(const [key,week] of Object.entries(state.user.weeks||{})){
    const ws=new Date(`${week.startDate||key}T12:00:00`);
    if(ws<current) continue;
    week.rulesVersion=state.rules.rulesVersion;
    week.rulesSnapshot=structuredClone(state.rules);
  }
  saveUser();
}

function exportBackup(){
  const payload={
    backupVersion:1,
    exportedAt:new Date().toISOString(),
    catalog:state.catalog,
    rules:state.rules,
    userState:state.user
  };
  downloadJson(payload,`nutriplan-backup-${new Date().toISOString().slice(0,10)}.json`);
}
async function importBackupFromFile(file){
  if(!file)return;
  try{
    const b=JSON.parse(await file.text());
    if(b.backupVersion!==1||!b.catalog||!b.rules||!b.userState) throw new Error("Copia de seguridad no compatible.");
    validateCatalogImport(b.catalog);
    localStorage.setItem("nutriplan.catalog.v2",JSON.stringify(b.catalog));
    localStorage.setItem("nutriplan.rules.v2",JSON.stringify(b.rules));
    localStorage.setItem("nutriplan.userState.v2",JSON.stringify(b.userState));
    state.catalog=b.catalog;state.rules=b.rules;state.user=b.userState;
    state.user.customFoods ||= [];
    state.user.customRecipes ||= [];
    rebuildRecipeMap();
    renderGuide();renderFoodFilters();renderFoods();renderRecipeFilters();renderRecipes();renderMatrixFilters();renderMatrix();renderShopping();renderSettingsInfo();renderWeek();
    alert("Copia de seguridad restaurada.");
  }catch(err){alert(`No se pudo restaurar la copia: ${err.message||err}`)}
}
function downloadJson(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}


function getDayTotal(day){
  const entries=day?.entries||[];
  const recipeEntries=entries.filter(e=>e.type!=="manual");
  const total=sumResolvedEntries(recipeEntries,state.recipeById,{historical:true});
  for(const e of entries.filter(e=>e.type==="manual")){
    const n=e.nutrition||{};
    total.calories += Number(n.calories||0);
    total.proteinG += Number(n.proteinG||0);
    total.carbsG += Number(n.carbsG||0);
    total.fatG += Number(n.fatG||0);
    total.fiberG += Number(n.fiberG||0);
    total.vegetablesG += Number(n.vegetablesG||0);
    total.fruitServings += Number(n.fruitServings||0);
  }
  const simpleFruit=entries.filter(e=>e.type==="simple"&&e.simpleType==="fruit").length;
  total.fruitServings += simpleFruit;
  return total;
}
function classifyCalories(calories,rules){
  const c=rules.daily.calories;
  if(calories>=c.targetMin && calories<=c.targetMax) return "good";
  if(calories>=c.softLow && calories<=c.softHigh) return "near";
  return "attention";
}
function dayCalorieStatus(day,week){
  if(!day || day.complete!==true) return "incomplete";
  return classifyCalories(getDayTotal(day).calories,effectiveRulesForWeek(week));
}
function calorieStatusText(status){
  return {good:"Dentro de rango",near:"Cerca del rango",attention:"Fuera de rango",incomplete:"No completado"}[status]||"";
}
function setCalendarMode(mode){
  state.calendarMode=mode;
  document.getElementById("weekViewBtn").classList.toggle("active",mode==="week");
  document.getElementById("monthViewBtn").classList.toggle("active",mode==="month");
  document.getElementById("weekModeContent").hidden=mode!=="week";
  document.getElementById("monthModeContent").hidden=mode!=="month";
  if(mode==="month"){
    state.currentMonthStart=startOfMonth(addDays(state.currentWeekStart,state.selectedDayIndex));
    renderMonth();
  }else{
    renderWeek();
  }
}
function findWeekForDate(date){
  const ws=startOfWeek(date);
  return state.user.weeks?.[weekKey(ws)] || null;
}
function findDayForDate(date){
  const week=findWeekForDate(date);
  return {week,day:week?.days?.[dateKey(date)]||null};
}
function renderMonth(){
  const monthStart=startOfMonth(state.currentMonthStart);
  const year=monthStart.getFullYear();
  const month=monthStart.getMonth();
  document.getElementById("monthTitle").textContent=
    new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(monthStart);

  const firstGrid=startOfWeek(monthStart);
  const lastDate=new Date(year,month+1,0,12);
  const lastGrid=addDays(startOfWeek(lastDate),6);
  const cells=[];
  const stats={good:0,near:0,attention:0,complete:0,calories:0};

  for(let d=new Date(firstGrid); d<=lastGrid; d=addDays(d,1)){
    const inMonth=d.getMonth()===month;
    const {week,day}=findDayForDate(d);
    const status=week ? dayCalorieStatus(day,week) : "incomplete";
    const isComplete=day?.complete===true;
    if(inMonth && isComplete && week){
      stats.complete++;
      stats[status]++;
      stats.calories+=getDayTotal(day).calories;
    }
    const dot=status==="incomplete" ? "" : `<span class="month-status-dot ${status}"></span>`;
    cells.push(`<button class="month-day ${inMonth?"":"outside"} ${isComplete?"complete":""}" data-month-date="${dateKey(d)}" type="button">
      <span class="month-day-number">${d.getDate()}</span>
      ${dot}
    </button>`);
  }
  document.getElementById("monthGrid").innerHTML=cells.join("");
  document.querySelectorAll("[data-month-date]").forEach(btn=>btn.onclick=()=>openDateFromMonth(btn.dataset.monthDate));

  const avg=stats.complete?Math.round(stats.calories/stats.complete):0;
  document.getElementById("monthSummary").innerHTML=`
    <section class="summary-card">
      <h3>Resumen del mes</h3>
      <div class="month-summary-grid">
        <div class="month-stat"><span>Días registrados</span><strong>${stats.complete}</strong></div>
        <div class="month-stat good"><span>Dentro de rango</span><strong>${stats.good}</strong></div>
        <div class="month-stat near"><span>Cerca</span><strong>${stats.near}</strong></div>
        <div class="month-stat attention"><span>Fuera</span><strong>${stats.attention}</strong></div>
      </div>
      <div class="month-average">${stats.complete?`Media de días completos: <strong>≈${avg} kcal</strong>`:"Todavía no hay días completos en este mes."}</div>
    </section>`;
}
function openDateFromMonth(isoDate){
  const d=new Date(`${isoDate}T12:00:00`);
  state.currentWeekStart=startOfWeek(d);
  state.selectedDayIndex=(d.getDay()+6)%7;
  ensureActiveWeek();
  setCalendarMode("week");
}


function customFoodDescription(f){
  const n=f.nutrition||{};
  const parts=[];
  if(Number(n.caloriesPer100g)>0) parts.push(`${Math.round(n.caloriesPer100g)} kcal/100 g`);
  if(Number(n.proteinPer100g)>0) parts.push(`P ${n.proteinPer100g} g`);
  if(Number(n.fiberPer100g)>0) parts.push(`fibra ${n.fiberPer100g} g`);
  if(Number(n.saltPer100g)>0) parts.push(`sal ${n.saltPer100g} g`);
  return [parts.join(" · "),f.note||""].filter(Boolean).join(". ");
}
function openCustomFoodModal(id=null){
  state.customFoodEditId=id;
  const f=id ? (state.user.customFoods||[]).find(x=>x.id===id) : null;
  document.getElementById("customFoodModalTitle").textContent=f?"Editar alimento":"Nuevo alimento";
  document.getElementById("customFoodName").value=f?.name||"";
  populateCustomFoodGroupSelect(f?.group||null);
  document.getElementById("customFoodClass").value=f?.classification||"Núcleo";
  document.getElementById("customFoodPortion").value=f?.portion||"";
  document.getElementById("customFoodCalories").value=f?.nutrition?.caloriesPer100g??"";
  document.getElementById("customFoodProtein").value=f?.nutrition?.proteinPer100g??"";
  document.getElementById("customFoodCarbs").value=f?.nutrition?.carbsPer100g??"";
  document.getElementById("customFoodFat").value=f?.nutrition?.fatPer100g??"";
  document.getElementById("customFoodFiber").value=f?.nutrition?.fiberPer100g??"";
  document.getElementById("customFoodSalt").value=f?.nutrition?.saltPer100g??"";
  document.getElementById("customFoodNote").value=f?.note||"";
  openSimpleModal("customFoodModal");
}
function saveCustomFood(){
  const name=document.getElementById("customFoodName").value.trim();
  const group=document.getElementById("customFoodGroup").value;
  if(!name||!group){ alert("Nombre y grupo son obligatorios."); return; }
  const nutrition={
    caloriesPer100g:numberOrZero("customFoodCalories"),
    proteinPer100g:numberOrZero("customFoodProtein"),
    carbsPer100g:numberOrZero("customFoodCarbs"),
    fatPer100g:numberOrZero("customFoodFat"),
    fiberPer100g:numberOrZero("customFoodFiber"),
    saltPer100g:numberOrZero("customFoodSalt")
  };
  const item={
    id:state.customFoodEditId||uid("custom_food"),
    name,group,
    classification:document.getElementById("customFoodClass").value,
    portion:document.getElementById("customFoodPortion").value.trim()||"Referencia por 100 g",
    description:"",
    tags:["personalizado"],
    aliases:[],
    version:1,
    custom:true,
    nutrition,
    note:document.getElementById("customFoodNote").value.trim()
  };
  item.description=customFoodDescription(item);
  const arr=state.user.customFoods||[];
  const idx=arr.findIndex(x=>x.id===item.id);
  if(idx>=0) arr[idx]=item; else arr.push(item);
  state.user.customFoods=arr;
  saveUser();
  closeSimpleModal("customFoodModal");
  renderFoodFilters(); renderFoods(); renderShopping();
}
function deleteCustomFood(id){
  if(!confirm("¿Eliminar este alimento personalizado?")) return;
  state.user.customFoods=(state.user.customFoods||[]).filter(x=>x.id!==id);
  state.user.shoppingList=(state.user.shoppingList||[]).filter(x=>x.foodId!==id);
  saveUser(); renderFoodFilters(); renderFoods(); renderShopping();
}

function rangeFromValue(v){
  const n=Number(v||0);
  return {min:n,max:n,calc:n};
}
function openCustomRecipeModal(id=null){
  state.customRecipeEditId=id;
  const r=id ? (state.user.customRecipes||[]).find(x=>x.id===id) : null;
  document.getElementById("customRecipeModalTitle").textContent=r?"Editar receta":"Nueva receta";
  document.getElementById("customRecipeName").value=r?.name||"";
  populateCustomRecipeCategorySelect(r?.category||null);
  document.getElementById("customRecipeCalories").value=r?.nutrition?.calories?.calc??"";
  document.getElementById("customRecipeProtein").value=r?.nutrition?.proteinG?.calc??"";
  document.getElementById("customRecipeCarbs").value=r?.nutrition?.carbsG?.calc??"";
  document.getElementById("customRecipeFat").value=r?.nutrition?.fatG?.calc??"";
  document.getElementById("customRecipeFiber").value=r?.nutrition?.fiberG?.calc??"";
  document.getElementById("customRecipeVeg").value=r?.nutrition?.vegetablesG??"";
  document.getElementById("customRecipeFruit").value=r?.nutrition?.fruitServings??"";
  document.getElementById("customRecipeNotes").value=r?.notes||"";
  openSimpleModal("customRecipeModal");
}
function saveCustomRecipe(){
  const name=document.getElementById("customRecipeName").value.trim();
  const calories=numberOrZero("customRecipeCalories");
  if(!name){ alert("El nombre es obligatorio."); return; }
  if(calories<=0){ alert("Introduce las kcal aproximadas por ración."); return; }
  const notes=document.getElementById("customRecipeNotes").value.trim();
  const item={
    id:state.customRecipeEditId||uid("custom_recipe"),
    name,
    category:document.getElementById("customRecipeCategory").value||"Otros",
    tags:["personalizada"],
    ingredients:[],
    preparation:notes||"Receta personalizada.",
    nutrition:{
      calories:rangeFromValue(calories),
      proteinG:rangeFromValue(numberOrZero("customRecipeProtein")),
      carbsG:rangeFromValue(numberOrZero("customRecipeCarbs")),
      fatG:rangeFromValue(numberOrZero("customRecipeFat")),
      fiberG:rangeFromValue(numberOrZero("customRecipeFiber")),
      vegetablesG:numberOrZero("customRecipeVeg"),
      fruitServings:numberOrZero("customRecipeFruit")
    },
    weeklyMetadata:{fishServings:0,priorityOilyFishServings:0,seafoodServings:0,legumeServings:0,redMeatServings:0,poultryServings:0,eggUnits:0,nutsServings:0},
    timeMinutes:null,freezable:false,notes,
    version:1,updatedAt:new Date().toISOString().slice(0,10),custom:true
  };
  const arr=state.user.customRecipes||[];
  const idx=arr.findIndex(x=>x.id===item.id);
  if(idx>=0) arr[idx]=item; else arr.push(item);
  state.user.customRecipes=arr;
  rebuildRecipeMap();
  saveUser();
  closeSimpleModal("customRecipeModal");
  renderRecipeFilters(); renderRecipes(); renderMatrixFilters(); renderMatrix(); renderWeek();
}
function deleteCustomRecipe(id){
  if(!confirm("¿Eliminar esta receta personalizada? Las entradas ya añadidas al calendario conservarán su snapshot.")) return;
  state.user.customRecipes=(state.user.customRecipes||[]).filter(x=>x.id!==id);
  rebuildRecipeMap(); saveUser();
  renderRecipeFilters(); renderRecipes(); renderMatrixFilters(); renderMatrix();
}

function populateManualSlot(slot){
  const selected=SLOT_LABELS[slot]?slot:"comida";
  const select=document.getElementById("manualEntrySlot");
  select.innerHTML=SLOT_ORDER.map(k=>`<option value="${k}" ${k===selected?"selected":""}>${SLOT_LABELS[k]}</option>`).join("");
  select.value=selected;
}
function openManualEntryModal(slot){
  populateManualSlot(slot);
  ["manualEntryName","manualEntryCalories","manualEntryProtein","manualEntryCarbs","manualEntryFat","manualEntryFiber","manualEntryVeg","manualEntryFruit","manualEntryNotes"]
    .forEach(id=>document.getElementById(id).value="");
  openSimpleModal("manualEntryModal");
}
function saveManualEntry(){
  const calories=numberOrZero("manualEntryCalories");
  if(calories<=0){ alert("Introduce al menos una estimación de calorías."); return; }
  const week=currentWeek(), dk=currentDayKey();
  week.days[dk] ||= {entries:[],complete:false};
  week.days[dk].entries ||= [];
  week.days[dk].entries.push({
    type:"manual",
    slot:document.getElementById("manualEntrySlot").value,
    name:document.getElementById("manualEntryName").value.trim()||"Comida manual",
    notes:document.getElementById("manualEntryNotes").value.trim(),
    nutrition:{
      calories,
      proteinG:numberOrZero("manualEntryProtein"),
      carbsG:numberOrZero("manualEntryCarbs"),
      fatG:numberOrZero("manualEntryFat"),
      fiberG:numberOrZero("manualEntryFiber"),
      vegetablesG:numberOrZero("manualEntryVeg"),
      fruitServings:numberOrZero("manualEntryFruit")
    }
  });
  saveUser(); closeSimpleModal("manualEntryModal"); renderWeek();
}

function renderMatrixFilters(){
  fillSelect(document.getElementById("matrixCategoryFilter"),unique(allRecipes().map(x=>x.category)),"Todas las categorías");
}
function renderMatrix(){
  const q=norm(document.getElementById("matrixSearch").value);
  const cat=document.getElementById("matrixCategoryFilter").value;
  const rows=allRecipes().filter(r=>(!q||norm(r.name+" "+r.category+" "+(r.tags||[]).join(" ")).includes(q))&&(!cat||r.category===cat));
  document.querySelector("#matrixTable tbody").innerHTML=rows.map(r=>`
    <tr>
      <td><strong>${esc(r.name)}</strong></td><td>${esc(r.category)}</td>
      <td>${r.nutrition.calories.min}-${r.nutrition.calories.max}</td>
      <td>${r.nutrition.proteinG.min}-${r.nutrition.proteinG.max} g</td>
      <td>${r.nutrition.fiberG.min}-${r.nutrition.fiberG.max} g</td>
      <td>${r.nutrition.vegetablesG?`≈${Math.round(r.nutrition.vegetablesG)} g`:"—"}</td>
      <td>${r.timeMinutes?`≈${r.timeMinutes} min`:"—"}</td>
    </tr>`).join("");
}


let pwaRegistration=null;

async function initPwa(){
  const status=document.getElementById("pwaStatus");
  if(!("serviceWorker" in navigator)){
    if(status) status.textContent="Este navegador no admite funcionamiento PWA offline.";
    return;
  }
  try{
    pwaRegistration=await navigator.serviceWorker.register("./service-worker.js",{scope:"./"});
    if(status) status.textContent=navigator.onLine
      ? "Preparada para uso offline después de la primera carga."
      : "Modo offline activo.";
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(status) status.textContent="Nueva versión disponible. Recarga la app para aplicarla.";
    });
  }catch(err){
    if(status) status.textContent="No se pudo activar el modo offline. Requiere HTTPS o localhost.";
    console.error("Service worker registration failed",err);
  }
}

async function checkForPwaUpdate(){
  const status=document.getElementById("pwaStatus");
  if(!pwaRegistration){
    if(status) status.textContent="Todavía no hay service worker registrado.";
    return;
  }
  try{
    if(status) status.textContent="Buscando actualización…";
    await pwaRegistration.update();
    if(pwaRegistration.waiting){
      if(status) status.textContent="Hay una actualización preparada. Cierra y vuelve a abrir la app.";
    }else{
      if(status) status.textContent="La aplicación está actualizada.";
    }
  }catch(err){
    if(status) status.textContent="No se pudo comprobar la actualización.";
  }
}

function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"))}
function norm(s){return String(s||"").normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim()}
function round1(n){return Math.round(Number(n||0)*10)/10}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(s){return esc(s)}
