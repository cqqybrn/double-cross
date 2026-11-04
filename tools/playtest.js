// 自动试玩：node tools/playtest.js [局数]
// 1) 逐个渲染所有段落，检查宏错误；2) 随机试玩，统计结局、死路、报错与覆盖率。
const { chromium } = require('playwright');
const path = require('path');
const RUNS = +process.argv[2] || 200;
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('**/assets/**', r => r.abort());
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.goto(URL);
  await p.waitForSelector('.title-screen');
  // 1) 静态渲染
  const statics = await p.evaluate(() => {
    const bad = [];
    const names = [...document.querySelectorAll('tw-passagedata')].map(x => x.getAttribute('name'))
      .filter(n => !['StoryInit', 'StoryInterface', 'Bar'].includes(n));
    for (const n of names) {
      try {
        const out = document.createElement('div');
        new SugarCube.Wikifier(out, SugarCube.Story.get(n).processText());
        const e = out.querySelector('.error-view, .error');
        if (e) bad.push([n, e.textContent.slice(0, 160)]);
      } catch (err) { bad.push([n, String(err).slice(0, 160)]); }
    }
    return { total: names.length, bad };
  });
  console.log(`静态渲染 ${statics.total} 段，出错 ${statics.bad.length}`);
  statics.bad.slice(0, 30).forEach(x => console.log('  ✗', x[0], x[1]));
  // 2) 随机试玩
  const tried = {};             // "段落|选项" -> 次数，优先选少走过的
  const ends = {}, dead = {}, errs = {}, visited = new Set();
  let steps = 0;
  for (let r = 0; r < RUNS; r++) {
    await p.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    await p.goto(URL);
    await p.waitForSelector('.title-screen');
    const res = await p.evaluate(async (tried) => {
      const vis = [];
      document.querySelector('#passages .title-menu a').click();
      for (let s = 0; s < 800; s++) {
        await new Promise(r => setTimeout(r, 0));
        const P = SugarCube.State.passage;
        vis.push(P);
        const root = document.querySelector('#passages');
        const e = root.querySelector('.error-view, .error');
        if (e) return { vis, tried, err: [P, e.textContent.slice(0, 200)] };
        const end = root.querySelector('.ending .name');
        if (end) return { vis, tried, end: P.split('.')[0] + ' ' + end.textContent };
        const links = [...root.querySelectorAll('a.link-internal')].filter(a => !a.closest('nav.after'));
        if (!links.length) return { vis, tried, dead: P };
        let best = null, bestN = Infinity;
        for (const a of links) {
          const k = P + '|' + a.textContent;
          const n = (tried[k] || 0) + Math.random() * 0.9;
          if (n < bestN) { bestN = n; best = a; }
        }
        const k = P + '|' + best.textContent;
        tried[k] = (tried[k] || 0) + 1;
        best.click();
      }
      return { vis, tried, loop: SugarCube.State.passage };
    }, tried);
    Object.assign(tried, res.tried);
    res.vis.forEach(v => visited.add(v)); steps += res.vis.length;
    if (res.end) ends[res.end] = (ends[res.end] || 0) + 1;
    if (res.dead) dead[res.dead] = (dead[res.dead] || 0) + 1;
    if (res.err) errs[res.err.join(' ')] = 1;
    if (res.loop) dead['步数上限@' + res.loop] = 1;
  }
  const all = await p.evaluate(() => [...document.querySelectorAll('tw-passagedata')].map(x => x.getAttribute('name')));
  const huaAll = new Set(all.filter(n => /^h\d+(~.*)?$/.test(n)));
  const huaSeen = new Set([...visited].map(v => v.split('.')[0]).filter(v => huaAll.has(v)));
  console.log(`试玩 ${RUNS} 局，${steps} 步；到达结局 ${Object.keys(ends).length} 种；访问段落 ${visited.size}；访问"话" ${huaSeen.size}/${huaAll.size}`);
  console.log('未到达的话：', [...huaAll].filter(h => !huaSeen.has(h)).join(' '));
  console.log('死路：', JSON.stringify(dead));
  console.log('运行报错：', Object.keys(errs).slice(0, 20));
  console.log('页面异常：', [...new Set(pageErrors)].slice(0, 10));
  console.log('结局：', Object.entries(ends).sort().map(([k, v]) => k + '×' + v).join('  '));
  await b.close();
})();
