const { spawnSync } = require('child_process');
function token(){const r=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8'});return (r.stdout.match(/password=(.+)/)||[])[1].trim();}
const H={'Authorization':`Bearer ${token()}`,'Accept':'application/vnd.github+json','User-Agent':'cahier-check'};
const get=async p=>{const r=await fetch(`https://api.github.com/repos/NewtNorlly/Cahier${p}`,{headers:H});return {s:r.status,j:await r.json()};};
(async()=>{
  const wf=await get('/actions/workflows?per_page=100');
  console.log('WORKFLOWS:');(wf.j.workflow_runs?[]:wf.j.workflows||[]).forEach(w=>console.log(' ',w.id,w.name,w.state));
  const runs=await get('/actions/runs?per_page=100');
  console.log('TOTAL RUNS:',runs.j.total_count);
  (runs.j.workflow_runs||[]).forEach(r=>console.log(' ',r.id,r.name,'#'+r.run_number,r.status,r.event));
  const pg=await get('/pages');
  console.log('PAGES:',pg.s,JSON.stringify({build_type:pg.j.build_type,source:pg.j.source,status:pg.j.status,html_url:pg.j.html_url}));
})();
