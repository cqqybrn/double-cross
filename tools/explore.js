// 回溯式穷举：每个"段落+选项"至少走一次。node tools/explore.js [最大步数]
const { chromium } = require('playwright');
const path = require('path');
const MAX = +process.argv[2] || 60000;
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('**/assets/**', r => r.abort());
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.goto(URL);
  await p.waitForSelector('.title-screen');
  const res = await p.evaluate(async (MAX) => {
    const tick = () => new Promise(r => setTimeout(r, 0));
    const tried = new Set(), visited = new Set();
    const ends = {}, dead = {}, errs = {};
    const stack = [];
    let steps = 0, sinceNew = 0;
    document.querySelector('#passages .title-menu a').click();
    await tick();
    async function backtrack() {
      while (stack.length) {
        const top = stack[stack.length - 1];
        const next = top.remaining.find(t => !tried.has(top.P + '|' + t));
        if (!next) { stack.pop(); continue; }
        await SugarCube.Save.base64.load(top.save);
        SugarCube.Engine.show();
        await tick();
        const a = [...document.querySelectorAll('#passages a.link-internal')]
          .filter(x => !x.closest('nav.after')).find(x => x.textContent === next);
        tried.add(top.P + '|' + next);
        if (!a) continue;
        a.click(); await tick();
        return true;
      }
      return false;
    }
    while (steps < MAX) {
      steps++;
      const P = SugarCube.State.passage;
      if (!visited.has(P)) { visited.add(P); sinceNew = 0; } else sinceNew++;
      const root = document.querySelector('#passages');
      const e = root.querySelector('.error-view, .error');
      let stop = false;
      if (e) { errs[P] = e.textContent.slice(0, 200); stop = true; }
      const end = root.querySelector('.ending .name');
      if (!stop && end) { const k = end.textContent; ends[k] = (ends[k] || 0) + 1; stop = true; }
      const links = stop ? [] : [...root.querySelectorAll('a.link-internal')].filter(a => !a.closest('nav.after'));
      if (!stop && !links.length) { dead[P] = 1; stop = true; }
      if (!stop && sinceNew > 400) { dead['循环@' + P] = 1; stop = true; }
      if (stop) { sinceNew = 0; if (!(await backtrack())) break; continue; }
      const untried = links.filter(a => !tried.has(P + '|' + a.textContent));
      let pick;
      if (untried.length) {
        if (untried.length > 1) stack.push({ P, save: SugarCube.Save.base64.save(), remaining: untried.slice(1).map(a => a.textContent) });
        pick = untried[0];
      } else {
        pick = links[Math.floor(Math.random() * links.length)];
      }
      tried.add(P + '|' + pick.textContent);
      pick.click(); await tick();
    }
    return { steps, ends, dead, errs, visited: [...visited], stackLeft: stack.length };
  }, MAX);
  const all = await p.evaluate(() => [...document.querySelectorAll('tw-passagedata')].map(x => x.getAttribute('name')));
  const huaAll = all.filter(n => /^h\d+(~.*)?$/.test(n));
  const seenHua = new Set(res.visited.map(v => v.split('.')[0]));
  const seenAll = new Set(res.visited);
  console.log(`步数 ${res.steps}，剩余回溯点 ${res.stackLeft}`);
  console.log(`结局 ${Object.keys(res.ends).length}/68；段落覆盖 ${seenAll.size}/${all.length - 5}；话覆盖 ${huaAll.filter(h => seenHua.has(h)).length}/${huaAll.length}`);
  console.log('未到达的话：', huaAll.filter(h => !seenHua.has(h)).join(' '));
  console.log('未到达的段落（前60）：', all.filter(n => /^h/.test(n) && !seenAll.has(n)).slice(0, 60).join(' '));
  console.log('死路/循环：', JSON.stringify(res.dead));
  console.log('运行报错：', JSON.stringify(res.errs).slice(0, 1500));
  console.log('页面异常：', [...new Set(pageErrors)].slice(0, 10));
  console.log('结局：', Object.keys(res.ends).sort().join(' '));
  await b.close();
})();
