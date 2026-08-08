'use strict';

/* ========== 音效引擎 (Web Audio API 7种程序合成音效) ========== */
const sound = (() => {
  let ctx = null, muted = false, bgmTimer = null, bgmGain = null, bgmStarted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function note(freq, start, dur, type, gainVal, dest) {
    if (muted) return;
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gainVal || 0.06, start + 0.015);
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g);
    g.connect(dest || c.destination);
    o.start(start); o.stop(start + dur);
  }

  /* 🔔 按钮点击 — 清脆短促 */
  function click() {
    const t = getCtx().currentTime;
    note(880, t, 0.08, 'square', 0.06);
    note(1320, t + 0.04, 0.06, 'square', 0.04);
  }

  /* ✅ 选择/提交 — 稍长"叮"声 */
  function select() {
    const t = getCtx().currentTime;
    note(660, t, 0.12, 'triangle', 0.07);
    note(880, t + 0.08, 0.15, 'triangle', 0.05);
  }

  /* 👟 角色移动过渡 — 嗖声 + 脚步 */
  function whoosh() {
    if (muted) return;
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.25);
    g.gain.setValueAtTime(0.04, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.3);
    [0, 0.12, 0.24].forEach(d => note(120, t + d, 0.04, 'square', 0.03));
  }

  /* ✨ 道具获得 — 叮咚上升和弦 */
  function itemGet() {
    const t = getCtx().currentTime;
    [[523, 0], [659, 0.06], [784, 0.12], [1047, 0.18]]
      .forEach(([f, d]) => note(f, t + d, 0.25, 'triangle', 0.07));
    note(1319, t + 0.32, 0.5, 'sine', 0.03);
  }

  /* 🎉 结果页庆祝 — 上升音阶 + 收尾和弦 */
  function celebration() {
    const t = getCtx().currentTime;
    [523, 587, 659, 784, 880, 1047].forEach((f, i) =>
      note(f, t + i * 0.09, 0.18, 'square', 0.055));
    note(1047, t + 0.65, 0.5, 'triangle', 0.06);
    note(1319, t + 0.65, 0.5, 'triangle', 0.04);
  }

  /* 📋 档案页 — 轻柔确认音 */
  function archive() {
    const t = getCtx().currentTime;
    note(440, t, 0.15, 'triangle', 0.06);
    note(554, t + 0.08, 0.2, 'triangle', 0.05);
  }

  /* 🎵 8-bit 像素风BGM循环 */
  function startBGM() {
    if (bgmStarted) return;
    bgmStarted = true;
    const c = getCtx();
    bgmGain = c.createGain();
    bgmGain.gain.value = 0.04;
    bgmGain.connect(c.destination);

    const melody = [
      {f:523,d:0.18},{f:587,d:0.18},{f:659,d:0.18},{f:784,d:0.18},
      {f:880,d:0.24},{f:784,d:0.14},{f:659,d:0.24},
      {f:587,d:0.18},{f:659,d:0.18},{f:784,d:0.18},{f:880,d:0.18},
      {f:1047,d:0.28},{f:0,d:0.1},{f:880,d:0.18},
      {f:784,d:0.18},{f:659,d:0.18},{f:587,d:0.18},{f:523,d:0.18},
      {f:659,d:0.24},{f:587,d:0.14},{f:523,d:0.24},
      {f:392,d:0.18},{f:440,d:0.18},{f:523,d:0.18},{f:587,d:0.18},
      {f:659,d:0.38},{f:0,d:0.18}
    ];
    const loopLen = melody.reduce((a, n) => a + n.d, 0);

    function loop() {
      if (muted) { bgmTimer = setTimeout(loop, 1000); return; }
      let t = c.currentTime + 0.02;
      melody.forEach(n => {
        if (n.f > 0) note(n.f, t, n.d - 0.02, 'square', 0.035, bgmGain);
        t += n.d;
      });
      bgmTimer = setTimeout(loop, loopLen * 1000);
    }
    loop();
  }

  function toggle() {
    muted = !muted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = muted ? '🔇' : '🎵';
    if (muted && bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
    if (!muted && bgmStarted) { bgmStarted = false; startBGM(); }
  }

  /* 注入静音按钮到body（不受页面切换影响） */
  function init() {
    const btn = document.createElement('button');
    btn.id = 'mute-btn';
    btn.textContent = '🎵';
    btn.title = '音效开关';
    btn.onclick = toggle;
    document.body.appendChild(btn);
  }

  return { init, click, select, whoosh, itemGet, celebration, archive, startBGM, toggle };
})();

/* ========== 图片预加载器 ========== */
const preloaded = {};
let preloadQueue = [];

function preloadImage(src) {
  if (!src || preloaded[src]) return;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => { preloaded[src] = true; resolve(); };
    img.src = src;
  });
}

async function preloadAll(sources) {
  return Promise.all(sources.filter(Boolean).map(preloadImage));
}

/* 加载中遮罩 */
function showLoading(){ document.getElementById('loading-overlay')?.classList.add('show'); }
function hideLoading(){ document.getElementById('loading-overlay')?.classList.remove('show'); }

/* ========== 资源路径（新图片在美术资源/根目录）========== */
const A='美术资源/';
const assets={
  home:`${A}启动页最新.webp`,
  map:`${A}地图页.webp`,
  // 过渡页：4个地点各一张（在 美术资源/过渡页/ 目录下）
  travel:[
    `${A}过渡页/前往迷雾观察林.webp`,   // 0
    `${A}过渡页/前往青年共生营.webp`,   // 1
    `${A}过渡页/前往灵感造物园.webp`,   // 2
    `${A}过渡页/前往行动引擎站.webp`    // 3
  ],
  // 对话页背景（按地点索引，每个地点专属）
  dialog:[
    `${A}对话答题页/迷雾观察林-对话页.webp`,   // 0 迷雾观察林
    `${A}对话答题页/青年共生营对话答题页.webp`, // 1 青年共生营
    `${A}对话答题页/灵感造物园对话答题页.webp`, // 2 灵感造物园
    `${A}对话答题页/行动引擎站对话答题页.webp`  // 3 行动引擎站
  ],
  boy:`${A}角色/男角色_去底.webp`,
  girl:`${A}角色/女角色_去底.png`,
  cat:`${A}角色/小猫_去底.webp`,
  // 地标标牌图片
  signs:[
    `${A}地标/迷雾观察林地标牌.webp`,
    `${A}地标/青年共生营地标牌.webp`,
    `${A}地标/灵感造物园地标牌.webp`,
    `${A}地标/行动引擎站地标牌.webp`
  ]
};

/* 四个地点 */
const areas=[
  {id:'insight',name:'迷雾观察林',title:'消失的参与感',
   story:'最近团队计划推出一个校园青年成长计划，但过去类似活动常常出现一个问题：报名时很多同学很感兴趣，活动开始后参与度却逐渐下降。你会从哪里开始寻找答案？',
   options:[['邀请不同类型的学生交流，先去找到真实声音。','insight'],['查看过去活动数据，从已有信息中寻找规律。','insight'],['设计一次小规模体验，通过行动验证问题。','execution'],['发起校园话题征集，让更多声音被看见。','creation']]},
  {id:'connection',name:'青年共生营',title:'寻找第一批同行者',
   story:'北辰青年准备启动校园共创项目。目前报名学生主要来自同一个学院，团队希望吸引不同专业、不同兴趣背景的同学加入。你会怎样让伙伴相遇？',
   options:[['联系校园关键伙伴，寻找不同圈层的推荐人。','connection'],['先了解同学加入项目的真实期待和顾虑。','insight'],['设计一次青年交流活动，让伙伴自然相遇。','creation'],['建立招募流程，提高伙伴加入效率。','execution']]},
  {id:'creation',name:'灵感造物园',title:'让行动被看见',
   story:'北辰青年完成了一次校园行动，但很多同学并不知道这个项目。团队希望让更多青年看到：普通学生也可以参与校园改变。你会如何让行动被看见？',
   options:[['记录参与者故事，用真实经历打动更多人。','creation'],['分析学生兴趣，寻找更有效的传播方式。','insight'],['设计互动活动，让更多人主动参与。','connection'],['规划长期内容节奏，让影响持续发生。','execution']]},
  {id:'execution',name:'行动引擎站',title:'7天倒计时',
   story:'距离校园青年共创活动开始还有7天，但部分成员任务没有完成，团队信息没有同步，合作资源也出现临时变化。你会怎样推动团队继续前进？',
   options:[['重新梳理任务优先级，明确负责人和时间节点。','execution'],['先和成员沟通，找到任务卡住的真实原因。','connection'],['调整原方案，寻找新的解决方式。','creation'],['回到参与者需求，重新判断调整方向。','insight']]}
];

// 道具页：背景图（按地点索引）+ 道具素材（按能力属性）
const rewardBg=[
  `${A}道具页/迷雾观察林.webp`,   // 0
  `${A}道具页/青年共生营.webp`,   // 1
  `${A}道具页/灵感造物园.webp`,   // 2
  `${A}道具页/行动引擎站.webp`    // 3
];
const rewardItem={
  insight:`${A}道具页/洞察之镜.webp`,
  connection:`${A}道具页/伙伴火种.webp`,
  creation:`${A}道具页/灵感火花.webp`,
  execution:`${A}道具页/行动背包.webp`
};
const rewardName={
  insight:'洞察之镜',
  connection:'伙伴火种',
  creation:'灵感火花',
  execution:'行动背包'
};

const art={
  insight:`${A}结果页/树洞勘探回音站（洞察为第一能力）.webp`,
  connection:`${A}结果页/灯塔抛锚俱乐部（连接为第一能力）.webp`,
  creation:`${A}结果页/月下拾荒流浪所（创意为第一能力）.webp`,
  execution:`${A}结果页/手搓宇宙中心（执行力为第一能力）.webp`
};

/* 校园行动档案图（4张完整版） */
const archiveArt={
  insight:'美术资源/结果页/树洞勘探回音站-校园行动档案.webp',
  connection:'美术资源/结果页/灯塔抛锚俱乐部-行动档案.webp',
  creation:'美术资源/结果页/月下拾荒流浪所-行动档案.webp',
  execution:'美术资源/结果页/手搓宇宙中心-行动档案.webp'
};

/* 场景参考图（档案页探索路径用） */
const sceneRef={
  insight:`${A}场景参考/迷雾森林.webp`,
  connection:`${A}场景参考/伙伴集合点.webp`,
  creation:`${A}场景参考/造物花园.webp`,
  execution:`${A}场景参考/行动基地.webp`
};

let state={area:0,visited:[false,false,false,false],visitOrder:[],scores:{insight:0,connection:0,creation:0,execution:0},selected:null,lastAbility:null};
const el=document.querySelector('#app');
function html(s){el.innerHTML=s}

/* 打字机 */
function type(text,target,done){
  let i=0;
  let t=setInterval(()=>{
    target.textContent=text.slice(0,++i);
    if(i>=text.length){clearInterval(t);if(done)done();}
  },50);
}

/* ========== 启动页 ========== */
async function home(){
  html(`<section class="screen home-scr">
    <img class="bg-img" src="${assets.home}" alt="" draggable="false">

    <!-- 男孩 + 小猫角色（左移，带名字标签） -->
    <div class="home-chars">
      <div class="hc-wrap">
        <div class="hc-name">小北</div>
        <img src="${assets.boy}" class="hc-left" draggable="false">
      </div>
      <div class="hc-wrap">
        <div class="hc-name">小咪</div>
        <img src="${assets.cat}" class="hc-right" draggable="false">
      </div>
    </div>

    <!-- 开始探索按钮（新底图+文字） -->
    <div class="start-btn-wrap">
      <button class="hz-start-img" onclick="showMap()" aria-label="开始探索">
        <img src="home/开始探索按钮.webp" draggable="false">
        <span class="btn-text">开始探索</span>
      </button>
      <div class="start-btn-hint">点击按钮进入游戏</div>
    </div>

    <!-- 动效装饰 -->
    <div class="fx-dust"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="fx-speaker"><span class="wave"></span><span class="wave w2"></span></div>
    <div class="fx-camera"><span class="flash"></span></div>
    <div class="fx-sun"><span class="ring"></span></div>
    <div class="fx-plane"><span class="wing"></span></div>
    <div class="fx-waterfall"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
  </section>`);

  // 后台预加载后续页面所有图片：地图地标→道具→结果页→档案
  [assets.map, ...assets.travel,
   ...assets.signs, ...rewardBg,
   ...Object.values(rewardItem), ...Object.values(art),
   ...Object.values(archiveArt)
  ].forEach(src=>{let img=new Image();img.src=src;});
}

/* ========== 地图页 ========== */
const spotPos=[
  {left:'22%',top:'40%'},   // 0:迷雾观察林
  {left:'76.5%',top:'45%'}, // 1:青年共生营
  {left:'27%',top:'70%'},   // 2:灵感造物园
  {left:'82.5%',top:'68%'}   // 3:行动引擎站
];

async function showMap(focus){
  sound.click();
  sound.startBGM();
  let d=state.area;
  let dest=focus?state.selected:-1;
  // 角色默认在 START 按钮位置（不聚焦时），聚焦时跑到目标地点
  let cx=focus?spotPos[dest].left:'50%';
  let cy=focus?spotPos[dest].top:'82%';
  let nextUnvisited=state.visited.findIndex(v=>!v);

  html(`<section class="screen map-scr ${focus?'zoom-in':''}">
    <img class="bg-img" src="${assets.map}" alt="" draggable="false">

    <!-- 顶部基地告示牌 -->
    <div class="base-sign">
      <span>你的基地</span>
      <small>待解锁</small>
    </div>

    <!-- 四个地点（标牌+热区包裹在一起，支持 hover 放大） -->
    ${areas.map((a,i)=>`
      <div class="spot-wrap" style="left:${spotPos[i].left};top:${spotPos[i].top}">
        <div class="spot-sign sp${i} ${dest===i?'sp-active':''} ${state.visited[i]?'sp-visited':''}"
          ${state.visited[i]||focus?'':`onclick="goToSpot(${i})"`}>
          <img src="${assets.signs[i]}" draggable="false">
          <span class="sp-name">${a.name}</span>
          ${state.visited[i]?'<span class="sp-unlock">已解锁</span>':''}
        </div>
        <button class="hotzone hz-spot"
          ${state.visited[i]||focus?'disabled':''} onclick="goToSpot(${i})" aria-label="${a.name}"></button>
      </div>
    `).join('')}

    ${focus?`<div class="glow-ring" style="left:${spotPos[dest].left};top:${spotPos[dest].top}"></div>
    <div class="particles"><span></span><span></span><span></span><span></span><span></span></div>`:''}

    <!-- 小北 + 小咪（在 START 位置） -->
    <div class="map-char ${focus?'running':''} ${!focus?'idle':''}" style="left:${cx};top:${cy}">
      <img src="${assets.boy}" draggable="false"><img src="${assets.cat}" draggable="false">
    </div>

    <!-- 气泡提示 -->
    ${!focus?`<div class="map-bubble">点击路标选择你要前往的地点吧</div>`:''}

    <!-- 环境漂浮树叶 -->
    <div class="map-env">
      <span class="leaf l1"></span><span class="leaf l2"></span><span class="leaf l3"></span>
      <span class="leaf l4"></span><span class="leaf l5"></span>
      <span class="leaf l6"></span><span class="leaf l7"></span>
    </div>
  </section>`);
}

function goToSpot(i){
  sound.select();
  state.selected=i;
  showMap(true);
  setTimeout(()=>travel(i),820);
}

/* ========== 过渡页 ========== */
function travel(i){
  sound.whoosh();
  let a=areas[i];
  // 不等图片，直接渲染（图片后台加载）
  html(`<section class="screen travel-scr">
    <img class="bg-img" src="${assets.travel[i]}" alt="" draggable="false">

    <!-- 目的地名称 -->
    <div class="travel-dest">
      <span>正在前往</span>
      <b>${a.name}</b>
    </div>

    <!-- 男孩 + 小猫（放大版奔跑） -->
    <div class="travel-char">
      <img src="${assets.boy}" draggable="false">
      <img src="${assets.cat}" draggable="false">
    </div>

    <!-- 能量条 -->
    <div class="travel-bar"><div class="bar-fill"></div></div>

    <!-- 底部4节点进度（按玩家实际访问顺序排列） -->
    <div class="travel-nodes">
      ${(()=>{
        let order=[]; // 动态构建显示顺序：[{idx, cls, icon}]
        // 1）已访问过的（按 visitOrder 顺序）
        state.visitOrder.forEach(j=>order.push({idx:j,cls:'tn-done',icon:'✓'}));
        // 2）当前前往的
        order.push({idx:i,cls:'tn-now',icon:'▶'});
        // 3）还没去过且不是当前
        areas.forEach((x,j)=>{if(!state.visitOrder.includes(j) && j!==i) order.push({idx:j,cls:'',icon:'●'});});
        return order.map(o=>`<span class="${o.cls}">${o.icon} ${areas[o.idx].name}</span>`).join('');
      })()}
    </div>
  </section>`);

  // 后台预加载对话页图片，避免跳转时再等加载
  preloadAll([assets.dialog[i], assets.boy, assets.cat]);
  // 4秒后自动跳转对话页（图片已缓存，秒开）
  setTimeout(()=>showDialog(i),4000);
}

/* ========== 题目页（对话页）========== */
function showDialog(i){
  let a=areas[i];
  // 不等图片，直接渲染（图片已在travel中预加载或后台加载）
  html(`<section class="screen dialog-scr">
    <img class="bg-img" src="${assets.dialog[i]}" alt="" draggable="false">

    <!-- 对话框 -->
    <div class="dlg-box">
      <div class="dlg-title">${a.title}</div>
      <div class="dlg-text" id="typing"></div>
    </div>

    <!-- 地点标签 -->
    <div class="dlg-location">${a.name}</div>

    <!-- 开始作答按钮 -->
    <button class="pxl-btn dlg-btn" id="answerBtn" onclick="showQuiz(${i})" style="display:none">
      <span>开始作答</span>
    </button>
  </section>`);

  type(a.story,document.querySelector('#typing'),()=>{
    let btn=document.querySelector('#answerBtn');
    if(btn)btn.style.display='block';
  });
}

/* ========== 答题页（复用对话页背景+覆盖选项按钮）========== */
function showQuiz(i){
  sound.click();
  let a=areas[i];
  html(`<section class="screen quiz-scr">
    <img class="bg-img" src="${assets.dialog[i]}" alt="" draggable="false">
    <div class="quiz-label">${a.name} · 请选择你的答案</div>
    ${a.options.map((o,n)=>`
      <button class="pxl-btn quiz-opt qo-${n}" onclick="submitAnswer(${i},${n})">
        <b>${'ABCD'[n]}</b> ${o[0]}
      </button>`).join('')}
  </section>`);
}

/* ========== 答题提交 ========== */
function submitAnswer(i,n){
  sound.select();
  let ability=areas[i].options[n][1];
  state.scores[ability]+=10;
  state.lastAbility=ability;
  showReward(i, ability);
}

/* ========== 道具页 ========== */
function showReward(i, ability){
  sound.itemGet();
  let bg=rewardBg[i];
  let item=rewardItem[ability];
  let name=rewardName[ability];
  html(`<section class="screen reward-scr">
    <img class="bg-img" src="${bg}" alt="" draggable="false">

    <!-- 道具发光粒子 -->
    <div class="reward-parts"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>

    <!-- 道具图（居中，带发光脉冲动效） -->
    <div class="reward-item-wrap">
      <img class="reward-item-img" src="${item}" alt="${name}" draggable="false">
    </div>

    <!-- 获得文字 -->
    <div class="reward-text">
      <span>太棒了！</span>
      <b>你获得了${name}</b>
    </div>

    <!-- 点击收下按钮 -->
    <button class="pxl-btn reward-btn" onclick="nextSpot()">
      <span>点击收下</span>
    </button>
  </section>`);
}

/* 打字机动效 */
function typewrite(el,text,speed=70){
  if(!el) return;
  el.textContent='';
  el.parentElement.classList.add('typing');
  let i=0;
  let t=setInterval(()=>{
    el.textContent+=text[i];
    i++;
    if(i>=text.length){clearInterval(t);el.parentElement.classList.remove('typing');}
  },speed);
}

/* 截图保存 */
function saveAsImage(){
  sound.click();
  let orig=document.querySelector('.result-scr');
  if(!orig) return;

  /* 克隆节点到屏幕外，移除所有动画确保全元素可见 */
  let clone=orig.cloneNode(true);
  clone.style.position='fixed';
  clone.style.top='-9999px';
  clone.style.left='-9999px';
  clone.style.width=orig.offsetWidth+'px';
  clone.style.height=orig.offsetHeight+'px';
  clone.style.zIndex='-1';
  document.body.appendChild(clone);

  clone.querySelectorAll('*').forEach(e=>{
    e.style.animation='none';
    e.style.opacity='1';
    e.style.transition='none';
    e.style.pointerEvents='none';
  });

  html2canvas(clone,{useCORS:true,allowTaint:true,scale:2,backgroundColor:null,logging:false})
    .then(canvas=>{
      let a=document.createElement('a');
      a.download='北辰青年-我的基地.png';
      a.href=canvas.toDataURL('image/png');
      a.click();
      document.body.removeChild(clone);
    })
    .catch(()=>document.body.removeChild(clone));
}

function nextSpot(){
  sound.click();
  if(state.selected!==null){
    state.visited[state.selected]=true;
    state.visitOrder.push(state.selected);
  }
  state.area++;
  state.selected=null;
  state.area<4?showMap():showResult();
}

/* ========== 结果页 ========== */
async function showResult(){
  sound.celebration();
  let top=Object.entries(state.scores).sort((a,b)=>b[1]-a[1])[0][0];

  /* ---- 灯塔抛锚俱乐部 专属页面 ---- */
  if(top==='connection'){
    html(`<section class="screen result-scr result-lighthouse">
      <img class="bg-img" src="${art[top]}" alt="" draggable="false">

      <!-- 灯塔旋转光束 -->
      <div class="lighthouse-beam"></div>
      <div class="lighthouse-beam b2"></div>

      <!-- 顶部双行标题 -->
      <div class="result-title">
        <span class="rt-line1">恭喜你建造出</span>
        <b class="rt-line2">灯塔抛锚俱乐部</b>
      </div>

      <!-- 底部角色 + 气泡 -->
      <div class="result-actors">
        <div class="actor-boy">
          <div class="bubble bubble-oval">
            <span>你把光点亮，所有孤帆便看到了彼此的存在。</span>
          </div>
          <img src="${assets.boy}" draggable="false">
        </div>
        <div class="actor-cat">
          <div class="bubble bubble-square">
            <span>Hi，灯塔守夜人</span>
          </div>
          <img src="${assets.cat}" draggable="false">
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="lh-btns">
        <button class="lh-btn-profile" onclick="showArchive()">查看我的校园行动档案</button>
      </div>
    </section>`);
    return;
  }

  /* ---- 树洞勘探回音站 专属页面 ---- */
  if(top==='insight'){
    html(`<section class="screen result-scr result-insight">
      <img class="bg-img" src="${art[top]}" alt="" draggable="false">

      <!-- 望远镜白光放射 -->
      <div class="insight-beam"></div>
      <div class="insight-beam b2"></div>

      <div class="result-title">
        <span class="rt-line1">恭喜你建造出</span>
        <b class="rt-line2">树洞勘探回音站</b>
      </div>

      <div class="result-actors">
        <div class="actor-boy">
          <div class="bubble bubble-oval"><span>每一句树洞里的话，都被你收集与回应。</span></div>
          <img src="${assets.boy}" draggable="false">
        </div>
        <div class="actor-cat">
          <div class="bubble bubble-square"><span>Hi，情报树懒</span></div>
          <img src="${assets.cat}" draggable="false">
        </div>
      </div>

      <div class="lh-btns">
        <button class="lh-btn-profile" onclick="showArchive()">查看我的校园行动档案</button>
      </div>
    </section>`);
    return;
  }

  /* ---- 月下拾荒流浪所 专属页面 ---- */
  if(top==='creation'){
    html(`<section class="screen result-scr result-creation">
      <img class="bg-img" src="${art[top]}" alt="" draggable="false">

      <!-- 暖黄星星 -->
      <div class="creation-stars">
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span>
      </div>

      <div class="result-title">
        <span class="rt-line1">恭喜你建造出</span>
        <b class="rt-line2">月下拾荒流浪所</b>
      </div>

      <div class="result-actors">
        <div class="actor-boy">
          <div class="bubble bubble-oval"><span>流浪家从不问终点，只捡起路上的光。</span></div>
          <img src="${assets.boy}" draggable="false">
        </div>
        <div class="actor-cat">
          <img src="${assets.cat}" draggable="false">
        </div>
      </div>

      <div class="lh-btns">
        <button class="lh-btn-profile" onclick="showArchive()">查看我的校园行动档案</button>
      </div>
    </section>`);
    return;
  }

  /* ---- 手搓宇宙中心 专属页面 ---- */
  if(top==='execution'){
    html(`<section class="screen result-scr result-execution">
      <img class="bg-img" src="${art[top]}" alt="" draggable="false">

      <!-- 电流频闪 -->
      <div class="electric-line e1"></div>
      <div class="electric-line e2"></div>
      <div class="electric-line e3"></div>

      <div class="result-title">
        <span class="rt-line1">恭喜你建造出</span>
        <b class="rt-line2">手搓宇宙中心</b>
      </div>

      <div class="result-actors">
        <div class="actor-boy">
          <div class="bubble bubble-oval"><span>脑洞不够？搓一个；世界太旧？改一个。</span></div>
          <img src="${assets.boy}" draggable="false">
        </div>
        <div class="actor-cat">
          <img src="${assets.cat}" draggable="false">
        </div>
      </div>

      <div class="lh-btns">
        <button class="lh-btn-profile" onclick="showArchive()">查看我的校园行动档案</button>
      </div>
    </section>`);
    return;
  }

  /* ---- 兜底（理论上不会走到这里）---- */
  html(`<section class="screen result-scr">
    <img class="bg-img" src="${art[top]}" alt="" draggable="false">
    <div class="result-char">
      <img src="${assets.boy}" draggable="false">
      <img src="${assets.cat}" draggable="false">
    </div>
    <button class="hotzone hz-save" onclick="alert('基地已保存！')" aria-label="保存基地"></button>
    <button class="hotzone hz-share" onclick="alert('分享功能开发中……')" aria-label="分享基地"></button>
  </section>`);
}

/* ========== 校园行动档案页（图片版）========== */
async function showArchive(){
  let top=Object.entries(state.scores).sort((a,b)=>b[1]-a[1])[0][0];
  html(`<section class="screen archive-scr">
    <img class="archive-img" src="${archiveArt[top]}" alt="" draggable="false">

    <button class="abtn-archive-save" onclick="saveArchiveImage()">保存我的档案</button>
  </section>`);
}

/* 档案页截图 */
function saveArchiveImage(){
  sound.archive();
  let orig=document.querySelector('.archive-scr');
  if(!orig) return;
  let clone=orig.cloneNode(true);
  let btn=clone.querySelector('.abtn-archive-save');
  if(btn) btn.remove();
  clone.style.position='fixed';clone.style.top='-9999px';clone.style.left='-9999px';
  clone.style.width=orig.offsetWidth+'px';clone.style.height=orig.offsetHeight+'px';
  clone.style.zIndex='-1';
  document.body.appendChild(clone);
  clone.querySelectorAll('*').forEach(e=>{
    e.style.animation='none';e.style.transition='none';e.style.pointerEvents='none';
  });
  html2canvas(clone,{useCORS:true,allowTaint:true,scale:2,backgroundColor:'#f5ecd7',logging:false})
    .then(canvas=>{
      document.body.removeChild(clone);
      let dataUrl=canvas.toDataURL('image/png');
      // 弹层展示，微信用户长按保存
      let overlay=document.createElement('div');
      overlay.className='archive-preview-overlay';
      overlay.innerHTML=`
        <img class="apv-img" src="${dataUrl}" alt="校园行动档案">
        <div class="apv-hint">👆 长按上方图片，保存到手机相册</div>
        <button class="apv-back" onclick="this.parentElement.remove()">返回</button>
      `;
      document.body.appendChild(overlay);
    })
    .catch(()=>document.body.removeChild(clone));
}

/* 初始化音效系统（创建静音按钮） */
sound.init();

// 预加载启动页、地图页背景图，消除首次黑屏闪
[assets.home, assets.map].forEach(src=>{let img=new Image();img.src=src;});

home();
