/* بيانات المشاريع + صور الخلفية + الوحدات — Supabase version */

/* ========== الأنواع ========== */
const TYPES = [
  { value: 'apartment', ar: 'شقق',   en: 'Apartments' },
  { value: 'villa',     ar: 'فلل',   en: 'Villas' },
  { value: 'floor',     ar: 'أدوار', en: 'Floors' }
];

/* ========== المراحل ========== */
const STAGES = [
  { value: 'sale',      ar: 'مرحلة البيع',    en: 'For Sale' },
  { value: 'finishing', ar: 'مرحلة التشطيب',  en: 'Finishing' },
  { value: 'structure', ar: 'مرحلة العظم',    en: 'Structure' },
  { value: 'sold',      ar: 'مباعة',          en: 'Sold' }
];

/* ========== حالات الوحدة ========== */
const UNIT_STATUS = [
  { value: 'available', ar: 'متاحة', en: 'Available' },
  { value: 'sold',      ar: 'مباعة', en: 'Sold' },
  { value: 'reserved',  ar: 'محجوزة', en: 'Reserved' }
];

/* ========== كاش داخلي ========== */
let _projectsCache = null;
let _heroCache = null;

/* =========================================================
   دوال المشاريع
   ========================================================= */

async function getProjects(){
  if(_projectsCache) return _projectsCache;
  try{
    const data = await sbSelect('projects');
    _projectsCache = data.map(p => ({
      id: p.id,
      nameAr: p.name_ar, nameEn: p.name_en,
      type: p.type, floors: p.floors,
      locationAr: p.location_ar, locationEn: p.location_en,
      stage: p.stage,
      price: p.price || 0, area: p.area || 0,
      cover: p.cover || '',
      images: p.images ? p.images.split('\n').filter(s => s.trim()) : [],
      descAr: p.desc_ar, descEn: p.desc_en,
      views: p.views || 0
    }));
    return _projectsCache;
  }catch(e){
    console.error('getProjects:', e);
    return [];
  }
}

async function addProject(project){
  try{
    const row = {
      name_ar: project.nameAr, name_en: project.nameEn,
      type: project.type,
      floors: project.floors,
      location_ar: project.locationAr, location_en: project.locationEn,
      stage: project.stage,
      price: project.price || 0,
      area: project.area || 0,
      cover: project.cover || '',
      images: Array.isArray(project.images) ? project.images.join('\n') : (project.images || ''),
      desc_ar: project.descAr || '', desc_en: project.descEn || ''
    };
    const result = await sbInsert('projects', row);
    _projectsCache = null;
    return result;
  }catch(e){
    console.error('addProject:', e);
    throw e;
  }
}

async function deleteProject(id){
  try{
    await sbDelete('projects', id);
    _projectsCache = null;
  }catch(e){
    console.error('deleteProject:', e);
    throw e;
  }
}

async function getProjectById(id){
  const list = await getProjects();
  return list.find(p => String(p.id) === String(id));
}

/* ---------- زيادة عدّاد المشاهدات ---------- */
async function incrementProjectViews(id){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}&select=views`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    if(!data.length) return;

    const currentViews = data[0].views || 0;
    const newViews = currentViews + 1;

    await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ views: newViews })
    });

    _projectsCache = null;
    return newViews;
  }catch(e){
    console.error('incrementViews:', e);
    return null;
  }
}

/* ---------- تحديث مشروع ---------- */
async function updateProject(id, updates){
  try{
    const row = {};
    if(updates.nameAr !== undefined) row.name_ar = updates.nameAr;
    if(updates.nameEn !== undefined) row.name_en = updates.nameEn;
    if(updates.type !== undefined) row.type = updates.type;
    if(updates.floors !== undefined) row.floors = updates.floors;
    if(updates.locationAr !== undefined) row.location_ar = updates.locationAr;
    if(updates.locationEn !== undefined) row.location_en = updates.locationEn;
    if(updates.stage !== undefined) row.stage = updates.stage;
    if(updates.price !== undefined) row.price = updates.price;
    if(updates.area !== undefined) row.area = updates.area;
    if(updates.cover !== undefined) row.cover = updates.cover;
    if(updates.images !== undefined) row.images = Array.isArray(updates.images) ? updates.images.join('\n') : updates.images;
    if(updates.descAr !== undefined) row.desc_ar = updates.descAr;
    if(updates.descEn !== undefined) row.desc_en = updates.descEn;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if(!res.ok) throw new Error('فشل في التعديل');
    _projectsCache = null;
    return await res.json();
  }catch(e){
    console.error('updateProject:', e);
    throw e;
  }
}

/* =========================================================
   دوال الوحدات (Units)
   ========================================================= */

async function getUnitsByProject(projectId){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/units?project_id=eq.${projectId}&select=*&order=created_at.asc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if(!res.ok) throw new Error('فشل في جلب الوحدات');
    const data = await res.json();
    return data.map(u => ({
      id: u.id,
      projectId: u.project_id,
      unitNumber: u.unit_number,
      area: u.area || 0,
      bedrooms: u.bedrooms || 0,
      price: u.price || 0,
      status: u.status || 'available',
      images: u.images ? u.images.split('\n').filter(s => s.trim()) : [],
      majlis: u.majlis || 0,
      livingRoom: u.living_room || 0,
      kitchen: u.kitchen || 0,
      bathrooms: u.bathrooms || 0,
      maidRoom: u.maid_room || 0,
      laundryRoom: u.laundry_room || 0
    }));
  }catch(e){
    console.error('getUnitsByProject:', e);
    return [];
  }
}

async function getUnitById(id){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/units?id=eq.${id}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if(!res.ok) throw new Error('فشل في جلب الوحدة');
    const data = await res.json();
    if(!data.length) return null;
    const u = data[0];
    return {
      id: u.id,
      projectId: u.project_id,
      unitNumber: u.unit_number,
      area: u.area || 0,
      bedrooms: u.bedrooms || 0,
      price: u.price || 0,
      status: u.status || 'available',
      images: u.images ? u.images.split('\n').filter(s => s.trim()) : [],
      majlis: u.majlis || 0,
      livingRoom: u.living_room || 0,
      kitchen: u.kitchen || 0,
      bathrooms: u.bathrooms || 0,
      maidRoom: u.maid_room || 0,
      laundryRoom: u.laundry_room || 0
    };
  }catch(e){
    console.error('getUnitById:', e);
    return null;
  }
}

async function addUnit(unit){
  try{
    const row = {
      project_id: unit.projectId,
      unit_number: unit.unitNumber,
      area: unit.area || 0,
      bedrooms: unit.bedrooms || 0,
      price: unit.price || 0,
      status: unit.status || 'available',
      images: Array.isArray(unit.images) ? unit.images.join('\n') : (unit.images || ''),
      majlis: unit.majlis || 0,
      living_room: unit.livingRoom || 0,
      kitchen: unit.kitchen || 0,
      bathrooms: unit.bathrooms || 0,
      maid_room: unit.maidRoom || 0,
      laundry_room: unit.laundryRoom || 0
    };
    const result = await sbInsert('units', row);
    return result;
  }catch(e){
    console.error('addUnit:', e);
    throw e;
  }
}

async function updateUnit(id, updates){
  try{
    const row = {};
    if(updates.unitNumber !== undefined) row.unit_number = updates.unitNumber;
    if(updates.area !== undefined) row.area = updates.area;
    if(updates.bedrooms !== undefined) row.bedrooms = updates.bedrooms;
    if(updates.price !== undefined) row.price = updates.price;
    if(updates.status !== undefined) row.status = updates.status;
    if(updates.images !== undefined) row.images = Array.isArray(updates.images) ? updates.images.join('\n') : updates.images;
    if(updates.majlis !== undefined) row.majlis = updates.majlis;
    if(updates.livingRoom !== undefined) row.living_room = updates.livingRoom;
    if(updates.kitchen !== undefined) row.kitchen = updates.kitchen;
    if(updates.bathrooms !== undefined) row.bathrooms = updates.bathrooms;
    if(updates.maidRoom !== undefined) row.maid_room = updates.maidRoom;
    if(updates.laundryRoom !== undefined) row.laundry_room = updates.laundryRoom;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/units?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if(!res.ok) throw new Error('فشل في التعديل');
    return await res.json();
  }catch(e){
    console.error('updateUnit:', e);
    throw e;
  }
}

async function deleteUnit(id){
  try{
    await sbDelete('units', id);
  }catch(e){
    console.error('deleteUnit:', e);
    throw e;
  }
}

/* =========================================================
   دوال صور الخلفية (Hero Images)
   ========================================================= */

async function getHeroImages(){
  if(_heroCache) return _heroCache;
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hero_images?select=*&order=created_at.asc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if(!res.ok) throw new Error('فشل في جلب الصور');
    const data = await res.json();
    _heroCache = data;
    return _heroCache;
  }catch(e){
    console.error('getHeroImages:', e);
    return [];
  }
}

async function addHeroImage(url){
  try{
    const row = { url: url };
    const result = await sbInsert('hero_images', row);
    _heroCache = null;
    return result;
  }catch(e){
    console.error('addHeroImage:', e);
    throw e;
  }
}

async function deleteHeroImage(id){
  try{
    await sbDelete('hero_images', id);
    _heroCache = null;
  }catch(e){
    console.error('deleteHeroImage:', e);
    throw e;
  }
}

/* =========================================================
   دوال مساعدة
   ========================================================= */

function getTypeLabel(type, lang){
  const t = TYPES.find(x => x.value === type);
  if(!t) return type;
  return lang === 'en' ? t.en : t.ar;
}

function getStageLabel(stage, lang){
  const s = STAGES.find(x => x.value === stage);
  if(!s) return stage;
  return lang === 'en' ? s.en : s.ar;
}

function getUnitStatusLabel(status, lang){
  const s = UNIT_STATUS.find(x => x.value === status);
  if(!s) return status;
  return lang === 'en' ? s.en : s.ar;
}

/* =========================================================
   إعادة تعيين الكاش
   ========================================================= */
function clearCache(){
  _projectsCache = null;
  _heroCache = null;
}
