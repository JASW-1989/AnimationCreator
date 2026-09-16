/* Original production-design fixtures. Not extracted from any reference anime.
 * Each fixture is explicit drawing artwork, NOT a general character/rig generator.
 * Internal vector drawings remain inspectable; imported production art uses raster assets.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KomaCinemaArt=factory();})(globalThis,function(){
'use strict';
const ink='#111b24',p=(d,fill,stroke=ink,w=1.6)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line=(d,c='#81948f',w=1)=>p(d,'none',c,w);
function defs(){return `<linearGradient id="cg-sky" x2=".3" y2="1"><stop stop-color="#142d3b"/><stop offset=".58" stop-color="#617779"/><stop offset="1" stop-color="#d2b99c"/></linearGradient><linearGradient id="cg-haze" x2="0" y2="1"><stop stop-color="#d5d7bf" stop-opacity="0"/><stop offset="1" stop-color="#edcfab" stop-opacity=".48"/></linearGradient><radialGradient id="cg-sun"><stop stop-color="#ffefcd" stop-opacity=".72"/><stop offset="1" stop-color="#f7cfa5" stop-opacity="0"/></radialGradient><radialGradient id="cg-vignette"><stop offset=".5" stop-color="#020d15" stop-opacity="0"/><stop offset="1" stop-color="#020d15" stop-opacity=".65"/></radialGradient><linearGradient id="cg-dark" x2="1" y2="1"><stop stop-color="#08121d"/><stop offset=".65" stop-color="#173644"/><stop offset="1" stop-color="#253a44"/></linearGradient><linearGradient id="cg-steel"><stop stop-color="#c1e8e1"/><stop offset=".32" stop-color="#407778"/><stop offset=".51" stop-color="#e9f7e9"/><stop offset=".53" stop-color="#244c57"/><stop offset="1" stop-color="#192b34"/></linearGradient><filter id="cg-glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="cg-soft"><feGaussianBlur stdDeviation="7"/></filter>`;}
function sky(){return `<rect x="-480" y="-270" width="1920" height="1080" fill="url(#cg-sky)"/><circle cx="315" cy="172" r="230" fill="url(#cg-sun)"/><circle cx="315" cy="172" r="65" fill="#e8cfad" opacity=".8"/><circle cx="337" cy="152" r="63" fill="#354d59"/>${p('M-150 262 Q-10 174 128 232 T453 251 T733 181 T1160 238 L1160 551 L-150 551Z','#526971','none')}${p('M-80 298 Q95 248 238 279 T581 268 T984 295 L1100 580 H-80Z','#40535e','none')}<path d="M-20 108 Q133 97 215 118 T414 127 M615 96 Q759 62 993 105 M-90 226 Q98 188 227 219 M486 234 Q685 188 955 222" stroke="#d7d1b1" opacity=".23" stroke-width="12" fill="none"/>`;}
function skyline(){let s='';for(let i=0;i<23;i++){let x=-110+i*57,h=28+(i*71%93),y=365-h;s+=`<g opacity="${.52+(i%3)*.12}"><path d="M${x} 430 V${y} l24 -10 20 13 V430Z" fill="#304552"/><path d="M${x+4} ${y+18}h30 m-30 18h30 m-30 18h30" stroke="#647777" stroke-width="2"/></g>`;}return s+line('M-100 394 L355 350 609 370 1080 340','#203944',8);}
function arches(){let s='';for(let i=0;i<5;i++){const x=-170+i*285;s+=`<g transform="translate(${x} 0)">${p('M0 484 V147 L12 129 H30 L37 148 V482Z','#233c44')}${p('M39 440 V201 Q130 41 219 201 V440 H245 V140 L228 116 Q128 -14 26 117 L9 145 V440Z','#30484b')}${line('M40 201 Q128 38 218 201 M62 160 L48 143 M92 128 L83 105 M124 115 L124 92 M158 127 L166 104 M191 155 L206 139','#657c75',3)}${p('M10 345 H39 L45 360 H3Z','#57685d')}${p('M205 311 H248 V325 H208Z','#647267')}${line('M12 170 V278 M22 203 V316 M219 184 V290','#7f8b76',1.5)}</g>`;}return s;}
function ground(){let s=p('M-240 447 L344 359 609 365 1180 459 V770 H-240Z','#26333a','none')+p('M343 365 L567 365 1045 615 -88 615Z','#4b5654','none');for(let i=0;i<13;i++){let y=386+Math.pow(i/12,1.75)*245;let w=(y-350)*2.7;s+=line(`M${461-w} ${y} L${461+w} ${y+10}`,'#1f3036',1.5);}for(let i=-5;i<=5;i++)s+=line(`M${452+i*9} 365 L${465+i*140} 640`,'#26373b',1.2);s+=p('M190 522 L287 481 406 472 361 489 491 497 642 479 821 520 692 536 393 519Z','#779085','none');return s;}
function foreground(){return p('M-100 -30 H98 L72 300 112 600 H-100Z','#0d232d','none')+p('M870 -40 H1110 V620 H866 L900 368Z','#132932','none')+line('M65 33 Q358 91 646 24 T1010 62 M67 48 Q408 131 903 57','#172e38',3)+p('M-20 540 L22 421 35 494 54 468 62 542 105 487 79 550 927 550 912 463 939 497 956 412 972 540Z','#10272b','none');}
function eyes(kind='open'){if(kind==='blink')return line('M-35 -56 Q-24 -50 -9 -57 M11 -57 Q28 -53 39 -60',ink,2.8);let out='';out+=p('M-38 -57 Q-25 -66 -9 -58 L-15 -49 Q-27 -45 -35 -51Z','#f4e6cc');out+=p('M8 -58 Q24 -69 41 -62 L35 -53 Q20 -45 11 -51Z','#ece5c9');out+=`<ellipse cx="-23" cy="-55" rx="4" ry="6" fill="#8f4528"/><ellipse cx="25" cy="-57" rx="4.2" ry="6" fill="#ac5d31"/><path d="M-23 -60 V-51 M25 -62 V-52" stroke="#112e35" stroke-width="2.4"/><circle cx="-21" cy="-58" r="1.3" fill="#fff4d1"/><circle cx="27" cy="-60" r="1.4" fill="#fff4d1"/>`;out+=line('M-39 -58 Q-24 -66 -8 -59 M7 -59 Q25 -70 42 -63',ink,3.6);out+=line('M-38 -71 L-13 -69 M12 -71 L36 -77',ink,2);return out;}
function head(kind='open'){return `<g>`+
 p('M-44 -77 Q-45 -124 -7 -135 Q37 -138 53 -101 L45 -7 -39 -2Z','#b3b9aa')+
 p('M-35 -96 Q5 -116 36 -95 L44 -61 35 -18 5 3 -23 -14 -40 -56Z','#d8c4a7')+
 p('M18 -99 L36 -95 44 -61 35 -18 5 3 -7 -5 17 -27 23 -62Z','#a78877','none')+
 p('M-38 -69 Q-52 -75 -47 -51 L-35 -39','#b69a85')+
 line('M-43 -64 Q-38 -63 -41 -50','#695d57',1.3)+
 p('M-19 -10 L-21 25 9 41 30 18 17 -7Z','#cbb599')+
 p('M6 1 L17 -7 30 18 9 41 -1 27Z','#91746a','none')+
 eyes(kind)+
 line('M4 -60 L-2 -34 4 -32 M-6 -20 Q4 -22 14 -23','#6b4d44',1.4)+
 line('M-5 -15 L8 -15','#b58f78',1)+
 p('M-45 -73 Q-65 -106 -37 -127 L-52 -128 -22 -142 20 -140 52 -117 61 -79 49 -16 36 -6 43 -43 36 -96 18 -62 19 -100 -6 -59 -2 -101 -29 -58 -24 -97 -42 -62Z','#d3d6bd')+
 p('M-41 -119 L-10 -131 21 -128 44 -108 45 -87 33 -97 19 -106 -4 -110 -24 -96 -45 -69Z','#b0c1b7','none')+
 line('M-35 -118 Q-9 -128 9 -115 M23 -122 Q41 -100 47 -74 M-22 -111 L-33 -80 M5 -119 L-9 -77','#6f8987',1.2)+
 line('M-48 -94 L-47 -74 M52 -90 L49 -39','#f9eaca',1.8)+
 `<circle cx="-43" cy="-40" r="2.4" fill="#e6b36c"/><path d="M-44 -38 L-42 -29" stroke="#e6b36c" stroke-width="1.5"/></g>`;}
function bust(kind='open'){return `<g stroke-linejoin="round">`+
 p('M-20 4 L-62 17 -110 56 -136 173 127 180 110 63 65 14 25 5 7 27Z','#1a2b36')+
 p('M-62 17 L-80 28 -108 79 -87 149 -47 165 -26 70Z','#3c5259')+
 p('M29 11 L62 18 108 67 91 159 37 126 24 51Z','#263a45')+
 p('M-20 23 L-39 75 -21 121 9 94 26 51 11 32Z','#c6b59a')+
 p('M-46 44 L-20 95 -36 156 4 180 -25 123 2 82Z','#16252e')+
 line('M-91 65 L-71 133 -49 146 M62 51 L78 98 73 139 M-103 83 L-100 121 M38 83 L61 102','#6a7c76',1.4)+
 p('M-17 35 L-36 74 63 139 74 120Z','#846f55')+
 p('M28 88 L43 98 37 111 22 101Z','#bcc0a6')+
 p('M27 92 L38 99 34 105 25 99Z','#253742')+
 head(kind)+
 p('M-40 14 Q-1 41 28 6 L37 29 Q6 57 -35 40Z','#9b442e')+
 p('M-36 22 Q-75 29 -104 6 Q-71 57 -41 43 L-69 68 Q-32 64 -15 39Z','#bd6947')+
 line('M-29 28 Q2 48 29 20 M-69 36 L-42 39','#e9a275',1.6)+
 `<path d="M106 61 L127 173 M-108 72 L-134 169" stroke="#aec4ab" stroke-width="2.2" fill="none" opacity=".7"/></g>`;}
function hero(){return `<g>${p('M-25 97 L-49 227 -27 232 6 133 23 229 46 227 37 95Z','#1b2b34')}${p('M-47 218 L-58 235 -61 245 -25 242 -23 225Z','#111e26')}${p('M24 220 L21 243 57 248 55 237 43 223Z','#101f26')}${line('M-17 131 L-31 207 M21 143 L34 213','#66766d',1.6)}<g transform="scale(.58)">${bust()}</g>${p('M-58 72 L-52 183 -20 163 -7 126 33 180 75 167 50 65 37 76 33 106Z','#243b44')}${p('M-55 78 L-52 172 -27 157 -19 130 -23 93Z','#496264')}${line('M-36 99 L-39 149 M49 113 L60 161','#8d9f88',1.3)}<g transform="rotate(-13 61 72)">${p('M58 47 L62 46 64 232 60 238Z','#799c99')}${p('M53 60 L60 7 70 55 63 49Z','url(#cg-steel)')}${line('M60 47 V210','#cbe3c4',1)}</g>${p('M56 71 Q65 65 67 74 L63 88 55 83Z','#c8ad8b')}</g>`;}
function actionPose(kind){const poses={ready:'M-36 20 Q-88 59 -89 123 L-48 110 -6 74 22 87 69 146 99 140 81 118 53 69 22 48 14 16Z',lean:'M-30 6 Q-101 30 -158 47 L-91 61 -45 73 -68 116 -45 128 0 75 34 77 70 116 101 109 57 58 15 24Z',strike:'M-29 -1 Q-88 0 -157 40 L-112 56 -49 38 -63 96 -101 125 -72 136 -36 117 -6 63 36 74 54 122 87 125 59 49 17 15Z',settle:'M-24 10 Q-72 30 -81 99 L-49 106 -21 64 -28 111 -64 151 -43 164 -1 128 15 76 39 107 59 157 86 154 63 92 29 28Z'};if(kind==='smear')return p('M-228 -24 Q-77 -38 56 -8 L139 25 -71 42 -193 100 -137 49 -252 62 -150 14Z','#101f2b')+line('M-232 24 L122 4 M-202 58 L79 21','#99c9c3',3);let a=p(poses[kind]||poses.ready,'#162833','#b1c8ac',1.3);a+=p('M-33 2 L-43 -42 -12 -63 15 -46 29 -12 12 13Z','#354b53');a+=`<g transform="translate(-5 -26) scale(.42)">${head('open')}</g>`;a+=p('M-30 -16 L-66 -15 -109 -37 -73 4 -41 5Z','#bc6546');if(kind==='ready')a+=p('M1 11 L47 -18 61 -53 70 -48 57 -10 21 27Z','#365158')+line('M43 -60 L111 106','#d1e6d0',3);else a+=p('M3 9 L60 3 110 -20 113 -10 65 22 19 29Z','#405d60')+line('M53 22 L182 -34','#d8efcd',4);return a;}
function eyeClose(kind){return `<rect x="-480" y="-270" width="1920" height="1080" fill="url(#cg-dark)"/><g transform="translate(448 730) scale(8.2)">${p('M-80 -50 L-34 -105 44 -99 80 -29 18 0 -80 -13Z','#b39883')}${p('M0 -95 L64 -82 81 -25 10 -20Z','#7e7169','none')}${eyes(kind)}${p('M-85 -75 L-57 -110 -4 -129 48 -113 72 -73 47 -60 46 -94 24 -64 30 -94 -7 -55 -5 -95 -46 -50 -35 -88Z','#b9c9b6')}${line('M-55 -92 L-68 -66 M6 -110 L-8 -70 M48 -98 L58 -73','#749898',1.1)}</g>`;}
function sigil(){let s='<g fill="none" stroke="#d6c9a3" stroke-width="1.2">';s+='<circle r="77"/><circle r="66"/><circle r="15"/>';for(let i=0;i<16;i++){let a=i*Math.PI/8,x=Math.cos(a),y=Math.sin(a);s+=`<path d="M${x*70} ${y*70} L${x*77} ${y*77}"/>`;}return s+'<path d="M0 -102 V-24 M0 24 V102 M-102 0 H-24 M24 0 H102 M-53 -53 L53 53 M53 -53 L-53 53"/></g>';}
const names=['sky','skyline','arches','ground','foreground','hero','bust_open','bust_blink','bust_alert','eye_open','eye_blink','action_ready','action_lean','action_smear','action_strike','action_settle','sigil','dark'];
function draw(name){switch(name){case'sky':return sky();case'skyline':return skyline();case'arches':return arches();case'ground':return ground();case'foreground':return foreground();case'hero':return hero();case'bust_open':case'bust_alert':return bust();case'bust_blink':return bust('blink');case'eye_open':return eyeClose('open');case'eye_blink':return eyeClose('blink');case'sigil':return sigil();case'dark':return '<rect x="-480" y="-270" width="1920" height="1080" fill="url(#cg-dark)"/>';default:if(name.startsWith('action_'))return actionPose(name.slice(7));throw Error('Unknown original fixture');}}
return {names,defs,draw};
});
