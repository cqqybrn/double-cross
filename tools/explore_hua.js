// 逐话覆盖：从每一话入口进入，用几套变量预设把该话内所有"段落+选项"走一遍。
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const PRESETS = {
  零: {},
  顺: { '001': 8, '002': 8, '003': 7, '004': 4, '005': 3, '006': 5, '007': 3, '009': 1, '015': 1, '016': 1, '017': 0, '018': 3, '019': 6 },
  险: { '001': 1, '002': 1, '003': 0, '004': 0, '005': 0, '006': 0, '007': 0, '009': 0, '015': 0, '016': 0, '017': 1, '018': 0, '019': 0 },
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('**/assets/**', r => r.abort());
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.goto(URL);
  await p.waitForSelector('.title-screen');
  const res = await p.evaluate(async (PRESETS) => {
    const tick = () => new Promise(r => setTimeout(r, 0));
    const all = [...document.querySelectorAll('tw-passagedata')].map(x => x.getAttribute('name'));
    const huas = all.filter(n => /^h\d+(~.*)?$/.test(n));
    const visited = new Set(), ends = {}, dead = {}, errs = {}, exits = {};
    const huaOf = n => n.split('.')[0];
    for (const h of huas) {
      for (const [pn, pre] of Object.entries(PRESETS)) {
        const tried = new Set(), stack = [];
        // 重置状态
        const V = SugarCube.State.variables;
        for (const k of Object.keys(V)) if (/^v\d{3}$/.test(k)) V[k] = 0;
        for (let i = 1; i <= 199; i++) V['v' + String(i).padStart(3, '0')] = 0;
        V.used = {}; V.expr = {}; V.ledger = [];
        for (const [k, v] of Object.entries(pre)) V['v' + k] = v;
        SugarCube.Engine.play(h); await tick();
        let steps = 0, sinceNew = 0;
        const back = async () => {
          while (stack.length) {
            const top = stack[stack.length - 1];
            const next = top.remaining.find(t => !tried.has(top.P + '|' + t));
            if (!next) { stack.pop(); continue; }
            await SugarCube.Save.base64.load(top.save); SugarCube.Engine.show(); await tick();
            tried.add(top.P + '|' + next);
            const a = [...document.querySelectorAll('#passages a.link-internal')].filter(x => !x.closest('nav.after')).find(x => x.textContent === next);
            if (!a) continue;
            a.click(); await tick(); return true;
          }
          return false;
        };
        while (steps++ < 4000) {
          const P = SugarCube.State.passage;
          if (!visited.has(P)) { visited.add(P); sinceNew = 0; } else sinceNew++;
          const root = document.querySelector('#passages');
          let stop = false;
          if (huaOf(P) !== h && P !== h) { exits[h + '→' + huaOf(P)] = 1; stop = true; }
          const e = !stop && root.querySelector('.error-view, .error');
          if (e) { errs[P + '@' + pn] = e.textContent.slice(0, 200); stop = true; }
          const end = !stop && root.querySelector('.ending .name');
          if (end) { ends[end.textContent] = h; stop = true; }
          const links = stop ? [] : [...root.querySelectorAll('a.link-internal')].filter(a => !a.closest('nav.after'));
          if (!stop && !links.length) { dead[P + '@' + pn] = 1; stop = true; }
          if (!stop && sinceNew > 120) { dead['循环 ' + P + '@' + pn] = 1; stop = true; }
          if (stop) { sinceNew = 0; if (!(await back())) break; continue; }
          const untried = links.filter(a => !tried.has(P + '|' + a.textContent));
          let pick;
          if (untried.length) {
            if (untried.length > 1) stack.push({ P, save: SugarCube.Save.base64.save(), remaining: untried.slice(1).map(a => a.textContent) });
            pick = untried[0];
          } else pick = links[Math.floor(Math.random() * links.length)];
          tried.add(P + '|' + pick.textContent);
          pick.click(); await tick();
        }
      }
    }
    return { all: all.filter(n => /^h/.test(n)), visited: [...visited], ends, dead, errs, exits: Object.keys(exits) };
  }, PRESETS);
  const seen = new Set(res.visited);
  const miss = res.all.filter(n => !seen.has(n));
  console.log(`段落覆盖 ${res.all.length - miss.length}/${res.all.length}；结局 ${Object.keys(res.ends).length}/${await p.evaluate(() => SugarCube.setup.ENDINGS.length)}`);
  console.log('未覆盖段落：', miss.join(' '));
  console.log('死路/循环：', JSON.stringify(res.dead, null, 0));
  console.log('运行报错：', JSON.stringify(res.errs, null, 0).slice(0, 2000));
  console.log('页面异常：', [...new Set(pageErrors)].slice(0, 10));
  const endNames = await p.evaluate(() => SugarCube.setup.ENDINGS.map(e => e.name));
  console.log('未到达结局：', endNames.filter(n => !res.ends[n]).join(' '));
  console.log('话的出口：', res.exits.join(' '));
  await b.close();
})();
