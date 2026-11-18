const KEY="naerme.pwa.reminders";
let reminders=JSON.parse(localStorage.getItem(KEY)||"[]");
let selected=null, radius=500, map, userMarker;

const $=s=>document.querySelector(s);
const list=$("#list"), count=$("#count"), empty=$("#empty");

function saveData(){localStorage.setItem(KEY,JSON.stringify(reminders));render();}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function initMap(){
  map=L.map("map",{zoomControl:false}).setView([59.78,5.50],12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
  reminders.forEach(addMarker);
  locate();
}
function addMarker(r){
  const marker=L.marker([r.lat,r.lng]).addTo(map);
  marker.bindPopup(`<b>${esc(r.title)}</b><br>${esc(r.place)}<br>${Math.round(r.radius)} m`);
  r._marker=marker;
}
function render(){
  count.textContent=reminders.length;
  empty.classList.toggle("hidden",reminders.length>0);
  list.innerHTML="";
  reminders.forEach(r=>{
    const el=document.createElement("div");el.className="item";
    el.innerHTML=`<div class="pin">${r.repeat?"🔔":"📍"}</div>
      <div><h3>${esc(r.title)}</h3><p>${esc(r.place)} · ${r.radius>=1000?(r.radius/1000)+" km":r.radius+" m"}</p></div>
      <div class="actions">
       <button class="smallbtn toggle ${r.enabled?"":"disabled"}" title="På/av">${r.enabled?"●":"○"}</button>
       <button class="smallbtn del" title="Slett">×</button>
      </div>`;
    el.querySelector(".toggle").onclick=()=>{r.enabled=!r.enabled;saveData();};
    el.querySelector(".del").onclick=()=>{if(r._marker)map.removeLayer(r._marker);reminders=reminders.filter(x=>x.id!==r.id);saveData();};
    list.appendChild(el);
  });
}
function locate(){
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(p=>{
    const ll=[p.coords.latitude,p.coords.longitude];
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.circleMarker(ll,{radius:8,color:"#0b84ff",fillColor:"#0b84ff",fillOpacity:.9,weight:3}).addTo(map).bindPopup("Du er her");
    map.setView(ll,14);
    checkProximity(ll[0],ll[1]);
  },()=>{}, {enableHighAccuracy:true,maximumAge:30000,timeout:10000});
}
function distance(lat1,lon1,lat2,lon2){
  const R=6371000,d=Math.PI/180;
  const a=Math.sin((lat2-lat1)*d/2)**2+Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin((lon2-lon1)*d/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function checkProximity(lat,lng){
  reminders.forEach(r=>{
    if(!r.enabled)return;
    const d=distance(lat,lng,r.lat,r.lng);
    const key="near."+r.id;
    if(d<=r.radius && !sessionStorage.getItem(key)){
      sessionStorage.setItem(key,"1");
      notify(r.title,r.place);
      if(!r.repeat)r.enabled=false;
      saveData();
    }else if(d>r.radius*1.25){
      sessionStorage.removeItem(key);
    }
  });
}
function notify(title,place){
  const body=`${title} · ${place}`;
  if("Notification" in window && Notification.permission==="granted"){
    new Notification("Nærme", {body});
  }else alert(`Nærme\n\n${title}\n${place}`);
}
async function askNotifications(){
  if("Notification" in window && Notification.permission==="default")await Notification.requestPermission();
}
function searchPlace(){
  const q=$("#place").value.trim(); if(!q)return;
  $("#results").innerHTML=`<div class="result">Søker…</div>`;
  fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}&accept-language=no`)
    .then(r=>r.json()).then(data=>{
      $("#results").innerHTML="";
      data.forEach(x=>{
        const b=document.createElement("button");b.className="result";
        b.innerHTML=`<strong>${esc(x.display_name.split(",")[0])}</strong><span>${esc(x.display_name)}</span>`;
        b.onclick=()=>selectPlace(x);
        $("#results").appendChild(b);
      });
      if(!data.length)$("#results").innerHTML=`<div class="result">Fant ikke stedet.</div>`;
    }).catch(()=>{$("#results").innerHTML=`<div class="result">Kunne ikke søke akkurat nå.</div>`});
}
function selectPlace(x){
  selected={name:x.display_name.split(",")[0],display:x.display_name,lat:+x.lat,lng:+x.lon};
  $("#selected").textContent="📍 "+selected.display;
  $("#selected").classList.remove("hidden");$("#results").innerHTML="";
  map.setView([selected.lat,selected.lng],16);
}
function openModal(){
  $("#modal").classList.remove("hidden");$("#title").focus();askNotifications();
}
function closeModal(){$("#modal").classList.add("hidden");}
function resetForm(){
  $("#title").value="";$("#place").value="";$("#results").innerHTML="";
  $("#selected").classList.add("hidden");selected=null;radius=500;$("#repeat").checked=false;
  document.querySelectorAll("#radius button").forEach(b=>b.classList.toggle("active",b.dataset.radius==="500"));
}
function create(){
  if(!$("#title").value.trim()||!selected){$("#status").textContent="Skriv inn hva du skal huske og velg et sted.";return;}
  const r={id:crypto.randomUUID(),title:$("#title").value.trim(),place:selected.name,display:selected.display,lat:selected.lat,lng:selected.lng,radius,repeat:$("#repeat").checked,enabled:true};
  reminders.push(r);addMarker(r);saveData();closeModal();resetForm();map.setView([r.lat,r.lng],15);
}
$("#addBtn").onclick=openModal;$("#closeBtn").onclick=closeModal;$(".backdrop").onclick=closeModal;
$("#searchBtn").onclick=searchPlace;$("#place").addEventListener("keydown",e=>{if(e.key==="Enter")searchPlace()});
$("#saveBtn").onclick=create;$("#locateBtn").onclick=locate;
document.querySelectorAll("#radius button").forEach(b=>b.onclick=()=>{radius=+b.dataset.radius;document.querySelectorAll("#radius button").forEach(x=>x.classList.toggle("active",x===b));});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
initMap();render();
setInterval(locate,30000);
