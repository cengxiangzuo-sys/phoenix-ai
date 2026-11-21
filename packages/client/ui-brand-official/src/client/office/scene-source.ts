/** Presentation-only scene: accepts roster snapshots, emits selection intent, never calls services. */
export default `(()=>{
const T=window.THREE,stage=document.getElementById('stage'),canvas=document.querySelector('canvas');
let renderer;try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true})}catch(error){document.querySelector('.loading').textContent='无法启用 3D，请使用上方员工选择器';return}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene(),camera=new T.OrthographicCamera(-12,12,8,-8,.1,100);camera.position.set(15,21,24);camera.lookAt(0,0,0);
scene.add(new T.HemisphereLight(0xffead7,0x53413c,2.4));
const sun=new T.DirectionalLight(0xffe5c5,5);sun.position.set(-8,16,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
const rim=new T.DirectionalLight(0xff8a43,2.5);rim.position.set(6,8,-10);scene.add(rim);const cool=new T.DirectionalLight(0x99bbdc,1.5);cool.position.set(8,10,8);scene.add(cool);
const mats={floor:new T.MeshStandardMaterial({color:0x49372b,roughness:.78}),floor2:new T.MeshStandardMaterial({color:0x4f3c2e,roughness:.8}),base:new T.MeshStandardMaterial({color:0x241b17,roughness:.6}),wall:new T.MeshStandardMaterial({color:0x54463a,roughness:.85}),wood:new T.MeshStandardMaterial({color:0x996845,roughness:.55}),edge:new T.MeshStandardMaterial({color:0x352720,roughness:.6}),metal:new T.MeshStandardMaterial({color:0xbca887,metalness:.65,roughness:.35}),orange:new T.MeshStandardMaterial({color:0xf87d20,roughness:.42}),rug:new T.MeshStandardMaterial({color:0x9e431e,roughness:1}),black:new T.MeshStandardMaterial({color:0x17191b,roughness:.5}),chair:new T.MeshStandardMaterial({color:0x4d5855,roughness:.85}),paper:new T.MeshStandardMaterial({color:0xeadac5,roughness:1}),leaf:new T.MeshStandardMaterial({color:0x4c6d4d,roughness:.9}),pot:new T.MeshStandardMaterial({color:0xa69077,roughness:.8}),light:new T.MeshStandardMaterial({color:0xffba66,emissive:0xff6a0a,emissiveIntensity:2.1}),screen:new T.MeshStandardMaterial({color:0x8fb6ad,emissive:0x699b9b,emissiveIntensity:.4,roughness:.3}),glass:new T.MeshPhysicalMaterial({color:0xb4c9c5,transparent:true,opacity:.16,roughness:.1,metalness:.1,depthWrite:false})};
function mesh(geo,mat,x,y,z,parent=scene){const m=new T.Mesh(geo,typeof mat==='string'?mats[mat]:mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(x,y,z,w,h,d,mat,parent){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent)}
function cyl(x,y,z,r,h,mat,parent){return mesh(new T.CylinderGeometry(r,r,h,40),mat,x,y,z,parent)}
function ball(x,y,z,r,mat,parent){return mesh(new T.SphereGeometry(r,20,14),mat,x,y,z,parent)}
function rounded(x,y,z,w,h,d,r,mat,parent){const shape=new T.Shape();shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:8});g.rotateX(-Math.PI/2);return mesh(g,mat,x,y-h/2,z,parent)}
function label(str,x,y,z,size=1.4,color='#e9d7c3'){const c=document.createElement('canvas');c.width=256;c.height=96;const a=c.getContext('2d');a.fillStyle='rgba(35,27,20,.88)';a.beginPath();a.roundRect(48,12,160,72,18);a.fill();a.fillStyle=color;a.font='500 '+(str.length>3?'32':'46')+'px PingFang SC,sans-serif';a.textAlign='center';a.textBaseline='middle';a.fillText(str,128,49);const tex=new T.CanvasTexture(c),s=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.position.set(x,y,z);s.scale.set(size,size*96/256,1);scene.add(s);return s}
const palette=[0x89aaa5,0xc49fa9,0x8e9fbd,0xb9ab7b];
const fabric=palette.map(color=>new T.MeshStandardMaterial({color,roughness:.95}));
const ink=new T.MeshStandardMaterial({color:0x272b29,roughness:.85});
function group(x=0,y=0,z=0,parent=scene){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g}
function sign(text,sub,x,y,z,w=3.2,flat=false,color='#e6c198'){
 const c=document.createElement('canvas');c.width=768;c.height=230;const a=c.getContext('2d');
 a.fillStyle='#28221d';a.fillRect(0,0,768,230);a.fillStyle='#db883e';a.fillRect(35,34,7,150);
 a.textAlign='left';a.textBaseline='middle';a.fillStyle=color;a.font='500 64px "PingFang SC",sans-serif';a.fillText(text,70,100);a.fillStyle='#ac9680';a.font='400 27px -apple-system,sans-serif';a.fillText(sub,73,174);
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
 const m=mesh(new T.PlaneGeometry(w,w*230/768),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),x,y,z);
 if(flat)m.rotation.x=-Math.PI/2;return m;
}
function plant(x,z,h=1,parent=scene,y=0){cyl(x,y+.22,z,.21,.43,'pot',parent);box(x,y+.6,z,.04,.7,.04,'wood',parent);for(let i=0;i<7;i++){const a=i*2.4;const l=ball(x+Math.cos(a)*.18,y+.5+h*.42+i*.035,z+Math.sin(a)*.18,.2,'leaf',parent);l.scale.set(.7,1.5,.65);l.rotation.z=Math.cos(a)*.7}}
function cup(x,y,z,parent=scene){const g=group(x,y,z,parent);cyl(0,.08,0,.075,.16,'paper',g);cyl(0,.164,0,.058,.005,'black',g);const handle=mesh(new T.TorusGeometry(.06,.018,6,12),'paper',.09,.08,0,g);return g}
function chair(x,z,a=0,mat='chair'){const g=group(x,0,z);g.rotation.y=a;cyl(0,.27,0,.055,.4,'metal',g);for(let i=0;i<5;i++){const leg=box(0,.12,0,.61,.045,.06,'black',g);leg.rotation.y=i*Math.PI/5}rounded(0,.5,0,.62,.12,.58,.1,mat,g);rounded(0,.86,.27,.61,.66,.12,.06,mat,g);return g}
function shelf(x,z,w=2.7){box(x,1.1,z,w,2.1,.47,'edge');for(const y of [.28,.85,1.4,2]){box(x,y,z,w,.055,.54,'wood');for(let n=0;n<7;n++){const height=.23+(n%3)*.07;box(x-w/2+.25+n*.3,y+height/2+.03,z+.05,.1,height,.24,n%3?'paper':'rug')}}}
function sofa(x,z,w=2.6,rot=0){const g=group(x,0,z);g.rotation.y=rot;rounded(0,.36,0,w,.46,.9,.14,'chair',g);rounded(0,.78,-.35,w,.6,.21,.1,'chair',g);for(const xx of [-w/2+.12,w/2-.12])rounded(xx,.65,0,.22,.48,.9,.09,'chair',g);for(const xx of [-.6,.6]){rounded(xx,.63,.04,.95,.12,.65,.07,'chair',g);const cushion=rounded(xx,.86,-.1,.48,.42,.12,.07,'rug',g);cushion.rotation.x=-.18}return g}
// Square 20 × 20 floor. Furniture leaves continuous central and cross aisles.
rounded(0,-.33,0,20.5,.6,20.5,.32,'base');box(0,-.035,10.12,19.8,.035,.04,'light');
for(let r=0;r<30;r++)for(let c=0;c<10;c++)box(-8.95+c*1.99,.005,-9.65+r*.665,1.965,.03,.643,(r+c)%4?'floor':'floor2');
box(0,1.28,-10,20,2.55,.16,'wall');box(-10,.6,0,.15,1.2,20,'wall');box(10,.6,0,.15,1.2,20,'wall');box(0,2.57,-9.87,19.7,.04,.045,'light');
for(let x=-9.7;x<10;x+=.33)box(x,1.4,-9.88,.045,2.12,.035,'wood');
// Three rear spaces: strategy studio, meeting suite, and water / coffee lounge.
for(const x of [-3.25,3.25]){box(x,1.15,-7.7,.12,2.3,4.5,'wall');box(x,2.31,-7.7,.15,.035,4.5,'metal')}
for(const [x,w] of [[-7.3,4.8],[-.8,4.55],[8.7,2.35]]){box(x,.92,-5.45,w,1.8,.04,'glass');box(x,1.84,-5.45,w,.035,.07,'metal');box(x,.05,-5.45,w,.04,.07,'metal');for(const v of [-1,1])box(x+v*w/2,.94,-5.45,.035,1.85,.05,'metal')}
sign('总指挥室','COMMAND CENTER',-6.6,2.05,-9.76,3.1);sign('共创会议室','IDEAS BECOME REAL',0,2.05,-9.76,3.4);sign('补给站','TAKE A LITTLE BREAK',6.5,2.05,-9.76,3.2);
shelf(-8.8,-8.3,1.3);rounded(-6.2,.92,-7.7,2.7,.15,1.3,.15,'wood');box(-6.2,1.3,-8,.95,.57,.08,'black');box(-6.2,1.3,-7.95,.86,.48,.01,'screen');chair(-6.2,-6.6);plant(-4.05,-8.9,1.2);box(-4.05,1.1,-7.2,.75,.06,.5,'paper');
rounded(0,.9,-7.55,3.5,.16,1.65,.3,'wood');cyl(-.95,.45,-7.55,.12,.85,'metal');cyl(.95,.45,-7.55,.12,.85,'metal');for(const x of [-1.15,0,1.15]){box(x,.995,-7.6,.4,.025,.3,'paper');cup(x,.99,-7.15)}
// Low pendant fixtures keep the miniature open.
for(const x of [-1.15,1.15]){cyl(x,2.8,-7.6,.36,.08,'black');cyl(x,2.75,-7.6,.3,.015,'light')}
box(6.7,.5,-8.9,4.7,1,.82,'wood');box(6.7,1.03,-8.9,4.85,.1,.93,'paper');for(const x of [4.9,6,7.1,8.2]){box(x,.53,-8.465,.98,.85,.015,'edge');box(x+.3,.75,-8.44,.12,.04,.025,'metal')}
box(5,1.36,-8.8,.6,.58,.46,'black');box(5,1.35,-8.55,.42,.3,.015,'metal');cup(5,1.09,-8.45);cup(6.1,1.1,-8.65);cup(6.4,1.1,-8.65);
// Water dispenser: translucent bottle, two taps and a cup shelf.
box(8.7,.73,-7.15,.7,1.4,.65,'paper');box(8.7,1,-6.81,.47,.48,.025,'black');for(const x of [8.55,8.85])box(x,1.1,-6.75,.06,.08,.09,'metal');cyl(8.7,1.72,-7.15,.27,.55,new T.MeshPhysicalMaterial({color:0x90c9d3,transparent:true,opacity:.6,roughness:.1}));box(8.7,.76,-6.72,.53,.035,.23,'metal');
sofa(5.05,-6.8,2.1);cyl(6.8,.46,-6.5,.48,.08,'wood');cyl(6.8,.22,-6.5,.07,.45,'metal');cup(6.8,.5,-6.5);plant(9.25,-9.2,1.2);
// Four capability neighborhoods, each with four genuine desks.
const zones=[{name:'研究与策略',en:'RESEARCH',x:-6.1,z:-1.95,color:0},{name:'视觉与内容',en:'CREATIVE',x:6.1,z:-1.95,color:1},{name:'工程与质量',en:'ENGINEERING',x:-6.1,z:4.05,color:2},{name:'运营与交付',en:'OPERATIONS',x:6.1,z:4.05,color:3}];
const screens=[];const stations=[];
const zoneLabels=zones.map(q=>{const el=document.createElement("span");el.className="px-zone";el.textContent=q.name;stage.append(el);return el});
function screen(x,y,z,w,h,parent,kind){box(x,y,z,w+.08,h+.08,.075,'black',parent);box(x,y,z+.045,w,h,.012,'screen',parent);for(let j=0;j<4;j++){const bar=box(x-w*.35+(j%2)*.08,y+h*.32-j*h*.18,z+.055,w*(.35+j%3*.15),.018,.005,j===0?'light':'paper',parent);screens.push(bar)}box(x,y-h/2-.12,z,.06,.2,.06,'metal',parent);box(x,y-h/2-.22,z,.34,.03,.2,'black',parent)}
function desk(x,z,zone,n){const g=group(x,0,z);rounded(0,.96,0,2.45,.14,1.2,.1,'wood',g);for(const xx of [-1.03,1.03])box(xx,.47,0,.07,.9,.9,'metal',g);box(-.9,.61,.05,.42,.57,.7,'edge',g);for(const y of [.43,.63,.83])box(-.9,y,.405,.18,.025,.02,'metal',g);
 if(zone===2){screen(-.4,1.43,-.3,.71,.48,g);screen(.43,1.43,-.3,.71,.48,g)}else screen(.05,1.46,-.3,1.04,.62,g);
 if(zone===1){const tablet=rounded(.08,1.07,.28,.72,.035,.4,.04,'black',g);tablet.rotation.x=.13;box(.08,1.095,.26,.62,.012,.3,'paper',g);box(.56,1.05,.22,.035,.025,.36,'orange',g);for(let k=0;k<4;k++)box(-.67+k*.14,1.05,-.12,.1,.04,.15,fabric[k],g)}
 else{rounded(.05,1.06,.28,.7,.035,.24,.03,'black',g);for(let row=0;row<3;row++)for(let col=0;col<8;col++)box(-.23+col*.077,1.081,.2+row*.067,.047,.009,.033,'metal',g);box(.6,1.06,.27,.12,.04,.18,'black',g)}
 if(zone===0){for(let k=0;k<3;k++)box(-.77,1.07+k*.045,-.25,.38,.045,.44,k%2?'rug':'paper',g)}
 if(zone===3){box(-.73,1.2,-.3,.31,.35,.05,'black',g);box(-.73,1.2,-.266,.25,.27,.012,'screen',g)}
 cup(.94,1.04,-.12,g);chair(x,z+1.02,0,fabric[zone]);stations.push({x,z,zone,n});
}
zones.forEach((q,i)=>{rounded(q.x,.055,q.z+.35,5.55,.035,5.25,.2,new T.MeshStandardMaterial({color:palette[i],roughness:1}));rounded(q.x,.078,q.z+.35,5.4,.016,5.1,.15,new T.MeshStandardMaterial({color:0x383731,roughness:1}));for(const [j,z] of [q.z-1.15,q.z+1.55].entries())for(const [k,x] of [q.x-1.5,q.x+1.5].entries())desk(x,z,i,j*2+k);sign(q.name,\`0\${i+1}  /  \${q.en}\`,q.x,.13,q.z-2.1,3.7,true);});
// Central island, pinboard, planting, architectural floor inlays.
rounded(0,.06,1.4,4.6,.04,7.6,.5,'rug');rounded(0,.086,1.4,4.25,.015,7.25,.4,new T.MeshStandardMaterial({color:0xb06137,roughness:1}));
cyl(0,.49,.6,.48,.9,'edge');cyl(0,1,.6,1.45,.15,'wood');box(-.4,1.1,.5,.58,.025,.38,'paper');cup(.7,1.08,.85);plant(.2,.05,.25,scene,1.08);
box(0,1.5,-3.7,2.7,1.35,.09,'edge');for(const x of [-1,1])box(x,.75,-3.7,.06,1.5,.06,'metal');for(let i=0;i<9;i++)box(-.9+(i%3)*.72,1.83-Math.floor(i/3)*.34,-3.64,.47,.2,.018,i%3?'paper':'orange');sign('共创中枢','CONNECT · MAKE · DELIVER',0,.14,3.8,3.4,true);
// Front living room and welcome desk, separated from work aisles.
sofa(5.5,8.65,3.4);for(const x of [5.5]){rounded(x,.4,7.95,1.75,.14,.75,.15,'wood');box(x,.48,7.95,.45,.04,.33,'paper');cup(x+.5,.48,7.95)}
rounded(0,.68,8.6,2.9,1.25,1,.23,'wood');rounded(0,1.35,8.6,3,.11,1.1,.2,'paper');sign('PHOENIX','AI OFFICE',0,.8,9.13,2.5);plant(1,8.6,.25,scene,1.4);box(-.65,1.58,8.5,.65,.4,.055,'black');
for(const [x,z,h] of [[-9.3,-4.6,1],[-9.3,1.2,1.1],[9.3,1.2,1],[-9.3,8.9,1.3],[9.3,8.9,1.3],[-2.8,-5.8,.8],[2.8,-5.8,.8]])plant(x,z,h);
for(const x of [-2.85,2.85]){box(x,.04,1.1,.025,.012,11.6,'metal');for(const z of [-4.5,1.1,7])box(x,.07,z,.1,.015,.38,'light')}
// Human resources is a physical recruitment counter; the two clerks are display characters.
rounded(-6.6,.05,8.65,6.15,.04,2.7,.17,new T.MeshStandardMaterial({color:0x504333,roughness:1}));
box(-6.7,.68,7.38,5.8,1.3,.045,'glass');box(-6.7,1.36,7.38,5.8,.035,.065,'metal');
rounded(-6.7,.69,8.4,4.8,1.3,.75,.12,'wood');rounded(-6.7,1.4,8.4,4.9,.12,.88,.12,'paper');
for(const x of [-7.75,-5.65]){box(x,1.65,8.42,.65,.4,.06,'black');box(x,1.65,8.46,.57,.32,.012,'screen');box(x,1.46,8.15,.52,.025,.2,'black');cup(x+.7,1.46,8.25)}
box(-9.35,.85,8.7,.55,1.65,.85,'edge');for(const y of [.3,.7,1.1,1.5]){box(-9.35,y,9.14,.45,.3,.025,'wood');box(-9.35,y,9.16,.13,.03,.02,'metal')}
sign('人事部','RECRUITMENT',-6.7,.91,8.81,2.5);

// Batch immobile furniture by material; moving screen marks and glass remain separate.
scene.updateMatrixWorld(true);
const batches=new Map(),staticMeshes=[];scene.traverse(o=>{if(o.isMesh&&!screens.includes(o)&&!o.material.transparent&&!o.material.map){const key=o.material.uuid;if(!batches.has(key))batches.set(key,{material:o.material,items:[]});batches.get(key).items.push(o);staticMeshes.push(o)}});
for(const {material,items} of batches.values()){
 const gs=items.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g});const merged=new T.BufferGeometry();
 for(const name of ['position','normal','uv']){const size=name==='uv'?2:3;const count=gs.reduce((sum,g)=>sum+g.attributes[name].array.length,0);const values=new Float32Array(count);let offset=0;for(const g of gs){values.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length}merged.setAttribute(name,new T.BufferAttribute(values,size))}
 const m=new T.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;scene.add(m);gs.forEach(g=>g.dispose());
}
staticMeshes.forEach(o=>{o.removeFromParent();o.geometry.dispose()});

function makeEmployee(p,i){const s=stations[p.station];p.home=p.main?[-6.2,-6.6]:[s.x,s.z+.9];const g=group(...[p.home[0],0,p.home[1]]);p.g=g;const skin=new T.MeshStandardMaterial({color:0xf18a32,roughness:.65});const uniform=fabric[p.zone];
 rounded(0,.78,0,.5,.48,.34,.12,uniform,g);const head=group(0,1.21,0,g);p.head=head;const face=ball(0,0,0,.29,skin,head);face.scale.set(1,1.05,.9);rounded(0,.01,.23,.4,.22,.04,.075,'black',head);for(const x of [-.105,.105])box(x,.03,.256,.055,.033,.014,'light',head);const tuft=mesh(new T.ConeGeometry(.095,.2,5),skin,.045,.34,0,head);tuft.rotation.z=-.25;
 p.arms=[-.32,.32].map(x=>{const a=group(x,.98,0,g);rounded(0,-.18,0,.13,.36,.14,.05,uniform,a);ball(0,-.38,.015,.075,skin,a);return a});
 p.legs=[-.14,.14].map(x=>{const leg=group(x,.56,0,g);box(0,-.2,0,.15,.38,.18,'black',leg);rounded(0,-.38,.06,.17,.1,.28,.04,'black',leg);return leg});
 const halo=mesh(new T.RingGeometry(.42,.47,40),haloMat,0,.055,0,g);halo.rotation.x=-Math.PI/2;p.halo=halo;
 p.mug=cup(0,-.38,.05,p.arms[1]);p.mug.visible=false;
 p.readProp=group(0,0,0,g);box(0,.94,.42,.52,.055,.32,'paper',p.readProp);box(0,.98,.42,.018,.01,.32,'rug',p.readProp);p.page=box(.13,.985,.42,.23,.01,.3,'paper',p.readProp);
 p.boardProp=group(0,0,0,g);const board=box(-.17,1.02,.35,.34,.46,.035,'paper',p.boardProp);board.rotation.x=-.45;for(let n=0;n<4;n++)box(-.17,1.13-n*.06,.41,.2,.012,.01,'wood',p.boardProp);
 p.pen=box(0,-.4,.08,.025,.025,.3,'orange',p.arms[1]);
 p.headset=group(0,0,0,head);const headset=mesh(new T.TorusGeometry(.31,.035,8,24,Math.PI),'black',0,0,0,p.headset);headset.rotation.z=0;ball(-.31,0,0,.08,'black',p.headset);box(-.27,-.12,.17,.025,.025,.27,'black',p.headset);
 syncWorkProps(p);
 p.tag=document.createElement('button');p.tag.className='employee';p.tag.onclick=()=>send('select',p.id);stage.append(p.tag);updateTag(p);
}
function syncWorkProps(p){const type=p.visualType||p.type,active=p.status==='working';p.readProp.visible=active&&type==='read';p.boardProp.visible=active&&['check','plan','browser','video'].includes(type);p.pen.visible=active&&type==='draw';p.headset.visible=active&&type==='call'}
function animateWork(p,t){p.head.rotation.set(Math.sin(t*1.8)*.035,Math.sin(t*.75)*.12,0);p.arms.forEach(a=>a.rotation.set(-.75,0,0));p.legs.forEach(a=>a.rotation.set(-.85,0,0));
 switch(p.visualType||p.type){case 'read':p.arms[0].rotation.x=-1;p.arms[1].rotation.x=-1.1;p.head.rotation.x=.22;if(p.page)p.page.rotation.z=Math.max(0,Math.sin(t*.85))*1.3;break;case 'think':p.arms[1].rotation.x=-2.15;p.arms[1].rotation.z=-.25;p.head.rotation.z=Math.sin(t*.6)*.13;break;case 'video':case 'browser':case 'draw':p.arms[1].rotation.x=-.98+Math.sin(t*3)*.12;p.arms[1].rotation.z=Math.sin(t*2.1)*.22;p.head.rotation.x=.14;break;case 'data':case 'type':case 'code':p.arms.forEach((a,j)=>a.rotation.x=-.95+Math.sin(t*9+j*2)*.13);if(p.type==='code')p.head.rotation.y=Math.sin(t*.6)*.32;break;case 'check':p.arms[0].rotation.x=-1;p.arms[1].rotation.x=-1.22+Math.sin(t*3.6)*.16;p.head.rotation.x=.17;break;case 'call':p.arms[0].rotation.x=-2.1;p.arms[0].rotation.z=.3;p.arms[1].rotation.x=-.7+Math.sin(t*2)*.25;p.head.rotation.z=Math.sin(t*2)*.07;break;case 'plan':p.arms[0].rotation.x=-1.1;p.arms[1].rotation.x=-1.4+Math.sin(t*2)*.24;p.arms[1].rotation.z=-.2;break;}
}
const clerks=[];for(const x of [-7.75,-5.65]){const g=group(x,.55,7.83);rounded(0,.77,0,.48,.5,.34,.1,'chair',g);ball(0,1.22,0,.28,'orange',g);rounded(0,1.23,.23,.39,.22,.04,.07,'black',g);for(const xx of [-.1,.1])box(xx,1.25,.26,.05,.03,.015,'light',g);const arms=[-.3,.3].map(xx=>box(xx,.82,.14,.13,.32,.15,'chair',g));clerks.push({g,arms});chair(x,7.8,Math.PI)}
function pathLength(route){return route.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0)}
function along(route,f){let d=Math.max(0,Math.min(1,f))*pathLength(route);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l||i===route.length-1){const r=l?Math.min(1,d/l):1;return {x:a[0]+(b[0]-a[0])*r,z:a[1]+(b[1]-a[1])*r,angle:Math.atan2(b[0]-a[0],b[1]-a[1])}}d-=l}}
function slotFor(mode,index,count){if(mode==='discussion'){const slots=count<=6?[[-1.15,-6.25],[1.15,-6.25],[-1.15,-8.85],[1.15,-8.85],[-2.55,-7.55],[2.55,-7.55]]:[...Array.from({length:7},(_,j)=>[-2.1+j*.7,-6.25]),...Array.from({length:7},(_,j)=>[-2.1+j*.7,-8.85]),[-2.55,-7.55],[2.55,-7.55]];return slots[index]}const a=index/count*Math.PI*2+.4;return [Math.sin(a)*2.05,.6+Math.cos(a)*2.05]}
function seatFacing(mode,q){if(mode==='discussion'){if(q[1]>-7)return Math.PI;if(q[1]<-8)return 0;return q[0]<0?Math.PI/2:-Math.PI/2}return Math.atan2(-q[0],.6-q[1])}
function exitRoute(p,at){if(at[1]<-5.45){if(at[0]<-3.25)return [at,[-4.2,at[1]],[-4.2,-5.05]];if(at[0]<3.25){if(at[1]<-7.7)return [at,[at[0],-9.35],[2.65,-9.35],[2.65,-5.05]];return [at,[at[0],-5.8],[2.45,-5.8],[2.45,-5.05]]}}if(at[1]>7.5&&at[0]<-3.3)return [at,[-2.85,at[1]],[-2.85,7.1]];if(Math.abs(at[0])<3)return [at,[at[0]<0?-2.85:2.85,at[1]]];return [at,[at[0],p.home[1]+.7],[at[0]<0?-2.85:2.85,p.home[1]+.7]]}
function routeTo(p,at,dest,mode){if(Math.hypot(at[0]-dest[0],at[1]-dest[1])<.05)return [at,dest];const r=exitRoute(p,at),last=r.at(-1);if(mode==='discussion'){r.push([last[0],-5.05],[2.65,-5.05]);if(dest[1]<-7.7)r.push([2.65,-9.35],[dest[0],-9.35]);else if(dest[0]<-2)r.push([2.65,-9.35],[-2.65,-9.35]);else r.push([2.65,-5.8],[dest[0],-5.8]);r.push(dest)}else if(mode==='command'){r.push([last[0],-5.05],[-4.2,-5.05],[-4.2,-6.6],dest)}else{const side=dest[0]<0?-2.85:2.85;const cross=last[1]>6?7.1:-4.8;r.push([last[0],cross],[side,cross],[side,dest[1]+(mode==='desk'?.7:0)]);if(mode==='desk')r.push([dest[0],dest[1]+.7]);r.push(dest)}return r}
const employees=[];
let snapshot=null, selected='', focused=false, playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed=0,last=0,width=1,height=1,focusMix=0,roomMode='discussion';
const resetCamera=document.createElement('button');resetCamera.className='camera-reset';resetCamera.textContent='重置视角';stage.append(resetCamera);
const cameraHelp=document.createElement('span');cameraHelp.className='camera-help';cameraHelp.textContent='拖动旋转 · 滚轮缩放';stage.append(cameraHelp);
const orbit=installOfficeCameraControls(canvas,resetCamera,pickEmployee);
resetCamera.addEventListener('click',()=>{focused=false;send('overview')});
const haloMat=new T.MeshBasicMaterial({color:0xffb363,side:T.DoubleSide,transparent:true,opacity:.9});
function send(action,id){parent.postMessage({channel:'phoenix-office',action,id},'*')}
function updateTag(p){p.tag.replaceChildren();const name=document.createElement('span'),detail=document.createElement('small');name.textContent=p.name;detail.textContent=p.role+' · '+p.activity;p.tag.append(name,detail);p.tag.title=p.name+' · '+p.role+' · '+p.activity;p.tag.setAttribute('aria-label',p.tag.title)}
function disposePerson(p){p.g.removeFromParent();p.g.traverse(o=>{o.geometry?.dispose();if(o.material&&!Object.values(mats).includes(o.material)&&!fabric.includes(o.material)&&o.material!==haloMat)o.material.dispose()});p.tag.remove()}
function startTrip(p,dest,mode){const route=routeTo(p,[p.g.position.x,p.g.position.z],dest,mode);p.trip={route,start:elapsed,duration:Math.max(.1,pathLength(route)/2.8)};p.destination=dest.join(',')}
function receive(event){
 if(event.source!==parent||event.data?.channel!=='phoenix-office-state')return;
 const next=event.data;
 if(!Array.isArray(next.people)||next.people.length>17||!next.people.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&typeof p.role==='string'&&typeof p.activity==='string'&&typeof p.visualType==='string'&&Number.isInteger(p.station)&&p.station>=0&&p.station<16&&Number.isInteger(p.zone)&&p.zone>=0&&p.zone<4&&['idle','working','waiting','blocked','unknown'].includes(p.status)))return;
 if(focused&&!next.focused)orbit.reset();
 selected=typeof next.selected==='string'?next.selected:'';focused=next.focused===true;playing=next.playing===true;roomMode=next.hall?'report':'discussion';
 for(const p of [...employees])if(!next.people.some(q=>q.id===p.id)){disposePerson(p);employees.splice(employees.indexOf(p),1)}
 for(const q of next.people){let p=employees.find(p=>p.id===q.id);
  if(p&&(p.station!==q.station||p.main!==q.main||p.type!==q.type)){disposePerson(p);employees.splice(employees.indexOf(p),1);p=null}
  if(!p){p={...q};makeEmployee(p,employees.length);employees.push(p);p.nextBreak=elapsed+12+employees.length*11;if(snapshot&&!next.floorChanged){p.g.position.set(-4.3,0,9.1);startTrip(p,p.home,p.main?'command':'desk')}}
  const changed=p.name!==q.name||p.role!==q.role||p.activity!==q.activity;Object.assign(p,q);syncWorkProps(p);if(changed)updateTag(p);
  if(p.status!=='idle'&&p.break){p.break=null;startTrip(p,p.home,p.main?'command':'desk')}
 }
 const meeting=employees.filter(p=>p.meeting);meeting.forEach((p,i)=>p.seat=slotFor(roomMode,i,meeting.length));
 employees.forEach(p=>{const dest=p.meeting?p.seat:p.home;if(!p.break&&p.destination!==dest.join(','))startTrip(p,dest,p.meeting?roomMode:p.main?'command':'desk')});
 for(const [mode,pool] of [['discussion',meetingChairs],['report',hallChairs]]){const count=mode===roomMode&&meeting.length?meeting.length:mode==='discussion'?6:4;pool.forEach((c,i)=>{c.visible=i<count;if(!c.visible)return;const q=slotFor(mode,i,count);c.position.set(q[0],0,q[1]);c.rotation.y=seatFacing(mode,q)+Math.PI})}
 snapshot=next;document.querySelector('.loading').hidden=true;
}
const meetingChairs=Array.from({length:16},()=>chair(0,0)),hallChairs=Array.from({length:16},()=>chair(0,0));
const roomData=[{name:'总指挥室',pos:[-6.6,3.2,-8]},{name:'会议室',pos:[0,3.2,-8]},{name:'茶水间',pos:[6.6,3.2,-8]},{name:'大厅',pos:[0,1.6,4]},{name:'人事部 · 创建员工',pos:[-6.6,2.6,8.6],action:'create'}];
const roomLabels=roomData.map(q=>{const b=document.createElement(q.action?'button':'span');b.className='room';b.textContent=q.name;if(q.action)b.onclick=()=>send(q.action);stage.append(b);return b});
function resize(){width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);renderer.setSize(width,height,false)}
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();
const selectedPosition=new T.Vector3();
function positionLabel(el,point){const v=point.project(camera);el.style.left=((v.x+1)*width/2)+'px';el.style.top=((-v.y+1)*height/2)+'px';el.hidden=v.x<-.95||v.x>.95||v.y<-.92||v.y>.92}
function cameraFit(){const aspect=width/height,p=employees.find(p=>p.id===selected);focusMix+=(Number(focused&&!!p)-focusMix)*.1;if(p)selectedPosition.lerp(p.g.position,.12);const target=new T.Vector3(selectedPosition.x*focusMix,.25+focusMix*.55,selectedPosition.z*focusMix);const radius=40*(1-focusMix*.72);camera.position.set(target.x+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*radius,target.y+Math.sin(orbit.pitch)*radius,target.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*radius);camera.lookAt(target);camera.updateMatrixWorld();let xx=0,yy=0;for(const x of [-10.5,10.5])for(const z of [-10.5,10.5])for(const y of [-.6,3.3]){const v=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);xx=Math.max(xx,Math.abs(v.x));yy=Math.max(yy,Math.abs(v.y))}const half=(Math.max(yy,xx/aspect)*1.02*(1-focusMix)+Math.max(3.5,3.9/aspect)*focusMix)/orbit.zoom;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();zoneLabels.forEach((el,i)=>{positionLabel(el,new T.Vector3(zones[i].x,1.85,zones[i].z-1.9));el.hidden||=width<650||focusMix>.15});roomLabels.forEach((el,i)=>{positionLabel(el,new T.Vector3(...roomData[i].pos));el.hidden||=focusMix>.5});const placed=[];employees.forEach(p=>{positionLabel(p.tag,new T.Vector3(p.g.position.x,2.12,p.g.position.z));p.tag.hidden||=focused&&p.id!==selected;p.tag.dataset.selected=String(p.id===selected);p.tag.dataset.status=p.status;p.tag.dataset.motion=p.break?.phase==='drink'?'drinking':p.trip?'walking':p.status;if(p.tag.hidden)return;const x=parseFloat(p.tag.style.left),baseY=parseFloat(p.tag.style.top);let y=baseY;for(let step=0;step<10;step++){const candidate=baseY-step*76;if(candidate<55)break;if(!placed.some(q=>Math.abs(q.x-x)<175&&Math.abs(q.y-candidate)<75)){y=candidate;break}}p.tag.style.top=y+'px';placed.push({x,y})})}
function beginBreak(p){const r=exitRoute(p,[p.g.position.x,p.g.position.z]),last=r.at(-1);r.push([last[0],-4.7],[7.5,-4.7],[7.5,-6.25],[8.55,-6.25]);p.break={phase:'out',returnRoute:r.map(point=>[...point]).reverse()};p.trip={route:r,start:elapsed,duration:pathLength(r)/2.1}}
function frame(now){const dt=last?Math.min((now-last)/1000,.08):0;last=now;if(playing&&!document.hidden)elapsed+=dt;
 clerks.forEach((p,i)=>p.arms.forEach((a,j)=>a.rotation.x=-.55+Math.sin(elapsed*4+i+j)*.07));
 employees.forEach((p,i)=>{
  if(p.status==='idle'&&!p.meeting&&!p.trip&&!p.break&&elapsed>p.nextBreak&&!employees.some(q=>q.break))beginBreak(p);
  let walking=false;
  if(p.trip){const f=(elapsed-p.trip.start)/p.trip.duration,q=along(p.trip.route,f);p.g.position.set(q.x,0,q.z);p.g.rotation.y=q.angle;walking=f<1;if(!walking){p.trip=null;if(p.break?.phase==='out'){p.break.phase='drink';p.break.until=elapsed+4.5}else if(p.break?.phase==='back'){p.break=null;p.nextBreak=elapsed+70+i*9}}}
  if(p.break?.phase==='drink'&&elapsed>=p.break.until){p.break.phase='back';const r=p.break.returnRoute;p.trip={route:r,start:elapsed,duration:pathLength(r)/2.1}}
  p.mug.visible=p.break?.phase==='drink';const taskVisible=p.status==='working'&&!walking&&!p.break;const taskType=p.visualType||p.type;p.readProp.visible=taskVisible&&!p.meeting&&taskType==='read';p.boardProp.visible=taskVisible&&!p.meeting&&['check','plan','browser','video'].includes(taskType);p.pen.visible=taskVisible&&!p.meeting&&taskType==='draw';p.headset.visible=taskVisible&&(taskType==='call'||p.speaking);p.halo.visible=p.id===selected;p.g.position.y=0;p.head.rotation.set(0,0,0);p.arms.forEach(a=>a.rotation.set(-.2,0,0));p.legs.forEach(a=>a.rotation.set(-.65,0,0));
  if(walking){p.g.position.y=Math.abs(Math.sin(elapsed*9))*.045;p.arms.forEach((a,j)=>a.rotation.x=Math.sin(elapsed*9+j*Math.PI)*.45);p.legs.forEach((a,j)=>a.rotation.x=Math.sin(elapsed*9+j*Math.PI)*.55)}
  else if(p.mug.visible){p.g.rotation.y=Math.PI;p.legs.forEach(a=>a.rotation.x=0);const lift=.75+.15*Math.sin(elapsed*1.4);p.arms[1].rotation.x=-2.5*lift;p.mug.rotation.x=2.5*lift;p.head.rotation.x=-.13}
  else{p.g.rotation.y=p.meeting?seatFacing(roomMode,p.seat):Math.PI;if(p.status==='working'&&!p.meeting)animateWork(p,elapsed+i*3);else if(p.speaking&&p.status==='working'){p.arms[1].rotation.x=-1.1+Math.sin(elapsed*2.7)*.22;p.arms[1].rotation.z=-.35}else if(p.status==='blocked')p.arms[1].rotation.x=-1.7;else if(p.status==='idle')p.head.rotation.y=Math.sin(elapsed*.65+i)*.12}
 });cameraFit();renderer.render(scene,camera);requestAnimationFrame(frame)
}
const ray=new T.Raycaster();
function pickEmployee(e){
 const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 ray.setFromCamera(new T.Vector2(x/r.width*2-1,-y/r.height*2+1),camera);
 const hit=ray.intersectObjects(employees.map(p=>p.g),true)[0];
 if(hit){let n=hit.object;while(n&&!employees.some(p=>p.g===n))n=n.parent;const p=employees.find(p=>p.g===n);if(p){send('select',p.id);return}}
 // Small characters remain selectable around their projected torso, at any zoom.
 let nearest=null,distance=24;
 for(const p of employees){const v=new T.Vector3(p.g.position.x,1,p.g.position.z).project(camera);if(v.z<-1||v.z>1)continue;const d=Math.hypot((v.x+1)*r.width/2-x,(1-v.y)*r.height/2-y);if(d<distance){nearest=p;distance=d}}
 if(nearest)send('select',nearest.id);
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('.loading').textContent='3D 画面已中断，可继续使用上方员工选择器';document.querySelector('.loading').hidden=false});
window.addEventListener('message',receive);send('ready');requestAnimationFrame(frame);

})();`
