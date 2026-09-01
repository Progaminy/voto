const PUBLIC_RESULTS_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const PUBLIC_RESULTS_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const PUBLIC_RESULTS_URL = `${PUBLIC_RESULTS_SUPABASE_URL}/functions/v1/vote-public-results`;

const resultEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function installPublicResultStyles() {
  if (document.getElementById('publicResultStyles')) return;
  const style = document.createElement('style');
  style.id = 'publicResultStyles';
  style.textContent = `
    .public-results-section{padding-bottom:34px}
    .public-results-card{border:1px solid var(--line);border-radius:22px;background:var(--surface,#fff);padding:22px;box-shadow:0 12px 35px rgba(15,45,80,.08)}
    .public-results-head{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}
    .public-results-head h2{margin:0 0 5px;color:var(--blue-950,#0b315f)}
    .public-results-head p{margin:0;color:var(--muted,#62738a);font-size:13px}
    .public-result-official{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#eaf8ef;color:#176b3a;font-size:11px;font-weight:850}
    .public-result-meta{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 20px}
    .public-result-meta article{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface-soft,#f8fbff)}
    .public-result-meta span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:800}
    .public-result-meta strong{display:block;margin-top:5px;font-size:15px;color:var(--blue-950,#0b315f);line-height:1.25}
    .public-distribution{border:1px solid #c9dff7;border-radius:16px;background:#f5f9ff;padding:15px;margin:0 0 18px}
    .public-distribution h3{margin:0 0 5px;color:#0b4d91}
    .public-distribution p{margin:0 0 12px;color:var(--muted);font-size:12px}
    .public-assignment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .public-assignment{background:#fff;border:1px solid #dbe7f4;border-radius:12px;padding:11px}
    .public-assignment small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;font-weight:800}
    .public-assignment strong{display:block;margin-top:4px;color:#123e70}
    .public-assignment span{display:block;margin-top:4px;font-size:11px;color:var(--muted)}
    .public-result-positions{display:grid;gap:14px}
    .public-result-position{border-top:1px solid var(--line);padding-top:15px}
    .public-result-position:first-child{border-top:0;padding-top:0}
    .public-result-position h3{margin:0 0 10px;color:var(--blue-900,#154f88)}
    .public-result-row{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(120px,2fr) 90px;gap:10px;align-items:center;padding:8px 0}
    .public-result-person{display:flex;align-items:center;gap:9px;min-width:0}
    .public-result-person img,.public-result-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#dce8f5;flex:0 0 auto}
    .public-result-person strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .public-result-bar{height:9px;border-radius:999px;background:#e7edf5;overflow:hidden}
    .public-result-bar span{display:block;height:100%;border-radius:inherit;background:var(--blue-600,#0757b6)}
    .public-result-score{text-align:right;font-weight:900;color:var(--blue-950,#0b315f)}
    .public-result-score small{display:block;color:var(--muted);font-size:10px;font-weight:700}
    @media(max-width:820px){.public-result-meta{grid-template-columns:repeat(2,minmax(0,1fr))}.public-assignment-grid{grid-template-columns:1fr}.public-result-row{grid-template-columns:minmax(0,1fr) 78px}.public-result-bar{grid-column:1/-1;grid-row:2}.public-result-score{grid-column:2;grid-row:1}.public-result-person strong{white-space:normal}}
  `;
  document.head.appendChild(style);
}
function ensurePublicResultSection() { installPublicResultStyles(); let section=document.getElementById('publicResultsSection'); if(section)return section; section=document.createElement('section'); section.id='publicResultsSection'; section.className='shell public-results-section hidden'; const ballot=document.getElementById('ballotSection'); if(ballot?.parentNode)ballot.parentNode.insertBefore(section,ballot); else document.getElementById('publicApp')?.appendChild(section); return section; }
function fmtDate(value){if(!value)return '—';try{return new Intl.DateTimeFormat('pt-MZ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return '—';}}
function fmtDuration(seconds){const total=Number(seconds);if(!Number.isFinite(total)||total<0)return '—';const mins=Math.round(total/60),days=Math.floor(mins/1440),hours=Math.floor((mins%1440)/60),minutes=mins%60,parts=[];if(days)parts.push(`${days}d`);if(hours)parts.push(`${hours}h`);if(minutes||!parts.length)parts.push(`${minutes}min`);return parts.join(' ');}
function renderPublicResults(publication){
 const section=ensurePublicResultSection();if(!publication?.snapshot){section.classList.add('hidden');section.innerHTML='';return;}const snap=publication.snapshot,election=snap.election||{},stats=snap.stats||{},distribution=snap.distribution||{},positions=Array.isArray(snap.positions)?snap.positions:[];
 const realization=election.opens_at&&election.closes_at?`${fmtDate(election.opens_at)} — ${fmtDate(election.closes_at)}`:fmtDate(election.opens_at||election.closes_at);
 let distributionHtml='';if(distribution.enabled){const assignments=Array.isArray(distribution.assignments)?distribution.assignments:[],remaining=Array.isArray(distribution.remaining_candidates)?distribution.remaining_candidates:[];const assignmentHtml=assignments.length?`<div class="public-assignment-grid">${assignments.map(item=>`<article class="public-assignment"><small>${resultEscape(item.role)}</small><strong>${resultEscape(item.candidate_name)}</strong><span>${Number(item.vote_count||0)} voto(s) · ${Number(item.percentage||0)}%</span></article>`).join('')}</div>`:'';const remainingText=distribution.status==='supplements'&&remaining.length?`<p style="margin-top:10px"><strong>Suplentes:</strong> ${remaining.map(item=>resultEscape(item.candidate_name)).join(', ')}</p>`:'';distributionHtml=`<section class="public-distribution"><h3>Distribuição dos cargos por ordem de votos</h3><p>${resultEscape(distribution.note||'Aplicada a regra configurada pela Comissão Eleitoral.')}</p>${assignmentHtml}${remainingText}</section>`;}
 const positionsHtml=positions.map(position=>`<article class="public-result-position"><h3>${resultEscape(position.position_title||'Vaga')}</h3>${(position.candidates||[]).map(candidate=>`<div class="public-result-row"><div class="public-result-person">${candidate.photo_url?`<img src="${resultEscape(candidate.photo_url)}" alt="" loading="lazy" />`:'<span class="public-result-avatar"></span>'}<strong>${resultEscape(candidate.candidate_name)}</strong></div><div class="public-result-bar" aria-label="${Number(candidate.percentage||0)}%"><span style="width:${Math.min(100,Number(candidate.percentage||0))}%"></span></div><div class="public-result-score">${Number(candidate.vote_count||0)}<small>${Number(candidate.percentage||0)}%</small></div></div>`).join('')||'<p>Sem candidatos.</p>'}</article>`).join('');
 section.innerHTML=`<div class="public-results-card"><div class="public-results-head"><div><h2>Resultados oficiais</h2><p>${resultEscape(election.title||'Eleição')} · ${resultEscape(election.organization_name||'AXINENE')}</p></div><span class="public-result-official">✓ Resultado anunciado</span></div><div class="public-result-meta"><article><span>Realização</span><strong>${resultEscape(realization)}</strong></article><article><span>Duração</span><strong>${resultEscape(fmtDuration(election.duration_seconds))}</strong></article><article><span>Participantes</span><strong>${Number(stats.participants||0)} de ${Number(stats.eligible_voters||0)}</strong></article><article><span>Participação</span><strong>${Number(stats.participation_percent||0)}%</strong></article><article><span>Anunciado em</span><strong>${resultEscape(fmtDate(publication.published_at||election.published_at))}</strong></article></div>${distributionHtml}<div class="public-result-positions">${positionsHtml}</div></div>`;section.classList.remove('hidden');
}
async function refreshPublicResults(){try{const response=await fetch(PUBLIC_RESULTS_URL,{method:'GET',headers:{apikey:PUBLIC_RESULTS_KEY,'x-client-info':'axinene-voto-public-results/1.0'},cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok||data?.ok===false)throw new Error(data?.message||'Falha ao consultar resultados.');renderPublicResults(data.publication||null);}catch(error){console.error(error);}}
window.axineneRefreshPublicResults=refreshPublicResults;ensurePublicResultSection();refreshPublicResults();
import('./voter-code-ui.js?v=20260902-0100');
