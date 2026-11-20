/* 감독 인생 시뮬레이터 - 샘플 엔진 (PRD v1.0 기반 프로토타입)
 * 포함: 6개국×4부 리그, 선수 능력치/히든/성장/노화/부상, 훈련, 스카우팅(탐색/판단),
 *       전술(포메이션/팀/개인/세트피스), 2D 격자 경기 시뮬레이션, 승강제, 시즌 진행
 * 미포함(샘플 범위 밖): 국내 컵, 챔피언스리그, 이적시장 심화, 경기 중 교체
 */
(function (root) {
  'use strict';

  /* ---------- 난수 ---------- */
  let _s = (Date.now() >>> 0) || 1;
  function setSeed(x) { _s = (x >>> 0) || 1; }
  function rnd() {
    _s |= 0; _s = _s + 0x6D2B79F5 | 0;
    let t = Math.imul(_s ^ _s >>> 15, 1 | _s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function norm() { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const r1 = x => Math.round(x * 10) / 10;

  /* ---------- 기본 데이터 ---------- */
  const ATTRS = ['슈팅', '패스', '헤딩', '드리블', '태클', '크로스', '세트피스',
    '대담함', '집중력', '판단력', '팀워크',
    '속력', '몸싸움', '균형감', '지구력',
    '반사신경', '핸들링'];
  const ATTR_GROUP = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3];
  const GROUP_NAME = ['기술적 능력', '정신적 능력', '신체적 능력', '골키퍼 능력'];
  const POS = ['GK', 'DF', 'MF', 'FW'];
  const KEY = [[15, 16, 8, 9], [4, 2, 12, 8, 9, 11], [1, 9, 10, 14, 3], [0, 3, 11, 7, 9, 2]];
  const CONTINENTS = [
    { id: 'EU', name: '유럽' }, { id: 'SA', name: '남미' }, { id: 'NA', name: '북중미' },
    { id: 'AF', name: '아프리카' }, { id: 'AS', name: '아시아' }, { id: 'OC', name: '오세아니아' }
  ];
  const FORMATION_LIST = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-1-4-1', '4-3-2-1'];

  const TACTIC_DEFS = [
    { k: 'tempo', n: '템포', l: ['매우 느림', '느림', '보통', '빠름', '매우 빠름'] },
    { k: 'press', n: '압박 강도', l: ['매우 낮음', '낮음', '보통', '높음', '매우 높음'] },
    { k: 'line', n: '수비 라인 높이', l: ['매우 낮음', '낮음', '보통', '높음', '매우 높음'] },
    { k: 'width', n: '공격 폭', l: ['매우 좁게', '좁게', '보통', '넓게', '매우 넓게'] },
    { k: 'plen', n: '패스 길이', l: ['매우 짧게', '짧게', '혼합', '길게', '매우 길게'] },
    { k: 'direct', n: '공격 전개', l: ['빌드업', '점유', '균형', '전환', '직접'] },
    { k: 'foul', n: '파울 허용도', l: ['매우 깨끗', '깨끗', '보통', '거침', '매우 거침'] }
  ];
  const TF_LABEL = ['매우 수비적', '수비적', '균형', '공격적', '매우 공격적'];
  const SP_DEFS = [
    { k: 'ca', n: '공격 코너 투입 인원', l: ['1명', '2명', '3명', '4명', '5명+'] },
    { k: 'ck', n: '코너 킥 방식', l: ['숏 코너', '짧게 혼합', '혼합', '크로스', '롱 크로스'] },
    { k: 'fk', n: '프리킥 성향', l: ['크로스 위주', '크로스', '혼합', '슈팅', '직접 슈팅'] },
    { k: 'md', n: '수비 세트피스 마킹', l: ['지역', '지역 우세', '혼합', '맨마킹 우세', '맨마킹'] },
    { k: 'dr', n: '수비 세트피스 인원', l: ['최소', '적게', '보통', '많이', '전원'] }
  ];
  const PT_DEFS = [
    { k: 'adv', n: '전진성', l: ['매우 보수적', '보수적', '보통', '적극적', '매우 적극'] },
    { k: 'shoot', n: '슈팅 빈도', l: ['매우 낮음', '낮음', '보통', '높음', '매우 높음'] },
    { k: 'risk', n: '패스 위험도', l: ['안전 패스', '안전', '보통', '모험적', '킬패스'] }
  ];

  const TRAIN = [
    { k: '공격 훈련', attrs: [0, 3, 1, 9], pos: [2, 3], d: '슈팅·드리블·패스·판단력 (MF/FW)' },
    { k: '수비 훈련', attrs: [4, 2, 8, 10], pos: [1, 2], d: '태클·헤딩·집중력·팀워크 (DF/MF)' },
    { k: '골키퍼 훈련', attrs: [15, 16, 8], pos: [0], d: '반사신경·핸들링·집중력 (GK)' },
    { k: '세트피스 훈련', attrs: [6, 2, 8, 5], pos: [0, 1, 2, 3], d: '세트피스·헤딩·집중력·크로스' },
    { k: '전술 훈련', attrs: [9, 10, 7], pos: [0, 1, 2, 3], coh: true, d: '판단력·팀워크 + 팀 전술 숙련도 상승' },
    { k: '체력 훈련', attrs: [14, 11, 12, 13], pos: [0, 1, 2, 3], d: '지구력·속력·몸싸움·균형감' },
    { k: '멘탈 훈련', attrs: [7, 8, 9], pos: [0, 1, 2, 3], d: '대담함·집중력·판단력' },
    { k: '회복/재활', attrs: [], rec: true, pos: [0, 1, 2, 3], d: '피로 회복 증가, 부상 위험 감소' }
  ];
  const INT_MULT = [0.5, 0.8, 1, 1.3, 1.6];
  const INT_DRAIN = [1, 3, 5, 8, 12];
  const INT_INJ = [0.4, 0.7, 1, 1.5, 2.2];
  const INT_LABEL = ['매우 가벼움', '가벼움', '보통', '강함', '매우 강함'];

  /* ---------- 이름 풀 ---------- */
  const NM = {
    en: { f: ['잭', '오웬', '리암', '해리', '칼럼', '대니', '루크', '네이선', '조던', '샘', '벤', '에단', '콜', '딜런', '맥스'], l: ['하트', '브룩스', '웨스턴', '핀치', '콜린스', '마시', '파커', '로슨', '베일', '스완', '쿠퍼', '헤일', '디컨', '윌킨스', '포스터'], n: ['잉글랜드', '웨일스', '스코틀랜드'] },
    fr: { f: ['뤼카', '테오', '엘리', '마엘', '노아', '이방', '킬리앙', '달리', '로맹', '자드', '빅토르', '레오', '악셀', '시몽', '마튀'], l: ['모로', '다르망', '벨리', '포르', '라쿠르', '도니', '마르셀', '샤브리', '뒤랑', '로랑', '페르송', '브뇌', '카스텔', '드락', '살리'], n: ['프랑스'] },
    de: { f: ['얀', '레온', '팀', '핀', '루카스', '니코', '마르빈', '엘리아스', '필립', '토비', '플로리안', '막스', '다비드', '야콥', '세바'], l: ['바그너', '호프만', '크라우제', '브란트', '자이들', '베커', '하르트만', '리히터', '아이히', '코흐', '네스', '페터', '로이터', '슈탈', '발터'], n: ['독일', '오스트리아'] },
    pt: { f: ['티아구', '주앙', '디오구', '넬송', '루이', '안드레', '페드루', '후고', '리카르두', '벤투', '가브리', '다니', '미겔', '세르지', '카를로'], l: ['페레이라', '소아르', '마토스', '칼라사', '리베이루', '네베스', '브란당', '탈라', '모라이스', '고메스', '바로스', '필리페', '안투네스', '로샤', '시몽이스'], n: ['포르투갈'] },
    es: { f: ['알레호', '마테오', '하비', '이반', '디에고', '사울', '엑토르', '루벤', '마르코', '파블로', '일리안', '아드리', '카를로', '엔리', '오스카'], l: ['몬테로', '카스티요', '벨라스', '나바로', '오르테가', '리베라', '마르몰', '구티에', '산체스', '아란다', '로메로', '페냐', '블랑코', '세라', '이글레'], n: ['스페인'] },
    it: { f: ['마티아', '잔루', '리카', '로렌', '엔초', '나탈레', '디노', '피에로', '코시모', '살바', '오를란', '체사레', '루초', '브루노', '안젤'], l: ['콘티', '베르티', '로마노', '페라리', '보나', '카르보', '데시모', '리치', '마리니', '판도', '소렌티', '칼비', '젠틸리', '토마지', '바를로'], n: ['이탈리아'] },
    af: { f: ['아마두', '이드리', '칼리', '쿠아메', '엠마', '세쿠', '타리', '나빌', '모하', '이브라', '음벰바', '쿠소', '아데', '바카리', '칸데'], l: ['디알로', '쿠야테', '은조', '반다', '오세이', '파예', '시세', '투레', '음보마', '아데예미', '칼루', '나시르', '벤나니', '코네', '다보'], n: ['나이지리아', '세네갈', '가나', '카메룬', '코트디부아르', '모로코', '말리'] },
    as: { f: ['켄지', '하루', '유타', '민준', '도윤', '재현', '소우', '류이', '시온', '태양', '진우', '카이', '레이', '현우', '준서'], l: ['다카노', '시미즈', '한', '서', '오카베', '이', '마쓰이', '박', '나카', '류', '도이', '정', '하라다', '신', '구로'], n: ['일본', '한국', '중국', '이란', '사우디'] },
    sa: { f: ['티아구', '가브리', '마테우스', '루카스', '레안드로', '브루노', '호드리', '디에고', '산티', '파쿤도', '니코', '라파', '구스타', '크리스', '엔소'], l: ['실바', '칸투', '알베스', '페르난', '로드리', '올리베', '카르도', '메디나', '로드리게', '아브레우', '소사', '베니테', '아코스타', '가르시', '바르가'], n: ['브라질', '아르헨티나', '우루과이', '콜롬비아', '칠레'] },
    na: { f: ['잭', '마테오', '디에고', '카를로', '조슈', '노아', '엘리', '가브리', '루카스', '샘', '엑토르', '벤', '알렉스', '이반', '다니'], l: ['웨스턴', '몬테로', '콜린스', '리베라', '파커', '구티에', '로슨', '메디나', '쿠퍼', '나바로', '헤일', '산체스', '포스터', '블랑코', '베일'], n: ['미국', '멕시코', '캐나다', '코스타리카'] },
    oc: { f: ['잭', '오웬', '리암', '해리', '칼럼', '루크', '네이선', '조던', '샘', '벤', '에단', '콜', '딜런', '맥스', '터너'], l: ['하트', '브룩스', '웨스턴', '핀치', '콜린스', '마시', '파커', '로슨', '베일', '스완', '쿠퍼', '헤일', '디컨', '윌킨스', '포스터'], n: ['호주', '뉴질랜드'] }
  };
  const CONT_REG = { EU: ['en', 'fr', 'de', 'pt', 'es', 'it'], SA: ['sa'], NA: ['na', 'en', 'es'], AF: ['af'], AS: ['as'], OC: ['oc'] };

  /* ---------- 국가/리그 (PRD 4.1.1, 4.1.2) ---------- */
  const COUNTRIES = [
    { id: 'ENG', name: '잉글랜드', sizes: [20, 24, 24, 24], ud: [3, 3, 2], coef: 1.0, reg: 'en',
      stems: ['엘름', '스톤', '하이', '웨스트', '노스', '이스트', '오크', '레이븐', '실버', '마시', '캐슬', '홀로', '브라이', '애쉬', '크레스', '월로'],
      suf: ['브룩', '게이트', '필드', '포드', '튼', '웨이', '힐', '베리', '크로프트', '데일'],
      type: ['어슬레틱', '유나이티드', '타운', '로버스', '시티', '레인저스', 'FC'] },
    { id: 'FRA', name: '프랑스', sizes: [18, 18, 18, 16], ud: [2, 2, 2], coef: 0.9, reg: 'fr',
      stems: ['세느', '라그', '오르', '마리', '벨루', '사브', '푸아', '튈', '노르', '리브', '카스', '에투', '모랑', '생', '발르', '올리'],
      suf: ['빌', '랑주', '비아', '탕', '리', '모', '쥐', '엥', '롱', '네'],
      type: ['SC', 'AC', 'FC', 'AS', 'US'] },
    { id: 'GER', name: '독일', sizes: [18, 18, 20, 20], ud: [2, 3, 3], coef: 0.96, reg: 'de',
      stems: ['알페', '쉬바', '룬트', '하르', '브란', '에르', '발트', '칼텐', '로이', '슈타', '네카', '오스', '포메', '잘츠', '보덴', '탈하'],
      suf: ['나', '호프', '하임', '부르크', '도르프', '슈타트', '베르크', '바흐', '탈', '펠트'],
      type: ['SV', 'FC', 'BSC', 'VfB', 'TSV'] },
    { id: 'POR', name: '포르투갈', sizes: [18, 18, 20, 18], ud: [2, 2, 2], coef: 0.82, reg: 'pt',
      stems: ['올리', '타구', '두에', '마르', '벨루', '소르', '카보', '아베', '리바', '포르', '세투', '알가', '페나', '레이', '몬타', '코임'],
      suf: ['바', '스', '로', '아', '리아', '뉴', '주', '말', '탈', '다'],
      type: ['SC', 'FC', 'AC', 'CD', 'GD'] },
    { id: 'ESP', name: '스페인', sizes: [20, 22, 20, 20], ud: [3, 3, 3], coef: 1.0, reg: 'es',
      stems: ['아르', '솔', '마레', '벨', '카스', '비르', '토레', '올리', '산토', '플로', '누에', '라구', '세르', '발로', '모란', '이베'],
      suf: ['카나', '데로', '스', '나', '리아', '로사', '바', '도', '노', '타'],
      type: ['CF', '데포르티보', '아틀레티', 'UD', 'SD', 'FC'] },
    { id: 'ITA', name: '이탈리아', sizes: [20, 20, 20, 20], ud: [3, 3, 3], coef: 0.96, reg: 'it',
      stems: ['토라', '벨', '포르', '체로', '마르', '살비', '카스', '리보', '테라', '비안', '로셀', '아우', '피오', '젠나', '몬디', '라베'],
      suf: ['노', '체', '토', '리아', '네', '나', '로', '모', '사', '타'],
      type: ['칼치오', 'FC', 'SSC', 'AC', 'US'] }
  ];
  const TIER_BASE = [0.62, 0.38, 0.2, 0.05];
  const TIER_SPAN = [0.38, 0.30, 0.22, 0.18];
  const MAX_WEEKS = 46;

  /* ---------- 월드 상태 ---------- */
  let W = null;
  function world() { return W; }

  /* ---------- 포메이션 ---------- */
  const _slotCache = {};
  function slotsFor(form) {
    if (_slotCache[form]) return _slotCache[form];
    const lines = form.split('-').map(Number);
    const slots = [{ pos: 0, x: 0.5, y: 0.04, line: -1 }];
    const n = lines.length;
    lines.forEach((cnt, li) => {
      const y = n === 1 ? 0.5 : 0.22 + (0.80 - 0.22) * li / (n - 1);
      const pos = li === 0 ? 1 : (li === n - 1 ? 3 : 2);
      for (let k = 0; k < cnt; k++) {
        const x = cnt === 1 ? 0.5 : 0.12 + 0.76 * k / (cnt - 1);
        slots.push({ pos, x, y: pos === 2 && cnt <= 3 && li > 1 ? y + 0.02 : y, line: li });
      }
    });
    _slotCache[form] = slots;
    return slots;
  }

  /* ---------- 선수 ---------- */
  function calcCA(p) {
    const at = p.at, k = KEY[p.p];
    let km = 0; for (const i of k) km += at[i]; km /= k.length;
    let all;
    if (p.p === 0) all = (at[10] + at[12] + at[13] + at[14]) / 4;
    else { let s = 0; for (let i = 0; i < 15; i++) s += at[i]; all = s / 15; }
    return 10 * (0.8 * km + 0.2 * all);
  }
  function caAs(p, pos) { // 해당 포지션 기준 능력(포지션 적합도 반영)
    const q = { at: p.at, p: pos };
    let v = calcCA(q);
    if (p.p === pos) return v;
    if (p.p === 0 || pos === 0) return v * (pos === 0 ? 0.2 : 0.5);
    return v * (Math.abs(p.p - pos) === 1 ? 0.93 : 0.85);
  }
  function refresh(p) { p.ca = Math.round(calcCA(p) * 10) / 10; if (p.pa < p.ca) p.pa = p.ca; }
  function valueOf(p) {
    let v = 20 * Math.pow(p.ca / 100, 4);
    if (p.a <= 22) v *= 1 + Math.max(0, p.pa - p.ca) / 60;
    if (p.a >= 31) v *= Math.max(0.2, 1 - (p.a - 30) * 0.15);
    return Math.max(0.05, r1(v));
  }
  function genName(reg) {
    const o = NM[reg];
    return pick(o.f) + ' ' + pick(o.l);
  }
  function genPlayer(L, pos, age, reg, opt) {
    opt = opt || {};
    if (age == null) age = clamp(Math.round(25.5 + norm() * 4.2), 16, 37);
    const peak = (62 + 72 * L) + norm() * 9;
    let ca, pa;
    if (age <= 21) {
      const yf = Math.min(0.9, 0.6 + 0.05 * (age - 15));
      ca = peak * yf;
      pa = peak + 6 + Math.abs(norm()) * 14 + (rnd() < 0.04 ? 20 : 0);
    } else if (age <= 26) {
      ca = peak * (0.95 + 0.01 * (age - 22)); pa = ca + Math.abs(norm()) * 6;
    } else if (age <= 30) { ca = peak; pa = ca; }
    else { ca = peak * (1 - 0.03 * (age - 30)); pa = ca; }
    if (opt.caShift) { ca += opt.caShift; pa += opt.caShift; }
    ca = clamp(ca, 22, 185); pa = clamp(Math.max(pa, ca + (age <= 21 ? 3 : 0)), ca, 195);
    const at = new Array(17);
    for (let i = 0; i < 17; i++) {
      let b = ca / 10 + norm() * 1.5;
      if (KEY[pos].includes(i)) b += 1.5; else b -= 1.0;
      if (ATTR_GROUP[i] === 2 && age >= 31) b -= (age - 30) * 0.4;
      if (pos === 0 && i < 15 && !KEY[0].includes(i)) b = 3 + rnd() * 6;
      if (pos !== 0 && i >= 15) b = 2 + rnd() * 5;
      at[i] = clamp(b, 1, 20);
    }
    const p = { id: 0, n: genName(reg), nat: pick(NM[reg].n), a: age, p: pos, at, pa, ip: clamp(Math.round(10 + norm() * 4), 1, 20), bm: clamp(Math.round(10 + norm() * 4), 1, 20), dv: clamp(Math.round(10 + norm() * 4 + (age <= 21 ? (pa - ca) / 15 : 0)), 1, 20), pr: clamp(Math.round(10 + norm() * 4), 1, 20), t: -1, inj: 0, cd: 100, g: 0, ap: 0, si: 0, ft: -1, ca: 0 };
    for (let t = 0; t < 4; t++) {
      const d = (ca - calcCA(p)) / 10;
      for (let i = 0; i < 17; i++) {
        if (pos === 0 ? (i < 15 && !KEY[0].includes(i) && i !== 10 && i !== 12 && i !== 13 && i !== 14) : i >= 15) continue;
        p.at[i] = clamp(p.at[i] + d, 1, 20);
      }
    }
    p.at = p.at.map(x => r1(x));
    refresh(p);
    return p;
  }
  function addPlayer(p) { p.id = W.nid++; W.P[p.id] = p; return p; }

  /* ---------- 팀/리그 생성 ---------- */
  function genTeamNames(c, count, used) {
    const out = [];
    let guard = 0;
    while (out.length < count && guard++ < 5000) {
      const nm = pick(c.stems) + pick(c.suf) + ' ' + pick(c.type);
      if (used.has(nm)) continue;
      used.add(nm); out.push(nm);
    }
    return out;
  }
  function randomTac() {
    const t = { tf: 3, ca: 3, ck: 3, fk: 3, md: 3, dr: 3 };
    TACTIC_DEFS.forEach(d => { t[d.k] = clamp(3 + ri(-1, 1), 1, 5); });
    return t;
  }
  function defaultTac() {
    const t = { tf: 3, ca: 3, ck: 3, fk: 3, md: 3, dr: 3 };
    TACTIC_DEFS.forEach(d => { t[d.k] = 3; });
    return t;
  }
  function makeSquad(team) {
    const spec = [[0, 3], [1, 8], [2, 8], [3, 6]];
    const c = COUNTRIES.find(x => x.id === team.cid);
    for (const [pos, n] of spec) {
      for (let i = 0; i < n; i++) {
        const foreign = rnd() < 0.25;
        const reg = (foreign || !c) ? pick(['en', 'fr', 'de', 'pt', 'es', 'it', 'af', 'sa']) : c.reg;
        const p = genPlayer(team.lv, pos, null, reg);
        p.t = team.id; addPlayer(p); team.pl.push(p.id);
      }
    }
    fixNumbers(team);
  }
  function newWorld(seed) {
    setSeed(seed || (Date.now() >>> 0));
    W = { season: 1, week: 1, nid: 1, P: {}, teams: [], lg: {}, pool: {}, state: 'play', report: null, u: null, MAXW: MAX_WEEKS };
    const used = new Set();
    COUNTRIES.forEach(c => {
      W.lg[c.id] = [];
      c.sizes.forEach((N, t) => {
        const names = genTeamNames(c, N, used);
        const ids = [];
        for (let i = 0; i < N; i++) {
          const u = clamp(0.5 * (1 - i / (N - 1)) + 0.5 * rnd(), 0, 1);
          const lv = clamp(c.coef * (TIER_BASE[t] + TIER_SPAN[t] * u), 0.02, 1);
          const team = { id: W.teams.length, name: names[i], cid: c.id, tier: t, lv, pl: [], form: pick(FORMATION_LIST), tac: randomTac(), pt: {}, lu: null, coh: 70,
            sS: clamp(Math.round(2 + lv * 6 + norm()), 1, 10), sJ: clamp(Math.round(2 + lv * 6 + norm()), 1, 10), bud: Math.round(5 + 160 * lv * lv) };
          W.teams.push(team); ids.push(team.id); makeSquad(team);
        }
        W.lg[c.id].push({ teams: ids, fx: [], tbl: {} });
      });
    });
    createRndTeams();
    setupSeasonTables();
    W.prevTop = null; W.cl = null; W.tw = null;
    setupCL();
    CONTINENTS.forEach(ct => {
      W.pool[ct.id] = [];
      fillPool(ct.id, 500);
    });
    return W;
  }
  function fillPool(cid, target) {
    const regs = CONT_REG[cid];
    while (W.pool[cid].length < target) {
      const age = ri(15, 21);
      const L = clamp(0.1 + rnd() * 0.75, 0, 1);
      const p = genPlayer(L, pick([0, 1, 1, 2, 2, 3, 3]), age, pick(regs));
      p.c = cid; p.t = -1; addPlayer(p); W.pool[cid].push(p.id);
    }
  }
  function roundRobin(ids) {
    const n = ids.length, arr = ids.slice(), rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const m = [];
      for (let i = 0; i < n / 2; i++) { const h = arr[i], a = arr[n - 1 - i]; m.push(r % 2 === 0 ? [h, a] : [a, h]); }
      rounds.push(m);
      arr.splice(1, 0, arr.pop());
    }
    return rounds;
  }
  function setupSeasonTables() {
    COUNTRIES.forEach(c => {
      W.lg[c.id].forEach(L => {
        const r = roundRobin(L.teams);
        const sw = r.map(m => m.map(x => [x[1], x[0]]));
        L.fx = r.concat(sw);
        L.tbl = {};
        L.teams.forEach(id => { L.tbl[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
      });
    });
    W.teams.forEach(t => { t.hist = []; });
    for (const id in W.P) { const p = W.P[id]; p.g = 0; p.ap = 0; p.si = 0; }
  }
  function sortedTable(L) {
    return L.teams.slice().sort((a, b) => {
      const A = L.tbl[a], B = L.tbl[b];
      return (B.pts - A.pts) || ((B.gf - B.ga) - (A.gf - A.ga)) || (B.gf - A.gf) || (a - b);
    });
  }

  /* ---------- 라인업 ---------- */
  function availablePlayers(team) { return team.pl.map(id => W.P[id]).filter(p => p && !p.inj); }
  function autoLineup(team, form) {
    form = form || team.form;
    const slots = slotsFor(form);
    const avail = availablePlayers(team);
    const used = new Set();
    const lu = new Array(11).fill(0);
    const order = slots.map((s, i) => i).sort((a, b) => (slots[a].pos === 0 ? -1 : slots[b].pos === 0 ? 1 : 0));
    for (const i of order) {
      const pos = slots[i].pos;
      let best = null, bs = -1;
      for (const p of avail) {
        if (used.has(p.id)) continue;
        const sc = caAs(p, pos) * (0.85 + 0.15 * p.cd / 100);
        if (sc > bs) { bs = sc; best = p; }
      }
      if (!best) { // 인원 부족 시 부상자 포함
        for (const id of team.pl) { if (!used.has(id)) { best = W.P[id]; break; } }
      }
      used.add(best.id); lu[i] = best.id;
    }
    return lu;
  }
  function validLineup(team) {
    const lu = team.lu;
    if (!lu || lu.length !== 11 || team.luF !== team.form) return false;
    const s = new Set();
    for (const id of lu) {
      const p = W.P[id];
      if (!p || p.t !== team.id || p.inj || s.has(id)) return false;
      s.add(id);
    }
    return true;
  }
  function currentLineup(team, isUser) {
    if (isUser) {
      if (!validLineup(team)) {
        // 부상 등으로 일부만 무효 → 해당 슬롯만 교체 시도
        const slots = slotsFor(team.form);
        if (team.lu && team.luF === team.form && team.lu.length === 11) {
          const keep = new Set(); const lu = team.lu.slice();
          lu.forEach(id => { const p = W.P[id]; if (p && p.t === team.id && !p.inj && !keep.has(id)) keep.add(id); });
          const avail = availablePlayers(team).filter(p => !keep.has(p.id));
          const seen = new Set();
          for (let i = 0; i < 11; i++) {
            const id = lu[i], p = W.P[id];
            if (p && p.t === team.id && !p.inj && !seen.has(id)) { seen.add(id); continue; }
            let best = null, bs = -1;
            for (const q of avail) { if (seen.has(q.id)) continue; const sc = caAs(q, slots[i].pos); if (sc > bs) { bs = sc; best = q; } }
            if (!best) { team.lu = null; break; }
            seen.add(best.id); lu[i] = best.id;
          }
          if (team.lu) { team.lu = lu; return lu; }
        }
        team.lu = autoLineup(team); team.luF = team.form;
      }
      return team.lu;
    }
    return autoLineup(team);
  }

  /* ---------- 경기 사이드(팀 능력) ---------- */
  const NA = 3.5, ND = 4.8, NM_ = 5.1;
  const wA = y => clamp((y - 0.35) / 0.4, 0, 1);
  const wD = y => clamp((0.6 - y) / 0.4, 0, 1);
  const wM = y => clamp(1 - Math.abs(y - 0.5) / 0.35, 0, 1);
  function copyPt(pt) { const o = {}; for (const k in pt) o[k] = Object.assign({}, pt[k]); return o; }
  function makeSide(team, lu, isHome, isUser, tacIn, ptIn) {
    const slots = slotsFor(team.form);
    const tac = tacIn || Object.assign({}, team.tac);
    const ptMap = ptIn || copyPt(team.pt);
    let sA = 0, sD = 0, sM = 0, gk = 10, staSum = 0, nOut = 0;
    const sl = [];
    const spA = [], spD = [];
    for (let i = 0; i < 11; i++) {
      const p = W.P[lu[i]], s = slots[i];
      const eff = (0.87 + 0.13 * p.cd / 100) * (p.p === s.pos ? 1 : (s.pos === 0 ? 0.5 : p.p === 0 ? 0.3 : (Math.abs(p.p - s.pos) === 1 ? 0.93 : 0.85)));
      const a = p.at;
      if (s.pos === 0) { gk = (0.4 * a[15] + 0.35 * a[16] + 0.15 * a[8] + 0.1 * a[9]) * eff; }
      else {
        const att = (0.35 * a[0] + 0.2 * a[3] + 0.15 * a[11] + 0.15 * a[9] + 0.15 * a[7]) * eff;
        const def = (0.3 * a[4] + 0.2 * a[2] + 0.2 * a[8] + 0.15 * a[12] + 0.15 * a[9]) * eff;
        const mid = (0.3 * a[1] + 0.25 * a[9] + 0.2 * a[10] + 0.15 * a[14] + 0.1 * a[3]) * eff;
        sA += wA(s.y) * att; sD += wD(s.y) * def; sM += wM(s.y) * mid;
        staSum += a[14]; nOut++;
        spA.push((0.5 * a[2] + 0.5 * a[6]) * eff); spD.push((0.5 * a[2] + 0.3 * a[8] + 0.2 * a[12]) * eff);
      }
      sl.push({ id: p.id, pos: s.pos, y: s.y, x: s.x, att: s.pos === 0 ? 0 : 1, shW: s.pos === 0 ? 0 : Math.pow(wA(s.y), 1.5) * Math.pow(a[0] * eff, 1.5) + 0.01, pt: ptMap[p.id] || { adv: 3, shoot: 3, risk: 3 } });
    }
    const coh = team.coh == null ? 70 : team.coh;
    const cm = 0.94 + 0.06 * coh / 100;
    let A = sA / NA, D = sD / ND, M = sM / NM_;
    const tf = tac.tf || 3;
    A *= 1 + 0.05 * (tf - 3); D *= 1 - 0.03 * (tf - 3);
    M *= 1 + 0.025 * (tac.press - 3) + 0.015 * (tac.line - 3);
    A *= 1 + 0.012 * (tac.tempo - 3);
    D *= 1 - 0.012 * (tac.line - 3);
    const hm = isHome ? 1.025 : 1;
    const mean = arr => arr.reduce((x, y) => x + y, 0) / Math.max(1, arr.length);
    return { team, tac, ptMap, slots: sl, form: team.form, R: { A: A * cm * hm, M: M * cm * hm, D: D * cm * hm, G: gk * cm }, sta: staSum / Math.max(1, nOut), sp: mean(spA), spd: mean(spD), red: 0, lu, isUser, isHome,
      entry: new Array(11).fill(0), loss: new Array(11).fill(0), base: lu.map(id => W.P[id].cd), subs: 0, maxSubs: 5, offIds: new Set(), played: lu.map(id => ({ id, in: 0, out: null })), manual: false };
  }
  function fatigue(S, m) {
    const d = 0.10 * (1 + 0.12 * (S.tac.tempo - 3) + 0.12 * (S.tac.press - 3));
    const s = clamp(1.3 - S.sta / 14, 0.4, 1.2);
    let sum = 0, n = 0;
    for (let i = 1; i < 11; i++) { sum += m - S.entry[i]; n++; }
    return 1 - d * s * clamp((sum / n - 50) / 40, 0, 1);
  }
  /* ---------- 경기 시뮬레이션 (2D 격자: 8열 x 12행) ---------- */
  const XG = [0, 0, 0, 0, 0, 0, 0.026, 0.052, 0.085, 0.13, 0.195, 0.3];
  const P0 = 0.84, SHOOT_MIN = 6;
  const depthOf = (s, r) => s === 0 ? 11 - r : r;
  const rowOf = (s, d) => s === 0 ? 11 - d : d;

  function pickCarrier(S, d) {
    const f = d / 11;
    let tot = 0; const w = new Array(11);
    for (let i = 0; i < 11; i++) { w[i] = Math.exp(-Math.abs(S.slots[i].y - f) * 6) * (S.slots[i].pos === 0 ? 0.4 : 1); tot += w[i]; }
    let x = rnd() * tot;
    for (let i = 0; i < 11; i++) { x -= w[i]; if (x <= 0) return i; }
    return 10;
  }
  function pickShooter(S, carrierIdx) {
    if (S.slots[carrierIdx].pos !== 0 && rnd() < 0.35) return carrierIdx;
    let tot = 0; for (const s of S.slots) tot += s.shW;
    let x = rnd() * tot;
    for (let i = 0; i < 11; i++) { x -= S.slots[i].shW; if (x <= 0) return i; }
    return 10;
  }

  /* 경기를 한 턴(약 1분)씩 진행할 수 있는 상태 머신. 진행 중 전술/교체 개입 가능.
   * opt.trace: 격자 이동 기록 / opt.manual: 사용자 팀 자동 교체 끄기(직접 교체) */
  function createMatch(hTeam, aTeam, opt) {
    opt = opt || {};
    const userId = W.u ? W.u.team : -1;
    const hu = hTeam.id === userId, au = aTeam.id === userId;
    const S = [
      makeSide(hTeam, currentLineup(hTeam, hu).slice(), true, hu),
      makeSide(aTeam, currentLineup(aTeam, au).slice(), false, au)
    ];
    S.forEach(x => { x.manual = !!opt.manual && x.isUser; });
    const score = [0, 0], st = { poss: [0, 0], shots: [0, 0], sot: [0, 0], corners: [0, 0], fouls: [0, 0], yc: [0, 0], rc: [0, 0] };
    const ev = [], tr = [], scorers = [], subsLog = [];
    let poss = rnd() < 0.5 ? 0 : 1, c = 3, r = 5, boost = 0, minute = 0, done = false;
    const TURNS = 94;
    const logEv = (m, s, type, text) => { ev.push({ m, s, type, text }); };
    const label = m => m > 90 ? '90+' + (m - 90) : String(m);
    if (opt.trace) tr.push({ m: 0, c, r, s: poss, tag: 'ko' });
    const res = { kind: opt.kind || 'league', score, st, ev, tr, scorers, subs: subsLog, lineups: null, forms: [hTeam.form, aTeam.form], teams: [hTeam.id, aTeam.id], sides: S, minutes: null, userSide: hu ? 0 : au ? 1 : -1 };

    function rebuild(i) {
      const o = S[i];
      const n = makeSide(o.team, o.lu, i === 0, o.isUser, o.tac, o.ptMap);
      n.manual = o.manual; n.entry = o.entry; n.loss = o.loss; n.base = o.base; n.subs = o.subs; n.maxSubs = o.maxSubs; n.offIds = o.offIds; n.played = o.played; n.red = o.red;
      S[i] = n;
    }
    function benchOf(i) {
      const o = S[i], on = new Set(o.lu);
      return o.team.pl.map(id => W.P[id]).filter(p => p && !p.inj && !on.has(p.id) && !o.offIds.has(p.id));
    }
    function sub(i, slotIdx, benchId) {
      const o = S[i];
      if (done) return { err: '경기가 종료되었습니다.' };
      if (o.subs >= o.maxSubs) return { err: '교체 가능 인원(5명)을 모두 사용했습니다.' };
      const np = W.P[benchId], oldId = o.lu[slotIdx], op = W.P[oldId];
      if (!np || np.t !== o.team.id || np.inj) return { err: '교체할 수 없는 선수입니다.' };
      if (o.lu.indexOf(benchId) >= 0 || o.offIds.has(benchId)) return { err: '이미 출전했거나 교체된 선수입니다.' };
      const rec = o.played.find(x => x.id === oldId); if (rec) { rec.out = minute; rec.end = Math.max(5, o.base[slotIdx] - o.loss[slotIdx]); }
      o.played.push({ id: benchId, in: minute, out: null });
      o.lu[slotIdx] = benchId; o.entry[slotIdx] = minute; o.loss[slotIdx] = 0; o.base[slotIdx] = np.cd; o.offIds.add(oldId); o.subs++;
      rebuild(i);
      subsLog.push({ s: i, m: minute, off: oldId, on: benchId });
      logEv(minute, i, 'sub', `🔄 ${label(minute)}' ${o.team.name} 교체: ${op.n} → ${np.n}`);
      return {};
    }
    function setTac(i, k, v) { S[i].tac[k] = v; rebuild(i); }
    function setPt(i, id, k, v) {
      const o = S[i]; o.ptMap[id] = Object.assign({ adv: 3, shoot: 3, risk: 3 }, o.ptMap[id]); o.ptMap[id][k] = v; rebuild(i);
    }
    function autoSub(i, m) {
      const o = S[i];
      if (o.subs >= 3) return;
      let worst = -1, wt = -1;
      for (let k = 1; k < 11; k++) {
        const p = W.P[o.lu[k]];
        const tired = (m - o.entry[k]) / (0.8 + p.at[14] / 20);
        if (tired > wt) { wt = tired; worst = k; }
      }
      if (worst < 0) return;
      const pos = o.slots[worst].pos, cur = caAs(W.P[o.lu[worst]], pos);
      let best = null, bs = -1;
      for (const p of benchOf(i)) { const sc = caAs(p, pos); if (sc > bs) { bs = sc; best = p; } }
      if (best && bs >= cur * 0.9) sub(i, worst, best.id);
    }

    function goalCheck(s, m, shooterIdx, kind) {
      score[s]++;
      const p = W.P[S[s].slots[shooterIdx].id];
      scorers.push({ s, m, id: p.id, kind });
      logEv(m, s, 'goal', `⚽ ${label(m)}' 골! ${S[s].team.name} - ${p.n}${kind ? ' (' + kind + ')' : ''}  [${score[0]}:${score[1]}]`);
      poss = 1 - s; c = 3; r = 5; boost = 0;
    }

    function step() {
      if (done) return;
      const m = ++minute;
      if (m === 60 || m === 70 || m === 78) for (let i = 0; i < 2; i++) if (!S[i].manual) autoSub(i, m);
      const s = poss, o = 1 - s, A = S[s], B = S[o];
      st.poss[s]++;
      for (let k = 0; k < 2; k++) {
        const X = S[k];
        if (!X.isUser) continue;
        const tm_ = X.tac.tempo + X.tac.press - 6;
        for (let i = 0; i < 11; i++) { const q = W.P[X.lu[i]]; X.loss[i] += (0.28 + 0.02 * tm_) * (1.5 - q.at[14] / 14) * (i === 0 ? 0.4 : 1); }
      }
      const fa = fatigue(A, m) * (A.red ? 0.88 : 1), fb = fatigue(B, m) * (B.red ? 0.88 : 1);
      const rA = A.R, rB = B.R;
      let d = depthOf(s, r);
      const attempts = rnd() < clamp(0.45 + 0.12 * (A.tac.tempo - 3), 0.1, 0.9) ? 2 : 1;
      let tag = '';
      for (let at = 0; at < attempts; at++) {
        d = depthOf(s, r);
        const ci = pickCarrier(A, d);
        const car = A.slots[ci];
        let pShoot = 0;
        if (d >= SHOOT_MIN) pShoot = 0.16 + 0.09 * (d - SHOOT_MIN) + 0.04 * ((A.tac.tf || 3) - 3) + 0.03 * (A.tac.tempo - 3) + boost;
        pShoot *= (0.55 + 0.15 * car.pt.shoot);
        if (d >= SHOOT_MIN && rnd() < pShoot) {
          const si = pickShooter(A, ci), sp = W.P[A.slots[si].id];
          st.shots[s]++;
          const shQ = (0.6 * sp.at[0] + 0.4 * sp.at[9]) * fa * (0.82 + 0.18 * sp.cd / 100);
          const edge = 1 - 0.3 * Math.abs(c - 3.5) / 3.5;
          let pg = XG[d] * edge * Math.exp(0.11 * (shQ - rB.G * fb)) * clamp(1 - 0.03 * (rB.D * fb - 10), 0.6, 1.4);
          pg = clamp(pg, 0.01, 0.6);
          if (rnd() < pg) { st.sot[s]++; tag = 'goal'; goalCheck(s, m, si); break; }
          const x = rnd();
          if (x < 0.40) st.sot[s]++;
          if (x < 0.28) {
            st.corners[s]++; tag = 'corner';
            const sk = A.tac.ca - 3, pc = 0.05 * Math.exp(0.09 * (A.sp * fa - B.spd * fb)) * (1 + 0.08 * sk) * (1 - 0.04 * (3 - B.tac.md));
            if (rnd() < clamp(pc, 0.01, 0.3)) { st.sot[s]++; st.shots[s]++; goalCheck(s, m, pickShooter(A, ci), '코너킥'); tag = 'goal'; break; }
            logEv(m, s, 'info', `🚩 ${label(m)}' ${A.team.name} 코너킥`);
          } else {
            logEv(m, s, 'shot', `🥅 ${label(m)}' ${A.team.name} - ${sp.n} 슈팅${x < 0.40 ? ' (선방)' : ' (빗나감)'}`);
            tag = 'shot';
          }
          poss = o; c = ri(2, 5); r = rowOf(o, ri(1, 2)); boost = 0;
          break;
        }
        const pLong = clamp(0.25 + 0.12 * (A.tac.plen - 3) + 0.10 * (A.tac.direct - 3) + 0.06 * (car.pt.risk - 3), 0.05, 0.7);
        let g = 1 + (rnd() < pLong ? ri(1, 3) : 0);
        if (car.pt.adv > 3 && rnd() < 0.1 * (car.pt.adv - 3)) g++;
        g = Math.min(g, 11 - d);
        if (g <= 0) g = 0;
        let prog, deny;
        if (d < 4) prog = 0.6 * rA.M + 0.4 * rA.D; else if (d < 8) prog = 0.6 * rA.M + 0.4 * rA.A; else prog = 0.5 * rA.M + 0.5 * rA.A;
        prog *= fa;
        if (d < 4) deny = (0.5 * rB.M + 0.5 * rB.A) * (0.7 + 0.1 * B.tac.press);
        else if (d < 8) deny = 0.55 * rB.M + 0.45 * rB.D;
        else deny = 0.3 * rB.M + 0.7 * rB.D;
        deny *= fb;
        if (B.tac.line > 3 && A.tac.direct > 2 && d >= 4) deny -= 0.25 * (B.tac.line - 3) * (A.tac.direct - 2);
        const p = clamp(P0 + 0.04 * (prog - deny) - 0.06 * Math.max(0, g - 1) + boost * 0.3 - 0.02 * (A.tac.tempo - 3), 0.15, 0.93);
        boost = 0;
        if (rnd() < p) {
          r = rowOf(s, d + g);
          let dc = ri(-1, 1);
          if (rnd() < 0.15 * (A.tac.width - 3 + 1)) dc += (c >= 4 ? 1 : -1);
          if (A.tac.width < 3 && rnd() < 0.12 * (3 - A.tac.width)) dc += (c >= 4 ? -1 : 1);
          c = clamp(c + dc, 0, 7);
        } else {
          const adv = g > 1 ? ri(0, g - 1) : 0;
          r = rowOf(s, d + adv);
          poss = o;
          const nd = depthOf(o, r);
          const pf = 0.2 + 0.04 * (B.tac.foul - 3);
          if (rnd() < pf) {
            st.fouls[o]++; tag = 'foul';
            const cr = rnd();
            if (cr < 0.005) { B.red++; st.rc[o]++; logEv(m, o, 'card', `🟥 ${label(m)}' ${B.team.name} 퇴장!`); tag = 'card'; }
            else if (cr < 0.30) { st.yc[o]++; logEv(m, o, 'card', `🟨 ${label(m)}' ${B.team.name} 경고`); tag = 'card'; }
            poss = s;
            if (d >= 8) {
              const pk = 0.045 * Math.exp(0.06 * (A.sp - B.spd)) * (1 + 0.08 * (A.tac.fk - 3));
              st.shots[s]++;
              if (rnd() < pk) { st.sot[s]++; goalCheck(s, m, pickShooter(A, ci), '프리킥'); tag = 'goal'; break; }
              logEv(m, s, 'info', `🎯 ${label(m)}' ${A.team.name} 프리킥 기회 무산`);
              poss = o; c = ri(2, 5); r = rowOf(o, ri(1, 2));
            }
          } else {
            if (B.tac.press >= 4 && nd >= 6) boost = 0.1 + 0.02 * (B.tac.press - 4);
            tag = 'turn';
          }
          break;
        }
      }
      if (opt.trace) tr.push({ m, c, r, s: poss, tag });
      if (m === 45 && opt.trace) tr.push({ m: 45, c: 3, r: 5, s: poss, tag: 'ht' });
      if (m >= TURNS) done = true;
    }

    function result() {
      res.lineups = [S[0].lu.slice(), S[1].lu.slice()];
      res.minutes = S.map(x => { const o = {}; x.played.forEach(pl => { o[pl.id] = Math.max(1, Math.min(90, (pl.out == null ? 90 : pl.out) - pl.in)); }); return o; });
      res.end = S.map(x => { const o = {}; x.played.forEach(pl => { if (pl.end != null) o[pl.id] = pl.end; else { const k = x.lu.indexOf(pl.id); o[pl.id] = k >= 0 ? Math.max(5, x.base[k] - x.loss[k]) : null; } }); return o; });
      res.ratings = [S[0].R, S[1].R];
      return res;
    }
    return { S, res, userSide: res.userSide, get minute() { return minute; }, get done() { return done; }, step, sub, setTac, setPt, bench: benchOf, result, stam: (s, i) => Math.max(5, S[s].base[i] - S[s].loss[i]) };
  }
  function simulateMatch(hTeam, aTeam, opt) {
    const M = createMatch(hTeam, aTeam, opt);
    while (!M.done) M.step();
    return M.result();
  }

  /* ---------- 경기 후 처리 ---------- */
  function injuryDuration() {
    const x = rnd();
    if (x < 0.68) return ri(1, 3);
    if (x < 0.94) return ri(4, 12);
    return ri(20, 44);
  }
  function setInjury(p, team, isUser, srcMsg) {
    p.inj = injuryDuration();
    if (p.inj >= 20) {
      p.si++;
      const recF = 1; // 회복력(프로의식) 영향
      if (rnd() < clamp(0.45 - p.pr * 0.01, 0.15, 0.5)) {
        const drops = []; const cnt = ri(1, 2);
        for (let k = 0; k < cnt; k++) { const i = pick([11, 12, 13, 14]); const dv = ri(1, 3) * recF; p.at[i] = r1(Math.max(1, p.at[i] - dv)); drops.push(ATTRS[i] + ' -' + dv); }
        refresh(p);
        if (isUser) log(`🩹 ${p.n} 중대 부상 후유증: ${drops.join(', ')}`);
      }
    }
    if (isUser) log(`🚑 ${p.n} 부상 (${p.inj}주)`);
  }
  function postMatch(res) {
    const userId = W.u ? W.u.team : -1;
    if (!res.minutes) { res.lineups = [res.sides[0].lu.slice(), res.sides[1].lu.slice()]; res.minutes = res.sides.map(x => { const o = {}; x.played.forEach(pl => { o[pl.id] = Math.max(1, Math.min(90, (pl.out == null ? 90 : pl.out) - pl.in)); }); return o; }); }
    [0, 1].forEach(s => {
      const team = W.teams[res.teams[s]], isUser = team.id === userId, S = res.sides[s];

      for (const sid in res.minutes[s]) {
        const p = W.P[sid]; if (!p) continue;
        const mins = res.minutes[s][sid], f = mins / 90;
        p.ap++;
        if (isUser) { const e = res.end && res.end[s] ? res.end[s][sid] : null; p.cd = clamp(e != null ? e : p.cd - 20 * f, 5, 100); p.pw = (p.pw || 0) + 1; }
        const base = 0.010 + 0.0007 * p.ip;
        const opp = res.sides[1 - s].tac.foul;
        const pr = f * base * (1 + 0.1 * (opp - 3)) * (1 + 0.15 * (S.tac.press - 3)) * (isUser && p.cd < 50 ? 1.6 : 1);
        if (rnd() < pr) setInjury(p, team, isUser);
      }
    });
    res.scorers.forEach(sc => { const p = W.P[sc.id]; if (p) p.g++; });
  }
  function applyResult(L, h, a, hg, ag) {
    const H = L.tbl[h], A = L.tbl[a];
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; A.l++; H.pts += 3; } else if (hg < ag) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
  }

  /* ---------- 로그 ---------- */
  function log(txt) { if (!W.u) return; W.u.log.unshift({ s: W.season, w: W.week, t: txt }); if (W.u.log.length > 80) W.u.log.length = 80; }

  /* ---------- 사용자 ---------- */
  function startGame(name, teamId) {
    const t = W.teams[teamId];
    const L = W.lg[t.cid][t.tier];
    const rank = L.teams.slice().sort((a, b) => W.teams[b].lv - W.teams[a].lv).indexOf(teamId);
    W.u = { name: name || '감독', team: teamId, train: { a: 0, b: 5, i: 3 }, att: { s: 2, j: 3 }, seen: [], evals: {}, own: {}, log: [], chg: [], hist: [], lastTac: JSON.stringify(t.tac) + t.form, targetRank: Math.max(1, Math.round((rank + 1) * 0.85)), reports: [] };
    t.tac = defaultTac(); t.lastTac = null; t.coh = 60; t.lu = null; t.luF = null;
    W.u.lastTac = JSON.stringify(t.tac) + t.form;
    log(`${W.u.name} 감독이 ${t.name}에 부임했습니다. 시즌 목표: ${W.u.targetRank}위 이내`);
    startWindow();
  }
  function userTeam() { return W.teams[W.u.team]; }
  function userFixture() {
    const t = userTeam(); const L = W.lg[t.cid][t.tier];
    const m = L.fx[W.week - 1];
    if (!m) return null;
    for (const [h, a] of m) if (h === t.id || a === t.id) return { h, a, home: h === t.id, opp: h === t.id ? a : h };
    return null;
  }

  /* ---------- 팀 전술 변경 → 숙련도 ---------- */
  function trackTactics() {
    const t = userTeam(); const key = JSON.stringify(t.tac) + t.form;
    return key;
  }

  /* ---------- 스카우팅 ---------- */
  function star(v) { return v < 80 ? 1 : v < 100 ? 2 : v < 125 ? 3 : v < 150 ? 4 : 5; }
  function evaluate(p, S, J) {
    const G = Math.sqrt(S * J), sp = 30 - 2.67 * (G - 1), sc = 0.4 * sp;
    const ePA = p.pa + norm() * sp, eCA = p.ca + norm() * sc;
    return { ca: r1(eCA), pa: r1(ePA), sc: r1(sc), sp: r1(sp), G: r1(G), s: W.season, w: W.week, pid: p.id,
      caLo: star(eCA - sc), caHi: star(eCA + sc), paLo: star(ePA - sp), paHi: star(ePA + sp),
      rel: sp <= 10 ? '높음' : sp <= 18 ? '보통' : '낮음' };
  }
  function ownEval(p) {
    const t = userTeam();
    let e = W.u.own[p.id];
    if (!e || e.s !== W.season) { e = evaluate(p, t.sS, t.sJ); W.u.own[p.id] = e; }
    return e;
  }
  function doSearch(cid) {
    if (W.u.att.s <= 0) return { err: '이번 주 탐색 시도 횟수를 모두 사용했습니다.' };
    const pool = W.pool[cid].filter(id => !W.u.seen.includes(id));
    if (pool.length < 2) return { err: '더 이상 발견할 선수가 없습니다.' };
    const S = userTeam().sS;
    const sk = (S - 1) / 9;
    const out = [];
    for (let n = 0; n < 2; n++) {
      let chosen;
      const cand = []; for (let k = 0; k < 5; k++) { let id, g = 0; do { id = pick(pool); } while (out.includes(id) && g++ < 20); cand.push(id); }
      if (rnd() < sk) { chosen = cand.reduce((b, id) => W.P[id].pa > W.P[b].pa ? id : b, cand[0]); } else chosen = cand[0];
      if (out.includes(chosen)) chosen = pool.find(id => !out.includes(id));
      out.push(chosen);
    }
    W.u.att.s--;
    out.forEach(id => { if (!W.u.seen.includes(id)) W.u.seen.push(id); });
    W.u.found = W.u.found || {}; out.forEach(id => { if (W.u.found[id] === undefined) W.u.found[id] = W.winIdx || 0; });
    log(`🔭 ${CONTINENTS.find(x => x.id === cid).name} 탐색: ${out.map(id => W.P[id].n).join(', ')} 발견`);
    return { ids: out };
  }
  function doJudge(pid) {
    const p = W.P[pid];
    if (!p) return { err: '선수를 찾을 수 없습니다.' };
    if (p.t === W.u.team) return { err: '내 팀 선수는 판단 대상이 아닙니다.' };
    if (W.u.att.j <= 0) return { err: '이번 주 판단 시도 횟수를 모두 사용했습니다.' };
    const t = userTeam();
    const e = evaluate(p, t.sS, t.sJ);
    W.u.att.j--;
    W.u.evals[pid] = e;
    if (!W.u.seen.includes(pid)) W.u.seen.push(pid);
    return { ev: e };
  }
  function buy(pid) {
    return { err: '선수 영입은 이적시장(이적 탭)에서 협상으로만 가능합니다.' };
    const p = W.P[pid]; const t = userTeam();
    if (!p || p.t === t.id) return { err: '영입할 수 없는 선수입니다.' };
    if (t.pl.length >= 32) return { err: '선수단이 가득 찼습니다 (최대 32명). 방출 후 다시 시도하세요.' };
    let price;
    if (p.t < 0) price = r1(valueOf(p) * 0.5);
    else {
      const from = W.teams[p.t];
      if (from.pl.length <= 20) return { err: '상대 구단이 선수단 부족을 이유로 거절했습니다.' };
      price = r1(valueOf(p) * 1.2);
    }
    if (price > t.bud) return { err: `예산이 부족합니다. (필요 ${price}M, 보유 ${r1(t.bud)}M)` };
    t.bud = r1(t.bud - price);
    if (p.t < 0) { const arr = W.pool[p.c]; const i = arr.indexOf(pid); if (i >= 0) arr.splice(i, 1); delete p.c; fillPool(Object.keys(W.pool).find(k => W.pool[k] === arr) || 'EU', 500); }
    else { const from = W.teams[p.t]; from.pl = from.pl.filter(x => x !== pid); from.lu = null; }
    p.t = t.id; t.pl.push(pid); t.lu = null; p.cd = 100;
    log(`✍️ ${p.n} 영입 (${price}M)`);
    return { price };
  }
  function release(pid) {
    if (W.state !== 'transfer') return { err: '선수 방출(이적)은 이적시장 기간에만 가능합니다.' };
    const t = userTeam(); const p = W.P[pid];
    if (!p || p.t !== t.id) return { err: '내 선수가 아닙니다.' };
    if (p.loan) return { err: '임대 선수는 방출할 수 없습니다. 시즌 종료 후 원소속팀으로 복귀합니다.' };
    if (t.pl.length <= 18) return { err: '선수단 최소 인원(18명)을 유지해야 합니다.' };
    t.pl = t.pl.filter(x => x !== pid); delete W.P[pid]; t.lu = null; delete t.pt[pid];
    log(`📤 ${p.n} 방출`);
    return {};
  }

  /* ---------- 훈련/주간 처리 ---------- */
  function trainWeek() {
    const t = userTeam(), pl = W.u.train, I = pl.i - 1;
    const changes = [];
    const slots = pl.a === pl.b ? [pl.a] : [pl.a, pl.b];
    const share = slots.length === 1 ? 1 : 0.5;
    const cats = slots.map(i => TRAIN[i]);
    const hasRec = cats.some(c => c.rec);
    let cohGain = 0;
    t.pl.forEach(id => {
      const p = W.P[id];
      if (!p.xp) p.xp = {};
      // 회복
      let rec = 22 + (hasRec ? 8 : 0) - 8 * Math.max(0, (p.pw || 0) - 1); p.pw = 0;
      if (p.inj) { p.inj--; if (p.inj === 0) log(`💪 ${p.n} 부상에서 복귀했습니다.`); p.cd = clamp(p.cd + rec * 0.5, 0, 100); return; }
      const ageF = p.a <= 18 ? 1.5 : p.a <= 21 ? 1.3 : p.a <= 25 ? 1.0 : p.a <= 29 ? 0.7 : p.a <= 32 ? 0.35 : 0.15;
      const devF = 0.6 + 0.04 * p.dv, room = clamp((p.pa - p.ca) / 30, 0.05, 1.2), prF = 0.8 + 0.02 * p.pr;
      cats.forEach(cat => {
        if (cat.rec) return;
        const eff = cat.pos.includes(p.p) ? 1 : 0.25;
        cat.attrs.forEach(ai => {
          if (p.p !== 0 && ai >= 15) return;
          let g = 0.034 * INT_MULT[I] * eff * share * ageF * devF * room * prF;
          if (p.ft === ai) g *= 1.8;
          p.xp[ai] = (p.xp[ai] || 0) + g;
          if (p.cd < 35 && pl.i >= 4 && ATTR_GROUP[ai] === 2) p.xp[ai] -= 0.04;
          if (p.xp[ai] >= 1) { p.xp[ai] -= 1; p.at[ai] = r1(Math.min(20, p.at[ai] + 1)); changes.push(`${p.n} ${ATTRS[ai]} +1`); }
          else if (p.xp[ai] <= -1) { p.xp[ai] += 1; p.at[ai] = r1(Math.max(1, p.at[ai] - 1)); changes.push(`${p.n} ${ATTRS[ai]} -1 (과훈련)`); }
        });
      });
      refresh(p);
      p.cd = clamp(p.cd - INT_DRAIN[I] + rec, 5, 100);
      // 훈련 중 부상
      const inj = 0.0022 * INT_INJ[I] * (0.5 + p.ip / 10) * (p.cd < 50 ? 1.8 : 1) * (hasRec ? 0.6 : 1);
      if (rnd() < inj) setInjury(p, t, true);
    });
    cats.forEach(cat => { if (cat.coh) cohGain += 3 * INT_MULT[I] * share * 2; });
    // 전술 숙련도
    const key = JSON.stringify(t.tac) + t.form;
    if (key !== W.u.lastTac) { t.coh = clamp(t.coh - 8, 20, 100); W.u.lastTac = key; }
    else t.coh = clamp(t.coh + 1.2 + cohGain, 20, 100);
    W.u.chg = changes;
    if (changes.length) log(`📈 훈련 결과: ${changes.slice(0, 6).join(', ')}${changes.length > 6 ? ` 외 ${changes.length - 6}건` : ''}`);
  }

  /* ---------- 주 진행 ---------- */
  function advanceWeek(userResults) {
    const t = userTeam();
    const urs = !userResults ? [] : Array.isArray(userResults) ? userResults : [userResults];
    const lgUser = urs.find(r => !r.kind || r.kind === 'league');
    const clUser = urs.find(r => r.kind === 'cl');
    COUNTRIES.forEach(c => {
      W.lg[c.id].forEach(L => {
        const m = L.fx[W.week - 1];
        if (!m) return;
        m.forEach(([h, a]) => {
          if (h === t.id || a === t.id) {
            if (lgUser) applyResult(L, h, a, lgUser.score[0], lgUser.score[1]);
            return;
          }
          const res = simulateMatch(W.teams[h], W.teams[a], {});
          applyResult(L, h, a, res.score[0], res.score[1]);
          postMatch(res);
        });
      });
    });
    if (W.cl && W.cl.fx[W.week]) {
      W.cl.fx[W.week].forEach(f => {
        if (f.h === t.id || f.a === t.id) { if (clUser) clApply(f, clUser.score[0], clUser.score[1]); return; }
        const res = simulateMatch(W.teams[f.h], W.teams[f.a], {});
        clApply(f, res.score[0], res.score[1]);
        postMatch(res);
      });
    }
    urs.forEach(res => {
      if (res.userSide >= 0) { const us = res.sides[res.userSide]; t.tac = Object.assign({}, us.tac); t.pt = copyPt(us.ptMap); }
      postMatch(res);
      const home = res.teams[0] === t.id;
      const me = home ? res.score[0] : res.score[1], op = home ? res.score[1] : res.score[0];
      const opp = W.teams[home ? res.teams[1] : res.teams[0]];
      const rs = me > op ? '승' : me < op ? '패' : '무';
      const isCl = res.kind === 'cl';
      W.u.hist.push({ s: W.season, w: W.week, opp: opp.name, home, gf: me, ga: op, r: rs, k: isCl ? 'cl' : 'league' });
      log(`📋 ${W.week}주차 ${isCl ? '[' + CL_NAME + '] ' : ''}${home ? '홈' : '원정'} vs ${opp.name} ${me}:${op} (${rs})`);
    });
    W.u.mwk = urs.length;
    W.teams.forEach(tm => {
      if (tm.id === t.id) return;
      tm.pl.forEach(id => { const p = W.P[id]; if (p.inj) p.inj--; });
    });
    clAfterWeek(W.week);
    trainWeek();
    W.u.att.s = 2; W.u.att.j = 3;
    W.week++;
    if (W.week === 20 && W.state === 'play') { startWindow('mid'); return; }   // 시즌 19번째 경기가 끝나면 시즌 중 이적시장
    const maxW = Math.max(...COUNTRIES.map(c => Math.max(...W.lg[c.id].map(L => L.fx.length))));
    if (W.week > maxW) { W.state = 'seasonEnd'; buildReport(); }
  }

  /* ---------- 시즌 종료 ---------- */
  function ageDelta(g, age) {
    if (g === 2) { // 신체
      if (age <= 18) return 1.3; if (age <= 21) return 0.9; if (age <= 24) return 0.4; if (age <= 27) return 0.1; if (age <= 29) return -0.1;
      if (age <= 31) return -0.5; if (age <= 34) return -1.0; return -1.5;
    }
    if (g === 3) { // GK 전용(노화 늦음)
      if (age <= 18) return 1.0; if (age <= 22) return 0.8; if (age <= 27) return 0.3; if (age <= 31) return 0; if (age <= 34) return -0.3; return -0.8;
    }
    if (g === 0) { // 기술
      if (age <= 18) return 1.2; if (age <= 21) return 0.9; if (age <= 24) return 0.5; if (age <= 27) return 0.15; if (age <= 30) return 0; if (age <= 33) return -0.2; return -0.6;
    }
    // 정신
    if (age <= 18) return 0.9; if (age <= 21) return 0.8; if (age <= 25) return 0.5; if (age <= 29) return 0.25; if (age <= 33) return 0.05; return -0.3;
  }
  function developPlayer(p, isUserTeam) {
    const growthLuck = clamp(1 + norm() * 0.35, 0.2, 1.8);
    const room = clamp((p.pa - p.ca) / 35, 0.05, 1.3);
    const injF = 1 - Math.min(0.6, p.si * 0.12);
    const ptF = (p.a <= 21 && p.t >= 0) ? (0.75 + 0.5 * Math.min(1, p.ap / 30)) : 1;
    const prDec = 1.1 - 0.015 * p.pr;
    for (let i = 0; i < 17; i++) {
      if (p.p !== 0 && i >= 15) continue;
      if (p.p === 0 && i < 15 && !KEY[0].includes(i) && ATTR_GROUP[i] !== 2 && i !== 10) { continue; }
      let b = ageDelta(ATTR_GROUP[i], p.a);
      if (b > 0) b *= room * (0.6 + 0.04 * p.dv) * growthLuck * injF * ptF * (isUserTeam ? 1 : 1);
      else b *= prDec;
      b += norm() * 0.3;
      p.at[i] = r1(clamp(p.at[i] + b, 1, 20));
    }
    refresh(p);
    if (p.a >= 27) p.pa = Math.min(p.pa, p.ca + 2);
  }
  function genYouth(team, pos) {
    const c = COUNTRIES.find(x => x.id === team.cid);
    const foreign = rnd() < 0.25;
    const p = genPlayer(team.lv, pos, ri(16, 18), (foreign || !c) ? pick(['en', 'fr', 'de', 'pt', 'es', 'it', 'af', 'sa']) : c.reg);
    p.t = team.id; addPlayer(p); team.pl.push(p.id); fixNumbers(team);
    return p;
  }
  function buildReport() {
    const t = userTeam(); const L = W.lg[t.cid][t.tier];
    const tbl = sortedTable(L); const rank = tbl.indexOf(t.id) + 1;
    const c = COUNTRIES.find(x => x.id === t.cid);
    const N = L.teams.length;
    let outcome = '잔류';
    if (t.tier > 0 && rank <= c.ud[t.tier - 1]) outcome = '승격';
    if (t.tier < 3 && rank > N - c.ud[t.tier]) outcome = '강등';
    const ok = rank <= W.u.targetRank;
    // 득점 순위
    const top = [];
    W.teams.filter(x => x.cid === t.cid && x.tier === t.tier).forEach(tm => tm.pl.forEach(id => { const p = W.P[id]; if (p.g > 0) top.push({ n: p.n, t: tm.name, g: p.g }); }));
    top.sort((a, b) => b.g - a.g);
    W.report = { season: W.season, rank, N, outcome, ok, target: W.u.targetRank, pts: L.tbl[t.id].pts, champ: W.teams[tbl[0]].name, scorers: top.slice(0, 5),
      cl: (W.cl && W.cl.teams.includes(t.id)) ? { stage: W.cl.stage[t.id], name: CL_STAGE_NAME[W.cl.stage[t.id]], champ: W.cl.champion != null ? W.teams[W.cl.champion].name : null } : null };
    W.u.reports.push({ season: W.season, team: t.name, tier: t.tier + 1, rank, outcome });
  }
  function nextSeason() {
    W.prevTop = {};
    COUNTRIES.forEach(c => { W.prevTop[c.id] = sortedTable(W.lg[c.id][0]).slice(0, 4); });
    const t = userTeam();
    // 1) 선수 노화/성장/은퇴 (모든 팀)
    W.teams.forEach(tm => {
      const isU = tm.id === t.id;
      const retire = [];
      tm.pl.forEach(id => {
        const p = W.P[id];
        developPlayer(p, isU);
        p.a++; p.si = Math.max(0, p.si - 0); p.ap = 0; p.g = 0; p.cd = 100; p.inj = Math.max(0, p.inj > 0 ? Math.min(p.inj, 6) : 0);
        if (p.xp) p.xp = {};
        if (p.a >= 34 && (p.a >= 39 || rnd() < (p.a - 33) * 0.22)) retire.push(id);
      });
      retire.forEach(id => { const p = W.P[id]; if (isU) log(`👋 ${p.n} (${p.a}세) 은퇴`); tm.pl = tm.pl.filter(x => x !== id); delete W.P[id]; delete tm.pt[id]; });
      // 유스 수혈 + 포지션 보충
      const cnt = [0, 0, 0, 0]; tm.pl.forEach(id => cnt[W.P[id].p]++);
      const min = [2, 6, 6, 4];
      for (let pos = 0; pos < 4; pos++) while (cnt[pos] < min[pos]) { genYouth(tm, pos); cnt[pos]++; }
      const ny = isU ? 2 : 2;
      for (let i = 0; i < ny; i++) { const y = genYouth(tm, pick([1, 2, 2, 3])); if (isU) log(`🌱 유스 승격: ${y.n} (${y.a}세, ${POS[y.p]})`); }
      if (!isU) {
        while (tm.pl.length > 28) {
          let worst = null; tm.pl.forEach(id => { const p = W.P[id]; if (p.loan) return; /* 임대로 와 있는 선수는 정리 대상이 아님 */ if (!worst || valueOf(p) < valueOf(worst)) worst = p; });
          if (!worst) break;
          tm.pl = tm.pl.filter(x => x !== worst.id); delete W.P[worst.id];
        }
      }
      tm.lu = null;
    });
    // 2) 풀 갱신
    CONTINENTS.forEach(ct => {
      const arr = W.pool[ct.id], keep = [];
      arr.forEach(id => {
        const p = W.P[id]; developPlayer(p, false); p.a++;
        if (p.a > 21) delete W.P[id]; else keep.push(id);
      });
      W.pool[ct.id] = keep; fillPool(ct.id, 500);
    });
    W.u.seen = W.u.seen.filter(id => W.P[id]); W.u.evals = {}; for (const k in W.u.own) delete W.u.own[k];
    // 3) 수익
    W.teams.forEach(tm => {
      if (tm.cid === 'RND') { tm.bud = r1(tm.bud + 10); return; }
      const L = W.lg[tm.cid][tm.tier];
      const rk = sortedTable(L).indexOf(tm.id);
      const income = r1(8 + 70 * tm.lv * tm.lv + 10 * (1 - rk / L.teams.length) + (tm.tier === 3 ? 2 : 0));
      const wages = teamWages(tm);
      tm.bud = r1(tm.bud + income - wages);
      if (tm.id === t.id) { W.u.fin = { income, wages, net: r1(income - wages) }; log(`💶 시즌 정산: 수입 ${income}M − 연봉 지출 ${wages}M = ${r1(income - wages)}M`); }
    });
    // 임대 선수 복귀 (임대 기간은 한 시즌)
    for (const id in W.P) {
      const p = W.P[id];
      if (!p.loan) continue;
      const home = W.teams[p.loan.from], cur = W.teams[p.t];
      if (cur) { cur.pl = cur.pl.filter(x => x !== p.id); cur.lu = null; delete cur.pt[p.id]; }
      if (home) { home.pl.push(p.id); home.lu = null; p.t = home.id; p.sn = null; fixNumbers(home); }
      if (home && home.id === t.id) log(`↩️ 임대 보냈던 ${p.n}이(가) 복귀했습니다.`);
      if (cur && cur.id === t.id) log(`↩️ 임대로 뛰던 ${p.n}이(가) ${home ? home.name : '원소속팀'}로 복귀했습니다.`);
      delete p.loan;
    }
    W.u.out = [];
    // 4) 승강
    COUNTRIES.forEach(c => {
      const tables = W.lg[c.id].map(L => sortedTable(L));
      for (let tr = 0; tr < 3; tr++) {
        const k = c.ud[tr];
        const upper = W.lg[c.id][tr], lower = W.lg[c.id][tr + 1];
        const down = tables[tr].slice(-k), up = tables[tr + 1].slice(0, k);
        upper.teams = upper.teams.filter(id => !down.includes(id)).concat(up);
        lower.teams = lower.teams.filter(id => !up.includes(id)).concat(down);
        up.forEach(id => { W.teams[id].tier = tr; }); down.forEach(id => { W.teams[id].tier = tr + 1; });
      }
    });
    W.teams.forEach(tm => { if (tm.cid === 'RND') limitRnd(tm); });
    // 승강 후 팀 레벨 재산정(선수단 기반)
    W.teams.forEach(tm => { const top = tm.pl.map(id => W.P[id].ca).sort((a, b) => b - a).slice(0, 14); const avg = top.reduce((a, b) => a + b, 0) / top.length; tm.lv = clamp((avg - 62) / 72, 0.02, 1); });
    W.season++; W.week = 1; W.state = 'play'; W.report = null;
    setupSeasonTables();
    setupCL();
    // 목표 재산정
    const L2 = W.lg[t.cid][t.tier];
    const rank = L2.teams.slice().sort((a, b) => W.teams[b].lv - W.teams[a].lv).indexOf(t.id);
    W.u.targetRank = Math.max(1, Math.round((rank + 1) * 0.85));
    t.lu = null;
    startWindow();
  }

  /* ---------- 등번호 (시즌 시작 전 이적시장 기간에만 변경 가능) ---------- */
  const NUM_PREF = [[1, 12, 13, 23, 25, 30, 31, 40], [2, 3, 4, 5, 15, 16, 22, 24, 26, 33, 34], [6, 8, 10, 14, 17, 18, 20, 21, 28, 29, 32, 35], [7, 9, 11, 19, 27, 36, 37, 38, 39]];
  function fixNumbers(tm) {
    const used = new Set(), todo = [];
    tm.pl.map(id => W.P[id]).sort((a, b) => b.ca - a.ca).forEach(p => {
      if (p.sn != null && !used.has(p.sn)) used.add(p.sn); else todo.push(p);
    });
    todo.forEach(p => {
      let n = NUM_PREF[p.p].find(x => !used.has(x));
      if (n == null) { n = 41; while (used.has(n)) n++; }
      p.sn = n; used.add(n);
    });
  }
  function setNumber(pid, n) {
    if (W.state !== 'transfer') return { err: '등번호는 시즌 시작 전(이적시장 기간)에만 변경할 수 있습니다.' };
    const t = userTeam(), p = W.P[pid];
    if (!p || p.t !== t.id) return { err: '내 팀 선수가 아닙니다.' };
    n = Math.round(n);
    if (!(n >= 1 && n <= 99)) return { err: '등번호는 1~99 사이여야 합니다.' };
    const other = t.pl.map(i => W.P[i]).find(x => x.sn === n && x.id !== pid);
    if (other) other.sn = p.sn;
    p.sn = n;
    return { swap: other ? other.n : null };
  }

  /* ---------- 연봉 / 이적시장 (새 시즌 시작 전 10턴) ---------- */
  const r2 = x => Math.round(x * 100) / 100;
  function wageOf(p) { return p.w != null ? p.w : r2(0.05 + 0.06 * valueOf(p)); }
  function teamWages(tm) { return r1(tm.pl.reduce((s, id) => s + wageOf(W.P[id]), 0)); }
  function wageDemand(p, buyer, seller) {
    let w = 0.05 + 0.08 * valueOf(p);
    if (seller && buyer.lv < seller.lv - 0.05) w *= 1.15;
    else if (seller && buyer.lv > seller.lv + 0.2) w *= 0.9;
    if (p.a >= 31) w *= 0.9;
    if (p.a <= 20) w *= 0.85;
    return r2(w);
  }
  const negActive = n => n.status === 'pending' || n.status === 'counter' || n.status === 'open' || n.status === 'rejected';
  // kind: 'pre' = 시즌 시작 전(20턴), 'mid' = 시즌 19번째 경기 후(10턴, 구단들이 선수를 내놓길 꺼려 요구액이 높음)
  function startWindow(kind) {
    kind = kind || 'pre';
    W.winIdx = (W.winIdx || 0) + 1;
    W.state = 'transfer';
    W.tw = { turn: 1, max: kind === 'mid' ? 10 : 20, kind, mult: kind === 'mid' ? 1.25 : 1, neg: [], inbox: [], nid: 1, loanList: [], saleList: [], recs: [] };
    W.u.att = { s: 2, j: 3 };
    genRecs();
    genInbox();
    log(kind === 'mid'
      ? '💱 시즌 중 이적시장이 열렸습니다 (10턴). 시즌 중이라 구단들이 선수를 내놓길 꺼려 요구액이 높습니다.'
      : '💱 이적시장이 열렸습니다. 새 시즌 시작까지 20턴입니다.');
  }
  // 협상 불가 사유 (임대 중 선수, 발굴하지 않았거나 이번 시장에서 막 발굴한 무소속 선수)
  function negBlock(pid) {
    const p = typeof pid === 'object' ? pid : W.P[pid];
    if (!p) return '선수를 찾을 수 없습니다.';
    if (p.loan) return '임대 중인 선수는 이적 협상을 할 수 없습니다.';
    if (p.t < 0) {
      const f = (W.u.found || {})[p.id];
      if (f === undefined) return '스카우터가 발굴한 선수만 협상할 수 있습니다. 스카우팅 탭에서 탐색하세요.';
      if (f >= (W.winIdx || 0)) return '이번 이적시장 중에 발굴한 선수는 다음 이적시장부터 협상할 수 있습니다.';
    }
    return null;
  }
  function twSaleList(pid) {
    if (W.state !== 'transfer') return { err: '이적시장 기간이 아닙니다.' };
    const t = userTeam(), p = W.P[pid];
    if (!p || p.t !== t.id) return { err: '내 팀 선수가 아닙니다.' };
    if (p.loan) return { err: '임대로 와 있는 선수는 방출 명단에 올릴 수 없습니다.' };
    if (t.pl.length <= 19) return { err: '선수단 최소 인원(19명)을 유지해야 합니다.' };
    W.tw.saleList = W.tw.saleList || [];
    if (W.tw.saleList.includes(pid)) return { err: '이미 방출 명단에 올라 있습니다.' };
    W.tw.saleList.push(pid);
    return {};
  }
  function twSaleCancel(pid) {
    W.tw.saleList = (W.tw.saleList || []).filter(x => x !== pid);
    W.tw.inbox = W.tw.inbox.filter(o => !(o.listed && o.pid === pid));
    return {};
  }
  // 스카우터 추천 풀 5개: 우리 팀 수준(평균 능력)과 예산에 맞춰 다른 팀 선수를 추천. 스카우팅 정확도에 따라 평가에 오차가 있음
  function genRecs() {
    const t = userTeam();
    const caS = t.pl.map(id => W.P[id].ca).sort((a, b) => b - a);
    const avg = caS.slice(0, 14).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(14, caS.length));
    const Gq = Math.sqrt(t.sS * t.sJ), sp = 30 - 2.67 * (Gq - 1), sc = 0.4 * sp;
    const bud = Math.max(t.bud, 3);
    let weak = 1, wv = 1e9;
    for (let pos = 0; pos < 4; pos++) {
      const arr = t.pl.map(id => W.P[id]).filter(p => p.p === pos).map(p => p.ca).sort((a, b) => b - a).slice(0, [1, 4, 4, 2][pos]);
      const m = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      if (m < wv) { wv = m; weak = pos; }
    }
    const cand = [];
    W.teams.forEach(tm => {
      if (tm.cid === 'RND' || tm.id === t.id) return;
      tm.pl.forEach(id => { const p = W.P[id]; if (p.loan) return; cand.push({ p, ca: p.ca + norm() * sc * 0.6, pa: p.pa + norm() * sp * 0.6, v: valueOf(p) }); });
    });
    const used = new Set();
    const mk = (key, name, desc, filter, sortFn, why) => {
      let arr = cand.filter(c => !used.has(c.p.id) && filter(c, 1));
      if (arr.length < 3) arr = cand.filter(c => !used.has(c.p.id) && filter(c, 2.5));
      arr = arr.sort(sortFn).slice(0, 12).sort(() => rnd() - 0.5).slice(0, 5).sort((a, b) => b.ca - a.ca);
      arr.forEach(c => used.add(c.p.id));
      return { key, name, desc, items: arr.map(c => ({ id: c.p.id, ca: r1(c.ca), pa: r1(c.pa), why: why(c) })) };
    };
    const d = c => { const x = Math.round(c.ca - avg); return (x >= 0 ? '+' : '') + x; };
    W.tw.recs = [
      mk('now', '즉시 전력감', '우리 팀 주전 수준에 맞는 즉시 쓸 수 있는 선수',
        (c, k) => c.p.a >= 22 && c.p.a <= 30 && c.ca >= avg - 3 && c.ca <= avg + 22 && c.v <= bud * 0.7 * k, (a, b) => b.ca - a.ca, c => `팀 평균 대비 능력 ${d(c)}`),
      mk('young', '성장 유망주', '지금은 낮아도 잠재력이 팀 수준을 넘는 젊은 선수',
        (c, k) => c.p.a <= 22 && c.pa >= avg + 8 && c.v <= bud * 0.5 * k, (a, b) => b.pa - a.pa, c => `${c.p.a}세 · 잠재력 높음`),
      mk('value', '가성비 영입', '몸값에 비해 능력이 좋은 선수',
        (c, k) => c.ca >= avg - 6 && c.v <= bud * 0.12 * k, (a, b) => b.ca - a.ca, c => '몸값 대비 능력 우수'),
      mk('vet', '베테랑 보강', '경험 많은 29세 이상 즉시 전력',
        (c, k) => c.p.a >= 29 && c.ca >= avg - 2 && c.v <= bud * 0.3 * k, (a, b) => b.ca - a.ca, c => `${c.p.a}세 · 경험 풍부`),
      mk('need', `약점 포지션 보강 (${POS[weak]})`, '우리 팀에서 상대적으로 약한 포지션을 메울 선수',
        (c, k) => c.p.p === weak && c.ca >= avg - 2 && c.v <= bud * 0.6 * k, (a, b) => b.ca - a.ca, c => `${POS[weak]} 보강 · 팀 평균 대비 ${d(c)}`)
    ];
  }
  function estPrice(p) {
    const ev = W.u.evals[p.id];
    if (ev) return valueOf({ ca: ev.ca, pa: ev.pa, a: p.a });
    W.u.est = W.u.est || {};
    let e = W.u.est[p.id];
    if (!e || e.s !== W.season) {
      const t = userTeam(), G_ = Math.sqrt(t.sS * t.sJ), sp = 30 - 2.67 * (G_ - 1);
      e = { v: valueOf({ ca: p.ca + norm() * 0.4 * sp, pa: p.pa + norm() * sp, a: p.a }), s: W.season };
      W.u.est[p.id] = e;
    }
    return e.v;
  }
  function enterPlayerStage(n) {
    const p = W.P[n.pid], t = userTeam(), seller = p.t >= 0 ? W.teams[p.t] : null;
    n.stage = 'player'; n.status = 'open'; n.offerW = null; n.rej = 0;
    n.dem = { w: r2(wageDemand(p, t, seller) * (0.95 + 0.3 * rnd()) * (p.t < 0 ? 0.85 : 1)), y: p.a <= 22 ? 5 : p.a <= 28 ? 4 : p.a <= 31 ? 2 : 1 };
  }
  function twStart(pid, fee, kind) {
    if (W.state !== 'transfer') return { err: '이적시장 기간이 아닙니다.' };
    const p = W.P[pid], t = userTeam();
    if (!p || p.t === t.id) return { err: '협상할 수 없는 선수입니다.' };
    if (p.loan && kind !== 'loan') return { err: '임대 중인 선수는 이적 협상을 할 수 없습니다.' };
    if (kind !== 'loan') { const nb = negBlock(p); if (nb) return { err: nb }; }
    if (kind === 'loan') { const why = loanBlock(p); if (why) return { err: why }; }
    if (W.tw.neg.some(n => n.pid === pid && negActive(n))) return { err: '이미 협상 중인 선수입니다.' };
    if (W.tw.neg.filter(negActive).length >= 6) return { err: '동시에 협상할 수 있는 선수는 6명까지입니다.' };
    if (t.pl.length >= 32) return { err: '선수단이 가득 찼습니다 (최대 32명). 먼저 방출하세요.' };
    const n = { id: W.tw.nid++, pid, turn: W.tw.turn, rej: 0, msg: '', sel: null };
    if (kind === 'loan') n.kind = 'loan';
    if (p.t < 0) {
      n.fee = r1(valueOf(p) * 0.15); enterPlayerStage(n);
      n.msg = '스카우터가 지난 시장 이전에 발굴한 선수입니다. 우선 협상권으로 에이전트 비용이 절반으로 줄고 선수가 연봉을 낮춰 받아들입니다.';
    } else {
      if (!(fee > 0)) return { err: '제안 이적료를 입력하세요.' };
      if (fee > t.bud) return { err: '예산을 초과하는 제안입니다.' };
      const seller = W.teams[p.t];
      if (seller.pl.length <= 20) return { err: '상대 구단이 선수단 부족으로 협상을 거부했습니다.' };
      const top = seller.pl.map(i => W.P[i]).sort((a, b) => b.ca - a.ca).slice(0, 3).some(x => x.id === pid);
      n.stage = 'club'; n.status = 'pending'; n.offer = r1(fee);
      n.ask = r1(valueOf(p) * (1.1 + 0.4 * rnd()) * (top ? 1.2 : 1)); n.sel = p.t;
      if (kind === 'loan') {
        const rank = seller.pl.filter(i => W.P[i].ca > p.ca).length;
        n.ask = r1(valueOf(p) * 0.12 * (0.8 + 0.5 * rnd()) * (rank < 16 ? 1.3 : 1));
      }
      n.ask = r1(n.ask * (W.tw.mult || 1));   // 시즌 중 이적시장에서는 구단들이 선수를 내놓기 꺼려 더 높게 부른다
      n.msg = '구단에 제안서를 보냈습니다. 다음 턴에 답변이 옵니다.';
    }
    W.tw.neg.push(n);
    return { neg: n };
  }
  function findNeg(id) { return W.tw.neg.find(n => n.id === id); }
  function twOfferClub(id, fee) {
    const n = findNeg(id), t = userTeam();
    if (!n || n.stage !== 'club' || (n.status !== 'rejected' && n.status !== 'counter')) return { err: '지금은 새 제안을 보낼 수 없습니다.' };
    if (!(fee > 0)) return { err: '제안 이적료를 입력하세요.' };
    if (fee > t.bud) return { err: '예산을 초과하는 제안입니다.' };
    n.offer = r1(fee); n.status = 'pending'; n.msg = '수정된 제안을 보냈습니다. 다음 턴에 답변이 옵니다.';
    return {};
  }
  function twAcceptCounter(id) {
    const n = findNeg(id);
    if (!n || n.stage !== 'club' || n.status !== 'counter') return { err: '수락할 역제안이 없습니다.' };
    if (n.counter > userTeam().bud) return { err: '예산이 부족합니다.' };
    n.fee = n.counter; if (n.kind === 'loan') return completeLoan(n); enterPlayerStage(n); n.msg = '이적료에 합의했습니다. 선수 개인 협상을 진행하세요.';
    return {};
  }
  function twOfferPlayer(id, wage, years) {
    const n = findNeg(id);
    if (!n || n.stage !== 'player' || (n.status !== 'open' && n.status !== 'rejected' && n.status !== 'counter')) return { err: '지금은 새 제안을 보낼 수 없습니다.' };
    if (!(wage > 0)) return { err: '연봉을 입력하세요.' };
    n.offerW = r2(wage); n.offerY = clamp(Math.round(years) || 1, 1, 5); n.status = 'pending';
    n.msg = '선수 측에 계약 조건을 전달했습니다. 다음 턴에 답변이 옵니다.';
    return {};
  }
  function twAcceptPlayerCounter(id) {
    const n = findNeg(id);
    if (!n || n.stage !== 'player' || n.status !== 'counter') return { err: '수락할 역제안이 없습니다.' };
    n.offerW = n.counterW; n.offerY = n.dem.y;
    return completeDeal(n);
  }
  function twCancel(id) { const n = findNeg(id); if (n && negActive(n)) { n.status = 'cancelled'; n.msg = '협상을 중단했습니다.'; } return {}; }
  function completeDeal(n) {
    const p = W.P[n.pid], t = userTeam();
    if (!p) { n.status = 'lost'; return { err: '선수를 찾을 수 없습니다.' }; }
    const bonus = r2(n.offerW * 0.5), total = r1((n.fee || 0) + bonus);
    if (t.pl.length >= 32) { n.status = 'failed'; n.msg = '선수단이 가득 차 계약이 무산되었습니다.'; return { err: n.msg }; }
    if (total > t.bud) { n.status = 'failed'; n.msg = `예산 부족으로 계약이 무산되었습니다. (필요 ${total}M)`; return { err: n.msg }; }
    if (p.t >= 0) { const s = W.teams[p.t]; s.pl = s.pl.filter(x => x !== p.id); s.lu = null; delete s.pt[p.id]; s.bud = r1(s.bud + (n.fee || 0)); }
    else { const cid = p.c, arr = W.pool[cid]; if (arr) { const i = arr.indexOf(p.id); if (i >= 0) arr.splice(i, 1); } delete p.c; if (cid) fillPool(cid, 500); }
    t.bud = r1(t.bud - total); p.t = t.id; p.sn = null; t.pl.push(p.id); fixNumbers(t); t.lu = null; p.w = n.offerW; p.ce = W.season + n.offerY - 1; p.cd = 100;
    n.status = 'done'; n.msg = `계약 완료! 연봉 ${n.offerW}M, ${n.offerY}년 (이적료 ${n.fee || 0}M + 계약금 ${bonus}M)`;
    log(`✍️ ${p.n} 영입 완료 — 이적료 ${n.fee || 0}M + 계약금 ${bonus}M, 연봉 ${n.offerW}M × ${n.offerY}년`);
    return { ok: true };
  }
  // 임대 불가 사유: 팀 내 능력 순위가 주전급이거나 능력이 매우 높은 선수일수록 임대할 수 없다
  function loanBlock(pid) {
    const p = typeof pid === 'object' ? pid : W.P[pid];
    if (!p) return '선수를 찾을 수 없습니다.';
    if (p.loan) return '이미 임대 중인 선수입니다.';
    if (p.t < 0) return '무소속 선수는 임대가 아니라 영입 협상으로 계약합니다.';
    const tm = W.teams[p.t];
    const rank = tm.pl.filter(i => W.P[i].ca > p.ca).length;
    if (rank < 11) return '팀의 핵심(주전급) 선수라 임대할 수 없습니다.';
    if (p.ca >= 125) return '능력이 매우 높아 임대할 수 없습니다.';
    return null;
  }
  function completeLoan(n) {
    const p = W.P[n.pid], t = userTeam();
    if (!p) { n.status = 'lost'; return { err: '선수를 찾을 수 없습니다.' }; }
    const fee = n.fee || 0;
    if (t.pl.length >= 32) { n.status = 'failed'; n.msg = '선수단이 가득 차 임대가 무산되었습니다.'; return { err: n.msg }; }
    if (fee > t.bud) { n.status = 'failed'; n.msg = `예산 부족으로 임대가 무산되었습니다. (필요 ${fee}M)`; return { err: n.msg }; }
    const s = W.teams[p.t];
    s.pl = s.pl.filter(x => x !== p.id); s.lu = null; delete s.pt[p.id]; s.bud = r1(s.bud + fee);
    t.bud = r1(t.bud - fee); p.loan = { from: s.id }; p.t = t.id; p.sn = null; t.pl.push(p.id); fixNumbers(t); t.lu = null; p.cd = Math.max(p.cd, 80);
    n.status = 'done'; n.msg = `임대 완료! 임대료 ${fee}M. 연봉 ${wageOf(p)}M은 우리 팀이 부담하고, 시즌 종료 후 ${s.name}로 복귀합니다.`;
    log(`🤝 ${p.n} 임대 영입 — 임대료 ${fee}M, 연봉 ${wageOf(p)}M 부담 (시즌 후 ${s.name} 복귀)`);
    return { ok: true };
  }
  function twLoanOut(pid) {
    if (W.state !== 'transfer') return { err: '이적시장 기간이 아닙니다.' };
    const t = userTeam(), p = W.P[pid];
    if (!p || p.t !== t.id) return { err: '내 팀 선수가 아닙니다.' };
    const why = loanBlock(p); if (why) return { err: why };
    if (t.pl.length <= 19) return { err: '선수단 최소 인원(19명)을 유지해야 합니다.' };
    W.tw.loanList = W.tw.loanList || [];
    if (W.tw.loanList.includes(pid)) return { err: '이미 임대 명단에 올라 있습니다.' };
    W.tw.loanList.push(pid);
    return {};
  }
  function twLoanCancel(pid) {
    W.tw.loanList = (W.tw.loanList || []).filter(x => x !== pid);
    W.tw.inbox = W.tw.inbox.filter(o => !(o.kind === 'loan' && o.pid === pid));
    return {};
  }
  function resolveNeg(n) {
    const p = W.P[n.pid];
    if (!p || (n.sel != null && p.t !== n.sel)) { n.status = 'lost'; n.msg = '다른 구단이 먼저 영입했습니다.'; return; }
    if (n.stage === 'club') {
      const ratio = n.offer / n.ask;
      if (ratio >= 1) { n.fee = n.offer; if (n.kind === 'loan') { completeLoan(n); return; } enterPlayerStage(n); n.msg = '✅ 구단이 이적료 제안을 수락했습니다. 선수 개인 협상을 진행하세요.'; }
      else if (ratio >= 0.85) { n.status = 'counter'; n.counter = r1(n.ask * (0.97 + 0.05 * rnd())); n.msg = `🔁 구단이 ${n.counter}M을 역제안했습니다.`; }
      else {
        n.status = 'rejected'; n.rej++;
        n.msg = ratio < 0.6 ? '❌ 제안 금액이 요구액에 한참 못 미칩니다.' : ratio < 0.75 ? '❌ 제안 금액이 요구액보다 많이 부족합니다.' : '❌ 제안 금액이 조금 부족합니다.';
        if (n.rej >= 5) { n.status = 'failed'; n.msg = '❌ 구단이 협상을 중단했습니다.'; }
      }
    } else {
      const sc = (n.offerW / n.dem.w) * (n.offerY < n.dem.y - 1 ? 0.93 : 1);
      if (sc >= 1) completeDeal(n);
      else if (sc >= 0.85) { n.status = 'counter'; n.counterW = r2(n.dem.w * (0.97 + 0.05 * rnd())); n.msg = `🔁 선수 측이 연봉 ${n.counterW}M(${n.dem.y}년)을 요구합니다.`; }
      else {
        n.status = 'rejected'; n.rej++;
        n.msg = sc < 0.6 ? '❌ 선수가 제시한 연봉에 크게 실망했습니다.' : '❌ 선수가 제시한 연봉에 만족하지 않습니다.';
        if (n.rej >= 5) { n.status = 'failed'; n.msg = '❌ 선수가 협상을 거부했습니다.'; }
      }
    }
  }
  function aiTrades(count) {
    const ais = W.teams.filter(x => x.id !== W.u.team && x.cid !== 'RND');
    let moved = 0;
    for (let k = 0; k < count; k++) {
      const b = pick(ais), a = pick(ais);
      if (a === b || a.pl.length <= 21 || b.pl.length >= 30) continue;
      const top = b.pl.map(id => W.P[id].ca).sort((x, y) => y - x).slice(0, 14);
      const avg = top.reduce((x, y) => x + y, 0) / top.length;
      const cand = a.pl.map(id => W.P[id]).filter(p => !p.loan && p.ca >= avg - 4 && valueOf(p) * 1.2 <= b.bud * 0.5);
      if (!cand.length) continue;
      const p = pick(cand), price = r1(valueOf(p) * 1.2 * (W.tw.mult || 1));
      a.pl = a.pl.filter(x => x !== p.id); a.lu = null; delete a.pt[p.id];
      b.pl.push(p.id); b.lu = null; p.t = b.id; p.sn = null; fixNumbers(b); a.bud = r1(a.bud + price); b.bud = r1(b.bud - price); moved++;
    }
    return moved;
  }
  function genInbox() {
    const t = userTeam();
    if (t.pl.length <= 20) return;
    const tw_ = W.tw, has = pid => tw_.inbox.some(o => o.pid === pid);
    const sale = tw_.saleList || [], loans = tw_.loanList || [];
    // 방출 명단: 다른 구단이 관심을 갖고, 현재 몸값보다 낮은 가격으로 영입을 시도한다
    sale.slice().forEach(pid => {
      const p = W.P[pid];
      if (!p || p.t !== t.id) { tw_.saleList = tw_.saleList.filter(x => x !== pid); return; }
      if (has(pid) || rnd() > 0.65) return;
      const fee = r1(valueOf(p) * (0.6 + 0.35 * rnd()));
      const buyers = W.teams.filter(x => x.cid !== 'RND' && x.id !== t.id && x.pl.length < 30 && x.bud >= fee);   // 살 수 있는 구단 중에서 접촉
      if (!buyers.length) return;
      const b = pick(buyers);
      tw_.inbox.push({ id: tw_.nid++, pid, from: b.id, fee, exp: tw_.turn + 3, listed: true });
    });
    // 명단에 없는 선수에게도 가끔 관심 (팔 생각이 없던 선수라 원래 몸값 이상을 제시)
    const cands = t.pl.map(id => W.P[id]).sort((a, b) => b.ca - a.ca).slice(0, 10).filter(p => !has(p.id) && !p.loan && !sale.includes(p.id) && !loans.includes(p.id));
    for (let k = 0; k < 2; k++) {
      if (rnd() < 0.3 && cands.length) {
        const p = pick(cands);
        const fee = r1(valueOf(p) * (1.0 + 0.5 * rnd()));
        const buyers = W.teams.filter(x => x.cid !== 'RND' && x.id !== t.id && x.lv >= t.lv - 0.25 && x.bud >= fee);
        if (!buyers.length) continue;
        const b = pick(buyers);
        if (!has(p.id)) tw_.inbox.push({ id: tw_.nid++, pid: p.id, from: b.id, fee, exp: tw_.turn + 3, listed: false });
      }
    }
  }
  function genLoanOffers() {
    const t = userTeam();
    (W.tw.loanList || []).slice().forEach(pid => {
      const p = W.P[pid];
      if (!p || p.t !== t.id) { W.tw.loanList = W.tw.loanList.filter(x => x !== pid); return; }
      if (W.tw.inbox.some(o => o.pid === pid) || rnd() > 0.6) return;
      const buyers = W.teams.filter(x => x.cid !== 'RND' && x.id !== t.id && x.pl.length < 30);
      if (!buyers.length) return;
      const b = pick(buyers), fee = r1(valueOf(p) * 0.1 * (0.8 + 0.5 * rnd()));
      W.tw.inbox.push({ id: W.tw.nid++, pid, from: b.id, fee, exp: W.tw.turn + 3, kind: 'loan' });
    });
  }
  function twInboxAccept(id) {
    const o = W.tw.inbox.find(x => x.id === id), t = userTeam();
    if (!o) return { err: '제안이 만료되었습니다.' };
    const p = W.P[o.pid], b = W.teams[o.from];
    if (!p || p.t !== t.id) return { err: '이미 처리된 제안입니다.' };
    if (t.pl.length <= 19) return { err: '선수단 최소 인원(19명)을 유지해야 합니다.' };
    if (o.kind === 'loan') {
      t.pl = t.pl.filter(x => x !== p.id); t.lu = null; delete t.pt[p.id];
      b.pl.push(p.id); b.lu = null; p.t = b.id; p.loan = { from: t.id }; p.sn = null; fixNumbers(b);
      t.bud = r1(t.bud + o.fee); b.bud = r1(b.bud - o.fee);
      W.u.out = W.u.out || []; W.u.out.push(p.id);
      W.tw.loanList = (W.tw.loanList || []).filter(x => x !== p.id);
      W.tw.inbox = W.tw.inbox.filter(x => x.pid !== p.id);
      log(`🤝 ${p.n}을(를) ${b.name}에 임대 보냈습니다. 임대료 ${o.fee}M (시즌 종료 후 복귀)`);
      return {};
    }
    t.pl = t.pl.filter(x => x !== p.id); t.lu = null; delete t.pt[p.id];
    b.pl.push(p.id); b.lu = null; p.t = b.id; p.sn = null; fixNumbers(b); t.bud = r1(t.bud + o.fee); b.bud = r1(b.bud - o.fee);
    W.tw.saleList = (W.tw.saleList || []).filter(x => x !== p.id);
    W.tw.inbox = W.tw.inbox.filter(x => x.pid !== p.id);
    log(`💰 ${p.n}을(를) ${b.name}에 ${o.fee}M에 매각했습니다.`);
    return {};
  }
  function twInboxReject(id) { W.tw.inbox = W.tw.inbox.filter(x => x.id !== id); return {}; }
  function ensureSquad(tm) {
    const cnt = [0, 0, 0, 0]; tm.pl.forEach(id => cnt[W.P[id].p]++);
    const min = [2, 6, 6, 4];
    for (let pos = 0; pos < 4; pos++) while (cnt[pos] < min[pos]) { genYouth(tm, pos); cnt[pos]++; }
  }
  function twNext() {
    if (W.state !== 'transfer') return;
    const tw_ = W.tw, t = userTeam();
    aiTrades(tw_.kind === 'mid' ? 12 : 25);
    tw_.neg.filter(negActive).forEach(n => { const p = W.P[n.pid]; if (!p || (n.sel != null && p.t !== n.sel)) { n.status = 'lost'; n.msg = '다른 구단이 먼저 영입했습니다.'; } });
    tw_.neg.filter(n => n.status === 'pending').forEach(resolveNeg);
    tw_.inbox = tw_.inbox.filter(o => o.exp > tw_.turn);
    genInbox(); genLoanOffers();
    t.pl.forEach(id => { const p = W.P[id]; p.cd = clamp(p.cd + (tw_.kind === 'mid' ? 5 : 15), 0, 100); });
    for (const id in W.P) { const p = W.P[id]; if (p.inj > 0 && p.t >= 0 && (tw_.kind !== 'mid' || tw_.turn % 3 === 0)) p.inj--; }
    tw_.turn++;
    if (tw_.turn % 5 === 0) genRecs();
    W.u.att = { s: 2, j: 3 };
    if (tw_.turn > tw_.max) twEnd();
  }
  function twEnd() {
    if (W.state !== 'transfer') return;
    const kind = W.tw.kind;
    W.tw.neg.filter(negActive).forEach(n => { n.status = 'cancelled'; });
    W.teams.forEach(tm => { ensureSquad(tm); fixNumbers(tm); tm.lu = null; });
    W.state = 'play';
    if (kind !== 'mid') { W.week = 1; log(`🏁 이적시장이 닫혔습니다. ${W.season}시즌 개막! 시즌 목표: ${W.u.targetRank}위 이내`); }
    else log('🏁 시즌 중 이적시장이 닫혔습니다. 후반기가 시작됩니다.');
  }

  /* ---------- 유러피언 마스터스컵 (챔피언스리그 오마주) ---------- */
  const CL_NAME = '유러피언 마스터스컵';
  const CL_LP_WEEKS = [3, 6, 9, 12, 15, 18, 21, 24];
  const CL_KO = { po: [27, 28], r16: [31, 32], qf: [34, 35], sf: [37, 38], final: [40] };
  const CL_PRIZE = { lp: 3, po: 5, r16: 8, qf: 12, sf: 16, final: 20, champion: 28 };
  const CL_STAGE_NAME = { lp: '리그 페이즈 탈락', po: '플레이오프 탈락', r16: '16강 탈락', qf: '8강 탈락', sf: '4강 탈락', final: '준우승', champion: '우승' };
  function createRndTeams() {
    const lvs = [];
    COUNTRIES.forEach(c => W.lg[c.id][0].teams.slice().sort((a, b) => W.teams[b].lv - W.teams[a].lv).slice(0, 4).forEach(i => lvs.push(W.teams[i].lv)));
    const avg = lvs.reduce((a, b) => a + b, 0) / lvs.length;
    const stems = ['블라', '코르', '드니', '할른', '스카', '네프', '오르', '트라', '베르', '리스', '쿠르', '마를', '젤라', '포스'];
    const suf = ['스키', '오프', '비츠', '나', '벡', '도', '린', '트', '센', '가'];
    const types = ['SK', 'FK', 'BK', 'IF', 'Sport', 'Spor'];
    const names = new Set(W.teams.map(t => t.name));
    for (let i = 0; i < 30; i++) {
      let nm, g = 0;
      do { nm = pick(stems) + pick(suf) + ' ' + pick(types); } while (names.has(nm) && g++ < 300);
      names.add(nm);
      const lv = clamp(avg * (0.55 + 0.40 * rnd()), 0.05, 1);   // 상위 4팀 평균의 55~95% 사이에서 팀마다 랜덤
      const team = { id: W.teams.length, name: nm, cid: 'RND', tier: -1, lv, base: lv, pl: [], form: pick(FORMATION_LIST), tac: randomTac(), pt: {}, lu: null, coh: 70, sS: 5, sJ: 5, bud: Math.round(5 + 160 * lv * lv) };
      W.teams.push(team); makeSquad(team);
    }
  }
  function limitRnd(tm) {   // 최초 전력의 ±10% 안에서만 변동
    const lo = tm.base * 0.92, hi = tm.base * 1.08;   // 안쪽 여유를 두고 보정해 ±10%를 넘지 않게 함
    for (let k = 0; k < 4; k++) {
      const top = tm.pl.map(id => W.P[id].ca).sort((a, b) => b - a).slice(0, 14);
      const now = (top.reduce((a, b) => a + b, 0) / top.length - 62) / 72;
      let target = now;
      if (now > tm.base * 1.1) target = hi; else if (now < tm.base * 0.9) target = lo; else break;
      const shift = (target - now) * 72 / 10;
      tm.pl.forEach(id => { const p = W.P[id]; for (let i = 0; i < 17; i++) { if (p.p !== 0 && i >= 15) continue; p.at[i] = r1(clamp(p.at[i] + shift, 1, 20)); } refresh(p); });
    }
  }
  function weightedTop4(ids) {
    const pool = ids.slice(), out = [];
    while (out.length < 4 && pool.length) {
      const w = pool.map(id => Math.pow(W.teams[id].lv, 6) + 0.0005);   // 팀 수준이 높을수록 4위권 진입 확률이 크게 높음
      let x = rnd() * w.reduce((a, b) => a + b, 0), k = 0;
      for (; k < pool.length - 1; k++) { x -= w[k]; if (x <= 0) break; }
      out.push(pool[k]); pool.splice(k, 1);
    }
    return out;
  }
  function setupCL() {
    const q = [], byC = {};
    COUNTRIES.forEach(c => {
      const top = (W.prevTop && W.prevTop[c.id]) ? W.prevTop[c.id].slice() : weightedTop4(W.lg[c.id][0].teams);
      byC[c.id] = top; top.forEach(id => q.push(id));
    });
    const rnds = W.teams.filter(t => t.cid === 'RND').map(t => t.id).sort(() => rnd() - 0.5).slice(0, 12);
    const teams = q.concat(rnds);
    const cl = { season: W.season, teams, byC, rnds, first: !W.prevTop, table: {}, fx: {}, ties: [], phase: 'lp', champion: null, stage: {}, rank: [] };
    teams.forEach(id => { cl.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; cl.stage[id] = 'lp'; });
    const rounds = roundRobin(teams.slice().sort(() => rnd() - 0.5));
    for (let i = 0; i < 8; i++) cl.fx[CL_LP_WEEKS[i]] = rounds[i].map(([h, a]) => ({ h, a, t: -1, leg: 0, round: 'lp' }));
    W.cl = cl;
    if (W.u && teams.includes(W.u.team)) log(`🏆 ${CL_NAME} 진출! ${cl.first ? '(첫 시즌: 팀 수준 기반 추첨)' : '(지난 시즌 리그 4위 이내)'}`);
  }
  function clRow(r, gf, ga) { r.p++; r.gf += gf; r.ga += ga; if (gf > ga) { r.w++; r.pts += 3; } else if (gf < ga) r.l++; else { r.d++; r.pts++; } }
  function clApply(f, hg, ag) {
    const cl = W.cl;
    if (f.round === 'lp') { clRow(cl.table[f.h], hg, ag); clRow(cl.table[f.a], ag, hg); }
    else cl.ties[f.t].legs[f.leg - 1] = { h: f.h, hg, ag };
  }
  function clRank() {
    const cl = W.cl;
    return cl.teams.slice().sort((a, b) => { const A = cl.table[a], B = cl.table[b]; return (B.pts - A.pts) || ((B.gf - B.ga) - (A.gf - A.ga)) || (B.gf - A.gf) || (a - b); });
  }
  function clAddTie(r, a, b, wk) {
    const cl = W.cl, idx = cl.ties.length, single = r === 'final';
    cl.ties.push({ r, a, b, legs: single ? [null] : [null, null], win: null, pen: false, single });
    (cl.fx[wk[0]] = cl.fx[wk[0]] || []).push({ h: a, a: b, t: idx, leg: 1, round: r });
    if (!single) (cl.fx[wk[1]] = cl.fx[wk[1]] || []).push({ h: b, a: a, t: idx, leg: 2, round: r });
  }
  function tieAgg(t) {
    let ga = 0, gb = 0;
    t.legs.forEach(l => { if (!l) return; if (l.h === t.a) { ga += l.hg; gb += l.ag; } else { gb += l.hg; ga += l.ag; } });
    return [ga, gb];
  }
  const NEXT_STAGE = { po: 'r16', r16: 'qf', qf: 'sf', sf: 'final', final: 'champion' };
  function clResolve(r) {
    const cl = W.cl, winners = [], uid = W.u ? W.u.team : -1;
    cl.ties.filter(t => t.r === r).forEach(t => {
      const [ga, gb] = tieAgg(t);
      let w;
      if (ga > gb) w = t.a; else if (gb > ga) w = t.b;
      else { t.pen = true; w = rnd() < clamp(0.5 + 0.4 * (W.teams[t.a].lv - W.teams[t.b].lv), 0.3, 0.7) ? t.a : t.b; }
      t.win = w; winners.push(w); cl.stage[w] = NEXT_STAGE[r];
      if (t.a === uid || t.b === uid) {
        const opp = W.teams[w === uid ? (t.a === uid ? t.b : t.a) : w].name;
        log(w === uid ? `🏆 ${CL_NAME} ${r === 'final' ? '결승 승리! 우승!' : '다음 라운드 진출'} (vs ${opp}, 합계 ${t.a === uid ? ga + ':' + gb : gb + ':' + ga}${t.pen ? ', 승부차기' : ''})` : `💔 ${CL_NAME} 탈락 (vs ${opp}, 합계 ${t.a === uid ? ga + ':' + gb : gb + ':' + ga}${t.pen ? ', 승부차기 패배' : ''})`);
      }
    });
    return winners;
  }
  function clAfterWeek(w) {
    const cl = W.cl; if (!cl) return;
    const shuf = a => a.slice().sort(() => rnd() - 0.5);
    if (cl.phase === 'lp' && w === CL_LP_WEEKS[7]) {
      cl.rank = clRank();
      cl.rank.forEach((id, i) => { cl.stage[id] = i < 8 ? 'r16' : i < 24 ? 'po' : 'lp'; });
      for (let i = 0; i < 8; i++) clAddTie('po', cl.rank[23 - i], cl.rank[8 + i], CL_KO.po);
      cl.phase = 'po';
      if (W.u) { const pos = cl.rank.indexOf(W.u.team); if (pos >= 0) log(`📊 ${CL_NAME} 리그 페이즈 ${pos + 1}위 — ${pos < 8 ? '16강 직행!' : pos < 24 ? '플레이오프 진출' : '탈락'}`); }
    } else if (cl.phase === 'po' && w === CL_KO.po[1]) {
      const win = shuf(clResolve('po')), seeds = cl.rank.slice(0, 8);
      seeds.forEach((s, i) => clAddTie('r16', win[i], s, CL_KO.r16));
      cl.phase = 'r16';
    } else if (cl.phase === 'r16' && w === CL_KO.r16[1]) {
      const win = shuf(clResolve('r16'));
      for (let i = 0; i < win.length; i += 2) clAddTie('qf', win[i], win[i + 1], CL_KO.qf);
      cl.phase = 'qf';
    } else if (cl.phase === 'qf' && w === CL_KO.qf[1]) {
      const win = shuf(clResolve('qf'));
      for (let i = 0; i < win.length; i += 2) clAddTie('sf', win[i], win[i + 1], CL_KO.sf);
      cl.phase = 'sf';
    } else if (cl.phase === 'sf' && w === CL_KO.sf[1]) {
      const win = shuf(clResolve('sf'));
      clAddTie('final', win[0], win[1], CL_KO.final);
      cl.phase = 'final';
    } else if (cl.phase === 'final' && w === CL_KO.final[0]) {
      const win = clResolve('final');
      cl.champion = win[0]; cl.phase = 'done';
      cl.teams.forEach(id => { W.teams[id].bud = r1(W.teams[id].bud + CL_PRIZE[cl.stage[id]]); });
      if (W.u && cl.teams.includes(W.u.team)) { const st = cl.stage[W.u.team]; log(`💶 ${CL_NAME} 상금 ${CL_PRIZE[st]}M 수령 (${CL_STAGE_NAME[st]})`); }
    }
  }
  function userFixtures() {
    const t = userTeam(), out = [];
    if (W.cl && W.cl.fx[W.week]) {
      W.cl.fx[W.week].forEach(f => { if (f.h === t.id || f.a === t.id) out.push({ kind: 'cl', h: f.h, a: f.a, home: f.h === t.id, opp: f.h === t.id ? f.a : f.h, meta: f }); });
    }
    const lf = userFixture();
    if (lf) { lf.kind = 'league'; out.push(lf); }
    return out;
  }

  /* ---------- 저장/불러오기 ---------- */
  // 세이브 데이터가 수 MB이므로 localStorage 대신 IndexedDB 사용 (모두 Promise 반환)
  function idb() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('managerSample', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('save');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  function idbOp(mode, fn) {
    const op = idb().then(db => new Promise((res, rej) => {
      const tx = db.transaction('save', mode); const st = tx.objectStore('save');
      const rq = fn(st);
      tx.oncomplete = () => res(rq ? rq.result : true);
      tx.onerror = () => rej(tx.error);
    }));
    // 저장소가 응답하지 않는 환경(비공개 모드 등)에서도 화면이 멈추지 않도록 타임아웃
    const to = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000));
    return Promise.race([op, to]);
  }
  function save() { return idbOp('readwrite', st => st.put(W, 'slot1')).then(() => true).catch(() => false); }
  function load() { return idbOp('readonly', st => st.get('slot1')).then(d => { if (!d) return false; W = d; return true; }).catch(() => false); }
  function hasSave() { return idbOp('readonly', st => st.count()).then(n => n > 0).catch(() => false); }
  function clearSave() { return idbOp('readwrite', st => st.clear()).catch(() => false); }

  /* ---------- 내보내기 ---------- */
  root.G = {
    ATTRS, ATTR_GROUP, GROUP_NAME, POS, KEY, CONTINENTS, FORMATION_LIST, TACTIC_DEFS, TF_LABEL, SP_DEFS, PT_DEFS, TRAIN, INT_LABEL, COUNTRIES, MAX_WEEKS,
    setSeed, rnd, ri, pick, clamp, norm, r1,
    world, newWorld, startGame, userTeam, userFixture, slotsFor, autoLineup, currentLineup, simulateMatch, createMatch, advanceWeek, nextSeason,
    sortedTable, calcCA, caAs, refresh, valueOf, star, evaluate, ownEval, doSearch, doJudge, buy, release, genPlayer,
    save, load, hasSave, clearSave, defaultTac, log, sortedTableByLeague: (cid, t) => sortedTable(W.lg[cid][t]),
    _debug: { makeSide, trainWeek, buildReport }
  };
  Object.assign(root.G, {
    userFixtures, twSaleList, twSaleCancel, negBlock, genRecs: () => genRecs(), twLoanOut, twLoanCancel, loanBlock, wageOf, teamWages, setNumber, fixNumbers, startWindow, twStart, twOfferClub, twAcceptCounter, twOfferPlayer, twAcceptPlayerCounter, twCancel,
    twNext, twEnd, twInboxAccept, twInboxReject, twEst: pid => estPrice(W.P[pid]), CL_NAME, CL_STAGE_NAME, CL_LP_WEEKS, CL_KO, clRank: () => clRank(), tieAgg
  });
})(typeof window !== 'undefined' ? window : globalThis);
