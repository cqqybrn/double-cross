// 求通关路线：最佳优先搜索，目标结局默认 HE·白鹭。node tools/solve.js [目标结局] [最大展开数]
const { chromium } = require('playwright');
const path = require('path');
const GOAL = process.argv[2] || 'HE·白鹭';
const MAX = +process.argv[3] || 60000;
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('**/assets/**', r => r.abort());
  await p.goto(URL); await p.waitForSelector('.title-screen');
  const res = await p.evaluate(async ({ GOAL, MAX }) => {
    const tick = () => new Promise(r => setTimeout(r, 0));
    const V = () => SugarCube.State.variables;
    const huaNum = P => +(/^h(\d+)/.exec(P) || [0, 0])[1];
    const score = () => { const v = V(); return v.v013 * 3 + v.v012 * 3 + v.v011 * 2 + v.v010 + v.v001 * 0.3 - v.v009 * 0.5 + v.v019 * 0.2; };
    const sig = () => { const v = V(); const o = []; for (let i = 1; i <= 32; i++) o.push(v['v' + String(i).padStart(3, '0')]); return o.join(','); };
    const links = () => [...document.querySelectorAll('#passages a.link-internal')].filter(a => !a.closest('nav.after'));
    document.querySelector('#passages .title-menu a').click(); await tick();
    const seen = new Set();
    const heap = [{ save: SugarCube.Save.base64.save(), P: SugarCube.State.passage, pri: 0, path: [] }];
    const endsSeen = {};
    let n = 0, bestHua = 0;
    while (heap.length && n < MAX) {
      heap.sort((a, b) => a.pri - b.pri);
      const cur = heap.pop();
      await SugarCube.Save.base64.load(cur.save); SugarCube.Engine.show(); await tick();
      const texts = links().map(a => a.textContent);
      for (let i = 0; i < texts.length; i++) {
        n++;
        if (i > 0) { await SugarCube.Save.base64.load(cur.save); SugarCube.Engine.show(); await tick(); }
        const a = links().find(x => x.textContent === texts[i]);
        if (!a) continue;
        a.click(); await tick();
        const P = SugarCube.State.passage;
        const root = document.querySelector('#passages');
        const end = root.querySelector('.ending .name');
        const pathN = cur.path.concat([texts[i]]);
        if (end) {
          endsSeen[end.textContent] = (endsSeen[end.textContent] || 0) + 1;
          if (end.textContent === GOAL) {
            const v = V();
            return { ok: true, n, path: pathN, vars: { 证据: v.v012, 良知: v.v013, 恩淑信任: v.v011, 宫本信任: v.v001, 素月好感: v.v010 }, endsSeen };
          }
          continue;
        }
        if (root.querySelector('.error-view, .error')) continue;
        const k = P + '#' + sig();
        if (seen.has(k)) continue;
        seen.add(k);
        bestHua = Math.max(bestHua, huaNum(P));
        heap.push({ save: SugarCube.Save.base64.save(), P, pri: huaNum(P) * 1000 + pathN.length + score() * 0.2, path: pathN });
      }
    }
    return { ok: false, n, bestHua, endsSeen, left: heap.length };
  }, { GOAL, MAX });
  if (res.ok) {
    console.log(`找到「${GOAL}」：展开 ${res.n} 次，路线共 ${res.path.length} 次点击`);
    console.log('结局时变量：', JSON.stringify(res.vars));
    console.log('路线中的关键选择（略去"继续"）：');
    console.log(res.path.filter(t => t !== '继续').map((t, i) => `${i + 1}. ${t}`).join('\n'));
  } else console.log('未找到', JSON.stringify(res).slice(0, 1500));
  await b.close();
})();
