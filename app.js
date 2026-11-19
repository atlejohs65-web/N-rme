const KEY="naerme.reminders.v3";
let reminders=[],selected=null,radius=500,map,userMarker,watchId,toastTimer;

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function toast(msg){
  const t=$("#toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3000);
}
function load(){
  try{
    reminders=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(reminders))reminders=[];
  }catch(e){reminders=[]}
}
function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify(reminders));
    if(JSON.parse(localStorage.getItem(KEY)||"[]").length!==reminders.length)throw Error("verify");
    render();return true;
  }catch(e){
    $("#status").textContent="Lagring mislyktes. Prøv å åpne Nærme fra Hjem-skjermen.";
    return false;
  }
}
function initMap(){
  map=L.map("map",{zoomControl:false}).setView([59.78,5.50],12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
  reminders.forEach(addMarker);
  startLocation();
}
function addMarker(r){
  if(r._marker)map.removeLayer(r._marker);
  r._marker=L.marker([r.lat,r.lng]).addTo(map).bindPopup(`<b>${esc(r.title)}</b><br>${esc(r.place)}<br>${r.radius>=1000?r.radius/1000+" km":r.radius+" m"}`);
}
function render(){
  $("#count").textContent=reminders.length;
  $("#empty").classList.toggle("hidden",reminders.length>0);
  $("#list").innerHTML="";
  reminders.forEach(r=>{
    const el=document.createElement("div");el.className="item";
    el.innerHTML=`<div class="pin">${r.repeat?"🔔":"📍"}</div><div><h3>${esc(r.title)}</h3><p>${esc(r.place)} · ${r.radius>=1000?r.radius/1000+" km":r.radius+" m"}</p></div><div class="actions"><button class="smallbtn toggle">${r.enabled?"●":"○"}</button><button class="smallbtn del">×</button></div>`;
    el.querySelector(".toggle").classList.toggle("disabled",!r.enabled);
    el.querySelector(".toggle").onclick=()=>{r.enabled=!r.enabled;persist();};
    el.querySelector(".del").onclick=()=>{if(r._marker)map.removeLayer(r._marker);reminders=reminders.filter(x=>x.id!==r.id);persist();toast("Påminnelse slettet");};
    $("#list").appendChild(el);
  });
}
async function notificationPermission(){
  if(!("Notification"in window)){toast("Varsler støttes ikke her. Bruk Nærme fra Hjem-skjermen.");return false}
  if(Notification.permission==="granted")return true;
  if(Notification.permission==="denied"){toast("Varsler er blokkert i iPhone-innstillingene.");return false}
  const p=await Notification.requestPermission();return p==="granted";
}
async function notify(title,place){
  const ok=await notificationPermission();
  if(ok)new Notification("Nærme",{body:`${title} · ${place}`,tag:"naerme-"+title});
  else toast(`${title} · ${place}`);
}
function distance(a,b,c,d){
  const R=6371000,rad=Math.PI/180, x=(c-a)*rad,y=(d-b)*rad;
  const q=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function check(lat,lng){
  let changed=false;
  reminders.forEach(r=>{
    if(!r.enabled)return;
    const d=distance(lat,lng,r.lat,r.lng),inside=d<=r.radius;
    const nearKey="near."+r.id;
    const wasNear=sessionStorage.getItem(nearKey)==="1";
    if(inside&&!wasNear){
      sessionStorage.setItem(nearKey,"1");
      notify(r.title,r.place);
      if(!r.repeat){r.enabled=false;changed=true;}
    }else if(d>r.radius*1.25)sessionStorage.removeItem(nearKey);
  });
  if(changed)persist();
}
function startLocation(){
  if(!navigator.geolocation){toast("Posisjon støttes ikke.");return}
  if(watchId)navigator.geolocation.clearWatch(watchId);
  watchId=navigator.geolocation.watchPosition(p=>{
    const lat=p.coords.latitude,lng=p.coords.longitude;
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.circleMarker([lat,lng],{radius:8,color:"#087cf0",fillColor:"#087cf0",fillOpacity:.95,weight:3}).addTo(map);
    check(lat,lng);
  },e=>{
    if(e.code===1)toast("Posisjon er blokkert. Tillat posisjon for Nærme.");
  },{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function openModal(){
  $("#modal").classList.remove("hidden");
  $("#status").textContent="";
  notificationPermission();
  $("#title").focus();
}
function closeModal(){ $("#modal").classList.add("hidden"); }
function selectPlace(x){
  selected={name:x.display_name.split(",")[0],display:x.display_name,lat:+x.lat,lng:+x.lon};
  $("#selected").textContent="📍 "+selected.display;
  $("#selected").classList.remove("hidden");$("#results").innerHTML="";
  map.setView([selected.lat,selected.lng],16);
}
async function searchPlace(){
  const q=$("#place").value.trim();if(!q)return;
  $("#results").innerHTML='<div class="result">Søker…</div>';
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}&accept-language=no`);
    const data=await res.json();$("#results").innerHTML="";
    data.forEach(x=>{const b=document.createElement("button");b.className="result";b.innerHTML=`<strong>${esc(x.display_name.split(",")[0])}</strong><span>${esc(x.display_name)}</span>`;b.onclick=()=>selectPlace(x);$("#results").appendChild(b)});
    if(!data.length)$("#results").innerHTML='<div class="result">Fant ikke stedet.</div>';
  }catch(e){$("#results").innerHTML='<div class="result">Kunne ikke søke akkurat nå.</div>'}
}
function resetForm(){
  $("#title").value="";$("#place").value="";$("#results").innerHTML="";$("#selected").classList.add("hidden");
  selected=null;radius=500;$("#repeat").checked=false;$("#status").textContent="";
  document.querySelectorAll("#radius button").forEach(b=>b.classList.toggle("active",b.dataset.radius==="500"));
}
function create(){
  const title=$("#title").value.trim();
  if(!title){$("#status").textContent="Skriv hva du skal huske.";return}
  if(!selected){$("#status").textContent="Velg et sted først.";return}
  const r={id:(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()),title,place:selected.name,display:selected.display,lat:selected.lat,lng:selected.lng,radius,repeat:$("#repeat").checked,enabled:true};
  reminders.push(r);
  if(!persist()){reminders.pop();return}
  addMarker(r);closeModal();resetForm();map.setView([r.lat,r.lng],15);toast("Påminnelse lagret");
}
$("#addBtn").onclick=openModal;$("#closeBtn").onclick=closeModal;$(".backdrop").onclick=closeModal;
$("#searchBtn").onclick=searchPlace;$("#place").addEventListener("keydown",e=>{if(e.key==="Enter")searchPlace()});
$("#saveBtn").onclick=create;$("#locateBtn").onclick=startLocation;
$("#testBtn").onclick=()=>notify("Test av Nærme","Varsler fungerer");
document.querySelectorAll("#radius button").forEach(b=>b.onclick=()=>{radius=+b.dataset.radius;document.querySelectorAll("#radius button").forEach(x=>x.classList.toggle("active",x===b))});
load();initMap();render();
