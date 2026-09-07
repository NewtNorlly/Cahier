// 用本地 git 凭据调 GitHub API：
// 1) 列出 workflows，定位 pages-build-deployment
// 2) 删除它的全部历史 runs
// 3) 把 Pages build source 切为 "workflow"（彻底不再产生 pages-build-deployment）
const { spawnSync } = require('child_process');

const OWNER = 'NewtNorlly', REPO = 'Cahier';
function token() {
  const r = spawnSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' });
  const out = r.stdout || '';
  const m = out.match(/password=(.+)/);
  if (!m) throw new Error('no token from git credential: ' + r.stderr);
  return m[1].trim();
}
const TOK = token();
const H = { 'Authorization': `Bearer ${TOK}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'cahier-clean' };
const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, { headers: H, ...opts });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = txt; }
  return { status: r.status, j };
};

(async () => {
  // 1) workflows
  const wf = await api('/actions/workflows?per_page=100');
  if (wf.status !== 200) { console.error('list workflows failed', wf.status, JSON.stringify(wf.j).slice(0,300)); process.exit(1); }
  console.log('workflows:', wf.j.workflows.map(w => `${w.id} ${w.name} state=${w.state}`));
  const target = wf.j.workflows.find(w => /pages.?build.?deployment/i.test(w.name) || /pages/i.test(w.name));

  let deleted = 0;
  if (target) {
    // 2) 分页取该 workflow 全部 runs
    let page = 1;
    while (true) {
      const runs = await api(`/actions/workflows/${target.id}/runs?per_page=100&page=${page}`);
      if (runs.status !== 200) { console.error('list runs failed', runs.status); break; }
      const arr = runs.j.workflow_runs || [];
      if (arr.length === 0) break;
      for (const run of arr) {
        const d = await api(`/actions/runs/${run.id}`, { method: 'DELETE' });
        console.log(`delete run ${run.id} [${run.name} #${run.run_number}] -> ${d.status}`);
        if (d.status === 204) deleted++;
      }
      if (arr.length < 100) break;
      page++;
    }
  } else {
    console.log('no pages-build-deployment workflow found (maybe already removed)');
  }

  // 兜底：扫描所有 runs，删除名为 pages-build-deployment 的
  let page = 1, extra = 0;
  while (true) {
    const runs = await api(`/actions/runs?per_page=100&page=${page}`);
    if (runs.status !== 200) break;
    const arr = runs.j.workflow_runs || [];
    if (arr.length === 0) break;
    for (const run of arr) {
      if (/pages.?build.?deployment/i.test(run.name || '')) {
        const d = await api(`/actions/runs/${run.id}`, { method: 'DELETE' });
        console.log(`兜底 delete run ${run.id} -> ${d.status}`);
        if (d.status === 204) extra++;
      }
    }
    if (arr.length < 100) break;
    page++;
  }

  // 3) Pages source -> workflow（防止再生成）
  const pages = await api('/pages', { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ build_type: 'workflow' }) });
  console.log('set pages build_type=workflow ->', pages.status);

  console.log(`DONE deleted=${deleted} extra=${extra}`);
})();
