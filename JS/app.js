// app.js

// Datos de Campus & POIs
const locations = {
  Entrance:      [43.225018, 0.052059],
  Library:       [43.224945, 0.051151],
  Cafeteria:     [43.227491, 0.050948],
  GYM:           [43.225022, 0.050141],
  Building_A:    [43.225121, 0.051905],
  Building_B:    [43.225188, 0.051330],
  Building_C:    [43.224918, 0.050762],
  Building_D:    [43.224511, 0.051267],
  Building_E:    [43.224897, 0.051205],
  Villa:         [43.225722, 0.050753],
  Building_J:    [43.226148, 0.050630],
  Building_K:    [43.226481, 0.050634],
  Building_M:    [43.223988, 0.050028],
  Building_IUFM: [43.224808, 0.049464],
  Observatoire:  [43.223953, 0.049200],
  Département_Génie_Électrique: [43.225952, 0.048409],
  Département_Techniques:       [43.226238, 0.049283],
  Département_Génie_Mécanique:  [43.226579, 0.047749],
  Département_Gestion:          [43.226727, 0.049311],
  Département_Multimédia:       [43.227101, 0.049143],
  Département_Civil:            [43.226198, 0.047592],
  Résidence_A:   [43.227188, 0.051380],
  Résidence_B:   [43.226901, 0.051519],
  Résidence_C:   [43.226672, 0.051519],
  Résidence_D:   [43.227049, 0.050050],
  Résidence_E:   [43.227233, 0.050063],
  Résidence_F:   [43.227397, 0.050192],
  Laboratory_L0: [43.225312, 0.050033],
  Laboratory_L1: [43.225728, 0.050033],
  Laboratory_L2: [43.226025, 0.050033],
  Laboratory_L3: [43.226203, 0.050033],
  Laboratory_L4: [43.226383, 0.050033]
};

// Globals
let map2D, map3D, routingControl, instructions = [];
let userMarker2D = null, userMarker3D = null;
let watchId = null, following = true;
let smoothLat, smoothLon, first = true, frameCnt = 0, baseAlt = null;
let db, infoMarkers = [];

// Shortcut
const $ = id => document.getElementById(id);

// Simple tests
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function runTests() {
  assert($("origin"), "Falta #origin");
  assert($("destination"), "Falta #destination");
  assert($("infoTitle") && $("infoDescription"), "Faltan inputs de info");
}

// Steps Control
const StepsControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    // creamos el contenedor arrancando en 'collapsed'
    const div = L.DomUtil.create('div', 'leaflet-steps collapsed');
    // inyectamos el header con icono y el ol
    div.innerHTML = `
      <h3 role="button" aria-expanded="false">
        Steps (${instructions.length})
        <span class="toggle-icon">▼</span>
      </h3>
      <ol>
        ${instructions.map((inst,i)=>
          `<li id="step-${i}">${inst.text}</li>`
        ).join('')}
      </ol>`;
    L.DomEvent.disableClickPropagation(div);

    // 1) capturar el <h3> como botón
    const header = div.querySelector('h3');
    // 2) al hacer click, alternar collapsed y aria-expanded
    L.DomEvent.on(header, 'click', () => {
      const isCollapsed = div.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', (!isCollapsed).toString());
      // opcional: reajustar posición tras cambiar tamaño
      adjustDirectionsPosition();
    });

    return div;
  }
});


// Inicialización
function initApp() {
  runTests();
  initMaps();
  initControls();
}

// Mapas
function initMaps() {
  const campusBounds = [[43.2235,0.0459],[43.2280,0.0536]];

  // 2D
  map2D = L.map("map2D", {
    center:[43.22476,0.05044],
    zoom:18, minZoom:17, maxZoom:19, maxBounds:campusBounds
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map2D);
  L.control.scale({imperial:false}).addTo(map2D);
  new L.Control.MiniMap(
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    {toggleDisplay:true}
  ).addTo(map2D);
  L.control.measure({
    position:'topright',
    primaryLengthUnit:'meters', secondaryLengthUnit:'kilometers',
    primaryAreaUnit:'sqmeters', secondaryAreaUnit:'hectares'
  }).addTo(map2D);

  map2D.on('dragstart zoomstart', ()=> following=false);

  // POIs
  const cluster = L.markerClusterGroup();
  Object.entries(locations).forEach(([key,coords])=>{
    const m = L.marker(coords).bindPopup(key.replace(/_/g,' '));
    m.on('click',()=> handlePOIClick(key));
    cluster.addLayer(m);
  });
  map2D.addLayer(cluster);

  // 3D
  map3D = new maplibregl.Map({
    container:"map3D",
    style:"https://api.maptiler.com/maps/streets-v2/style.json?key=OskyrOiFGGaB6NMWJlcC",
    center:[0.05044,43.22476], zoom:17, pitch:60, bearing:-20, antialias:true
  });
  map3D.addControl(new maplibregl.NavigationControl());
  map3D.on('dragstart zoomstart', ()=> following=false);

  map3D.on('load', ()=>{
    map3D.addSource('pois',{type:'geojson', data:{
      type:'FeatureCollection',
      features:Object.entries(locations).map(([k,c])=>({
        type:'Feature',
        geometry:{type:'Point',coordinates:[c[1],c[0]]},
        properties:{name:k}
      }))
    }});
    map3D.addLayer({
      id:'pois-layer', type:'circle', source:'pois',
      paint:{
        'circle-radius':6,
        'circle-color':'#0055A4',
        'circle-stroke-color':'#fff',
        'circle-stroke-width':2
      }
    });
    map3D.on('click','pois-layer', e=>{
      const name=e.features[0].properties.name;
      handlePOIClick(name);
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${name.replace(/_/g,' ')}</strong>`)
        .addTo(map3D);
    });
  });

  switchTo2D();
}

// Click en POI
function handlePOIClick(key){
  if (!$("origin").value) $("origin").value = key;
  else $("destination").value = key;
}

// Controles
function initControls(){
  fillSelect("origin");
  fillSelect("destination");

  $("searchBox").addEventListener("input", debounce(()=>{
    const txt=$("searchBox").value.toLowerCase();
    ["origin","destination"].forEach(id=>{
      Array.from($(id).options).forEach(o=>{
        o.style.display = o.text.toLowerCase().includes(txt)?'block':'none';
      });
    });
  },100));

  $("btnGo").onclick       = drawRoute;
  $("btn2D").onclick       = switchTo2D;
  $("btn3D").onclick       = switchTo3D;
  $("btnStartGPS").onclick = startTracking;
  $("btnFollow").onclick   = ()=>{
    following=true;
    if(userMarker2D && getComputedStyle($("map2D")).display!=="none")
      map2D.panTo(userMarker2D.getLatLng(),{animate:true});
    if(userMarker3D && getComputedStyle($("map3D")).display!=="none")
      map3D.setCenter(userMarker3D.getLngLat().toArray());
  };

  // Modals
  $("alert-close").onclick          = ()=> $("alertModal").classList.remove("active");
  $("btnAddInfo").onclick           = ()=>{$("infoFormOverlay").classList.add("active"); $("infoForm").classList.add("active");};
  $("btnCancelInfo").onclick        = ()=>{$("infoFormOverlay").classList.remove("active"); $("infoForm").classList.remove("active");};
  $("hiddenFileInput").onchange     = ()=>{
    const f=$("hiddenFileInput").files[0];
    if(f){
      const r=new FileReader();
      r.onload=e=>$("preview").src=e.target.result;
      r.readAsDataURL(f);
    }
  };
  $("btnSaveInfo").onclick          = saveInfo;
  $("btnViewInfos").onclick         = ()=>{ $("infoModalOverlay").classList.add("active"); $("infoListPanel").classList.add("active"); refreshInfoList(); };
  $("btnCloseInfoPanel").onclick    = ()=>{ $("infoModalOverlay").classList.remove("active"); $("infoListPanel").classList.remove("active"); };
  $("infoModalOverlay").onclick     = e=>{
    if(e.target=== $("infoModalOverlay")){
      $("infoModalOverlay").classList.remove("active");
      $("infoListPanel").classList.remove("active");
    }
  };

  // IndexedDB
  const req = indexedDB.open("CampusAppDB",1);
  req.onerror     = e=>console.error("DB error",e);
  req.onsuccess   = e=>{ db=e.target.result; loadAllMarkers(); };
  req.onupgradeneeded = e=>{
    const store=e.target.result.createObjectStore("infos",{keyPath:"id",autoIncrement:true});
    store.createIndex("by_date","timestamp");
  };

  // Ajuste dinámico del panel de pasos
  window.addEventListener('resize', adjustDirectionsPosition);
}

// Rellena selects
function fillSelect(id){
  const sel=$(id);
  sel.innerHTML=`<option value="">— select —</option><option value="gps">My Location</option>`;
  const groups={
    General:["Entrance","Library","Cafeteria","GYM","Villa"],
    Buildings:Object.keys(locations).filter(k=>/^Building/.test(k)||/^Observatoire/.test(k)),
    Departments:Object.keys(locations).filter(k=>k.startsWith("Département")),
    Residences:Object.keys(locations).filter(k=>k.startsWith("Résidence")),
    Labs:Object.keys(locations).filter(k=>k.startsWith("Laboratory"))
  };
  for(const label in groups){
    const og=document.createElement("optgroup");
    og.label=label;
    groups[label].forEach(key=>{
      const o=document.createElement("option");
      o.value=key;
      o.textContent=key.replace(/_/g," ");
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
}

// Dibuja ruta
function drawRoute(){
  const o=$("origin").value, d=$("destination").value;
  if(!o) return showModal("Select origin");
  if(!d) return showModal("Select destination");
  if(routingControl) map2D.removeControl(routingControl);

  const origin = o==="gps"
    ? (userMarker2D ? userMarker2D.getLatLng() : (showModal("Start GPS first"),null))
    : L.latLng(...locations[o]);
  if(!origin) return;
  const dest = L.latLng(...locations[d]);

  routingControl = L.Routing.control({
    router:L.Routing.osrmv1({
      serviceUrl:"https://routing.openstreetmap.de/routed-foot/route/v1",
      profile:"foot"
    }),
    waypoints:[origin,dest],
    fitSelectedRoutes:true,
    show:false,
    createMarker:()=>null,
    lineOptions:{styles:[{weight:5,color:"#0055A4"}]}
  })
  .on("routesfound", e=>{
    instructions = e.routes[0].instructions.slice();
    if(window._stepsCtrl) map2D.removeControl(window._stepsCtrl);
    window._stepsCtrl = new StepsControl();
    map2D.addControl(window._stepsCtrl);
    adjustDirectionsPosition();
    syncRouteTo3D(e.routes[0].coordinates.map(c=>[c.lng,c.lat]));
  })
  .on("routingerror", ()=> showModal("Routing error"))
  .addTo(map2D);
}

// Ajusta posición del panel
function adjustDirectionsPosition(){
  const dir = document.querySelector('.leaflet-steps');
  if(!dir) return;
  const ctrl = document.getElementById('controls');
  const ctrlRect = ctrl.getBoundingClientRect();
  const mapRect  = document.getElementById('map2D').getBoundingClientRect();
  dir.style.top   = (ctrlRect.bottom - mapRect.top + 10) + 'px';
  dir.style.right = '10px';
}

// Sincroniza ruta 3D
function syncRouteTo3D(coords){
  const data={type:"Feature",geometry:{type:"LineString",coordinates:coords}};
  if(map3D.getSource("route3D")){
    map3D.getSource("route3D").setData(data);
  } else {
    map3D.addSource("route3D",{type:"geojson",data});
    map3D.addLayer({
      id:"route3D-layer", type:"line", source:"route3D",
      paint:{"line-color":"#FFD700","line-width":5}
    });
  }
}

// Geolocalización
function handlePosition(p){
  const {latitude:lat,longitude:lon,accuracy,altitude:alt,altitudeAccuracy:acc} = p.coords;
  if(accuracy>100) return;
  if(first){ smoothLat=lat; smoothLon=lon; first=false; if(acc<5) baseAlt=alt; }
  else { const α=0.4; smoothLat=smoothLat*(1-α)+lat*α; smoothLon=smoothLon*(1-α)+lon*α; }
  if(++frameCnt%3!==0) return;

  const pos2D = [smoothLat,smoothLon], pos3D=[smoothLon,smoothLat];

  if(getComputedStyle($("map2D")).display!=="none"){
    if(!userMarker2D) userMarker2D=L.marker(pos2D).addTo(map2D);
    else             userMarker2D.setLatLng(pos2D);
    if(following)    map2D.panTo(pos2D,{animate:true});
    highlightStep();
  }

  if(getComputedStyle($("map3D")).display!=="none"){
    if(!userMarker3D) userMarker3D=new maplibregl.Marker().setLngLat(pos3D).addTo(map3D);
    else              userMarker3D.setLngLat(pos3D);
    if(following)     map3D.setCenter(pos3D);
  }

  let floor="Unknown";
  if(baseAlt!=null && acc<5){
    const d=alt-baseAlt;
    floor=d<2?"Ground":d<4?"First":"Upper";
  }
  $("info").innerHTML=`
    <p>
      <strong>Lat:</strong> ${smoothLat.toFixed(6)}<br>
      <strong>Lon:</strong> ${smoothLon.toFixed(6)}<br>
      <strong>Alt:</strong> ${alt!=null?alt.toFixed(1)+" m":"—"}<br>
      <strong>Acc:</strong> ±${accuracy.toFixed(1)} m<br>
      <strong>Floor:</strong> ${floor}
    </p>`;
}

function startTracking(){
  first=true; frameCnt=0;
  if(watchId) navigator.geolocation.clearWatch(watchId);
  navigator.geolocation.getCurrentPosition(handlePosition,()=>{},{
    enableHighAccuracy:true, timeout:5000, maximumAge:0
  });
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    err=>showModal(`GPS error: ${err.message}`),
    { enableHighAccuracy:true, timeout:5000, maximumAge:0 }
  );
}

function highlightStep(){
  if(!userMarker2D || !instructions.length) return;
  const pt = turf.point([userMarker2D.getLatLng().lng,userMarker2D.getLatLng().lat]);
  let best=0, bd=Infinity;
  instructions.forEach((inst,i)=>{
    if(!inst.latLng) return;
    const d = turf.distance(pt,turf.point([inst.latLng.lng,inst.latLng.lat]),{units:"meters"});
    if(d<bd){ bd=d; best=i; }
  });
  instructions.forEach((_,i)=>{
    const el = document.getElementById(`step-${i}`);
    if(el) el.classList.toggle("current", i===best);
  });
}

function switchTo2D(){
  $("map3D").style.display="none";
  $("map2D").style.display="block";
  map2D.invalidateSize();
}
function switchTo3D(){
  $("map2D").style.display="none";
  $("map3D").style.display="block";
  map3D.resize();
}

function loadAllMarkers(){
  const tx=db.transaction("infos","readonly");
  tx.objectStore("infos").getAll().onsuccess=e=>{
    infoMarkers.forEach(m=>m.remove());
    infoMarkers=[];
    e.target.result.forEach(addMarkerToMap);
  };
}

function addMarkerToMap(info){
  const lng=parseFloat(info.lng), lat=parseFloat(info.lat);
  if(isNaN(lng)||isNaN(lat)){
    console.warn("Coords inválidas",info);
    return;
  }
  const el=document.createElement("div");
  el.className="info-marker";
  new maplibregl.Marker(el)
    .setLngLat([lng,lat])
    .setPopup(new maplibregl.Popup({offset:25})
      .setHTML(`
        <h3>${info.title}</h3>
        <div class="info-meta">
          ${new Date(info.timestamp).toLocaleString()} · Type: ${info.type} ·
          Lat:${lat.toFixed(6)}, Lon:${lng.toFixed(6)}
        </div>
        <p>${info.description}</p>
        ${info.image?`<img src="${info.image}" class="info-image" alt="${info.title}">`:''}
      `))
    .addTo(map3D);
  infoMarkers.push(el);
}

function saveInfo(){
  const title=$("infoTitle").value.trim();
  const description=$("infoDescription").value.trim();
  const type=$("infoMarkerType").value;
  if(!title||!description) return alert("Rellena título y descripción.");

  const image=$("preview").src||null;
  const center=map3D.getCenter();
  const lng=center.lng;
  const lat=center.lat;
  const timestamp=Date.now();

  const tx=db.transaction("infos","readwrite");
  tx.objectStore("infos").add({title,description,type,image,lng,lat,timestamp})
    .onsuccess=()=>{
      $("infoFormOverlay").classList.remove("active");
      $("infoForm").classList.remove("active");
      $("infoTitle").value="";
      $("infoDescription").value="";
      $("preview").src="";
      loadAllMarkers();
    };
}

function refreshInfoList(){
  const tx=db.transaction("infos","readonly");
  tx.objectStore("infos").getAll().onsuccess=e=>{
    const list=$("infoList");
    list.innerHTML=e.target.result.map(info=>`
      <div class="info-item">
        <h3>${info.title}</h3>
        <div class="info-meta">
          ${new Date(info.timestamp).toLocaleString()} · Type: ${info.type} ·
          Lat:${info.lat.toFixed(6)}, Lon:${info.lng.toFixed(6)}
        </div>
        <p>${info.description}</p>
        ${info.image?`<img src="${info.image}" class="info-image" alt="${info.title}">`:''}
        <button class="btn-delete" data-id="${info.id}">Delete</button>
      </div>
    `).join('');
    list.querySelectorAll(".btn-delete").forEach(btn=>{
      btn.onclick=()=>{
        const id=Number(btn.dataset.id);
        db.transaction("infos","readwrite").objectStore("infos").delete(id)
          .onsuccess=refreshInfoList;
      };
    });
  };
}

// Utilities
function debounce(fn,delay=100){
  let t;
  return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay);};
}

function showModal(msg){
  $("alert-message").textContent=msg;
  $("alertModal").classList.add("active");
}

// Launch
document.addEventListener("DOMContentLoaded", initApp);
