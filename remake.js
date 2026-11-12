// Feature locations refer to the same eye/chin alignment used for every portrait.
// One composited surface prevents hairline gaps and GPU texture loss between tiny tiles.
const renderInteractiveTiles=renderBoard;
renderBoard=function(){
 renderInteractiveTiles();const surface=document.createElement('canvas');surface.width=600;surface.height=780;const ctx=surface.getContext('2d');
 tiles.forEach((id,i)=>{if(!faces[id]?.canvas)return;const r=tileRect(i);ctx.drawImage(faces[id].canvas,r.x,r.y,r.width,r.height,r.x,r.y,r.width,r.height)});
 $('#board').style.backgroundImage=`url("${surface.toDataURL('image/jpeg',.96)}")`;
};
$('#showGrid').onchange=e=>$('#board').classList.toggle('show-grid',e.target.checked);
const featurePoints={left:[210,340],right:[390,340],nose:[300,440],mouth:[300,530]};
document.querySelectorAll('[data-feature]').forEach(button=>button.onclick=()=>{
 const name=button.dataset.feature, zoom=name==='all'?1:4;
 $('#detailZoom').value=String(zoom);$('#detailZoom').dispatchEvent(new Event('change'));
 requestAnimationFrame(()=>{const sc=document.querySelector('.detail-scroll'),p=featurePoints[name]||[300,390];sc.scrollTo({left:Math.max(0,p[0]*zoom-sc.clientWidth/2),top:Math.max(0,p[1]*zoom-sc.clientHeight/2)});});
});
// Keep mixed portraits readable: borrow contiguous facial regions, not random noise.
$('#random').onclick=()=>{
 const pool=faces.map((_,i)=>i).filter(i=>faces[i].status==='ready'&&($('#includeSelf').checked||!faces[i].self));
 if(!pool.length)return notify('Add another portrait or include your own face first.');
 window.clearDetail?.();const pick=()=>pool[Math.floor(Math.random()*pool.length)];
 const baseFace=pick(),eyeL=pick(),eyeR=pick(),nose=pick(),mouth=pick();
 tiles=Array.from({length:COUNT},(_,i)=>{const r=tileRect(i),x=r.x+r.width/2,y=r.y+r.height/2;if(y>280&&y<390)return x<300?eyeL:eyeR;if(y>=390&&y<490&&x>210&&x<390)return nose;if(y>=490&&y<575&&x>150&&x<450)return mouth;return baseFace;});
 experiment++;$('#experimentNum').textContent=String(experiment).padStart(3,'0');renderBoard();updateActions();notify('A new what-if. Zoom in and make it yours.');
};
// Editing is always face-on; the separate Colorfigures stage provides full rotation.
$('#stage').onpointerdown=$('#stage').onpointermove=$('#stage').onpointerup=$('#stage').onpointercancel=null;
renderBoard();
