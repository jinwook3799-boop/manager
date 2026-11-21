/* 감독 인생 시뮬레이터 - 샘플 UI (모바일 세로 우선) */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const POS = G.POS;
  const S = { screen: 'start', tab: 'home', tsub: 'form', ssub: 'ALL', sel: null, startC: 'ENG', startT: 0, startSel: null, name: '', tc: 'ENG', tt: 0, tabsub: 'table', sc: { c: 'ENG', t: 0, team: null }, lastSearch: [], match: null, scoutSub: 'find', toastT: 0, view: null, tr: { sub: 'rec', negPid: null, fc: 'ENG', ft: 0, fteam: null, fpos: 'ALL' }, fxs: [], cur: 0, results: [], fxWeek: 0, auto: { run: false, to: 0, lu: true, win: false, timer: 0 }, hs: null };

  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(S.toastT); S.toastT = setTimeout(() => el.classList.remove('show'), 2200); }
  const W = () => G.world();
  const T = () => G.userTeam();
  const starsHtml = n => { let s = ''; for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '<span class="off">★</span>'; return `<span class="stars">${s}</span>`; };
  const starRange = (lo, hi) => lo === hi ? starsHtml(lo) : `<span class="stars">${'★'.repeat(lo)}<span class="off">${'★'.repeat(hi - lo)}</span></span><small>(${lo}~${hi})</small>`;
  const posB = p => `<span class="badge p-${POS[p]}">${POS[p]}</span>`;
  const attrCls = v => v >= 15 ? 'a-hi' : v >= 10 ? 'a-mid' : 'a-lo';
  const barCls = v => v < 40 ? 'bad' : v < 65 ? 'warn' : '';
  const teamCol = id => `hsl(${(id * 47) % 360},62%,46%)`;
  const lvRating = lv => Math.round(40 + 60 * lv);
  const M = v => (Math.round(v * 10) / 10) + 'M';

  /* ---------- 공통 컴포넌트 ---------- */
  function seg(label, val, labels, attrs) {
    let b = '';
    for (let i = 1; i <= 5; i++) b += `<button class="${i === val ? 'on' : ''}" ${attrs} data-v="${i}">${i}</button>`;
    return `<div class="seg"><div class="segh"><span>${label}</span><b class="good">${labels[val - 1]}</b></div><div class="segb">${b}</div></div>`;
  }
  function selOpts(labels, val) { return labels.map((l, i) => `<option value="${i + 1}" ${i + 1 === val ? 'selected' : ''}>${i + 1} · ${l}</option>`).join(''); }
  function evBadge(e, p) {
    let h = `<div class="row" style="flex-wrap:wrap;gap:4px 12px"><span>현재 ${starRange(e.caLo, e.caHi)}</span><span>잠재 ${starRange(e.paLo, e.paHi)}</span></div>`;
    h += `<small>신뢰도 ${e.rel} · ${e.s}시즌 ${e.w}주차 평가</small>`;
    const gap = e.pa - e.ca;
    if (p.a >= 31) h += ` <span class="chip warn-t">하락 위험</span>`;
    else if (p.a >= 27) h += ` <span class="chip">전성기</span>`;
    else if (gap >= 30) h += ` <span class="chip good">성장 여지 큼</span>`;
    else if (gap >= 12) h += ` <span class="chip">성장 여지 있음</span>`;
    return h;
  }

  // 소속 표시: 6개국 클럽 / 해외 구단(유망주) / 무소속
  function whereOf(p) {
    const w = W();
    if (p.fa) return '무소속 (자유계약)';
    if (p.t >= 0) return esc(w.teams[p.t].name);
    return esc(G.ocName(p)) + ' · ' + ((G.CONTINENTS.find(c => c.id === p.c) || { name: '해외' }).name);
  }
  function joinNote(p) { return G.joinTiming(p) === 'next' ? '<small class="warn-t">지금 계약하면 다음 이적시장이 열릴 때 합류합니다.</small>' : ''; }

  /* ---------- 시작 화면 ---------- */
  function viewStart() {
    const w = W();
    const c = G.COUNTRIES.find(x => x.id === S.startC);
    const L = w.lg[S.startC][S.startT];
    const teams = L.teams.slice().sort((a, b) => w.teams[b].lv - w.teams[a].lv);
    const hasSave = S.hasSave;
    let h = `<div class="hero"><h1>⚽ 감독 인생 시뮬레이터</h1><div class="sub">샘플 버전 · 4부리그 벤치부터 유럽 정상까지</div></div>`;
    h += `<div class="card"><div class="infobox">이 샘플은 PRD v1.0의 핵심(리그·전술·선수 성장·훈련·스카우팅·2D 격자 경기)을 담은 프로토타입입니다. 국내 컵과 챔피언스리그, 경기 중 교체는 아직 없습니다. 클럽·선수 이름은 모두 가상의 임시 이름입니다.</div></div>`;
    if (hasSave) h += `<div class="card"><button class="btn blue full" data-act="loadgame">💾 이어하기 (저장된 게임)</button></div>`;
    h += `<div class="card"><h2>감독 이름</h2><input id="nm" value="${esc(S.name)}" maxlength="12" placeholder="감독 이름 (예: 김감독)" data-chg="name"></div>`;
    h += `<div class="card"><h2>국가 · 리그 선택</h2><div class="row"><select data-chg="startC">${G.COUNTRIES.map(x => `<option value="${x.id}" ${x.id === S.startC ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
      <select data-chg="startT">${[0, 1, 2, 3].map(t => `<option value="${t}" ${t === S.startT ? 'selected' : ''}>${t + 1}부 (${w.lg[S.startC][t].teams.length}팀)</option>`).join('')}</select></div>
      <small>모든 리그에서 팀을 자유롭게 고를 수 있습니다. 강팀일수록 이사회 기대치가 높습니다.</small></div>`;
    h += `<div class="list">`;
    teams.forEach((id, i) => {
      const t = w.teams[id];
      const goal = Math.max(1, Math.round((i + 1) * 0.85));
      h += `<div class="item ${S.startSel === id ? 'on' : ''}" data-act="pickteam" data-id="${id}"><div class="grow"><b>${esc(t.name)}</b><br><small>전력 ${lvRating(t.lv)} · 예산 ${M(t.bud)} · 목표 ${goal}위 이내</small></div><span class="badge">${i + 1}</span></div>`;
    });
    h += `</div>`;
    h += `<div class="pad"><button class="btn pri full" data-act="startgame" ${S.startSel == null ? 'disabled' : ''}>${S.startSel == null ? '팀을 선택하세요' : esc(w.teams[S.startSel].name) + ' 감독으로 시작'}</button></div>`;
    return h;
  }

  /* ---------- 셸 ---------- */
  function shell(content) {
    const w = W(), t = T(), c = G.COUNTRIES.find(x => x.id === t.cid);
    const tabs = [['home', '🏠', '홈'], ['squad', '👥', '스쿼드'], ['tactics', '📋', '전술'], ['train', '🏋️', '훈련'], ['scout', '🔭', '스카우팅'], ['transfer', '💱', '이적'], ['table', '📊', '순위']];
    let h = `<div class="topbar"><div class="row sp"><div><b>${esc(t.name)}</b><br><small>${c.name} ${t.tier + 1}부 · ${w.season}시즌 ${w.state === 'transfer' ? '이적시장 ' + w.tw.turn + '/' + w.tw.max + '턴' : Math.min(w.week, w.MAXW) + '주차'}</small></div><div style="text-align:right"><b class="good">${M(t.bud)}</b><br><small>예산</small></div></div></div>`;
    h += content;
    h += `<div class="nav"><div class="nav-in">${tabs.map(([k, ic, n]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-k="${k}"><span class="ic">${ic}</span>${n}</button>`).join('')}</div></div>`;
    return h;
  }

  /* ---------- 홈 ---------- */
  const ROUND_NAME = { lp: '리그 페이즈', po: '플레이오프', r16: '16강', qf: '8강', sf: '4강', final: '결승' };
  function fxLabel(f) {
    if (f.kind !== 'cl') return '🏟 리그';
    const m = f.meta;
    return `🏆 ${G.CL_NAME} · ${ROUND_NAME[m.round]}${m.round !== 'lp' && m.round !== 'final' ? ' ' + m.leg + '차전' : ''}`;
  }
  function viewHome() {
    const w = W(), u = w.u, t = T(), L = w.lg[t.cid][t.tier];
    if (w.state === 'seasonEnd') return viewSeasonEnd();
    let h = '';
    if (w.state === 'transfer') {
      h += `<div class="card"><h3>이적시장</h3><b style="font-size:16px">${w.tw.turn}/${w.tw.max}턴 · ${w.tw.kind === 'mid' ? '시즌 중 이적시장 (후반기 시작 전)' : w.season + '시즌 개막 전'}</b><br><small>이 기간에 계약한 선수는 바로 합류합니다. 매각, 방출, 임대 보내기, 등번호 변경은 이 기간에만 가능합니다. (협상·계약은 시즌 중에도 되지만 합류는 다음 이적시장)</small>
        <div class="row" style="margin-top:10px"><button class="btn pri grow" data-act="tab" data-k="transfer">💱 이적시장 열기</button><button class="btn grow" data-act="tnext">⏭ 다음 턴</button></div></div>`;
    } else {
      const fxs = G.userFixtures();
      if (fxs.length) {
        h += `<div class="card"><h3>이번 주 경기 (${fxs.length}경기)</h3>`;
        const resume = S.fxs.length && S.cur > 0 && S.cur < S.fxs.length && S.fxWeek === w.season * 100 + w.week;
        fxs.forEach((f, i) => {
          const opp = w.teams[f.opp], done = resume && i < S.cur ? S.results[i] : null;
          const sc = done ? (done.teams[0] === t.id ? done.score[0] + ':' + done.score[1] : done.score[1] + ':' + done.score[0]) : '';
          h += `<div style="margin:6px 0"><small>${fxLabel(f)}</small><br><b style="font-size:15px">${f.home ? '홈' : '원정'} vs ${esc(opp.name)}</b> <small>전력 ${lvRating(opp.lv)}</small>${done ? ` <span class="chip good">✅ 완료 ${sc}</span>` : ''}</div>`;
        });
        if (resume) h += `<div class="infobox">첫 경기가 끝났습니다. 체력이 이미 반영되었으니 스쿼드·전술에서 선발을 바꾼 뒤 남은 경기를 진행하세요.</div>`;
        if (fxs.length > 1) h += `<div class="warnbox">주중 ${G.CL_NAME} 경기가 겹쳐 회복 시간이 부족합니다. 선수 체력이 더 많이 떨어지니 로테이션을 고려하세요.</div>`;
        h += `<div class="row" style="margin-top:8px"><button class="btn pri grow" data-act="prematch">⚽ ${resume ? '남은 경기 진행' : '경기 진행'}</button></div></div>`;
      } else {
        h += `<div class="card"><h3>이번 주</h3><b>경기 없음</b><br><small>훈련과 스카우팅에 집중하세요.</small><div class="row" style="margin-top:10px"><button class="btn pri grow" data-act="skipweek">➡ 다음 주 진행</button></div></div>`;
      }
    }
    if (w.state !== 'seasonEnd') {
      const maxR = L.fx.length, a = S.auto;
      h += `<div class="card"><h3>⏩ 자동 진행</h3>${a.run ? `<b>진행 중… ${w.week}라운드</b> <button class="btn sm danger" data-act="autostop">중지</button>` : `
        <div class="row"><span style="white-space:nowrap">리그</span><input type="number" id="autoTo" min="1" max="${maxR}" value="${Math.min(maxR, Math.max(a.to || 0, w.state === 'play' ? w.week : 1))}" style="width:80px"><span style="white-space:nowrap">라운드까지</span><button class="btn pri grow" data-act="autorun">자동 진행</button></div>
        <label class="row" style="margin-top:6px"><input type="checkbox" id="autoLu" ${a.lu ? 'checked' : ''} style="width:auto;min-height:0"> <small>매 경기 자동 선발(체력 낮은 선수 로테이션)</small></label>
        <label class="row"><input type="checkbox" id="autoWin" ${a.win ? 'checked' : ''} style="width:auto;min-height:0"> <small>이적시장도 자동으로 넘기기(협상 없이 턴만 진행)</small></label>
        <small>내 경기는 즉시 결과로 처리됩니다. 지정한 라운드 경기까지 마치거나 시즌이 끝나면 멈춥니다.${a.win ? '' : ' 이적시장이 열리면 멈춥니다.'}</small>`}</div>`;
    }
    const tbl = G.sortedTable(L), idx = tbl.indexOf(t.id);
    const lu = G.currentLineup(t, true);
    const avg = lu.reduce((a, id) => a + w.P[id].cd, 0) / 11;
    const low = lu.filter(id => w.P[id].cd < 50).length;
    const inj = t.pl.map(id => w.P[id]).filter(p => p.inj);
    h += `<div class="card"><h3>팀 상태</h3><div class="kv"><div>선발 평균 체력<br><b>${Math.round(avg)}%</b></div><div>전술 숙련도<br><b>${Math.round(t.coh)}</b></div><div>포메이션<br><b>${t.form} (${G.TF_LABEL[t.tac.tf - 1]})</b></div><div>시즌 목표<br><b>${u.targetRank}위 이내</b></div><div>연봉 총액<br><b>${M(G.teamWages(t))}</b></div><div>예산<br><b>${M(t.bud)}</b></div></div>`;
    if (low) h += `<div class="warnbox">체력이 낮은 선발 선수가 ${low}명입니다. 훈련 강도를 낮추거나 로테이션하세요.</div>`;
    const exp = t.pl.concat(t.res || []).map(id => w.P[id]).filter(p => !p.loan && G.yearsLeft(p) <= 0);
    if (exp.length) h += `<div class="warnbox">이번 시즌이 끝나면 계약이 만료되는 선수 ${exp.length}명: ${exp.slice(0, 4).map(p => esc(p.n)).join(', ')}${exp.length > 4 ? ' …' : ''}. 재계약하지 않으면 무소속으로 떠납니다. (스쿼드 → 선수 상세 → 재계약)</div>`;
    const nAct = w.tw ? w.tw.neg.filter(n => G.negActive(n)).length : 0, nPend = (w.pendIn || []).length;
    if (nAct || nPend) h += `<div class="infobox">진행 중인 협상 ${nAct}건${nPend ? ` · 다음 이적시장 합류 예정 ${nPend}명` : ''} <button class="btn sm" data-act="gotoneg">협상 보기</button></div>`;
    if (w.state === 'play' && w.u.rlast && w.u.rlast.s === w.season && w.u.rlast.w === w.week) h += `<div class="infobox">이번 주 수요일 2군 경기에 ${w.u.rlast.ids.length}명이 뛰었습니다. 이 선수들을 1군에 올리면 체력이 깎인 상태입니다.</div>`;
    if (inj.length) h += `<div class="warnbox">부상자 ${inj.length}명: ${inj.slice(0, 5).map(p => '#' + p.sn + ' ' + esc(p.n) + '(' + p.inj + '주)').join(', ')}${inj.length > 5 ? ' …' : ''}</div>`;
    h += `</div>`;
    if (w.cl && w.cl.teams.includes(t.id)) {
      const st = w.cl.stage[t.id];
      h += `<div class="card"><h3>🏆 ${G.CL_NAME}</h3><b>${w.cl.phase === 'done' ? G.CL_STAGE_NAME[st] : '진행 중'}</b> <small>· 이번 시즌 출전팀 (순위 탭에서 확인)</small></div>`;
    }
    h += `<div class="card"><h3>순위 (${idx + 1}위)</h3><table class="tbl"><tr><th>#</th><th class="l">팀</th><th>경기</th><th>득실</th><th>승점</th></tr>`;
    const s0 = Math.max(0, Math.min(idx - 2, tbl.length - 5));
    tbl.slice(s0, s0 + 5).forEach((id, k) => { const r = L.tbl[id]; h += `<tr class="${id === t.id ? 'me' : ''}"><td>${s0 + k + 1}</td><td class="l">${esc(w.teams[id].name)}</td><td>${r.p}</td><td>${r.gf - r.ga}</td><td>${r.pts}</td></tr>`; });
    h += `</table></div>`;
    const last = u.hist[u.hist.length - 1];
    if (last) h += `<div class="card"><h3>최근 경기</h3><b>${last.w}주차 ${last.k === 'cl' ? '[마스터스컵] ' : ''}${last.home ? '홈' : '원정'} vs ${esc(last.opp)} ${last.gf}:${last.ga} <span class="${last.r === '승' ? 'good' : last.r === '패' ? 'bad-t' : ''}">(${last.r})</span></b></div>`;
    h += `<div class="card"><h3>소식</h3><div class="log">${u.log.slice(0, 10).map(l => `<div>${esc(l.t)}</div>`).join('') || '<small>소식이 없습니다.</small>'}</div></div>`;
    h += `<div class="pad row"><button class="btn grow" data-act="save">💾 저장</button><button class="btn danger grow" data-act="newgame">새 게임</button></div>`;
    return h;
  }
  function viewSeasonEnd() {
    const w = W(), r = w.report;
    let h = `<div class="card"><h2>🏁 ${r.season}시즌 종료</h2><div class="kv"><div>최종 순위<br><b style="font-size:20px">${r.rank}위</b> <small>/ ${r.N}팀</small></div><div>승점<br><b style="font-size:20px">${r.pts}</b></div></div>
      <p>시즌 목표(${r.target}위 이내): <b class="${r.ok ? 'good' : 'bad-t'}">${r.ok ? '달성 🎉' : '미달'}</b></p>
      <p>결과: <b class="${r.outcome === '승격' ? 'good' : r.outcome === '강등' ? 'bad-t' : ''}">${r.outcome}</b> · 우승: ${esc(r.champ)}</p>
      ${r.cl ? `<p>${G.CL_NAME}: <b class="${r.cl.stage === 'champion' ? 'good' : ''}">${r.cl.name}</b> <small>(우승팀 ${esc(r.cl.champ || '-')})</small></p>` : ''}</div>`;
    if (r.moy) h += `<div class="card"><h3>🏅 올해의 감독상</h3>${r.won ? `<b class="good" style="font-size:16px">수상! ${esc(r.moy.mgr)} 감독</b>` : `<b>${esc(r.moy.mgr)}</b> <small>(${esc(r.moy.tname)})</small>`}<br><small>시즌 전 예상 ${r.moy.exp}위 → 최종 ${r.moy.rank}위. 우승팀이 아니라 기대 이상의 성적을 낸 팀 가운데 추첨합니다.</small></div>`;
    if (r.prize) h += `<div class="card"><h3>💶 이번 시즌 상금</h3><div class="kv"><div>리그 상금<br><b>${M(r.prize.league)}</b></div>${r.prize.promo ? `<div>승격 보너스<br><b>${M(r.prize.promo)}</b></div>` : ''}${r.cl ? `<div>${G.CL_NAME}<br><b>${M(r.prize.cl)}</b> <small>(지급 완료)</small></div>` : ''}</div><small>리그 상금은 다음 시즌 준비 때 예산에 들어오며, 이적시장에서 선수 영입에 쓸 수 있습니다.</small></div>`;
    if (r.topG && r.topG.length) h += `<div class="card"><h3>최고 득점자</h3>${r.topG.map((s, i) => `<div class="cmp"><span>${i + 1}. ${esc(s.n)} <small>${esc(s.t)}</small></span><b>${s.g}골</b></div>`).join('')}</div>`;
    else if (r.scorers.length) h += `<div class="card"><h3>득점 순위</h3>${r.scorers.map((s, i) => `<div class="cmp"><span>${i + 1}. ${esc(s.n)} <small>${esc(s.t)}</small></span><b>${s.g}골</b></div>`).join('')}</div>`;
    if (r.topA && r.topA.length) h += `<div class="card"><h3>최고 도움자</h3>${r.topA.map((s, i) => `<div class="cmp"><span>${i + 1}. ${esc(s.n)} <small>${esc(s.t)}</small></span><b>${s.as}도움</b></div>`).join('')}</div>`;
    if (r.best) h += bestCard(r.best);
    h += `<div class="pad"><small>이 시즌의 최종 순위표와 기록은 순위 탭 → '시즌 기록'에 남습니다.</small></div>`;
    h += `<div class="card"><div class="infobox">다음으로 모든 선수의 나이가 1살 늘고 성장·노화·은퇴, 승강, 연봉 정산이 반영됩니다. 이어서 <b>이적시장(20턴)</b>이 열립니다.</div><button class="btn pri full" data-act="nextseason">▶ ${r.season + 1}시즌 준비 (이적시장으로)</button></div>`;
    return h;
  }

  function bestCard(b) {
    const row = x => `<div class="cmp"><span><span class="badge p-${x.pos}">${x.pos}</span> ${esc(x.n)} <small>${x.a}세 · ${esc(x.t)}</small></span><small>${x.ap}경기 ${x.g}골 ${x.as}도움</small></div>`;
    return `<div class="card"><h3>⭐ 베스트 일레븐 (${b.form})</h3>${b.xi.map(row).join('')}<h3 style="margin-top:10px">후보 7명</h3>${b.subs.map(row).join('')}</div>`;
  }

  /* ---------- 스쿼드 ---------- */
  function numBadge(p) { return `<span class="badge" style="background:#2c3a49;min-width:34px">#${p.sn != null ? p.sn : '-'}</span>`; }
  function gauge(v, label) { return `<div class="bar ${barCls(v)}" style="margin-top:5px"><i style="width:${Math.round(v)}%"></i></div>`; }
  // 최근 3주 안에 오르거나 내린 능력치 옆에 화살표 (초록 ▲ / 빨강 ▼)
  function arrow(p, i) {
    const o = p.dl && p.dl[i];
    if (!o || (W().tick || 0) - o.t > 2) return '';
    return o.d > 0 ? '<span class="up">▲</span>' : '<span class="dn">▼</span>';
  }
  const SQV = [['base', '기본'], ['tech', '기술적'], ['ment', '정신적'], ['phys', '신체적']];
  // 선수 줄 아래에 보여 줄 정보: 기본(키·몸무게·나이·국적) 또는 선택한 분류의 능력치
  function infoLine(p) {
    if (S.sqv === 'base' || !S.sqv) return `<small>키 ${p.h}cm · ${p.kg}kg · ${p.a}세 · ${esc(p.nat)}</small>`;
    const g = S.sqv === 'tech' ? 0 : S.sqv === 'ment' ? 1 : 2;
    let h = '';
    G.ATTRS.forEach((n, i) => {
      const gi = G.ATTR_GROUP[i];
      if (gi !== g && !(g === 0 && gi === 3 && p.p === 0)) return;
      const v = Math.round(p.at[i]);
      h += `<span class="av"><small>${n}</small> <b class="${attrCls(v)}">${v}</b>${arrow(p, i)}</span>`;
    });
    return `<div class="avs">${h}</div>`;
  }
  function yl(p) { return G.yearsLeft(p); }
  function contractChip(p) {
    if (p.loan) return ' <span class="chip warn-t">임대</span>';
    const y = yl(p);
    return y <= 0 ? ' <span class="chip bad-t">계약 만료 임박</span>' : y === 1 ? ' <span class="chip warn-t">계약 1년</span>' : '';
  }
  // 선발·후보를 나눠 보여 주고, 선발을 누른 뒤 후보(또는 다른 선발)를 누르면 맞바꾼다 (경기 중 교체 화면과 같은 방식)
  function lineupEditor() {
    const w = W(), t = T(), lu = G.currentLineup(t, true), slots = G.slotsFor(t.form);
    let sel = S.luSel;
    if (sel && ((sel.k === 's' && !(sel.i < 11)) || (sel.k === 'b' && (!w.P[sel.id] || lu.includes(sel.id) || w.P[sel.id].t !== t.id || w.P[sel.id].r2)))) sel = S.luSel = null;
    const on = new Set(lu);
    let h = `<div class="card"><div class="row sp"><h3 style="margin:0">선발 11명 · ${t.form}</h3><button class="btn sm" data-act="autolu">자동 선발</button></div>
      <div class="infobox">${sel ? (sel.k === 's' ? `<b>#${w.P[lu[sel.i]].sn} ${esc(w.P[lu[sel.i]].n)}</b> 선택됨 → 아래 후보(또는 다른 선발)를 누르면 맞바꿉니다.` : `<b>#${w.P[sel.id].sn} ${esc(w.P[sel.id].n)}</b> 선택됨 → 바꿀 선발 선수를 누르세요.`) : '1) 바꿀 선발 선수를 누르고 2) 들어갈 후보를 누르세요. 오른쪽 › 를 누르면 선수 상세로 갑니다.'}</div></div>`;
    h += `<div class="pad" style="padding-bottom:6px"><b>선발</b></div><div class="list">`;
    lu.forEach((id, i) => {
      const p = w.P[id], s = slots[i];
      const mis = p.p !== s.pos ? ' <span class="chip warn-t">포지션 불일치</span>' : '';
      h += `<div class="item ${sel && sel.k === 's' && sel.i === i ? 'on' : ''}" data-act="lusel" data-k="s" data-i="${i}">${posB(s.pos)}<div class="grow"><b>${numBadge(p)} ${esc(p.n)}</b>${mis}${contractChip(p)}${gauge(p.cd)}${infoLine(p)}</div>
        <div style="text-align:right"><b>${Math.round(p.cd)}%</b><br><button class="btn sm" data-act="player" data-id="${p.id}">›</button></div></div>`;
    });
    h += `</div>`;
    const bench = t.pl.map(id => w.P[id]).filter(p => !on.has(p.id)).sort((a, b) => (a.p - b.p) || ((a.sn || 99) - (b.sn || 99)));
    const pos = sel && sel.k === 's' ? slots[sel.i].pos : null;
    h += `<div class="pad" style="padding-bottom:6px"><b>후보 ${bench.length}명</b>${pos != null ? ` <small>→ ${G.POS[pos]} 자리에 넣을 선수를 고르세요</small>` : ''}</div><div class="list">`;
    bench.forEach(p => {
      const fit = pos != null && p.p !== pos ? ' <span class="chip warn-t">포지션 불일치</span>' : '';
      h += `<div class="item ${sel && sel.k === 'b' && sel.id === p.id ? 'on' : ''} ${p.inj ? 'dis' : ''}" data-act="lusel" data-k="b" data-id="${p.id}">${posB(p.p)}<div class="grow"><b>${numBadge(p)} ${esc(p.n)}</b>${fit}${contractChip(p)}${p.inj ? ` <span class="bad-t">🚑${p.inj}주</span>` : ''}${gauge(p.cd)}${infoLine(p)}${resLine(p)}</div>
        <div style="text-align:right"><b>${Math.round(p.cd)}%</b><br><button class="btn sm" data-act="player" data-id="${p.id}">›</button></div></div>`;
    });
    return h + `</div>`;
  }
  function resLine(p) {
    const w = W(), r = p.rg;
    if (!r || r.s !== w.season || w.week - r.w > 1 || w.state !== 'play') return '';
    const when = r.w === w.week ? '3일 전(이번 주 수요일)' : '지난주 수요일';
    return `<br><small class="warn-t">2군 경기 출전: ${when} · ${r.m}분 · 체력 -${r.loss}%</small>`;
  }
  function viewSquad() {
    const w = W(), t = T();
    if (S.sel != null && w.P[S.sel] && w.P[S.sel].t === t.id) return viewPlayer(w.P[S.sel]);
    const res = t.res || [];
    let h = `<div class="tabs">${[['first', `1군 (${t.pl.length})`], ['res', `2군 (${res.length})`]].map(([k, n]) => `<button class="${(S.sqt || 'first') === k ? 'on' : ''}" data-act="sqt" data-k="${k}">${n}</button>`).join('')}</div>`;
    h += `<div class="tabs"><small style="align-self:center">보기</small>${SQV.map(([k, n]) => `<button class="${(S.sqv || 'base') === k ? 'on' : ''}" data-act="sqv" data-k="${k}">${n}</button>`).join('')}</div>`;
    if ((S.sqt || 'first') === 'first') return h + lineupEditor();
    // 2군
    const f = G.resFixture(t, w.week), last = w.u.rlast;
    h += `<div class="card"><h3>2군 일정</h3><small>2군은 리그를 따로 치르지 않고, 매주 수요일(1군 주말 경기 3일 전)에 경기가 있습니다. 4주마다 한 주는 쉽니다. 2군 경기에 뛴 선수를 1군에 올리면 체력이 깎인 채로 뜁니다.</small>`;
    if (w.state === 'play' && f) h += `<div class="cmp" style="margin-top:6px"><span>이번 주(${w.week}주차) 수요일</span><b>${f.home ? '홈' : '원정'} vs ${esc(w.teams[f.opp].name)} 2군</b></div>`;
    else h += `<div class="cmp" style="margin-top:6px"><span>이번 주</span><b>${w.state === 'play' ? '2군 경기 없음(휴식 주)' : '이적시장 기간 — 2군 경기 없음'}</b></div>`;
    if (last && last.s === w.season) h += `<div class="cmp"><span>최근 경기 ${last.w}주차</span><small>vs ${esc(w.teams[last.opp].name)} 2군 · ${last.ids.length}명 출전</small></div>`;
    h += `</div>`;
    if (!res.length) h += `<div class="pad"><small>2군 선수가 없습니다.</small></div>`;
    h += `<div class="list">`;
    res.map(id => w.P[id]).sort((a, b) => a.p - b.p || a.a - b.a).forEach(p => {
      h += `<div class="item">${posB(p.p)}<div class="grow"><b>${esc(p.n)}</b> <small>${p.a}세</small>${contractChip(p)}${p.inj ? ` <span class="bad-t">🚑${p.inj}주</span>` : ''}${gauge(p.cd)}${infoLine(p)}${resLine(p)}</div>
        <div style="text-align:right;white-space:nowrap"><b>${Math.round(p.cd)}%</b><br><button class="btn sm" data-act="tofirst" data-id="${p.id}">1군↑</button> <button class="btn sm" data-act="player" data-id="${p.id}">›</button></div></div>`;
    });
    return h + `</div>`;
  }
  function tendency(v, lo, hi, loTxt, hiTxt, mid) { return v <= lo ? loTxt : v >= hi ? hiTxt : mid; }
  function viewPlayer(p) {
    const w = W(), t = T(), e = G.ownEval(p);
    const open = w.state === 'transfer';
    const y = yl(p), rn = w.tw && w.tw.neg.find(n => n.pid === p.id && n.kind === 'renew' && G.negActive(n));
    let h = `<div class="pad"><button class="btn sm" data-act="back">← 목록</button></div>`;
    h += `<div class="card"><div class="row sp"><div><h2 style="margin:0">${esc(p.n)}</h2><small>${esc(p.nat)} · ${p.a}세 · ${POS[p.p]} · 키 ${p.h}cm · ${p.kg}kg</small><br><span class="chip ${p.r2 ? 'warn-t' : 'good'}">${p.r2 ? '2군' : '1군'}</span>${contractChip(p)}</div><div style="text-align:right"><b style="font-size:26px">#${p.sn != null ? p.sn : '-'}</b><br><small>등번호</small></div></div>
      <div style="margin-top:8px">${evBadge(e, p)}</div>
      <div style="margin-top:8px"><div class="row sp"><small>체력</small><b>${Math.round(p.cd)}%</b></div>${gauge(p.cd)}${resLine(p)}</div>
      <div class="kv" style="margin-top:8px"><div>현재 능력 <b>${Math.round(p.ca)}</b></div><div>시장 가치 <b>${M(G.valueOf(p))}</b></div><div>연봉 <b>${M(G.wageOf(p))}</b>${p.loan ? ` <small>(임대 · 시즌 후 ${esc(w.teams[p.loan.from] ? w.teams[p.loan.from].name : '원소속팀')} 복귀)</small>` : ''}</div><div>출전 <b>${p.ap}경기 · ${p.g}골</b>${p.rap ? ` <small>(2군 ${p.rap})</small>` : ''}</div></div>
      ${p.inj ? `<div class="warnbox">🚑 부상 중: ${p.inj}주 후 복귀</div>` : ''}</div>`;
    if (!p.loan) {
      h += `<div class="card"><h3>계약</h3><b>${p.ce}시즌까지</b> <small>(${y <= 0 ? '이번 시즌이 끝나면 만료' : '남은 기간 ' + y + '년'})</small>`;
      if (rn) h += `<div class="infobox">재계약 협상 중입니다. 이적 탭 → 협상에서 진행하세요.</div><button class="btn sm blue" data-act="gotoneg">협상 화면으로</button>`;
      else if (y <= 1) h += `<div class="${y <= 0 ? 'warnbox' : 'infobox'}">${y <= 0 ? '재계약하지 않으면 시즌이 끝난 뒤 무소속으로 팀을 떠납니다.' : '계약이 1년 남았습니다. 지금 재계약할 수 있습니다.'}</div><button class="btn pri full" data-act="renew" data-id="${p.id}" ${G.canNegotiate() ? '' : 'disabled'}>🖊 재계약 협상</button>`;
      else h += `<br><small>남은 기간이 1년 이하가 되면 재계약할 수 있습니다.</small>`;
      h += `</div>`;
    }
    h += `<div class="card"><h3>1군 / 2군</h3>${p.r2 ? `<button class="btn full" data-act="tofirst" data-id="${p.id}">1군으로 올리기</button>` : `<button class="btn full" data-act="tores" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>2군으로 내리기</button>`}<small>1군·2군 이동은 이적시장과 관계없이 언제든 할 수 있습니다.</small></div>`;
    h += `<div class="card"><h3>등번호</h3>${open
      ? `<div class="row"><input type="number" min="1" max="99" value="${p.sn != null ? p.sn : ''}" data-chg="setnum" data-id="${p.id}" style="width:90px"><small>이적시장 기간에만 변경 가능합니다. 다른 선수가 쓰는 번호는 서로 맞바꿉니다.</small></div>`
      : `<b>#${p.sn != null ? p.sn : '-'}</b> <small>시즌이 시작되어 변경할 수 없습니다.</small>`}</div>`;
    [0, 1, 2, 3].forEach(g => {
      if (g === 3 && p.p !== 0) return;
      h += `<div class="card"><h3>${G.GROUP_NAME[g]}</h3>`;
      G.ATTRS.forEach((n, i) => {
        if (G.ATTR_GROUP[i] !== g) return;
        const v = p.at[i];
        h += `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v * 5}%"></i></div><span class="v ${attrCls(v)}">${Math.round(v)}${arrow(p, i)}</span></div>`;
      });
      h += `</div>`;
    });
    h += `<div class="pad"><small>▲/▼는 최근 3주 안에 오르거나 내린 능력치입니다. 성장기에도 컨디션·출전 시간에 따라 내릴 수 있고, 나이가 들면 신체 능력부터 내려갑니다.</small></div>`;
    h += `<div class="card"><h3>성향 (스태프 관찰)</h3><div class="kv">
      <div>부상 <b>${tendency(p.ip, 6, 14, '튼튼한 편', '부상이 잦은 편', '보통')}</b></div>
      <div>큰 경기 <b>${tendency(p.bm, 7, 14, '긴장하는 편', '큰 경기에 강함', '보통')}</b></div>
      <div>성장 속도 <b>${tendency(p.dv, 7, 14, '더딘 편', '빠른 편', '보통')}</b></div>
      <div>프로의식 <b>${tendency(p.pr, 7, 14, '낮은 편', '높은 편', '보통')}</b></div></div></div>`;
    h += `<div class="card"><h3>개인 집중 훈련</h3><select data-chg="focus" data-id="${p.id}"><option value="-1">지정 안 함</option>${G.ATTRS.map((n, i) => (p.p !== 0 && i >= 15) || (p.p === 0 && i < 15 && !G.KEY[0].includes(i) && G.ATTR_GROUP[i] !== 2 && i !== 10) ? '' : `<option value="${i}" ${p.ft === i ? 'selected' : ''}>${n}</option>`).join('')}</select><small>선택한 능력치의 성장 속도가 빨라집니다.</small></div>`;
    h += `<div class="pad">${open && !p.loan ? `<button class="btn danger full" data-act="release" data-id="${p.id}">선수 방출 (계약 해지 → 무소속)</button>` : `<small>선수 방출·이적은 이적시장 기간에만 가능합니다.</small>`}</div>`;
    return h;
  }

  /* ---------- 전술 ---------- */
  function viewTactics() {
    const w = W(), t = T();
    const subs = [['form', '포메이션'], ['team', '팀 전술'], ['indiv', '개인 전술'], ['sp', '세트피스']];
    let h = `<div class="tabs">${subs.map(([k, n]) => `<button class="${S.tsub === k ? 'on' : ''}" data-act="tsub" data-k="${k}">${n}</button>`).join('')}</div>`;
    const lu = G.currentLineup(t, true);
    if (S.tsub === 'form') {
      h += `<div class="card"><h3>포메이션</h3><div class="row" style="flex-wrap:wrap">${G.FORMATION_LIST.map(f => `<button class="btn sm ${t.form === f ? 'blue' : ''}" data-act="form" data-f="${f}">${f}</button>`).join('')}</div></div>`;
      h += `<div class="card">${seg('포메이션 성향', t.tac.tf, G.TF_LABEL, 'data-act="tac" data-k="tf"')}</div>`;
      const R = G._debug.makeSide(t, lu, true, true).R;
      h += `<div class="card"><h3>팀 능력 (선발 기준)</h3><div class="kv"><div>공격 <b>${R.A.toFixed(1)}</b></div><div>중원 <b>${R.M.toFixed(1)}</b></div><div>수비 <b>${R.D.toFixed(1)}</b></div><div>골키퍼 <b>${R.G.toFixed(1)}</b></div></div><small>전술 숙련도 ${Math.round(t.coh)} (전술을 자주 바꾸면 낮아지고, 전술 훈련으로 오릅니다)</small></div>`;
      h += lineupEditor();
    } else if (S.tsub === 'team') {
      h += `<div class="card">${G.TACTIC_DEFS.map(d => seg(d.n, t.tac[d.k], d.l, `data-act="tac" data-k="${d.k}"`)).join('')}</div>`;
      h += `<div class="infobox">템포·압박이 높으면 공격 기회가 늘지만 체력 소모와 부상 위험이 커집니다. 높은 수비 라인은 직접 플레이하는 상대에게 뒷공간을 내줄 수 있습니다.</div>`;
    } else if (S.tsub === 'indiv') {
      h += `<div class="pad"><small>선발 선수별 세부 지시 (전진성·슈팅 빈도·패스 위험도)</small></div>`;
      const slots = G.slotsFor(t.form);
      lu.forEach((id, i) => {
        const p = w.P[id]; const pt = t.pt[id] || { adv: 3, shoot: 3, risk: 3 };
        h += `<div class="card"><div class="row">${posB(slots[i].pos)}<b>#${p.sn} ${esc(p.n)}</b></div><div class="kv" style="margin-top:8px">${G.PT_DEFS.map(d => `<div><small>${d.n}</small><select data-chg="pt" data-id="${id}" data-k="${d.k}">${selOpts(d.l, pt[d.k])}</select></div>`).join('')}</div></div>`;
      });
    } else {
      h += `<div class="card">${G.SP_DEFS.map(d => seg(d.n, t.tac[d.k], d.l, `data-act="tac" data-k="${d.k}"`)).join('')}</div>`;
      h += `<div class="infobox">세트피스 결과는 선수들의 헤딩·세트피스 능력과 상대 수비 능력에 좌우됩니다. 세트피스 훈련으로 능력치를 올리세요.</div>`;
    }
    return h;
  }

  /* ---------- 훈련 ---------- */
  function viewTrain() {
    const w = W(), u = w.u, t = T(), tr = u.train;
    const opt = v => G.TRAIN.map((c, i) => `<option value="${i}" ${i === v ? 'selected' : ''}>${c.k}</option>`).join('');
    let h = `<div class="card"><h3>주간 훈련 계획</h3>
      <div class="seg"><div class="segh"><span>훈련 1</span></div><select data-chg="trA">${opt(tr.a)}</select><small>${G.TRAIN[tr.a].d}</small></div>
      <div class="seg"><div class="segh"><span>훈련 2</span></div><select data-chg="trB">${opt(tr.b)}</select><small>${G.TRAIN[tr.b].d}</small></div>
      ${seg('훈련 강도', tr.i, G.INT_LABEL, 'data-act="trI"')}</div>`;
    const hasGK = tr.a === 2 || tr.b === 2;
    if (!hasGK) h += `<div class="warnbox">골키퍼 훈련이 없어 GK의 성장이 더딥니다.</div>`;
    if (tr.i >= 4) h += `<div class="warnbox">강도가 높아 성장은 빠르지만 피로 누적과 부상 위험이 커집니다. 컨디션을 확인하세요.</div>`;
    const avg = t.pl.reduce((a, id) => a + w.P[id].cd, 0) / t.pl.length;
    h += `<div class="card"><h3>선수단 컨디션</h3><div class="bar ${barCls(avg)}"><i style="width:${avg}%"></i></div><small>평균 ${Math.round(avg)}% · 부상 ${t.pl.filter(id => w.P[id].inj).length}명 · 전술 숙련도 ${Math.round(t.coh)}</small></div>`;
    h += `<div class="card"><h3>지난 주 훈련 결과</h3><div class="log">${u.chg.length ? u.chg.slice(0, 15).map(c => `<div>${esc(c)}</div>`).join('') : '<small>아직 결과가 없습니다. 주를 진행하면 능력치 변화가 표시됩니다.</small>'}</div></div>`;
    h += `<div class="infobox">나이가 어리고 성장 속도·잠재력 여유가 클수록 훈련 효과가 큽니다. 포지션과 맞지 않는 훈련은 효과가 줄어듭니다.</div>`;
    return h;
  }

  /* ---------- 스카우팅 ---------- */
  function playerCard(p, opts) {
    const w = W(); const e = w.u.evals[p.id];
    const nb = G.negBlock(p.id), lb = G.loanBlock(p.id) || (G.canNegotiate() ? null : '협상 불가');
    const ctr = p.t >= 0 ? ` · 계약 ${Math.max(0, G.yearsLeft(p))}년 남음` : '';
    let h = `<div class="card"><div class="row sp"><div class="row" data-act="oview" data-id="${p.id}" style="cursor:pointer">${posB(p.p)}<div><b>${esc(p.n)} ›</b><br><small>${p.a}세 · ${esc(p.nat)} · ${whereOf(p)}${ctr}</small></div></div></div>`;
    h += `<div style="margin-top:8px">${e ? evBadge(e, p) : '<small>⚪ 미평가 — 판단 시도로 현재/잠재 능력을 평가하세요.</small>'}</div>`;
    h += `<div class="row" style="margin-top:10px"><button class="btn sm blue grow" data-act="judge" data-id="${p.id}">🔍 판단 (${w.u.att.j}회)</button><button class="btn sm grow" ${nb ? 'disabled' : ''} data-act="neg" data-id="${p.id}">✍️ ${p.fa ? '개인 협상' : '이적 협상'}</button>${p.t >= 0 ? `<button class="btn sm grow" data-act="loan" data-id="${p.id}" ${lb ? 'disabled' : ''}>임대</button>` : ''}</div>${nb && p.t < 0 ? `<small class="warn-t">${esc(nb)}</small>` : (!nb ? joinNote(p) : '')}</div>`;
    return h;
  }
  function viewScout() {
    const w = W(), u = w.u, t = T();
    let h = `<div class="card"><div class="kv"><div>탐색 능력<br><b style="font-size:18px">${t.sS}</b>/10</div><div>판단 능력<br><b style="font-size:18px">${t.sJ}</b>/10</div><div>탐색 시도<br><b>${u.att.s}회 남음</b></div><div>판단 시도<br><b>${u.att.j}회 남음</b></div></div>
      <small>종합 정확도 ${Math.sqrt(t.sS * t.sJ).toFixed(1)} · 탐색·판단이 둘 다 높을수록 평가가 정확합니다. 시도 횟수는 매주 초기화됩니다.</small></div>`;
    const subs = [['find', '탐색 (대륙)'], ['judge', '판단 (타 팀)'], ['watch', '관찰 목록']];
    h += `<div class="tabs">${subs.map(([k, n]) => `<button class="${S.scoutSub === k ? 'on' : ''}" data-act="ssc" data-k="${k}">${n}</button>`).join('')}</div>`;
    if (S.scoutSub === 'find') {
      h += `<div class="card"><h3>대륙을 지정해 15~21세 유망주 탐색 (1회 2명)</h3><div class="row" style="flex-wrap:wrap">${G.CONTINENTS.map(c => `<button class="btn sm" data-act="search" data-c="${c.id}" ${u.att.s <= 0 ? 'disabled' : ''}>${c.name}</button>`).join('')}</div></div>`;
      if (S.lastSearch.length) { h += `<div class="pad"><small>방금 발견한 선수</small></div>`; S.lastSearch.forEach(id => { if (w.P[id]) h += playerCard(w.P[id]); }); }
    } else if (S.scoutSub === 'judge') {
      const c = S.sc.c, tier = S.sc.t;
      const tms = w.lg[c][tier].teams.filter(id => id !== t.id);
      if (S.sc.team == null || !tms.includes(S.sc.team)) S.sc.team = tms[0];
      h += `<div class="card"><h3>다른 팀의 선수를 지정해 평가 (전 연령)</h3><div class="row"><select data-chg="scC">${G.COUNTRIES.map(x => `<option value="${x.id}" ${x.id === c ? 'selected' : ''}>${x.name}</option>`).join('')}</select><select data-chg="scT">${[0, 1, 2, 3].map(x => `<option value="${x}" ${x === tier ? 'selected' : ''}>${x + 1}부</option>`).join('')}</select></div>
        <select style="margin-top:8px" data-chg="scTeam">${tms.map(id => `<option value="${id}" ${id === S.sc.team ? 'selected' : ''}>${esc(w.teams[id].name)}</option>`).join('')}</select></div>`;
      const pl = w.teams[S.sc.team].pl.map(id => w.P[id]).sort((a, b) => (a.a - b.a));
      pl.forEach(p => { h += playerCard(p); });
    } else {
      const ids = u.seen.filter(id => w.P[id] && w.P[id].t !== t.id);
      if (!ids.length) h += `<div class="pad"><small>아직 관찰 중인 선수가 없습니다. 탐색이나 판단으로 선수를 추가하세요.</small></div>`;
      ids.slice().reverse().slice(0, 40).forEach(id => { h += playerCard(w.P[id]); });
    }
    return h;
  }

  /* ---------- 순위 ---------- */
  function viewTable() {
    const w = W(), t = T();
    const subs = [['table', '순위표'], ['sched', '내 일정'], ['top', '득점·도움'], ['cl', '마스터스컵'], ['hist', '시즌 기록']];
    let h = `<div class="tabs">${subs.map(([k, n]) => `<button class="${S.tabsub === k ? 'on' : ''}" data-act="tsb" data-k="${k}">${n}</button>`).join('')}</div>`;
    const c = G.COUNTRIES.find(x => x.id === S.tc);
    const L = w.lg[S.tc][S.tt];
    if (S.tabsub === 'hist') return h + viewHistory();
    if (S.tabsub !== 'sched' && S.tabsub !== 'cl') h += `<div class="card"><div class="row"><select data-chg="tc">${G.COUNTRIES.map(x => `<option value="${x.id}" ${x.id === S.tc ? 'selected' : ''}>${x.name}</option>`).join('')}</select><select data-chg="tt">${[0, 1, 2, 3].map(x => `<option value="${x}" ${x === S.tt ? 'selected' : ''}>${x + 1}부</option>`).join('')}</select></div></div>`;
    if (S.tabsub === 'cl') return h + viewCL();
    if (S.tabsub === 'table') {
      const tb = G.sortedTable(L), N = tb.length;
      const up = S.tt > 0 ? c.ud[S.tt - 1] : 0, dn = S.tt < 3 ? c.ud[S.tt] : 0;
      h += `<div class="card" style="padding:6px"><table class="tbl"><tr><th>#</th><th class="l">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr>`;
      tb.forEach((id, i) => { const r = L.tbl[id]; h += `<tr class="${id === t.id ? 'me' : ''} ${i < up ? 'up' : ''} ${i >= N - dn ? 'dn' : ''}"><td>${i + 1}</td><td class="l">${esc(w.teams[id].name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`; });
      h += `</table></div><div class="pad"><small>초록: 승격권 · 빨강: 강등권 (직행 승강, ${up ? '승격 ' + up + '팀' : ''}${up && dn ? ' / ' : ''}${dn ? '강등 ' + dn + '팀' : ''})</small></div>`;
    } else if (S.tabsub === 'top') {
      const top = [];
      L.teams.forEach(id => w.teams[id].pl.forEach(pid => { const p = w.P[pid]; if (p.g > 0 || p.as > 0) top.push({ n: p.n, t: w.teams[id].name, g: p.g, as: p.as || 0, a: p.ap }); }));
      const tb = (arr, k, lab) => `<div class="card"><h3>${lab}</h3><table class="tbl"><tr><th>#</th><th class="l">선수</th><th class="l">팀</th><th>${k === 'g' ? '골' : '도움'}</th></tr>${arr.slice(0, 15).map((s, i) => `<tr><td>${i + 1}</td><td class="l">${esc(s.n)}</td><td class="l"><small>${esc(s.t)}</small></td><td><b>${s[k]}</b></td></tr>`).join('') || '<tr><td colspan="4">기록 없음</td></tr>'}</table></div>`;
      h += tb(top.filter(x => x.g > 0).sort((a, b) => b.g - a.g), 'g', '득점 순위');
      h += tb(top.filter(x => x.as > 0).sort((a, b) => b.as - a.as), 'as', '도움 순위');
    } else {
      const L2 = w.lg[t.cid][t.tier];
      h += `<div class="card"><h3>지난 경기</h3>${w.u.hist.length ? w.u.hist.slice().reverse().slice(0, 12).map(x => `<div class="cmp"><span>${x.w}주 ${x.k === 'cl' ? '🏆' : ''}${x.home ? 'H' : 'A'} ${esc(x.opp)}</span><b class="${x.r === '승' ? 'good' : x.r === '패' ? 'bad-t' : ''}">${x.gf}:${x.ga} ${x.r}</b></div>`).join('') : '<small>경기 기록이 없습니다.</small>'}</div>`;
      let up = ''; for (let wk = w.week; wk < w.week + 6 && wk <= L2.fx.length; wk++) { const m = L2.fx[wk - 1].find(([a, b]) => a === t.id || b === t.id); if (m) { const home = m[0] === t.id, o = w.teams[home ? m[1] : m[0]]; up += `<div class="cmp"><span>${wk}주 ${home ? 'H' : 'A'} ${esc(o.name)}</span><small>전력 ${lvRating(o.lv)}</small></div>`; } }
      h += `<div class="card"><h3>다음 일정</h3>${up || '<small>남은 경기가 없습니다.</small>'}</div>`;
    }
    return h;
  }

  function viewHistory() {
    const w = W(), arc = w.archive || [];
    if (!arc.length) return `<div class="card"><h3>시즌 기록</h3><small>아직 끝난 시즌이 없습니다. 시즌이 끝나면 최종 순위, 기록, 득점·도움 1위, 베스트 일레븐과 후보 7명, 올해의 감독이 여기에 남습니다.</small></div>`;
    if (S.hs == null || !arc[S.hs]) S.hs = arc.length - 1;
    const e = arc[S.hs];
    let h = `<div class="card"><select data-chg="hs">${arc.map((x, i) => `<option value="${i}" ${i === S.hs ? 'selected' : ''}>${x.season}시즌 · ${esc(x.lname)}</option>`).join('')}</select>
      <p style="margin:8px 0 0">내 팀 <b>${esc(e.me.team)}</b> <b class="good">${e.me.rank}위</b> / ${e.me.N}팀${e.cl ? ` · ${G.CL_NAME} 우승 ${esc(e.cl)}` : ''}</p></div>`;
    h += `<div class="card" style="padding:6px"><h3 style="padding:6px">최종 순위 · ${esc(e.lname)}</h3><table class="tbl"><tr><th>#</th><th class="l">팀</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>승점</th></tr>${e.table.map(r => `<tr class="${r.n === e.me.team ? 'me' : ''}"><td>${r.rk}</td><td class="l">${esc(r.n)}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table></div>`;
    const list = (arr, k, unit) => arr.length ? arr.map((s, i) => `<div class="cmp"><span>${i + 1}. ${esc(s.n)} <small>${esc(s.t)}</small></span><b>${s[k]}${unit}</b></div>`).join('') : '<small>기록 없음</small>';
    h += `<div class="card"><h3>최고 득점자</h3>${list(e.topG, 'g', '골')}<h3 style="margin-top:10px">최고 도움자</h3>${list(e.topA, 'as', '도움')}<small>득점·도움은 리그와 ${G.CL_NAME}를 합친 기록입니다.</small></div>`;
    h += bestCard(e.best);
    const my = e.awards.find(a => a.c === G.COUNTRIES.find(c => c.id === e.cid).name && a.tier === e.tier + 1);
    h += `<div class="card"><h3>🏅 올해의 감독상</h3>${e.awards.map(a => `<div class="cmp"><span>${esc(a.c)} ${a.tier}부${a.me ? ' <b class="good">(나)</b>' : ''}</span><small>${esc(a.mgr)} · ${esc(a.tname)} (예상 ${a.exp}위→${a.rank}위)</small></div>`).join('')}</div>`;
    h += `<div class="card"><h3>리그별 우승팀</h3>${e.champs.map(c => `<div class="cmp"><span>${esc(c.c)}</span><small>${c.teams.map((n, i) => (i + 1) + '부 ' + esc(n)).join(' · ')}</small></div>`).join('')}</div>`;
    return h;
  }

  /* ---------- 다른 팀/무소속 선수 상세 (스카우팅 정확도에 따른 오차 포함) ---------- */
  function viewOther(p) {
    const w = W(), t = T();
    if (p.t === t.id) return viewPlayer(p);
    const e = w.u.evals[p.id];
    const Gq = Math.sqrt(t.sS * t.sJ), sp = 30 - 2.67 * (Gq - 1);
    let sig = (0.4 * sp) / 10;          // 능력치(1~20 척도) 관찰 오차
    if (e) sig *= 0.5;                  // 판단을 해 본 선수는 더 정확하게 보임
    const amp = sig * 1.73;
    const fz = i => { let x = (p.id * 9301 + i * 49297 + w.season * 233) % 233280; x = (x * 9301 + 49297) % 233280; return x / 233280 * 2 - 1; };
    const rel = sig < 0.4 ? '높음' : sig < 0.8 ? '보통' : '낮음';
    const where = whereOf(p);
    const est = G.twEst(p.id);
    let h = `<div class="pad"><button class="btn sm" data-act="oback">← 돌아가기</button></div>`;
    h += `<div class="card"><div class="row sp"><div><h2 style="margin:0">${esc(p.n)}</h2><small>${esc(p.nat)} · ${p.a}세 · ${POS[p.p]} · ${where}</small></div>${p.t >= 0 && p.sn != null ? `<div style="text-align:right"><b style="font-size:26px">#${p.sn}</b><br><small>등번호</small></div>` : ''}</div>
      <div style="margin-top:8px">${e ? evBadge(e, p) : '<small>⚪ 미평가 — 판단 시도로 현재/잠재 능력 ★를 확인하세요.</small>'}</div>
      <div class="kv" style="margin-top:8px"><div>예상 몸값 <b>≈ ${M(est)}</b></div><div>예상 요구 연봉 <b>≈ ${M(G.r1(G.marketWage(p)))}</b></div>${p.t >= 0 ? `<div>계약 <b>${Math.max(0, G.yearsLeft(p))}년 남음</b></div><div>키·몸무게 <b>${p.h}cm · ${p.kg}kg</b></div>` : `<div>키·몸무게 <b>${p.h}cm · ${p.kg}kg</b></div>`}<div>${p.inj ? `상태 <b class="bad-t">🚑 부상 ${p.inj}주</b>` : '상태 <b>정상</b>'}</div><div>정보 신뢰도 <b>${rel}</b></div></div>
      <small>능력치는 우리 팀의 스카우팅 정확도(${Gq.toFixed(1)})만큼의 오차가 있습니다. ${e ? '판단을 거친 선수라 오차가 줄었습니다.' : '판단을 하면 더 정확해집니다.'}</small></div>`;
    [0, 1, 2, 3].forEach(g => {
      if (g === 3 && p.p !== 0) return;
      h += `<div class="card"><h3>${G.GROUP_NAME[g]}</h3>`;
      G.ATTRS.forEach((n, i) => {
        if (G.ATTR_GROUP[i] !== g) return;
        const v = Math.max(1, Math.min(20, Math.round(p.at[i] + fz(i) * amp)));
        h += `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v * 5}%"></i></div><span class="v ${attrCls(v)}">${v}</span></div>`;
      });
      h += `</div>`;
    });
    h += `<div class="card"><div class="row"><button class="btn blue grow" data-act="judge" data-id="${p.id}">🔍 판단 (${w.u.att.j}회)</button><button class="btn pri grow" ${G.negBlock(p.id) ? 'disabled' : ''} data-act="neg" data-id="${p.id}">💬 ${p.fa ? '개인 협상' : '이적 협상'}</button>${p.t >= 0 ? `<button class="btn grow" data-act="loan" data-id="${p.id}" ${G.loanBlock(p.id) ? 'disabled' : ''}>임대</button>` : ''}</div><small>${G.negBlock(p.id) ? esc(G.negBlock(p.id)) + ' ' : ''}${p.t >= 0 && G.loanBlock(p.id) ? '임대 불가: ' + G.loanBlock(p.id) + ' · ' : ''}협상은 시즌 중에도 할 수 있지만, 이적시장 밖에서 계약한 선수는 다음 이적시장에 합류합니다. 무소속 선수는 언제든 바로 합류합니다.</small></div>`;
    return h;
  }

  /* ---------- 이적시장 ---------- */
  const NEG_STATUS = { pending: '⏳ 답변 대기', counter: '🔁 상대 요구', open: '📝 제안 필요', rejected: '❌ 거절', done: '✅ 계약 완료', failed: '🚫 결렬', lost: '🚫 무산', cancelled: '⛔ 중단' };
  const NEG_KIND = n => n.kind === 'renew' ? '재계약' : n.kind === 'loan' ? '임대 협상' : n.fa ? '무소속 개인 계약' : n.oc ? '해외 구단 이적' : '이적 협상';
  function negCard(n) {
    const w = W(), t = T(), p = w.P[n.pid];
    if (!p) return '';
    const live = G.negActive(n);
    let h = `<div class="card" style="margin:8px 14px"><div class="row sp"><div class="row" data-act="${n.kind === 'renew' ? 'player' : 'oview'}" data-id="${p.id}" style="cursor:pointer">${posB(p.p)}<div><b>${esc(p.n)} ›</b><br><small>${p.a}세 · ${n.kind === 'renew' ? '내 선수 · 계약 ' + p.ce + '시즌까지' : whereOf(p)} · ${NEG_KIND(n)}</small></div></div><span class="chip">${NEG_STATUS[n.status]}</span></div>`;
    if (n.msg) h += `<div class="infobox" style="margin-top:8px">${esc(n.msg)}</div>`;
    if (live && n.kind !== 'renew' && n.join === 'next') h += `<small class="warn-t">계약되면 다음 이적시장이 열릴 때 합류합니다.</small>`;
    if (n.stage === 'club') {
      h += `<div class="kv" style="margin-top:6px"><div><small>내 제안</small><br><b>${M(n.offer)}</b></div>${n.status === 'counter' ? `<div><small>구단이 원하는 금액</small><br><b class="warn-t">${M(n.counter)}</b></div>` : ''}</div>`;
      if (n.status === 'counter') h += `<div class="row" style="margin-top:8px"><button class="btn sm pri grow" data-act="tacc" data-id="${n.id}">요구 금액 수락 (${M(n.counter)})</button></div>`;
      if (n.status === 'counter' || n.status === 'rejected') h += `<div class="row" style="margin-top:8px"><input type="number" step="0.1" min="0" id="fee_${n.id}" value="${G.r1(n.status === 'counter' ? (n.offer + n.counter) / 2 : n.offer * 1.15)}"><button class="btn sm blue" style="white-space:nowrap" data-act="tclub" data-id="${n.id}">새 제안</button></div>`;
    } else if (n.stage === 'player') {
      const hint = G.r1(G.marketWage(p));
      h += `<div class="kv" style="margin-top:6px">${n.kind === 'renew' ? `<div><small>현재 연봉</small><br><b>${M(G.wageOf(p))}</b></div>` : `<div><small>${n.fa ? '이적료' : '합의 이적료'}</small><br><b>${M(n.fee || 0)}</b></div>`}<div><small>시장 연봉(추정)</small><br><b>≈ ${M(hint)}</b></div>${n.offerW != null ? `<div><small>내 제안</small><br><b>${M(n.offerW)} × ${n.offerY}년</b></div>` : ''}${n.status === 'counter' ? `<div><small>선수가 원하는 조건</small><br><b class="warn-t">${M(n.counterW)} × ${n.dem.y}년</b></div>` : ''}</div>`;
      if (n.status === 'counter') h += `<div class="row" style="margin-top:8px"><button class="btn sm pri grow" data-act="tpacc" data-id="${n.id}">요구 수락 (연봉 ${M(n.counterW)})</button></div>`;
      if (n.status === 'open' || n.status === 'counter' || n.status === 'rejected') {
        const defW = n.status === 'counter' ? (n.offerW + n.counterW) / 2 : (n.offerW != null ? n.offerW * 1.1 : hint);
        const defY = n.dem ? n.dem.y : 3;
        h += `<div class="row" style="margin-top:8px"><input type="number" step="0.05" min="0" id="wage_${n.id}" value="${Math.round((n.status === 'open' ? hint : defW) * 100) / 100}" style="flex:2"><select id="yrs_${n.id}" style="flex:1">${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${y === defY ? 'selected' : ''}>${n.kind === 'renew' ? '+' : ''}${y}년</option>`).join('')}</select><button class="btn sm blue" style="white-space:nowrap" data-act="tplayer" data-id="${n.id}">연봉 제안</button></div>
          <small>${n.kind === 'renew' ? '재계약은 계약을 선택한 연수만큼 연장합니다. 계약금(연봉의 50%)을 지불합니다.' : '총 지출 = 이적료 + 계약금(연봉의 50%)'} · 현재 예산 ${M(t.bud)}</small>`;
      }
    }
    if (live) h += `<div class="row" style="margin-top:8px"><button class="btn sm danger" data-act="tcancel" data-id="${n.id}">협상 중단</button></div>`;
    return h + `</div>`;
  }
  function recRow(it) {
    const w = W(), t = T(), p = w.P[it.id];
    if (!p || p.t === t.id) return '';
    const lb = G.loanBlock(p.id) || (G.canNegotiate() ? null : 'x'), nb = G.negBlock(p.id);
    return `<div class="item" style="flex-wrap:wrap;background:transparent;border-bottom:1px solid var(--line)">
      <div class="row grow" data-act="oview" data-id="${p.id}" style="cursor:pointer;min-width:60%">${posB(p.p)}<div><b>${esc(p.n)} ›</b> <small>${p.a}세</small><br><small>${whereOf(p)} · 몸값 ≈ ${M(G.twEst(p.id))}${p.t >= 0 ? ' · 계약 ' + Math.max(0, G.yearsLeft(p)) + '년' : ''}</small></div></div>
      <div style="text-align:right"><small>현재</small> ${starsHtml(G.star(it.ca))}<br><small>잠재</small> ${starsHtml(G.star(it.pa))}</div>
      <div style="width:100%"><span class="chip good">${esc(it.why)}</span></div>
      <div class="row" style="width:100%;margin-top:6px"><button class="btn sm pri grow" ${nb ? 'disabled' : ''} data-act="neg" data-id="${p.id}">이적 협상</button><button class="btn sm grow" ${lb ? 'disabled' : ''} data-act="loan" data-id="${p.id}">임대</button></div>${nb ? `<small class="warn-t">${esc(nb)}</small>` : ''}</div>`;
  }
  function newNegForm(p) {
    const w = W(), est = G.twEst(p.id), loan = S.tr.negKind === 'loan';
    let h = `<div class="card"><h3>${loan ? '새 임대 협상' : p.fa ? '무소속 선수 개인 협상' : '새 이적 협상'}</h3><div class="row">${posB(p.p)}<div><b>${esc(p.n)}</b><br><small>${p.a}세 · ${whereOf(p)}${p.t >= 0 ? ' · 계약 ' + Math.max(0, G.yearsLeft(p)) + '년 남음' : ''}</small></div></div>`;
    if (loan) h += `<div class="infobox" style="margin-top:8px">임대료는 예상 몸값(약 <b>${M(est)}</b>)의 10~15% 수준입니다. 선수 연봉은 우리 팀이 부담하고, 시즌이 끝나면 원소속팀으로 돌아갑니다. 주전급·고능력 선수는 임대할 수 없습니다.</div>
      <div class="row" style="margin-top:8px"><input type="number" step="0.1" min="0" id="fee_start" value="${G.r1(est * 0.14)}"><button class="btn pri" style="white-space:nowrap" data-act="tstart" data-id="${p.id}">임대 제안</button></div>`;
    else if (p.fa) h += `<div class="infobox" style="margin-top:8px">계약이 끝나 팀을 떠난 무소속 선수입니다. <b>이적료 없이</b> 개인 계약(연봉·기간)만 맺으면 되고, 계약하면 <b>이적시장과 관계없이 바로</b> 스쿼드에 합류합니다. 예상 요구 연봉 ≈ ${M(G.r1(G.marketWage(p)))}</div><div class="row" style="margin-top:8px"><button class="btn pri grow" data-act="tstart" data-id="${p.id}">개인 협상 시작</button></div>`;
    else if (p.t < 0) h += `<div class="infobox" style="margin-top:8px">스카우터가 발굴한 유망주로, <b>${esc(G.ocName(p))}</b> 소속입니다. 6개국 리그 밖의 작은 구단이라 유럽 1~4부 구단보다 이적료가 훨씬 쌉니다. 예상 몸값 ≈ <b>${M(est)}</b> (발굴 선수라 요구 연봉도 조금 낮습니다)</div>
      <div class="row" style="margin-top:8px"><input type="number" step="0.1" min="0" id="fee_start" value="${G.r1(Math.max(0.1, est * 0.45))}"><button class="btn pri" style="white-space:nowrap" data-act="tstart" data-id="${p.id}">제안 보내기</button></div>`;
    else {
      const rf = G.refuseChance(p);
      h += `<div class="infobox" style="margin-top:8px">예상 몸값 약 <b>${M(est)}</b> (스카우팅 정확도에 따라 오차가 있습니다). 구단은 ${W().state === 'transfer' ? '다음 턴' : '다음 주'}에 답합니다. 크게 모자라면 거절하고, 타협의 여지가 있으면 원하는 금액을 말합니다. 흥정에 응하는 구단은 제안을 거듭할수록 요구액을 조금씩 낮추고, 그렇지 않은 구단은 처음 금액을 고수합니다.</div>
        ${rf >= 0.3 ? `<div class="warnbox">팀의 핵심 선수이고 계약이 ${Math.max(0, G.yearsLeft(p))}년 남아 있어, 구단이 금액과 관계없이 판매를 거부할 수 있습니다.</div>` : ''}
        <div class="row" style="margin-top:8px"><input type="number" step="0.1" min="0" id="fee_start" value="${G.r1(est * 1.15)}"><button class="btn pri" style="white-space:nowrap" data-act="tstart" data-id="${p.id}">제안 보내기</button></div>`;
    }
    h += joinNote(p);
    return h + `<div class="row" style="margin-top:8px"><button class="btn sm" data-act="tclose">닫기</button></div></div>`;
  }
  function faList() {
    const w = W(), tr = S.tr;
    let h = `<div class="pad"><small>계약이 끝나 팀을 떠난 <b>무소속 선수</b>입니다. 이적료 없이 개인 계약만 하면 되고, 이적시장과 관계없이 계약 즉시 합류합니다. 다른 구단도 무소속 선수를 데려가니 서두르세요.</small></div>`;
    h += `<div class="tabs">${['ALL', 'GK', 'DF', 'MF', 'FW'].map(f => `<button class="${tr.fpos === f ? 'on' : ''}" data-act="tfpos" data-k="${f}">${f === 'ALL' ? '전체' : f}</button>`).join('')}</div>`;
    let pl = (w.fa || []).map(id => w.P[id]).filter(Boolean);
    if (tr.fpos !== 'ALL') pl = pl.filter(p => POS[p.p] === tr.fpos);
    pl.sort((a, b) => G.twEst(b.id) - G.twEst(a.id));
    if (!pl.length) h += `<div class="pad"><small>조건에 맞는 무소속 선수가 없습니다.</small></div>`;
    pl.slice(0, 40).forEach(p => { h += playerCard(p); });
    return h;
  }
  function viewTransfer() {
    const w = W(), t = T(), tr = S.tr;
    const inWin = w.state === 'transfer';
    if (!G.canNegotiate()) {
      let h = `<div class="card"><h2>💱 이적</h2><p>시즌 정산 중입니다. 다음 시즌 준비로 넘어가면 이적시장이 열립니다.</p></div>`;
      if (w.u.fin) h += `<div class="card"><h3>지난 시즌 정산</h3><div class="kv"><div>기본 수입<br><b>${M(w.u.fin.income)}</b></div><div>리그 상금<br><b>${M(w.u.fin.prize || 0)}</b></div><div>연봉 지출<br><b>${M(w.u.fin.wages)}</b></div></div><b class="${w.u.fin.net >= 0 ? 'good' : 'bad-t'}">순이익 ${M(w.u.fin.net)}</b></div>`;
      return h;
    }
    const tw = w.tw;
    const act = tw.neg.filter(n => G.negActive(n));
    const mid = tw.kind === 'mid';
    let h;
    if (inWin) h = `<div class="card"><h2 style="margin:0">💱 ${mid ? '시즌 중 이적시장' : '시즌 전 이적시장'} ${tw.turn}/${tw.max}턴</h2><small>협상 답변은 다음 턴에 도착합니다 · 연봉 총액 ${M(G.teamWages(t))} · 예산 <b class="good">${M(t.bud)}</b></small>
      ${mid ? `<div class="warnbox">시즌 중이라 구단들이 선수를 내놓길 꺼려 요구액이 평소보다 높습니다. 이 시장이 닫히면 후반기가 시작됩니다.</div>` : ''}
      ${w.u.fin && tw.turn === 1 ? `<div class="infobox">지난 시즌 정산: 기본 수입 ${M(w.u.fin.income)} + 리그 상금 ${M(w.u.fin.prize || 0)} − 연봉 ${M(w.u.fin.wages)} = <b>${M(w.u.fin.net)}</b>. 상금은 예산에 들어와 영입에 쓸 수 있습니다.</div>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn pri grow" data-act="tnext">⏭ 다음 턴</button><button class="btn grow" data-act="tend">시장 건너뛰기</button></div></div>`;
    else h = `<div class="card"><h2 style="margin:0">💱 시즌 중 협상</h2><small>연봉 총액 ${M(G.teamWages(t))} · 예산 <b class="good">${M(t.bud)}</b></small>
      <div class="infobox">이적시장 밖에서도 협상·계약은 할 수 있습니다. 답변은 <b>다음 주</b>에 오고, 계약된 선수는 <b>다음 이적시장이 열릴 때 합류</b>합니다(이적료·계약금은 계약할 때 지불). <b>무소속 선수</b>는 계약하면 바로 합류합니다. 시즌 중이라 구단들의 요구액이 높습니다. 방출·매각·임대 보내기·등번호 변경은 이적시장에서만 됩니다.</div></div>`;
    const found = (w.u.seen || []).filter(id => w.P[id] && w.P[id].t < 0 && !w.P[id].fa && !w.P[id].pend);
    const subs = [['rec', '스카우터 추천'], ['neg', `협상 (${act.length})`], ['find', '선수 찾기'], ['found', `발굴 선수 (${found.length})`], ['fa', `무소속 (${(w.fa || []).length})`]];
    if (inWin) subs.push(['inbox', `받은 제안 (${tw.inbox.length})`], ['mine', '내 선수']);
    if (!subs.some(x => x[0] === tr.sub)) tr.sub = 'rec';
    h += `<div class="tabs">${subs.map(([k, n]) => `<button class="${tr.sub === k ? 'on' : ''}" data-act="trsub" data-k="${k}">${n}</button>`).join('')}</div>`;
    if (tr.sub === 'rec') {
      h += `<div class="pad"><small>스카우터가 우리 팀 수준과 예산에 맞춰 고른 다른 팀 선수 추천 5개 목록입니다. 스카우팅 정확도가 낮으면 추천이 빗나갈 수 있습니다. (이적시장에서 5턴마다 갱신)</small></div>`;
      (tw.recs || []).forEach(r => {
        h += `<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px"><b>${esc(r.name)}</b><br><small>${esc(r.desc)}</small></div>`;
        const rows = r.items.map(recRow).join('');
        h += rows || `<div style="padding:0 12px 12px"><small>조건에 맞는 선수가 없습니다.</small></div>`;
        h += `</div>`;
      });
    } else if (tr.sub === 'neg') {
      if (tr.negPid != null && w.P[tr.negPid]) h += newNegForm(w.P[tr.negPid]);
      const pend = (w.pendIn || []).map(id => w.P[id]).filter(Boolean);
      if (pend.length) h += `<div class="card"><h3>다음 이적시장 합류 예정 (${pend.length}명)</h3>${pend.map(p => `<div class="cmp"><span>${posB(p.p)} ${esc(p.n)} <small>${p.a}세</small></span><small>${p.pend.loan ? '임대' : '연봉 ' + M(p.pend.w)} · ${whereOf(p)}</small></div>`).join('')}</div>`;
      if (!act.length && tr.negPid == null) h += `<div class="pad"><small>진행 중인 협상이 없습니다. '스카우터 추천', '선수 찾기', '발굴 선수', '무소속'에서 협상을 시작하세요. 재계약은 스쿼드 → 선수 상세에서 시작합니다. (동시에 8명까지)</small></div>`;
      act.forEach(n => { h += negCard(n); });
      const fin = tw.neg.filter(n => !act.includes(n)).slice().reverse();
      if (fin.length) { h += `<div class="pad"><small>종료된 협상</small></div>`; fin.slice(0, 6).forEach(n => { const p = w.P[n.pid]; h += `<div class="card" style="margin:6px 14px;padding:8px 12px"><div class="row sp"><span>${p ? esc(p.n) : '?'} <small>${NEG_KIND(n)}</small></span><span class="chip">${NEG_STATUS[n.status]}</span></div><small>${esc(n.msg || '')}</small></div>`; }); }
    } else if (tr.sub === 'find') {
      const tms = w.lg[tr.fc][tr.ft].teams.filter(id => id !== t.id);
      if (tr.fteam == null || !tms.includes(tr.fteam)) tr.fteam = tms[0];
      h += `<div class="card"><div class="row"><select data-chg="trFc">${G.COUNTRIES.map(x => `<option value="${x.id}" ${x.id === tr.fc ? 'selected' : ''}>${x.name}</option>`).join('')}</select><select data-chg="trFt">${[0, 1, 2, 3].map(x => `<option value="${x}" ${x === tr.ft ? 'selected' : ''}>${x + 1}부</option>`).join('')}</select></div>
        <select style="margin-top:8px" data-chg="trFteam">${tms.map(id => `<option value="${id}" ${id === tr.fteam ? 'selected' : ''}>${esc(w.teams[id].name)}</option>`).join('')}</select></div>`;
      h += `<div class="tabs">${['ALL', 'GK', 'DF', 'MF', 'FW'].map(f => `<button class="${tr.fpos === f ? 'on' : ''}" data-act="tfpos" data-k="${f}">${f === 'ALL' ? '전체' : f}</button>`).join('')}</div>`;
      let pl = w.teams[tr.fteam].pl.map(id => w.P[id]);
      if (tr.fpos !== 'ALL') pl = pl.filter(p => POS[p.p] === tr.fpos);
      pl.sort((a, b) => a.p - b.p || a.a - b.a).forEach(p => { h += playerCard(p); });
    } else if (tr.sub === 'found') {
      h += `<div class="pad"><small>스카우팅 탭에서 대륙을 탐색해 발굴한 유망주입니다. 무소속이 아니라 <b>6개국 리그 밖의 해외 소규모 구단</b> 소속이라 이적료가 있지만, 유럽 1~4부 구단보다 훨씬 쌉니다. 이번 이적시장 중에 발굴한 선수나 시즌 중에 계약한 선수는 <b>다음 이적시장에 합류</b>합니다.</small></div>`;
      if (!found.length) h += `<div class="pad"><small>발굴한 선수가 없습니다. 스카우팅 탭에서 탐색하세요.</small></div>`;
      found.slice().reverse().slice(0, 40).forEach(id => { h += playerCard(w.P[id]); });
    } else if (tr.sub === 'fa') {
      h += faList();
    } else if (tr.sub === 'inbox') {
      if (!tw.inbox.length) h += `<div class="pad"><small>받은 제안이 없습니다. 방출·임대 명단에 올리면 다른 구단이 관심을 보입니다. 명단에 없는 선수에게도 가끔 제안이 옵니다.</small></div>`;
      tw.inbox.forEach(o => {
        const p = w.P[o.pid], b = w.teams[o.from]; if (!p) return;
        const kindTxt = o.kind === 'loan' ? '임대 제안' : (o.listed ? '방출 명단 선수 제안 (몸값보다 낮은 가격)' : '명단에 없던 선수에게 온 관심');
        h += `<div class="card" style="margin:8px 14px"><div class="row" data-act="oview" data-id="${p.id}" style="cursor:pointer">${posB(p.p)}${numBadge(p)}<div><b>${esc(p.n)} ›</b><br><small>${p.a}세 · 연봉 ${M(G.wageOf(p))}</small></div></div>
          <div style="margin-top:6px"><span class="chip ${o.kind === 'loan' ? '' : (o.listed ? 'warn-t' : 'good')}">${kindTxt}</span></div>
          <p><b>${esc(b.name)}</b>이(가) <b class="good">${M(o.fee)}</b>${o.kind === 'loan' ? '의 임대료로 시즌 임대를 제안했습니다. (선수 연봉은 상대 구단 부담, 시즌 후 복귀)' : '에 영입을 제안했습니다.'} <small>(시장 가치 ${M(G.valueOf(p))} · ${o.exp - tw.turn}턴 후 만료)</small></p>
          <div class="row"><button class="btn sm pri grow" data-act="tsell" data-id="${o.id}">${o.kind === 'loan' ? '임대 수락' : '매각 수락'}</button><button class="btn sm grow" data-act="trej" data-id="${o.id}">거절</button></div></div>`;
      });
    } else {
      h += `<div class="pad"><small>선수 이름을 누르면 능력치를 볼 수 있습니다. <b>방출 명단·임대 명단</b>에 올리면 다른 구단이 관심을 갖고 접촉합니다. 방출 명단 선수는 현재 몸값보다 낮은 가격으로 제안이 옵니다. 등번호는 지금만 바꿀 수 있고, 주전급·고능력 선수는 임대할 수 없습니다. 즉시 방출한 선수는 무소속이 됩니다.</small></div><div class="list">`;
      const ll = tw.loanList || [], sl = tw.saleList || [];
      t.pl.map(id => w.P[id]).sort((a, b) => a.p - b.p || (a.sn || 99) - (b.sn || 99)).forEach(p => {
        const why = p.loan ? null : G.loanBlock(p.id);
        const lq = ll.includes(p.id), sq = sl.includes(p.id);
        h += `<div class="item" style="flex-wrap:wrap">${posB(p.p)}<input type="number" min="1" max="99" value="${p.sn}" data-chg="setnum" data-id="${p.id}" style="width:64px;min-height:36px;padding:4px 6px"><div class="grow" data-act="oview" data-id="${p.id}" style="cursor:pointer"><b>${esc(p.n)} ›</b> <small>${p.a}세</small>${p.loan ? ' <span class="chip warn-t">임대 중</span>' : ''}${sq ? ' <span class="chip warn-t">방출 명단</span>' : ''}${lq ? ' <span class="chip">임대 명단</span>' : ''}${p.loan ? '' : contractChip(p)}<br><small>연봉 ${M(G.wageOf(p))} · 가치 ${M(G.valueOf(p))}${p.loan ? ' · 시즌 후 ' + esc(w.teams[p.loan.from].name) + ' 복귀' : ' · ' + p.ce + '시즌까지' + (why ? ' · 임대 불가' : '')}</small></div>
          ${p.loan ? '' : `<div class="row" style="width:100%;gap:6px">${sq ? `<button class="btn sm grow" data-act="salecancel" data-id="${p.id}">방출 명단 취소</button>` : `<button class="btn sm grow" data-act="sale" data-id="${p.id}">방출 명단</button>`}${lq ? `<button class="btn sm grow" data-act="loancancel" data-id="${p.id}">임대 명단 취소</button>` : `<button class="btn sm grow" data-act="loanout" data-id="${p.id}" ${why ? 'disabled' : ''}>임대 명단</button>`}<button class="btn sm danger" data-act="release" data-id="${p.id}">즉시 방출</button></div>`}</div>`;
      });
      h += `</div>`;
      const outs = (w.u.out || []).filter(id => w.P[id]);
      if (outs.length) h += `<div class="card"><h3>임대 보낸 선수 (시즌 종료 후 복귀)</h3>` + outs.map(id => `<div class="cmp"><span>${esc(w.P[id].n)}</span><small>${esc(w.teams[w.P[id].t].name)}</small></div>`).join('') + `</div>`;
    }
    return h;
  }

  /* ---------- 유러피언 마스터스컵 ---------- */
  function viewCL() {
    const w = W(), cl = w.cl, t = T();
    if (!cl) return `<div class="card">대회 정보가 없습니다.</div>`;
    const PH = { lp: '리그 페이즈', po: '플레이오프', r16: '16강', qf: '8강', sf: '4강', final: '결승', done: '종료' };
    const mine = cl.teams.includes(t.id);
    const rank = G.clRank();
    let h = `<div class="card"><h2 style="margin:0">🏆 ${G.CL_NAME}</h2><small>각 리그 1부 상위 4팀(24팀) + 가상 소국 챔피언 12팀 = 36팀 · 현재 단계: <b>${PH[cl.phase]}</b></small>
      <div class="infobox" style="margin-top:8px">${cl.first ? '첫 시즌이라 지난 성적이 없어, 1부 팀 수준에 비례한 추첨으로 4팀을 정했습니다. 전력이 높은 팀일수록 진출 확률이 높습니다.' : '지난 시즌 각 리그 1부 상위 4팀이 진출했습니다.'} 랜덤 12팀은 가상 팀 30개 중에서 매년 새로 추첨됩니다.</div>
      <p style="margin:8px 0 0">${mine ? `내 팀: <b class="good">출전 중</b> · ${cl.phase === 'done' ? G.CL_STAGE_NAME[cl.stage[t.id]] : '진행 중'}` : `내 팀: 불참 <small>(내 리그 진출 팀: ${cl.byC[t.cid] ? cl.byC[t.cid].map(id => esc(w.teams[id].name)).join(', ') : '-'})</small>`}</p></div>`;
    if (mine) {
      let up = '';
      Object.keys(cl.fx).map(Number).sort((a, b) => a - b).forEach(wk => { if (wk < w.week) return; cl.fx[wk].forEach(f => { if (f.h === t.id || f.a === t.id) up += `<div class="cmp"><span>${wk}주 ${f.h === t.id ? 'H' : 'A'} ${esc(w.teams[f.h === t.id ? f.a : f.h].name)}</span><small>${ROUND_NAME[f.round]}</small></div>`; }); });
      h += `<div class="card"><h3>내 마스터스컵 일정</h3>${up || '<small>남은 경기가 없습니다.</small>'}</div>`;
    }
    h += `<div class="card" style="padding:6px"><h3 style="padding:6px">리그 페이즈 순위 (8경기)</h3><table class="tbl"><tr><th>#</th><th class="l">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr>`;
    rank.forEach((id, i) => {
      const r = cl.table[id], tm = w.teams[id];
      h += `<tr class="${id === t.id ? 'me' : ''} ${i < 8 ? 'up' : ''} ${i >= 24 ? 'dn' : ''}"><td>${i + 1}</td><td class="l">${esc(tm.name)}${tm.cid === 'RND' ? ' <small>🌐</small>' : ''}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`;
    });
    h += `</table><div class="pad"><small>초록: 16강 직행(1~8위) · 무색: 플레이오프(9~24위) · 빨강: 탈락 · 🌐 랜덤 추첨 팀</small></div></div>`;
    ['po', 'r16', 'qf', 'sf', 'final'].forEach(r => {
      const ties = cl.ties.filter(x => x.r === r);
      if (!ties.length) return;
      h += `<div class="card"><h3>${ROUND_NAME[r]}</h3>`;
      ties.forEach(x => {
        const played = x.legs.some(l => l), [ga, gb] = G.tieAgg(x);
        const A = w.teams[x.a], B = w.teams[x.b];
        h += `<div class="cmp"><span class="${x.win === x.a ? 'good' : ''}">${esc(A.name)}</span><b>${played ? ga + ' : ' + gb : 'vs'}${x.pen ? ' <small>(승부차기)</small>' : ''}</b><span class="${x.win === x.b ? 'good' : ''}" style="text-align:right">${esc(B.name)}</span></div>`;
      });
      h += `</div>`;
    });
    if (cl.champion != null) h += `<div class="card"><h2>🏆 우승: ${esc(w.teams[cl.champion].name)}</h2></div>`;
    return h;
  }

  /* ---------- 경기 화면 ---------- */
  function viewPrematch() {
    const w = W(), t = T(), fx = S.fxs[S.cur];
    const home = w.teams[fx.h], away = w.teams[fx.a];
    const luH = G.currentLineup(home, home.id === t.id), luA = G.currentLineup(away, away.id === t.id);
    const rH = G._debug.makeSide(home, luH, true, false).R, rA = G._debug.makeSide(away, luA, false, false).R;
    const row = (n, a, b) => `<div class="stat"><span>${a.toFixed(1)}</span><b>${n}</b><span>${b.toFixed(1)}</span></div>`;
    let h = `<div class="topbar"><div class="row sp"><button class="btn sm" data-act="exitmatch">← 돌아가기</button><b>${w.season}시즌 ${w.week}주차</b><small>${S.cur + 1}/${S.fxs.length}경기</small></div></div>`;
    h += `<div class="scoreb"><small>${fxLabel(fx)}</small><div class="row sp"><div class="tn" style="color:${teamCol(home.id)}">${esc(home.name)}<br><small>${home.form}</small></div><div class="sub">VS</div><div class="tn" style="color:${teamCol(away.id)}">${esc(away.name)}<br><small>${away.form}</small></div></div></div>`;
    h += `<div class="card"><h3>양 팀 전력 비교 (선발 기준)</h3>${row('공격', rH.A, rA.A)}${row('중원', rH.M, rA.M)}${row('수비', rH.D, rA.D)}${row('골키퍼', rH.G, rA.G)}</div>`;
    const lowC = G.currentLineup(t, true).filter(id => w.P[id].cd < 50).length;
    if (lowC) h += `<div class="card"><div class="warnbox">체력이 낮은 선발이 ${lowC}명입니다. 전술 탭에서 라인업을 확인하거나, 경기 중 교체를 활용하세요.</div></div>`;
    h += `<div class="card"><div class="row"><button class="btn grow" data-act="gotactics">📋 전술 수정</button></div><div class="row" style="margin-top:8px"><button class="btn pri grow" data-act="kickoff">▶ 킥오프 (2D 보기)</button><button class="btn grow" data-act="instant">⏭ 즉시 결과</button></div></div>`;
    return h;
  }

  function lineupOf(s) { const m = S.match; return m.M ? m.M.S[s].lu : m.res.lineups[s]; }
  function matchDom() {
    const m = S.match, w = W();
    const home = w.teams[m.res.teams[0]], away = w.teams[m.res.teams[1]];
    let toks = '';
    for (let s = 0; s < 2; s++) for (let i = 0; i < 11; i++) {
      const pid = lineupOf(s)[i]; const p = w.P[pid]; const sl = m.res.sides[s].slots[i];
      toks += `<div class="tok ${sl.pos === 0 ? 'gk' : ''}" id="tk${s}_${i}" data-act="tok" data-s="${s}" data-i="${i}" title="${esc(p.n)}"><i style="background:${s === 0 ? m.col[0] : m.col[1]}">${p.sn}</i>${(m.M && s === m.M.userSide) ? '<s class="tst"><u></u></s>' : ''}</div>`;
    }
    let h = `<div class="topbar"><div class="row sp"><b>${esc(home.name)} vs ${esc(away.name)}</b><small id="mmin">0'</small></div></div>`;
    h += `<div class="scoreb"><div class="row sp"><span class="tn" style="color:${m.col[0]}">${esc(home.name)}</span><span class="sc" id="msc">0 : 0</span><span class="tn" style="color:${m.col[1]}">${esc(away.name)}</span></div></div>`;
    h += `<div class="pitchwrap"><div class="pitch" id="pitch"><div class="box t"></div><div class="box b"></div><div class="ballhl" id="bhl"></div>${toks}<div class="ballc" id="ball">⚽</div></div></div>`;
    h += `<div class="mctl"><button class="btn sm" data-act="mplay" id="bplay">⏸ 정지</button><button class="btn sm" data-act="mspeed" id="bspd">1x</button><button class="btn sm blue" data-act="mpanel" id="bpanel">📋 전술·교체</button><button class="btn sm" data-act="mskip">⏭ 결과</button></div>`;
    h += `<div id="mpanel"></div><div class="card"><h3>경기 로그</h3><div class="evlog" id="mlog"></div></div><div id="mend"></div>`;
    return h;
  }
  function tokenPos(res, s, frame) {
    // 격자(8열 x 12행) 위 22명 배치
    const side = res.sides[s], w = W();
    const dB = (s === 0 ? 11 - frame.r : frame.r) / 11; // 이 팀 관점에서 공의 전진도
    const used = {};
    const out = [];
    const poss = frame.s === s;
    side.slots.forEach((sl, i) => {
      let y = sl.y + (dB - 0.5) * 0.3 * (sl.pos === 0 ? 0.1 : 1) + (poss && sl.pos >= 2 ? 0.04 : 0) + (sl.pos === 1 ? 0.05 * (side.tac.line - 3) : 0) + 0.02 * (sl.pt.adv - 3);
      y = Math.max(0.03, Math.min(0.97, y));
      let x = 0.5 + (sl.x - 0.5) * (1 + 0.07 * (side.tac.width - 3));
      x = Math.max(0, Math.min(1, x));
      let c = Math.round((s === 0 ? x : 1 - x) * 7), r = s === 0 ? Math.round((1 - y) * 11) : Math.round(y * 11);
      out.push({ i, c, r, pos: sl.pos });
    });
    return out;
  }
  function placeAll(frame) {
    const m = S.match, res = m.res;
    const occ = {};
    const all = [];
    for (let s = 0; s < 2; s++) tokenPos(res, s, frame).forEach(t => all.push({ s, ...t }));
    // 공 소유 팀의 가장 가까운 선수가 공 위치로 이동
    let car = null, bd = 99;
    all.forEach(t => { if (t.s === frame.s && t.pos !== 0 || (t.s === frame.s && t.i === 0 && frame.r === (frame.s === 0 ? 11 : 0))) { const d = Math.abs(t.c - frame.c) + Math.abs(t.r - frame.r); if (d < bd) { bd = d; car = t; } } });
    if (car) { car.c = frame.c; car.r = frame.r; car.has = true; }
    // 충돌 해소
    all.sort((a, b) => (b.has ? 1 : 0) - (a.has ? 1 : 0));
    all.forEach(t => {
      let key = t.c + ',' + t.r;
      if (occ[key] && !t.has) {
        let found = false;
        for (let rad = 1; rad < 3 && !found; rad++) for (let dr = -rad; dr <= rad && !found; dr++) for (let dc = -rad; dc <= rad && !found; dc++) {
          const c = t.c + dc, r = t.r + dr; if (c < 0 || c > 7 || r < 0 || r > 11) continue;
          if (!occ[c + ',' + r]) { t.c = c; t.r = r; found = true; }
        }
        key = t.c + ',' + t.r;
      }
      occ[key] = true;
    });
    all.forEach(t => {
      const el = document.getElementById(`tk${t.s}_${t.i}`); if (!el) return;
      el.style.left = (t.c * 12.5) + '%'; el.style.top = (t.r * 8.3333) + '%';
      el.classList.toggle('has', !!t.has);
    });
    const b = document.getElementById('ball'), hl = document.getElementById('bhl');
    if (b) { b.style.left = (frame.c * 12.5) + '%'; b.style.top = (frame.r * 8.3333) + '%'; }
    if (hl) { hl.style.left = (frame.c * 12.5) + '%'; hl.style.top = (frame.r * 8.3333) + '%'; }
  }
  function updateMatchUi() {
    const m = S.match, res = m.res, fr = res.tr[Math.min(m.idx, res.tr.length - 1)];
    placeAll(fr);
    const w = W();
    for (let s = 0; s < 2; s++) lineupOf(s).forEach((pid, i) => {
      const el = document.getElementById(`tk${s}_${i}`); if (!el || !w.P[pid]) return;
      el.title = w.P[pid].n; const ic = el.querySelector('i'); if (ic) ic.textContent = w.P[pid].sn;
      if (m.M && s === m.M.userSide) { const u2 = el.querySelector('.tst u'); if (u2) { const v = m.M.stam(s, i); u2.style.width = v + '%'; u2.style.background = v < 40 ? '#ef5b5b' : v < 65 ? '#f0b429' : '#3ecf8e'; } }
    });
    const min = fr.m;
    const goals = [0, 0];
    res.scorers.forEach(sc => { if (sc.m <= min) goals[sc.s]++; });
    const el = id => document.getElementById(id);
    if (el('msc')) el('msc').textContent = `${goals[0]} : ${goals[1]}`;
    if (el('mmin')) el('mmin').textContent = (min > 90 ? '90+' + (min - 90) : min) + "'";
    const ev = res.ev.filter(e => e.m <= min);
    if (el('mlog')) { el('mlog').innerHTML = ev.slice().reverse().map(e => `<div class="${e.type}">${esc(e.text)}</div>`).join('') || '<div><small>킥오프!</small></div>'; }
    if (fr.tag === 'ht' && !m.htShown) { m.htShown = true; pauseMatch(); toast('하프타임 — 전술과 교체를 점검하세요'); if (m.M && !m.M.done) openPanel('tac'); }
  }
  function pauseMatch() { const m = S.match; if (!m) return; m.playing = false; clearTimeout(m.timer); const b = document.getElementById('bplay'); if (b) b.textContent = '▶ 재개'; }
  function resumeMatch() {
    const m = S.match; if (!m || m.done) return;
    const p = document.getElementById('mpanel'); if (p) p.innerHTML = '';
    m.playing = true; const b = document.getElementById('bplay'); if (b) b.textContent = '⏸ 정지';
    tick();
  }
  function tick() {
    const m = S.match; if (!m || !m.playing) return;
    if (m.M) {
      if (m.M.done) { endMatch(); return; }
      m.M.step(); m.idx = m.res.tr.length - 1;
    } else {
      if (m.idx >= m.res.tr.length - 1) { endMatch(); return; }
      m.idx++;
    }
    updateMatchUi();
    if (!m.playing) return;
    const fr = m.res.tr[m.idx];
    const delay = (fr.tag === 'goal' ? 1400 : fr.tag === 'shot' || fr.tag === 'corner' || fr.tag === 'card' ? 800 : 380) / m.speed;
    m.timer = setTimeout(tick, delay);
  }
  function endMatch() {
    const m = S.match; if (!m) return;
    pauseMatch();
    if (m.M) {
      const us = m.M.userSide; if (us >= 0) m.M.S[us].manual = false; // 결과 바로 보기: 남은 교체는 자동
      while (!m.M.done) m.M.step();
      m.res = m.M.result();
    }
    m.idx = m.res.tr.length - 1; m.done = true; updateMatchUi();
    window.__lastRes = m.res;   // 점검용
    const pn = document.getElementById('mpanel'); if (pn) pn.innerHTML = '';
    const res = m.res, w = W();
    const st = res.st, tot = st.poss[0] + st.poss[1];
    const row = (n, a, b) => `<div class="stat"><span>${a}</span><b>${n}</b><span>${b}</span></div>`;
    const sc = res.scorers.map(s => `<div class="cmp"><span>${s.m > 90 ? '90+' + (s.m - 90) : s.m}' ${esc(w.P[s.id] ? w.P[s.id].n : '?')}${s.kind ? ' (' + s.kind + ')' : ''}</span><small>${esc(w.teams[res.teams[s.s]].name)}</small></div>`).join('');
    const us = res.userSide;
    const sb = us >= 0 ? res.subs.filter(x => x.s === us).map(x => `<div class="cmp"><span>${x.m}' ${esc(w.P[x.off].n)} → ${esc(w.P[x.on].n)}</span></div>`).join('') : '';
    document.getElementById('mend').innerHTML = `<div class="card"><h2>경기 종료 ${res.score[0]} : ${res.score[1]}</h2>${row('점유율', Math.round(st.poss[0] / tot * 100) + '%', Math.round(st.poss[1] / tot * 100) + '%')}${row('슈팅', st.shots[0], st.shots[1])}${row('유효슈팅', st.sot[0], st.sot[1])}${row('코너킥', st.corners[0], st.corners[1])}${row('파울', st.fouls[0], st.fouls[1])}${row('경고', st.yc[0], st.yc[1])}${row('퇴장', st.rc[0], st.rc[1])}${sc ? '<h3 style="margin-top:10px">득점자</h3>' + sc : ''}${sb ? '<h3 style="margin-top:10px">우리 팀 교체</h3>' + sb : ''}<button class="btn pri full" style="margin-top:12px" data-act="finishmatch">✔ 결과 반영하고 다음으로</button></div>`;
    const ctl = document.querySelector('.mctl'); if (ctl) ctl.style.display = 'none';
    window.scrollTo(0, document.body.scrollHeight);
  }
  function startMatch(play) {
    const w = W(), fx = S.fxs[S.cur];
    const home = w.teams[fx.h], away = w.teams[fx.a];
    let M = null, res;
    if (play) { M = G.createMatch(home, away, { trace: true, manual: true, kind: fx.kind }); res = M.res; }
    else res = G.simulateMatch(home, away, { trace: true, kind: fx.kind });
    const c0 = teamCol(home.id); let c1 = teamCol(away.id);
    if (Math.abs(((home.id * 47) % 360) - ((away.id * 47) % 360)) < 60) c1 = `hsl(${((away.id * 47) + 180) % 360},62%,46%)`;
    S.match = { M, res, idx: 0, speed: 1, playing: true, timer: 0, col: [c0, c1], htShown: false, done: false, ptab: 'tac', selOff: null };
    S.screen = 'match'; $('#app').innerHTML = matchDom();
    if (play) { updateMatchUi(); S.match.timer = setTimeout(tick, 700); }
    else { endMatch(); }
  }

  /* ---------- 경기 중 전술/교체 패널 ---------- */
  function openPanel(tab) {
    const m = S.match; if (!m || !m.M || m.M.done) return;
    pauseMatch(); if (tab) m.ptab = tab;
    renderPanel();
    const el = document.getElementById('mpanel'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function renderPanel() {
    const m = S.match, el = document.getElementById('mpanel'); if (!el || !m || !m.M) return;
    const M = m.M, us = M.userSide;
    if (M.done || us < 0) { el.innerHTML = ''; return; }
    const sd = M.S[us], w = W(), POSN = G.POS;
    const tabs = [['tac', '팀 전술'], ['pt', '개인 전술'], ['sub', '교체']];
    let h = `<div class="card"><div class="row sp"><b>${M.minute}분 · 경기 중 조정</b><small>교체 ${sd.subs}/${sd.maxSubs}</small></div>`;
    h += `<div class="tabs" style="padding:8px 0 0">${tabs.map(([k, n]) => `<button class="${m.ptab === k ? 'on' : ''}" data-act="mtab" data-k="${k}">${n}</button>`).join('')}</div>`;
    if (m.ptab === 'tac') {
      h += seg('경기 성향', sd.tac.tf || 3, G.TF_LABEL, 'data-act="mtac" data-k="tf"');
      h += G.TACTIC_DEFS.map(d => seg(d.n, sd.tac[d.k], d.l, `data-act="mtac" data-k="${d.k}"`)).join('');
      h += `<small>바꾼 전술은 즉시 적용되며 경기 후에도 유지됩니다. (전술을 바꾸면 팀 숙련도가 떨어집니다)</small>`;
    } else if (m.ptab === 'pt') {
      sd.lu.forEach((id, i) => {
        const p = w.P[id]; const pt = sd.ptMap[id] || { adv: 3, shoot: 3, risk: 3 };
        h += `<div style="margin-top:10px"><div class="row">${posB(sd.slots[i].pos)}<b>#${p.sn} ${esc(p.n)}</b></div><div class="kv" style="margin-top:6px">${G.PT_DEFS.map(d => `<div><small>${d.n}</small><select data-chg="mpt" data-id="${id}" data-k="${d.k}">${selOpts(d.l, pt[d.k])}</select></div>`).join('')}</div></div>`;
      });
    } else {
      const sel = m.selOff;
      h += `<div class="infobox" style="margin-top:8px">1) 교체로 나갈 선수를 누르고 2) 들어올 선수를 누르세요. 한 번 교체된 선수는 다시 뛸 수 없습니다.</div>`;
      h += `<h3>그라운드 위 선수 (번호는 등번호)</h3><div class="list" style="border-radius:10px;overflow:hidden">`;
      sd.lu.forEach((id, i) => {
        const p = w.P[id];
        const played = M.minute - sd.entry[i];
        const live = M.stam(us, i);
        const tired = played / (0.8 + p.at[14] / 20);
        h += `<div class="item ${sel === i ? 'on' : ''}" data-act="msel" data-i="${i}">${posB(sd.slots[i].pos)}<div class="grow"><b>#${p.sn} ${esc(p.n)}</b><div class="bar ${barCls(live)}" style="margin:4px 0"><i style="width:${Math.round(live)}%"></i></div><small>체력 ${Math.round(live)}% · 지구력 ${Math.round(p.at[14])} · ${played}분 출전</small></div>${tired > 75 ? '<span class="chip warn-t">피로</span>' : ''}</div>`;
      });
      h += `</div>`;
      const pos = sel != null ? sd.slots[sel].pos : null;
      const bench = M.bench(us).sort((a, b) => pos != null ? G.caAs(b, pos) - G.caAs(a, pos) : (a.p - b.p) || (b.ca - a.ca));
      h += `<h3 style="margin-top:12px">교체 후보${sel != null ? ` → #${w.P[sd.lu[sel]].sn} 자리 (${POSN[pos]})` : ''}</h3>`;
      if (sd.subs >= sd.maxSubs) h += `<div class="warnbox">교체를 모두 사용했습니다.</div>`;
      else if (!bench.length) h += `<div class="warnbox">교체 가능한 선수가 없습니다.</div>`;
      else {
        h += `<div class="list" style="border-radius:10px;overflow:hidden">`;
        bench.forEach(p => {
          const fit = pos != null ? (p.p === pos ? '' : '<span class="chip warn-t">포지션 불일치</span>') : '';
          h += `<div class="item ${sel == null ? 'dis' : ''}" data-act="msub" data-id="${p.id}">${posB(p.p)}<div class="grow"><b>#${p.sn} ${esc(p.n)}</b> <small>${p.a}세</small><br><small>체력 ${Math.round(p.cd)}%</small></div>${fit}</div>`;
        });
        h += `</div>`;
      }
    }
    h += `<button class="btn pri full" style="margin-top:12px" data-act="mplay">▶ 경기 재개</button></div>`;
    el.innerHTML = h;
  }

  /* ---------- 렌더링 ---------- */
  function render() {
    const app = $('#app');
    if (S.screen === 'start') { app.innerHTML = viewStart(); return; }
    if (S.screen === 'prematch') { app.innerHTML = viewPrematch(); return; }
    if (S.screen === 'match') return;
    let c = '';
    if (S.view != null && W().P[S.view]) c = viewOther(W().P[S.view]);
    else if (S.tab === 'home') c = viewHome();
    else if (S.tab === 'squad') c = viewSquad();
    else if (S.tab === 'tactics') c = viewTactics();
    else if (S.tab === 'train') c = viewTrain();
    else if (S.tab === 'scout') c = viewScout();
    else if (S.tab === 'transfer') c = viewTransfer();
    else if (S.tab === 'table') c = viewTable();
    app.innerHTML = shell(c);
  }
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  function doSave(showToast) { G.save().then(ok => { if (showToast) toast(ok ? '저장되었습니다.' : '저장에 실패했습니다.'); }); }

  /* ---------- 자동 진행: 지정한 리그 라운드까지 내 경기를 즉시 결과로 처리 ---------- */
  function autoStep() {
    const a = S.auto, w = W();
    if (!a.run) return;
    let msg = null;
    if (w.state === 'seasonEnd') msg = '시즌이 끝나 자동 진행을 멈췄습니다.';
    else if (w.state === 'transfer') { if (a.win) { G.twNext(); } else msg = '이적시장이 열려 자동 진행을 멈췄습니다.'; }
    else if (w.week > a.to) msg = `${a.to}라운드까지 자동 진행을 마쳤습니다.`;
    else {
      const t = T();
      if (a.lu) { t.lu = G.autoLineup(t); t.luF = t.form; }
      const resume = S.fxs.length && S.cur > 0 && S.cur < S.fxs.length && S.fxWeek === w.season * 100 + w.week;
      const fxs = resume ? S.fxs.slice(S.cur) : G.userFixtures();
      const out = resume ? S.results.slice() : [];
      fxs.forEach(f => { const r = G.simulateMatch(w.teams[f.h], w.teams[f.a], { kind: f.kind }); G.applyUserFatigue(r); out.push(r); if (a.lu) { t.lu = G.autoLineup(t); t.luF = t.form; } });
      S.fxs = []; S.cur = 0; S.results = [];
      G.advanceWeek(out);
    }
    if (msg) { a.run = false; S.screen = 'game'; S.tab = 'home'; render(); toast(msg); doSave(false); return; }
    if (S.tab === 'home' && S.screen === 'game') rerender();
    a.timer = setTimeout(autoStep, 30);
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, w = G.world(), d = el.dataset;
    switch (a) {
      case 'pickteam': S.startSel = +d.id; rerender(); break;
      case 'startgame': {
        if (S.startSel == null) return;
        G.startGame(($('#nm') ? $('#nm').value : S.name) || '감독', S.startSel);
        const t = T(); S.tc = t.cid; S.tt = t.tier; S.sc = { c: t.cid, t: Math.min(3, t.tier), team: null };
        S.screen = 'game'; S.tab = 'home'; window.scrollTo(0, 0); render(); doSave(false); break;
      }
      case 'loadgame': G.load().then(ok => { if (ok) { const t = T(); S.tc = t.cid; S.tt = t.tier; S.sc = { c: t.cid, t: t.tier, team: null }; S.screen = 'game'; S.tab = 'home'; render(); toast('불러왔습니다.'); } else toast('불러오기 실패'); }); break;
      case 'tab': S.tab = d.k; S.sel = null; S.view = null; window.scrollTo(0, 0); render(); break;
      case 'ssub': S.ssub = d.k; rerender(); break;
      case 'player': S.sel = +d.id; window.scrollTo(0, 0); render(); break;
      case 'back': S.sel = null; S.view = null; render(); break;
      case 'oview': S.view = +d.id; window.scrollTo(0, 0); render(); break;
      case 'oback': S.view = null; render(); break;
      case 'release': {
        if (!confirm('이 선수를 방출할까요? (되돌릴 수 없습니다)')) return;
        const r = G.release(+d.id); if (r.err) toast(r.err); else { S.sel = null; toast('방출했습니다.'); render(); } break;
      }
      case 'tsub': S.tsub = d.k; rerender(); break;
      case 'sqt': S.sqt = d.k; S.luSel = null; rerender(); break;
      case 'sqv': S.sqv = d.k; rerender(); break;
      case 'lusel': {
        const t = T(), lu = G.currentLineup(t, true).slice(), cur = S.luSel;
        if (d.k === 'b' && w.P[+d.id] && w.P[+d.id].inj) { toast('부상 중인 선수는 선발로 넣을 수 없습니다.'); break; }
        const me = d.k === 's' ? { k: 's', i: +d.i } : { k: 'b', id: +d.id };
        if (!cur) { S.luSel = me; rerender(); break; }
        if (cur.k === me.k && (cur.k === 's' ? cur.i === me.i : cur.id === me.id)) { S.luSel = null; rerender(); break; }
        if (cur.k === 'b' && me.k === 'b') { S.luSel = me; rerender(); break; }
        if (cur.k === 's' && me.k === 's') { const x = lu[cur.i]; lu[cur.i] = lu[me.i]; lu[me.i] = x; toast('선발끼리 자리를 바꿨습니다.'); }
        else { const si = cur.k === 's' ? cur.i : me.i, bid = cur.k === 'b' ? cur.id : me.id; const out = w.P[lu[si]]; lu[si] = bid; toast(`교체: ${out.n} → ${w.P[bid].n}`); }
        t.lu = lu; t.luF = t.form; S.luSel = null; rerender(); break;
      }
      case 'tores': { const r = G.toReserve(+d.id); toast(r.err || '2군으로 내렸습니다.'); if (!r.err) S.sel = null; rerender(); break; }
      case 'tofirst': { const r = G.toFirst(+d.id); toast(r.err || '1군으로 올렸습니다.' + (w.P[+d.id] && w.P[+d.id].rg && w.P[+d.id].rg.w === w.week && w.state === 'play' ? ' (이번 주 2군 경기를 뛰어 체력이 깎여 있습니다)' : '')); rerender(); break; }
      case 'renew': { const r = G.twRenew(+d.id); if (r.err) { toast(r.err); break; } S.tab = 'transfer'; S.sel = null; S.view = null; S.tr.sub = 'neg'; S.tr.negPid = null; toast('재계약 협상을 시작했습니다.'); window.scrollTo(0, 0); render(); break; }
      case 'gotoneg': S.tab = 'transfer'; S.sel = null; S.view = null; S.tr.sub = 'neg'; window.scrollTo(0, 0); render(); break;
      case 'form': { const t = T(); t.form = d.f; t.lu = null; rerender(); break; }
      case 'autolu': { const t = T(); t.lu = G.autoLineup(t); t.luF = t.form; S.luSel = null; rerender(); toast('자동 선발을 적용했습니다.'); break; }
      case 'tac': { const t = T(); t.tac[d.k] = +d.v; rerender(); break; }
      case 'trI': { w.u.train.i = +d.v; rerender(); break; }
      case 'ssc': S.scoutSub = d.k; rerender(); break;
      case 'search': {
        const r = G.doSearch(d.c);
        if (r.err) toast(r.err); else { S.lastSearch = r.ids; toast('2명의 선수를 발견했습니다.'); }
        rerender(); break;
      }
      case 'judge': { const r = G.doJudge(+d.id); if (r.err) toast(r.err); else toast('판단 완료'); rerender(); break; }
      case 'buy': {
        const p = w.P[+d.id]; const price = p.t < 0 ? G.r1(G.valueOf(p) * 0.5) : G.r1(G.valueOf(p) * 1.2);
        if (!confirm(`${p.n} 영입 (${price}M)?`)) return;
        const r = G.buy(+d.id); if (r.err) toast(r.err); else { toast('영입 완료!'); } rerender(); break;
      }
      case 'neg': { if (!G.canNegotiate()) { toast('시즌 정산 중에는 협상할 수 없습니다.'); break; } S.tab = 'transfer'; S.view = null; S.tr.sub = 'neg'; S.tr.negPid = +d.id; S.tr.negKind = 'buy'; window.scrollTo(0, 0); render(); break; }
      case 'loan': { if (!G.canNegotiate()) { toast('시즌 정산 중에는 협상할 수 없습니다.'); break; } S.tab = 'transfer'; S.view = null; S.tr.sub = 'neg'; S.tr.negPid = +d.id; S.tr.negKind = 'loan'; window.scrollTo(0, 0); render(); break; }
      case 'loanout': { const r = G.twLoanOut(+d.id); toast(r.err || '임대 명단에 올렸습니다. 다음 턴부터 제안이 올 수 있습니다.'); rerender(); break; }
      case 'loancancel': G.twLoanCancel(+d.id); rerender(); break;
      case 'sale': { const r = G.twSaleList(+d.id); toast(r.err || '방출 명단에 올렸습니다. 다른 구단이 몸값보다 낮은 가격으로 접촉해 올 수 있습니다.'); rerender(); break; }
      case 'salecancel': G.twSaleCancel(+d.id); rerender(); break;
      case 'tclose': S.tr.negPid = null; rerender(); break;
      case 'trsub': S.tr.sub = d.k; rerender(); break;
      case 'tfpos': S.tr.fpos = d.k; rerender(); break;
      case 'tstart': { const inp = document.getElementById('fee_start'); const r = G.twStart(+d.id, inp ? parseFloat(inp.value) : 0, S.tr.negKind === 'loan' ? 'loan' : undefined); if (r.err) toast(r.err); else { S.tr.negPid = null; toast(r.neg.stage === 'player' ? '개인 협상을 시작했습니다. 연봉을 제안하세요.' : `협상을 시작했습니다. ${w.state === 'transfer' ? '다음 턴' : '다음 주'}에 답변이 옵니다.`); } rerender(); break; }
      case 'tcancel': G.twCancel(+d.id); rerender(); break;
      case 'tclub': { const r = G.twOfferClub(+d.id, parseFloat(document.getElementById('fee_' + d.id).value)); toast(r.err || '제안을 보냈습니다.'); rerender(); break; }
      case 'tacc': { const r = G.twAcceptCounter(+d.id); toast(r.err || '이적료에 합의했습니다. 선수와 개인 협상을 진행하세요.'); rerender(); break; }
      case 'tplayer': { const r = G.twOfferPlayer(+d.id, parseFloat(document.getElementById('wage_' + d.id).value), +document.getElementById('yrs_' + d.id).value); toast(r.err || '계약 조건을 전달했습니다.'); rerender(); break; }
      case 'tpacc': { const r = G.twAcceptPlayerCounter(+d.id); toast(r.err || (r.later ? '계약 완료! 다음 이적시장에 합류합니다.' : '계약 완료!')); rerender(); doSave(false); break; }
      case 'tnext': { G.twNext(); if (w.state === 'play') { S.tab = 'home'; toast('이적시장이 닫혔습니다. 시즌 개막!'); } else toast(w.tw.turn + '턴이 되었습니다.'); render(); doSave(false); break; }
      case 'tend': if (confirm('이적시장을 닫고 시즌을 시작할까요? 진행 중인 협상은 시즌 중에도 이어지며, 이후 계약된 선수는 다음 이적시장에 합류합니다.')) { G.twEnd(); S.tab = 'home'; render(); doSave(false); } break;
      case 'tsell': { const r = G.twInboxAccept(+d.id); toast(r.err || '처리했습니다.'); rerender(); break; }
      case 'trej': G.twInboxReject(+d.id); rerender(); break;
      case 'tsb': S.tabsub = d.k; rerender(); break;
      case 'prematch': if (!(S.fxs.length && S.cur > 0 && S.cur < S.fxs.length && S.fxWeek === w.season * 100 + w.week)) { S.fxs = G.userFixtures(); S.cur = 0; S.results = []; S.fxWeek = w.season * 100 + w.week; } S.screen = 'prematch'; window.scrollTo(0, 0); render(); break;
      case 'exitmatch': S.screen = 'game'; render(); break;
      case 'gotactics': S.screen = 'game'; S.tab = 'tactics'; render(); break;
      case 'kickoff': startMatch(true); break;
      case 'instant': startMatch(false); break;
      case 'mplay': { const m = S.match; if (m.playing) pauseMatch(); else resumeMatch(); break; }
      case 'mpanel': openPanel('tac'); break;
      case 'mtab': S.match.ptab = d.k; renderPanel(); break;
      case 'mtac': { const m = S.match; m.M.setTac(m.M.userSide, d.k, +d.v); renderPanel(); updateMatchUi(); break; }
      case 'msel': { S.match.selOff = +d.i; renderPanel(); break; }
      case 'msub': {
        const m = S.match; if (m.selOff == null) { toast('먼저 교체로 나갈 선수를 선택하세요.'); break; }
        const r = m.M.sub(m.M.userSide, m.selOff, +d.id);
        if (r.err) toast(r.err); else { toast('교체 완료'); m.selOff = null; updateMatchUi(); renderPanel(); }
        break;
      }
      case 'tok': { const m = S.match; const s = +d.s, i = +d.i; const pid = lineupOf(s)[i]; const p = w.P[pid]; if (p) toast(`#${p.sn} ${p.n} (${POS[m.res.sides[s].slots[i].pos]}) 체력 ${Math.round(m.M && s === m.M.userSide ? m.M.stam(s, i) : p.cd)}%`); break; }
      case 'mspeed': { const m = S.match; m.speed = m.speed === 1 ? 2 : m.speed === 2 ? 4 : 1; document.getElementById('bspd').textContent = m.speed + 'x'; break; }
      case 'mskip': endMatch(); break;
      case 'finishmatch': {
        const res = S.match.res; S.match = null; G.applyUserFatigue(res); S.results.push(res); S.cur++;
        if (S.cur < S.fxs.length) { S.screen = 'prematch'; window.scrollTo(0, 0); render(); break; }
        G.advanceWeek(S.results); S.fxs = []; S.cur = 0; S.results = []; S.luSel = null;
        S.screen = 'game'; S.tab = 'home'; window.scrollTo(0, 0); render(); doSave(false); break;
      }
      case 'skipweek': G.advanceWeek(null); render(); doSave(false); break;
      case 'autorun': {
        const to = parseInt(document.getElementById('autoTo').value, 10);
        if (!(to >= 1)) { toast('라운드를 입력하세요.'); break; }
        if (w.state === 'play' && to < w.week) { toast(`이미 ${w.week - 1}라운드까지 진행했습니다.`); break; }
        S.auto.to = to; S.auto.lu = document.getElementById('autoLu').checked; S.auto.win = document.getElementById('autoWin').checked; S.auto.run = true;
        rerender(); S.auto.timer = setTimeout(autoStep, 30); break;
      }
      case 'autostop': S.auto.run = false; clearTimeout(S.auto.timer); rerender(); toast('자동 진행을 중지했습니다.'); doSave(false); break;
      case 'nextseason': G.nextSeason(); S.tab = 'home'; render(); doSave(false); window.scrollTo(0, 0); break;
      case 'save': doSave(true); break;
      case 'newgame': if (confirm('새 게임을 시작할까요? 현재 진행 상황은 저장하지 않으면 사라집니다.')) { G.newWorld(); S.screen = 'start'; S.startSel = null; render(); } break;
    }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]'); if (!el) return;
    const k = el.dataset.chg, v = el.value, d = el.dataset, w = G.world();
    switch (k) {
      case 'name': S.name = v; break;
      case 'startC': S.startC = v; S.startT = 0; S.startSel = null; rerender(); break;
      case 'startT': S.startT = +v; S.startSel = null; rerender(); break;
      case 'slot': {
        const t = T(); const lu = G.currentLineup(t, true).slice(); const i = +d.i, nid = +v;
        const j = lu.indexOf(nid); if (j >= 0) lu[j] = lu[i]; lu[i] = nid; t.lu = lu; t.luF = t.form; rerender(); break;
      }
      case 'mpt': { const m = S.match; m.M.setPt(m.M.userSide, +d.id, d.k, +v); break; }
      case 'pt': { const t = T(); const o = t.pt[d.id] || (t.pt[d.id] = { adv: 3, shoot: 3, risk: 3 }); o[d.k] = +v; break; }
      case 'trA': w.u.train.a = +v; rerender(); break;
      case 'trB': w.u.train.b = +v; rerender(); break;
      case 'focus': w.P[+d.id].ft = +v; toast('개인 훈련을 설정했습니다.'); break;
      case 'scC': S.sc.c = v; S.sc.team = null; rerender(); break;
      case 'scT': S.sc.t = +v; S.sc.team = null; rerender(); break;
      case 'scTeam': S.sc.team = +v; rerender(); break;
      case 'setnum': { const r = G.setNumber(+d.id, parseFloat(v)); toast(r.err || (r.swap ? '등번호를 변경했습니다. (' + r.swap + ' 선수와 맞교환)' : '등번호를 변경했습니다.')); rerender(); break; }
      case 'trFc': S.tr.fc = v; S.tr.fteam = null; rerender(); break;
      case 'trFt': S.tr.ft = +v; S.tr.fteam = null; rerender(); break;
      case 'trFteam': S.tr.fteam = +v; rerender(); break;
      case 'tc': S.tc = v; rerender(); break;
      case 'hs': S.hs = +v; rerender(); break;
      case 'tt': S.tt = +v; rerender(); break;
    }
  });

  /* ---------- 시작 ---------- */
  function boot() {
    G.newWorld();
    S.hasSave = false;
    const hash = location.hash;
    if (hash.indexOf('demo=') >= 0) { demo(hash.split('demo=')[1]); return; }
    render();
    try {
      G.hasSave().then(has => { S.hasSave = has; if (has && S.screen === 'start') rerender(); });
    } catch (err) { /* 저장소를 쓸 수 없는 환경 */ }
  }
  // 화면 점검용: index.html#demo=home|squad|player|tactics|indiv|train|scout|judge|table|prematch|match
  function demo(kind) {
    const w = G.world();
    const id = w.cl.byC.ENG[0];
    G.startGame('데모', id); if (kind !== 'transfer' && kind !== 'neg' && kind !== 'oview') G.twEnd();
    const t = T(); S.tc = t.cid; S.tt = t.tier; S.sc = { c: 'ENG', t: 0, team: null };
    for (let i = 0; G.world().state === 'play' && i < 6; i++) { G.advanceWeek(G.userFixtures().map(f => G.simulateMatch(w.teams[f.h], w.teams[f.a], { kind: f.kind }))); }
    G.doSearch('AF');
    S.screen = 'game';
    const map = { home: 'home', squad: 'squad', player: 'squad', tactics: 'tactics', indiv: 'tactics', train: 'train', scout: 'scout', judge: 'scout', table: 'table', transfer: 'transfer', oview: 'transfer', neg: 'transfer', cl: 'table', mine: 'transfer' };
    if (kind === 'cl') S.tabsub = 'cl';
    if (kind === 'oview') { const o = w.teams[w.lg.ENG[0].teams.find(x => x !== id)]; S.view = o.pl[3]; G.doJudge(o.pl[3]); }
    if (kind === 'mine') S.tr.sub = 'mine';
    if (kind === 'neg') { const o = w.teams[w.lg.ENG[0].teams.find(x => x !== id)]; const p1 = w.P[o.pl[4]]; G.twStart(p1.id, G.twEst(p1.id) * 1.3); G.twNext(); const p2 = w.P[o.pl[8]]; G.twStart(p2.id, G.twEst(p2.id) * 0.6); S.tr.negPid = w.P[o.pl[2]].id; }
    S.tab = map[kind] || 'home';
    if (kind === 'player') S.sel = t.pl[3];
    if (kind === 'indiv') S.tsub = 'indiv';
    if (kind === 'scout') { const r = G.doSearch('AS'); }
    if (kind === 'judge') { S.scoutSub = 'judge'; S.sc = { c: 'ENG', t: 0, team: w.lg.ENG[0].teams[2] }; G.doJudge(w.teams[w.lg.ENG[0].teams[2]].pl[5]); }
    if (kind === 'scout') { S.lastSearch = w.u.seen.slice(-2); G.doJudge(S.lastSearch[0]); }
    if (kind === 'prematch') { S.fxs = G.userFixtures(); S.cur = 0; S.results = []; S.screen = 'prematch'; }
    if (kind === 'match') { S.fxs = G.userFixtures(); S.cur = 0; S.results = []; startMatch(true); const m = S.match; pauseMatch(); m.idx = 40; m.htShown = true; updateMatchUi(); return; }
    render();
  }
  window.addEventListener('load', boot);
})();
