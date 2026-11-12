const overlay=document.createElement('canvas');overlay.width=600;overlay.height=780;window.detailLayer=overlay;
const oc=overlay.getContext('2d'),dc=$('#detailCanvas'),dg=dc.getContext('2d');let history=[],painting=false,last=null,base=null;
function drawBase(){base=document.createElement('canvas');base.width=600;base.height=780;const g=base.getContext('2d');tiles.forEach((id,i)=>{const r=tileRect(i);g.drawImage(faces[id].canvas,r.x,r.y,r.width,r.height,r.x,r.y,r.width,r.height)});}
function refreshDetail(){dg.clearRect(0,0,600,780);dg.drawImage(base,0,0);dg.drawImage(overlay,0,0);$('#undoBrush').disabled=!history.length;}
window.clearDetail=()=>{oc.clearRect(0,0,600,780);history=[];document.querySelector('#board .detail-overlay')?.remove()};
$('#precision').onclick=()=>{if(!faces.every(f=>f.status==='ready'))return notify('Your portraits are still loading. Try again in a moment.');drawBase();history=[];$('#brushSource').replaceChildren();faces.forEach((f,i)=>{const option=document.createElement('option');option.value=i;option.textContent=f.name;$('#brushSource').append(option)});$('#brushSource').value=selected;refreshDetail();$('#detailDialog').showModal()};
$('#brushSize').oninput=e=>$('#brushSizeValue').textContent=e.target.value;
$('#detailZoom').onchange=e=>{dc.style.width=600*Number(e.target.value)+'px';dc.style.maxWidth='none'};
const patch=document.createElement('canvas');patch.width=600;patch.height=780;const pg=patch.getContext('2d');
function stamp(x,y){const r=Number($('#brushSize').value)/2;pg.globalCompositeOperation='source-over';pg.clearRect(0,0,600,780);pg.drawImage(faces[Number($('#brushSource').value)].canvas,0,0);pg.globalCompositeOperation='destination-in';const mask=pg.createRadialGradient(x,y,r*.72,x,y,r);mask.addColorStop(0,'#000');mask.addColorStop(1,'transparent');pg.fillStyle=mask;pg.fillRect(0,0,600,780);oc.drawImage(patch,0,0)}
function at(e){const r=dc.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*600,y:(e.clientY-r.top)/r.height*780}}
dc.onpointerdown=e=>{if(e.button!==0)return;history.push(oc.getImageData(0,0,600,780));if(history.length>20)history.shift();painting=true;last=at(e);dc.setPointerCapture(e.pointerId);stamp(last.x,last.y);refreshDetail()};
dc.onpointermove=e=>{if(!painting)return;const p=at(e),n=Math.max(1,Math.ceil(Math.hypot(p.x-last.x,p.y-last.y)/Math.max(1,Number($('#brushSize').value)/5)));for(let i=1;i<=n;i++)stamp(last.x+(p.x-last.x)*i/n,last.y+(p.y-last.y)*i/n);last=p;refreshDetail()};
dc.onpointerup=dc.onpointercancel=()=>{painting=false;last=null};
$('#undoBrush').onclick=()=>{if(history.length)oc.putImageData(history.pop(),0,0);refreshDetail()};
$('#clearBrush').onclick=()=>{history.push(oc.getImageData(0,0,600,780));oc.clearRect(0,0,600,780);refreshDetail()};
function applyOverlay(){document.querySelector('#board .detail-overlay')?.remove();const im=document.createElement('img');im.className='detail-overlay';im.src=overlay.toDataURL();im.alt='Painted facial details';$('#board').append(im);flat=true;depth()}
$('#applyBrush').onclick=()=>$('#detailDialog').close();$('#detailDialog').addEventListener('close',applyOverlay);
$('#sculpture').onclick=()=>{if(!tiles.every(i=>faces[i].canvas))return;$('#figureFrame').srcdoc=FIGURE_HTML;$('#sculptureDialog').showModal();};
$('#figureFrame').onload=()=>{if($('#sculptureDialog').open)$('#figureFrame').contentWindow.postMessage({type:'portrait',image:composite()},'*')};
window.addEventListener('message',e=>{if(e.source!==$('#figureFrame').contentWindow)return;if(e.data?.type==='edit'){ $('#sculptureDialog').close();$('#precision').click() }});
$('#sculptureDialog').addEventListener('close',()=>$('#figureFrame').srcdoc='');
