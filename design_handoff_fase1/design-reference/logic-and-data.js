// A/CO v5 — logica + dados de seed extraidos do prototipo (referencia, NAO copiar para producao).
// Use para extrair fixtures/seed e entender comportamentos. Modelo de dados: README §7.


class Component extends DCLogic {
  state = { screen: 'command', prob: 45, approvals: {}, drafts: {}, dealTab: 'activities', actFilter: 'all', docStore: (()=>{ try { return JSON.parse(localStorage.getItem('aco_docs')||'{}'); } catch(e){ return {}; } })(), authed: (() => { try { return localStorage.getItem('aco_authed') === '1'; } catch (e) { return false; } })() };

  _chatEnd() { setTimeout(() => { const el = document.querySelector('[data-chat-end]'); if (!el) return; let p = el.parentElement; while (p) { if (p.scrollHeight > p.clientHeight + 12) p.scrollTop = p.scrollHeight; p = p.parentElement; } }, 90); }
  _ingestDocs(key, files) {
    const list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    const fmt = (n) => n < 1024 ? n + ' B' : (n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dt = new Date(); const date = M[dt.getMonth()] + ' ' + dt.getDate();
    let pending = list.length;
    const store = JSON.parse(JSON.stringify(this.state.docStore || {}));
    const arr = (store[key] || []).slice();
    const persist = (s) => { try { localStorage.setItem('aco_docs', JSON.stringify(s)); return true; } catch (e) { return false; } };
    const finish = () => {
      store[key] = arr;
      if (!persist(store)) { const lite = {}; Object.keys(store).forEach((k) => { lite[k] = store[k].map((d) => Object.assign({}, d, { url: '' })); }); persist(lite); }
      this.setState({ docStore: store, docDrag: false });
      if (arr[0]) this.pushAudit('Document attached — ' + arr[0].name + ' · ' + key.split('|')[1] + ' · stored on the record');
      this.ciToast(list.length + (list.length > 1 ? ' files attached' : ' file attached') + ' — stored on this record');
    };
    list.forEach((f) => {
      const ext = ((f.name || 'file').split('.').pop() || '').toUpperCase().slice(0, 4);
      const entry = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: f.name || 'file', size: fmt(f.size || 0), type: ext, date: date, who: 'You', url: '' };
      if ((f.size || 0) > 0 && f.size < 1400000) {
        const r = new FileReader();
        r.onload = () => { entry.url = r.result; arr.unshift(entry); if (--pending === 0) finish(); };
        r.onerror = () => { arr.unshift(entry); if (--pending === 0) finish(); };
        r.readAsDataURL(f);
      } else { arr.unshift(entry); if (--pending === 0) finish(); }
    });
  }
  _removeDoc(key, id) {
    const store = JSON.parse(JSON.stringify(this.state.docStore || {}));
    store[key] = (store[key] || []).filter((d) => d.id !== id);
    try { localStorage.setItem('aco_docs', JSON.stringify(store)); } catch (e) {}
    this.setState({ docStore: store });
    this.ciToast('Removed from this record');
  }
  nav(s) { if (s === 'next') s = 'intel'; const extra = s === 'deal' ? { dealId:'Rivage PH-A · Marcelo C.', dealCard:null, dlSent:false, dlMlsOpen:false, dlTourOpen:false, dlTourSent:false, mlsSel:{}, docSent:false, dlRelSel:null } : {}; this.setState(st => ({ prevScreen: st.screen, screen: s, ...extra })); }

  setState(patch, cb) {
    try {
      if (!this._undoLock) {
        const keys = (typeof patch === 'function') ? null : Object.keys(patch || {});
        const NOISE = ['setNewType','ctStatusAddOpen','ctNewStatus','ctIdEdit','ctTypeAddOpen','ctNewType','ctNewTag','dlRedQOpen','dlPartyAddOpen','dlPartySel','dlSecC','dlMomHov','advGatesOpen','tlHov','agHover','ctSubHov','tlMlsOpen','dlMlsOpen','contactSeg','ctTagsOpen','ctIdOpen','ctIdPin','cmdSel','cmdQuery','vw','notifOpen','profileOpen','mobNavOpen','dlChatInput','dlChatTyping','ctTabMoreOpen','navMoreOpen','sortOpen','qcToast','askText','chatInput','agNewVal','agCmtVal','ctFieldVals','ctMandates','ttDrafts','logName','logBody','threadSearch','oppQuery','opFilters','opFilterOpen','ctFilters','ctFilterOpen','nameMenuQuery','ctColMenuOpen','peekDeal','peekContact','ctTabMoreOpen'];
        const meaningful = !keys || keys.some(k => NOISE.indexOf(k) < 0);
        if (meaningful) this._undo = [ ...(this._undo || []).slice(-9), JSON.parse(JSON.stringify(this.state)) ];
      }
    } catch (e) {}
    super.setState(patch, cb);
  }

  undoLast() {
    const stack = this._undo || [];
    const prev = stack.pop();
    if (!prev) { this.ciToast('Nothing to undo'); return; }
    this._undoLock = true;
    const patch = {};
    Object.keys(this.state).forEach(k => { patch[k] = (k in prev) ? prev[k] : undefined; });
    Object.keys(prev).forEach(k => { patch[k] = prev[k]; });
    this.setState(patch, () => { this._undoLock = false; });
    this.ciToast('Undone — last action reverted · ⌘Z');
  }

  componentDidMount() {
    this._gPending = false;
    this._cmdKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.setState(s => ({ cmdOpen: !s.cmdOpen, cmdQuery: '', cmdDone: null, shortcutsOpen: false })); return; }
      if (e.key === 'Escape') { if (this.state.cmdOpen || this.state.shortcutsOpen || this.state.qcOpen) this.setState({ cmdOpen: false, cmdDone: null, shortcutsOpen: false, qcOpen: false }); return; }
      const tag = (e.target && e.target.tagName) || '';
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); this.undoLast(); return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); this.setState(s => ({ shortcutsOpen: !s.shortcutsOpen, cmdOpen: false })); return; }
      if (e.key.toLowerCase() === 'v' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); this.toggleVoice(); return; }
      if (e.key === '/') { e.preventDefault(); this.setState({ cmdOpen: true, cmdQuery: '', cmdDone: null, cmdSel: 0, shortcutsOpen: false }); return; }
      if (this.state.screen === 'next' && !this._gPending && !this._nPending) {
        const nk = e.key.toLowerCase();
        const len = this._naFlatIds ? this._naFlatIds.length : 0;
        if (len && (nk === 'j' || nk === 'k')) { e.preventDefault(); this.setState(s => ({ naSel: Math.max(0, Math.min(len-1, (s.naSel||0) + (nk==='j'?1:-1))) })); return; }
        if (len && nk === 'l') { const id = this._naFlatIds[this.state.naSel||0]; if (id) this.toggleAction(id); return; }
        if (len && nk === 's') { const id = this._naFlatIds[this.state.naSel||0]; if (id) this.resched(id, (this._naNameById||{})[id] || id, { due:'Jul 07', bucket:'week', tag:'+1d' }); return; }
      }
      if (this.state.screen === 'contacts' && (this.state.contactView || 'directory') === 'queue' && !this._gPending) {
        const qk = e.key.toLowerCase();
        if (qk === 'j' || qk === 'k') { e.preventDefault(); this.setState(s => ({ qSel: Math.max(0, Math.min(6, (s.qSel||0) + (qk==='j'?1:-1))) })); return; }
        if (qk === 'l') { const id = 'q' + ((this.state.qSel||0)+1); this.setState(s => { const t = { ...(s.touchedQueue||{}) }; t[id] = !t[id]; return { touchedQueue: t }; }); return; }
        if (qk === 's') { const id = 'q' + ((this.state.qSel||0)+1); this.setState(s => { const t = { ...(s.snoozedQueue||{}) }; t[id] = t[id] ? undefined : 'Tue'; return { snoozedQueue: t }; }); return; }
      }
      if (this._gPending) {
        this._gPending = false;
        clearTimeout(this._gTimer);
        const map = { c:'command', p:'pipeline', o:'contacts', n:'contacts', a:'activities', i:'intel', x:'next', r:'reports', s:'settings', d:'deal', t:'tc' };
        const dest = e.key.toLowerCase() === 'g' ? (this.state.prevScreen || 'command') : map[e.key.toLowerCase()];
        if (dest) { e.preventDefault(); this.setState(st => ({ prevScreen: st.screen, screen: dest, shortcutsOpen: false })); }
        return;
      }
      if (this._nPending) {
        this._nPending = false;
        clearTimeout(this._nTimer);
        const qmap = { l:'log', t:'task', a:'appt', n:'note', c:'contact', d:'deal' };
        const qt = qmap[e.key.toLowerCase()];
        if (qt) { e.preventDefault(); this.setState({ qcOpen: true, qcType: qt, shortcutsOpen: false, cmdOpen: false }); }
        return;
      }
      if (e.key.toLowerCase() === 'g') { this._gPending = true; clearTimeout(this._gTimer); this._gTimer = setTimeout(() => { this._gPending = false; }, 900); return; }
      if (e.key.toLowerCase() === 'n') { this._nPending = true; clearTimeout(this._nTimer); this._nTimer = setTimeout(() => { this._nPending = false; }, 900); }
    };
    window.addEventListener('keydown', this._cmdKey);
    this._onRz = () => this.setState({ vw: window.innerWidth });
    window.addEventListener('resize', this._onRz);
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._cmdKey); if (this._onRz) window.removeEventListener('resize', this._onRz); if (this._rec) { try { this._rec.stop(); } catch(e) {} } }

  // ---- Ask bar · universal composer ----
  toggleVoice() {
    if (this.state.listening) { if (this._rec) { try { this._rec.stop(); } catch(e) {} } this.setState({ listening: false }); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.askReply('(voice)', 'Voice recognition not available in this browser — use Chrome/Edge, or type the command.'); return; }
    const rec = new SR();
    this._rec = rec;
    rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false;
    let finalText = '';
    rec.onresult = (ev) => {
      let t = '';
      for (const r of ev.results) { t += r[0].transcript; if (r.isFinal) finalText = t; }
      this.setState({ askText: t });
    };
    rec.onend = () => { this.setState({ listening: false }); const t = (finalText || this.state.askText || '').trim(); if (t) this.askSubmit(t, true); };
    rec.onerror = () => { this.setState({ listening: false }); };
    this.setState({ listening: true, askText: '' });
    rec.start();
  }
  // ---- Document intake · upload → extraction → records ----
  openCi() { this.setState({ ciOpen: true, ciStage: 'drop', ciFile: '', ciKind: 'psa' }); }
  ciKindFromName(name) {
    const lo = (name||'').toLowerCase();
    if (/passport|passaporte|id/.test(lo)) return 'passport';
    if (/fund|pof|bank|extrato/.test(lo)) return 'pof';
    if (/listing|exclusiv/.test(lo)) return 'listing';
    return 'psa';
  }
  onCiFile(e) {
    const f = e.target.files && e.target.files[0];
    const name = f ? f.name : 'document.pdf';
    this.setState({ ciFile: name, ciKind: this.ciKindFromName(name), ciStage: 'reading' });
    clearTimeout(this._ciT);
    this._ciT = setTimeout(() => this.setState({ ciStage: 'done' }), 1600);
  }
  ciUseSample(kind, fname) {
    this.setState({ ciFile: fname, ciKind: kind, ciStage: 'reading' });
    clearTimeout(this._ciT);
    this._ciT = setTimeout(() => this.setState({ ciStage: 'done' }), 1600);
  }
  // ---- Off-market registration ----
  openOmForm() {
    this._omDraft = { name:'', area:'', type:'Condo', bd:'', ba:'', sf:'', ask:'', src:'Owner direct', owner:'', notes:'' };
    this.setState({ omFormOpen:true, omStatus:'Quiet', omPhotos:[], omDocs:[], omErr:null, omOpts:{ match:true, dossier:true, watch:false } });
  }
  omMoney(v) {
    const s = String(v||'').trim().replace(/[$,\s]/g,'').toUpperCase();
    if (!s) return 0;
    if (s.endsWith('M')) return (parseFloat(s)||0)*1e6;
    if (s.endsWith('K')) return (parseFloat(s)||0)*1e3;
    return parseFloat(s)||0;
  }
  submitOmForm() {
    const d = this._omDraft || {};
    if (!(d.name||'').trim()) { this.setState({ omErr:'Property / address is required.' }); return; }
    if (!(d.ask||'').trim()) { this.setState({ omErr:'Ask price is required.' }); return; }
    const st = this.state.omStatus || 'Quiet';
    const stColor = st==='Preview' ? '#B45309' : st==='Circulating' ? '#10A37F' : '#8F8F8F';
    const money = this.omMoney(d.ask);
    const sf = parseFloat(String(d.sf||'').replace(/[,\s]/g,'')) || 0;
    const isLand = d.type==='Land';
    const psf = isLand ? 'land' : (money>0 && sf>0 ? '$'+Math.round(money/sf).toLocaleString('en-US')+'/SF' : '—');
    const fmtSf = sf>0 ? sf.toLocaleString('en-US') : '';
    const specs = isLand
      ? [fmtSf ? fmtSf+' SF lot' : 'land parcel', (d.area||'').trim()].filter(Boolean).join(' · ')
      : ([d.bd ? d.bd+' BD' : '', d.ba ? d.ba+' BA' : '', fmtSf ? fmtSf+' SF' : ''].filter(Boolean).join(' · ') || [d.type, (d.area||'').trim()].filter(Boolean).join(' · '));
    const ask = /^\$/.test(String(d.ask).trim()) ? String(d.ask).trim() : '$'+String(d.ask).trim();
    const opts = this.state.omOpts || {};
    const nPh = (this.state.omPhotos||[]).length, nDoc = (this.state.omDocs||[]).length;
    const row = { id:'omn'+Date.now(), name:d.name.trim(), src:d.src||'Owner direct', ask, psf, specs, st, stColor, matched:(opts.match?'2':'—'), held:'0d' };
    this.setState(s => ({ omNewInv:[row, ...(s.omNewInv||[])], omFormOpen:false }));
    this.pushAudit('Off-market · ' + d.name.trim() + ' registered — ' + st + ' · ' + (d.src||'Owner direct') + ' · ' + nPh + ' photos · ' + nDoc + ' docs to private vault' + (opts.match ? ' · buyer-book sweep queued' : '') + (opts.dossier ? ' · watermarked dossier drafting' : ''));
    this.ciToast(opts.match ? 'Registered off-market · buyer-book sweep found 2 matches' : 'Registered off-market · filed to private vault');
  }
  ciToast(msg) {
    this.setState({ qcToast: msg });
    clearTimeout(this._qcT);
    this._qcT = setTimeout(() => this.setState({ qcToast: null }), 3400);
  }
  ciCreate() {
    const kind = this.state.ciKind || 'psa';
    if (kind === 'psa') {
      const tx = { name:'Carvalho — Rivage PH-A', meta:'Under Contract · Cash · Effective Jul 06', progressLabel:'0 of 9 milestones', pct:'2%', alert:'Inspection T-10 · short window', alertColor:'#D0342C', gci:'$555K', closing:'Closing Sep 12', dot:'#D0342C' };
      const tasks = [
        { id:'ci1', name:'Carvalho · Rivage PH-A', action:'Schedule inspection — window shortened to 10d per §7', type:'Task', wgci:'', due:'Jul 07', bucket:'today', agentParsed:true },
        { id:'ci2', name:'Carvalho · Rivage PH-A', action:'Confirm escrow deposit receipt — $1.85M due Jul 09', type:'Task', wgci:'', due:'Jul 09', bucket:'week', agentParsed:true },
        { id:'ci3', name:'Carvalho · Rivage PH-A', action:'HOA package to association — draft ready, 21d lead time', type:'Document', wgci:'', due:'Jul 08', bucket:'week', agentParsed:true }
      ];
      this.setState(s => ({ ciOpen: false, extraTx: tx, naUserTasks: [...tasks, ...(s.naUserTasks||[])], screen:'pipeline', pipeTab:'tx' }));
      this.pushAudit('Contract read · Carvalho × Rivage PH-A — transaction + action plan created, 2 risk flags raised');
      this.ciToast('Transaction created · 9 milestones · 3 tasks · agent tracking due dates');
    } else if (kind === 'pof') {
      this.setState(s => ({ ciOpen: false, naUserTasks: [{ id:'cip1', name:'Marcelo Carvalho', action:'Proof of funds expires Sep 28 — refresh before offer round', type:'Task', wgci:'', due:'Sep 21', bucket:'later', agentParsed:true }, ...(s.naUserTasks||[])] }));
      this.pushAudit('Proof of funds filed · Marcelo Carvalho — $22.4M verified · KYC updated · stored in private vault');
      this.ciToast('Proof of funds verified · KYC updated · expiry reminder set');
    } else if (kind === 'passport') {
      this.setState(s => ({ ciOpen: false, naUserTasks: [{ id:'cip2', name:'Marcelo Carvalho', action:'Passport expires Mar 2027 — reverify before closing docs', type:'Task', wgci:'', due:'—', bucket:'later', agentParsed:true }, ...(s.naUserTasks||[])] }));
      this.pushAudit('ID document filed · Marcelo Carvalho — passport verified · vault only · expiry reminder set');
      this.ciToast('Passport filed to private vault · KYC complete');
    } else if (kind === 'listing') {
      const tx = { name:'Klein — Estates at Acqualina PH', meta:'Listing · Exclusive · Signed Jul 06 · 6mo term', progressLabel:'0 of 6 actions', pct:'2%', alert:'Photos due Jul 11', alertColor:'#5D5D5D', gci:'$597K', closing:'Ask $19.9M', dot:'#0D0D0D' };
      const tasks = [
        { id:'cil1', name:'Klein · Estates PH', action:'Book photography + staging — preferred vendor held Jul 10–11', type:'Task', wgci:'', due:'Jul 08', bucket:'week', agentParsed:true },
        { id:'cil2', name:'Klein · Estates PH', action:'MLS draft QA — listing live target Jul 13', type:'Document', wgci:'', due:'Jul 11', bucket:'week', agentParsed:true }
      ];
      this.setState(s => ({ ciOpen: false, extraTx: tx, naUserTasks: [...tasks, ...(s.naUserTasks||[])], screen:'pipeline', pipeTab:'tx' }));
      this.pushAudit('Listing agreement read · Klein × Estates PH — listing playbook instantiated · buyer-match sweep queued');
      this.ciToast('Listing created · 6 actions · 4 matched buyers found in your book');
    }
  }

  askReply(q, a, actions, rich) {
    this.setState(s => ({ askThread: [{ q, a, actions: actions || [], rich: rich || null }, ...(s.askThread || [])].slice(0, 6), askText: '', askDockDismissed: false }));
  }
  _decorateAsk(t) {
    const rich = t.rich || {};
    return { ...t,
      actions: (t.actions || []).map(a => ({ label: a.label, onClick: ()=>{ if (a.contact) this.openContact(a.contact); else if (a.screen) this.nav(a.screen); } })),
      isChart: rich.kind === 'chart', isList: rich.kind === 'list', isDeal: rich.kind === 'deal', isStats: rich.kind === 'stats',
      chartBars: rich.kind === 'chart' ? rich.bars.map(b => ({ m: b.m,
        barStyle: `width:100%;height:${b.h};min-height:2px;background:${b.on ? '#0D0D0D' : '#D8D8D8'};`,
        labStyle: `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${b.on ? 600 : 400};font-size:9px;letter-spacing:0.06em;color:${b.on ? '#0D0D0D' : '#8F8F8F'};` })) : [],
      chartRows: rich.kind === 'chart' ? rich.rows : [],
      chartTotal: rich.kind === 'chart' ? rich.total : '',
      listRows: rich.kind === 'list' ? rich.rows.map(r => ({ ...r, hasValue: !!r.value,
        onClick: ()=>{ if (r.contact) this.openContact(r.contact); else if (r.screen) this.nav(r.screen); } })) : [],
      deal: rich.kind === 'deal' ? { ...rich, hasAlert: !!rich.alert } : { title:'', sub:'', stats:[], alert:'', hasAlert:false },
      statsRows: rich.kind === 'stats' ? rich.rows : []
    };
  }
  askSubmit(text, viaVoice) {
    const lo = text.toLowerCase();
    const tag = viaVoice ? ' · via voice' : '';
    // context: which record is open right now?
    const idName = { marcelo:'Marcelo Carvalho', keller:'Anton Keller · Zurich FO', sterling:'Robert Sterling', bittencourt:'Ana Bittencourt', nakamura:'Kenji Nakamura', ravel:'Elena Ravel', alvarez:'Carlos Alvarez', zanotti:'Valdemar Zanotti' };
    const scr = this.state.screen;
    let ctxName = null;
    if (scr === 'contact') ctxName = idName[this.state.contactId || 'marcelo'] || null;
    else if (scr === 'deal') ctxName = this.state.dealId ? this.state.dealId : 'Marcelo Carvalho · Rivage PH-A';
    else if (scr === 'tc') ctxName = 'Robert Sterling · Acqualina 4802';
    const navMap = [['opportunities','pipeline','Opportunities'],['pipeline','pipeline','Opportunities'],['contatos','contacts','Contacts'],['contacts','contacts','Contacts'],['contact','contacts','Contacts'],['network','network','Network'],['rede','network','Network'],['atividades','activities','Activities'],['activities','activities','Activities'],['inbox','activities','Activities'],['intelig','intel','Intelligence'],['intel','intel','Intelligence'],['report','reports','Reports'],['relat','reports','Reports'],['settings','settings','Settings'],['ajustes','settings','Settings'],['config','settings','Settings'],['transaç','tc','Transaction'],['transaction','tc','Transaction'],['today','next','Today'],['tasks','next','Today'],['tarefas','next','Today'],['ações','next','Today']];
    const contactMap = [['marcelo','marcelo','Marcelo Carvalho'],['keller','keller','Anton Keller'],['zurich','keller','Anton Keller'],['sterling','sterling','Robert Sterling'],['bittencourt','bittencourt','Ana Bittencourt'],['nakamura','nakamura','Kenji Nakamura'],['ravel','ravel','Elena Ravel'],['alvarez','alvarez','Carlos Alvarez']];
    // 1 · log / create (context-aware: falls back to the open record)
    if (/^(loga|log |registra|nova task|new task|criar|anota|agenda|marca|schedule|update)/.test(lo)) {
      const hit = contactMap.find(([k]) => lo.includes(k));
      const who = hit ? hit[2] : (ctxName || 'General');
      const isMeeting = /(agenda|marca|schedule|meeting|visita|tour|call)/.test(lo);
      this.pushAudit('Created via Ask' + tag + ' · ' + who + ' — “' + text + '” (agent-structured' + (!hit && ctxName ? ' · from open record' : '') + ')');
      this.askReply(text, (isMeeting ? 'Scheduled' : 'Logged') + ' for ' + who + (!hit && ctxName ? ' — inferred from the open record' : '') + '. The agent structured type, date and next action' + (isMeeting ? ' + calendar event with D-1 confirmation' : '') + '.' + tag, [{ label:'Open Today', screen:'next' }]);
      return;
    }
    // 2 · open contact
    const cHit = contactMap.find(([k]) => lo.includes(k));
    if (cHit && /(abre|abrir|open|mostra|ver|como está|como esta|status)/.test(lo)) {
      if (/(como está|como esta|status)/.test(lo)) {
        if (cHit[2] === 'Robert Sterling') {
          this.askReply(text, 'In contract, on schedule — one point of attention:', [{ label:'Open transaction', screen:'tc' }],
            { kind:'deal', title:'Sterling — Acqualina 4802', sub:'Under Contract · Cash · Closing Aug 15',
              stats:[{l:'GCI',v:'$530K'},{l:'Milestones',v:'2 of 9'},{l:'Inspection ends',v:'Jul 08'}],
              alert:'HOA approval package due Jul 11 — T-3 · draft to association ready' });
          return;
        }
        if (cHit[2] === 'Marcelo Carvalho') {
          this.askReply(text, 'Strong momentum — cadence overdue by 1 day:', [{ label:'Open deal', screen:'deal' }, { label:'Open contact', contact:'marcelo' }],
            { kind:'deal', title:'Marcelo C. — Rivage PH-A', sub:'Tour Completed · 45% · Expected close Sep 2026',
              stats:[{l:'Budget',v:'$18.5M'},{l:'W.GCI',v:'$250K'},{l:'Next action',v:'Jul 08'}],
              alert:'Cadence day 4 of 3 — confirm 2nd visit + send developer schedule' });
          return;
        }
        this.askReply(text, cHit[2] + ': record opened alongside — latest touches, deals and tasks in view.', [{ label:'Open ' + cHit[2].split(' ')[0], contact: cHit[1] }]);
        return;
      }
      this.openContact(cHit[1]);
      this.askReply(text, cHit[2] + ' opened.' + tag);
      return;
    }
    // 3 · navigate
    const nHit = navMap.find(([k]) => lo.includes(k));
    if (nHit && /(vai|abre|abrir|open|go|mostra|leva)/.test(lo)) { this.nav(nHit[1]); this.askReply(text, nHit[2] + ' aberto.' + tag); return; }
    // 4 · questions
    if (/(setembro|september)/.test(lo)) { this.askReply(text, 'Setembro concentra o trimestre — $4.40M weighted em 4 closings:', [{ label:'Open forecast', screen:'intel' }],
      { kind:'chart', bars:[{m:'JUL',h:'31%'},{m:'AUG',h:'10%'},{m:'SEP',h:'100%',on:true},{m:'OCT',h:'2%'},{m:'NOV',h:'14%'},{m:'DEC',h:'5%'}],
        rows:[{name:'Indian Creek Estate',value:'$3.02M'},{name:'Zurich FO · Golden Beach',value:'$504K'},{name:'Faena Penthouse',value:'$460K'},{name:'Marcelo · Rivage PH-A',value:'$412K'}], total:'SEP · $4.40M weighted GCI' }); return; }
    if (/(overdue|atrasad|vencid)/.test(lo)) { this.askReply(text, '4 itens overdue — clique para abrir cada um:', [{ label:'Open queue', screen:'contacts' }],
      { kind:'list', rows:[
        { dot:'#D0342C', name:'Marcelo Carvalho', note:'HOT · cadence day 4 of 3 — 2nd visit + developer schedule', value:'$412K', contact:'marcelo' },
        { dot:'#D0342C', name:'Bal Harbour Listing', note:'19 days since last touch — threshold 14 · re-touch draft ready', value:'', screen:'intel' },
        { dot:'#D0342C', name:'Sterling · HOA package', note:'Due Jul 11 · T-3 — draft to association ready', value:'$530K', screen:'tc' },
        { dot:'#D0342C', name:'Ana Bittencourt', note:'Referral ask · 94 days since close — draft prepared', value:'', contact:'bittencourt' } ] }); return; }
    if (/(fecha|closes|forecast|quanto)/.test(lo)) { this.askReply(text, 'July: $1.34M weighted across 3 closings. The semester peak is September:', [{ label:'Open forecast', screen:'intel' }],
      { kind:'chart', bars:[{m:'JUL',h:'31%',on:true},{m:'AUG',h:'10%'},{m:'SEP',h:'100%'},{m:'OCT',h:'2%'},{m:'NOV',h:'14%'},{m:'DEC',h:'5%'}],
        rows:[{name:'Faena 8C · Ravel',value:'$530K'},{name:'Continuum 2904 · Alvarez',value:'$410K'},{name:'Bal Harbour 1503 · Nakamura',value:'$400K'}], total:'JUL · $1.34M weighted GCI' }); return; }
    if (/(health|saúde|pipeline)/.test(lo)) { this.askReply(text, 'Pipeline health 82/100 — aging is the only factor on watch (2 stalled deals):', [{ label:'Open Intelligence', screen:'intel' }],
      { kind:'stats', rows:[{label:'Coverage',value:'3.2×',w:'88%'},{label:'Velocity',value:'Good',w:'74%'},{label:'Aging',value:'Watch',w:'58%'},{label:'Hygiene',value:'Clean',w:'96%'}] }); return; }
    // default (context-aware)
    this.askReply(text, 'Understood' + (ctxName ? ' — applied to ' + ctxName + ' (open record)' : '') + '. Routed to the agent; interpretation and proposal will appear in Needs Your Decision.' + tag);
  }
  openContact(id) { this.setState({ screen: 'contact', contactId: id, contactTab: 'overview', nameMenuOpen: false }); }
  gcSave(playName) {
    const st = this.state.gcStatus || 'NEW';
    const catRaw = this.state.gcCat || 'Prospect';
    const catMap = { 'Client':'client', 'Prospect':'prospect', 'Sphere':'sphere', 'Vendor / Partner':'sphere' };
    const contact = { id:'gc1', name:'Isabela Fontes', category: catMap[catRaw] || 'prospect', relationship: catRaw + ' · Buyer', location:'Rio de Janeiro, BR', dot:'#8F8F8F', status: st,
      phone:'+55 21 9 7712 ····', email:'isabela.fontes@fontesgroup.com', since:'2026', lifetime:'—', dealsWon:'0', active:'0', lastTouch:'Jul 06',
      tags:['Google Contacts', this.state.gcSource || 'Event'], prefAsset: this.state.gcAsset || 'Oceanfront condo', prefAreas:'Faena District', prefBudget: this.state.gcBudget || '$4–6M',
      narrative:'Synced from Google Contacts Jul 06. Met at Faena preview event — interested in an oceanfront pied-à-terre. Nurturing playbook “' + playName + '” scheduled on categorization.',
      agentNote:'New lead from Google sync — “' + playName + '” playbook running; first step queued for approval.',
      deals:[], touches:[{ date:'Jul 06', type:'Note', body:'Synced from Google Contacts · categorized ' + catRaw + ' / ' + st + ' · playbook “' + playName + '” scheduled.' }] };
    this.setState(s => ({ gcAdded:[contact, ...(s.gcAdded||[])], gcHandled:true, gcTriageOpen:false, qcToast:'Contact categorized · “' + playName + '” playbook scheduled' }));
    this.pushAudit('Google Contacts sync · Isabela Fontes categorized ' + catRaw + ' / ' + st + ' — nurturing playbook scheduled');
    clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2800);
  }
  pushAudit(txt) { const t = new Date(); const hh = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0'); this.setState(s => ({ naAudit: [{ t: hh, txt }, ...(s.naAudit||[])].slice(0, 20) })); }
  resched(id, name, spec) { const cur = (this.state.naResched||{})[id]; this.setState(s => { const r = { ...(s.naResched||{}) }; r[id] = cur ? undefined : spec; const c = { a1:3, ...(s.naReschCount||{}) }; if (!cur) c[id] = (c[id]||0) + 1; return { naResched: r, naReschCount: c }; }); this.pushAudit(cur ? ('Reschedule reverted · ' + name + ' — activity logged to record') : ('Rescheduled ' + spec.tag + ' · ' + name + ' — activity logged to record')); }
  killTask(id, name) { this.setState(s => ({ doneActions: { ...(s.doneActions||{}), [id]: true } })); this.pushAudit('Killed · ' + name + ' — removed from queue, no follow-up'); }
  commitToday(id, name) { this.setState(s => ({ naResched: { ...(s.naResched||{}), [id]: { due:'Jul 06', bucket:'today', tag:'committed' } } })); this.pushAudit('Committed · ' + name + ' — moved to today, escalation cleared'); }
  toggleAction(id) { const nm = (this._naNameById||{})[id] || id; const willDo = !((this.state.doneActions||{})[id]); this.setState(s => { const d = { ...(s.doneActions||{}) }; d[id] = !d[id]; const f = { ...(s.naFollow||{}) }; if (d[id]) { f[id] = 'Follow-up proposed · Jul 09 — queued after your OK'; } else { delete f[id]; } return { doneActions: d, naFollow: f }; }); this.pushAudit(willDo ? ('Completed · ' + nm + ' — outcome logged, follow-up proposed') : ('Reopened · ' + nm)); }
  toggleActDone(id) { this.setState(s => { const d = { ...(s.doneAct||{}) }; d[id] = !d[id]; return { doneAct: d }; }); }
  submitLog() {
    const t = this.state.logType || 'Note';
    const name = (this.state.logName || '').trim();
    const body = (this.state.logBody || '').trim();
    if (!name && !body) return;
    const entry = { id: 'log' + Date.now(), type: t, name: name || 'Untitled', body: body || '—', date: 'Jul 06', outcome: t === 'Task' ? 'Open' : 'Logged' };
    this.setState(s => ({ loggedActs: [entry, ...(s.loggedActs || [])], logName: '', logBody: '', logOpen: false }));
  }
  selectThread(id) { this.setState(s => ({ threadId: id, readThreads: { ...(s.readThreads||{}), [id]: true } })); }
  sendMsg() {
    const txt = (this.state.chatInput || '').trim();
    if (!txt) return;
    const id = this.state.threadId || 'marcelo';
    this.setState(s => { const sm = { ...(s.sentMsgs||{}) }; sm[id] = [ ...(sm[id]||[]), { dir:'out', text: txt, time:'Now' } ]; return { sentMsgs: sm, chatInput: '' }; });
  }
  approve(id) { this.setState(st => ({ approvals: { ...st.approvals, [id]: 'approved' } })); }
  dismiss(id) { this.setState(st => ({ approvals: { ...st.approvals, [id]: 'dismissed' } })); }
  approveDraft(id) { this.setState(st => ({ drafts: { ...st.drafts, [id]: true } })); }
  setProbVal(v) { let n = parseInt(v, 10); if (isNaN(n)) n = 0; n = Math.max(0, Math.min(100, n)); this.setState({ prob: n }); }

  renderVals() {
    const F0 = "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;";
    const C = { ink:'#0D0D0D', graf:'#303030', conc:'#5D5D5D', pedra:'#8F8F8F', nev:'#E3E3E3', gaze:'#ECECEC', branco:'#FFFFFF', moss:'#0D0D0D', ox:'#D0342C' };
    const scr = this.state.screen === 'next' ? 'intel' : this.state.screen;
    const vw = this.state.vw || (typeof window !== 'undefined' ? window.innerWidth : 1440);
    const isMob = vw < 800; const isTab = vw < 1180;
    const docKey = scr === 'contact' ? ('contact|' + (this.state.contactId || 'marcelo')) : ('deal|' + (this.state.dealId || 'Rivage PH-A · Marcelo C.'));
    const userDocs = (this.state.docStore || {})[docKey] || [];
    const docDragOn = !!this.state.docDrag;
    const docTools = {
      dropCount: String(userDocs.length),
      hasDropDocs: userDocs.length > 0,
      dropDocs: userDocs.map((d) => ({ name: d.name, type: d.type || 'FILE', meta: [d.type, d.size, d.date, d.who].filter(Boolean).join(' · '), cur: d.url ? 'pointer' : 'default',
        onOpen: () => { if (d.url) { const w = window.open('', '_blank'); if (w) { w.document.title = d.name; w.document.body.style.margin = '0'; const fr = w.document.createElement('iframe'); fr.src = d.url; fr.style.cssText = 'border:0;position:fixed;inset:0;width:100%;height:100%'; w.document.body.appendChild(fr); } } else { this.ciToast('Stored — full preview in the live app'); } },
        onRemove: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this._removeDoc(docKey, d.id); } })),
      dropZoneStyle: 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed ' + (docDragOn ? '#0D0D0D' : '#C9C9C9') + ';border-radius:12px;background:rgba(255,255,255,' + (docDragOn ? '0.72' : '0.42') + ');padding:30px 20px;cursor:pointer;text-align:center;transition:all 150ms;',
      onDocDragOver: (e) => { if (e && e.preventDefault) e.preventDefault(); if (!this.state.docDrag) this.setState({ docDrag: true }); },
      onDocDragLeave: (e) => { if (e && e.preventDefault) e.preventDefault(); if (this.state.docDrag) this.setState({ docDrag: false }); },
      onDocDrop: (e) => { if (e && e.preventDefault) e.preventDefault(); this._ingestDocs(docKey, e.dataTransfer && e.dataTransfer.files); },
      onDocPick: (e) => { this._ingestDocs(docKey, e.target.files); try { e.target.value = ''; } catch (x) {} }
    };
    const titleMap = { command:'Welcome', pipeline:'Opportunities', deal:'Deal Detail', tc:'Transaction', intel:'Intelligence', next:'Next Actions', inbox:'Inbox', activities:'Activities', marketing:'Marketing', contacts:'Contacts', contact:'Contact', assets:'Assets', reports:'Reports', network:'Network', settings:'Settings' };
    const realScreens = ['command','pipeline','deal','tc','intel','reports','contacts','contact','next','activities','inbox','marketing','network','settings','dealpage','partner','partnernew','ptrecord','ptdash','ptcollat'];
    titleMap.dealpage = 'Deal Record';
    titleMap.partner = 'Partner Portal';
    titleMap.partnernew = 'New Referral';
    titleMap.ptrecord = 'Referral Record';
    titleMap.ptdash = 'Partner Dashboard';
    titleMap.ptcollat = 'Pre-Development Collaterals';

    let navDefs = [['Welcome','command'],['Intelligence','intel'],['Contacts','contacts'],['Opportunities','pipeline'],['Inbox','inbox'],['Marketing','marketing'],['Reports','reports'],['Settings','settings']];
    const navMoreDefs = [];
    const VA_ALLOW = { 'Sales Agent':['Welcome','Contacts','Opportunities','Inbox','Activities','Reports'], 'Admin':['Welcome','Contacts','Inbox','Activities'], 'Transaction Coordinator':['Welcome','Opportunities','Activities'], 'Marketing':['Welcome','Marketing'], 'Referral Partner':['Dashboard','Pipeline','New Referral'] };
    const vaRoleCur = this.state.viewAs && this.state.viewAs.role;
    if (vaRoleCur && VA_ALLOW[vaRoleCur]) navDefs = navDefs.filter(d => VA_ALLOW[vaRoleCur].indexOf(d[0]) >= 0);
    if (vaRoleCur === 'Referral Partner') navDefs = [['Dashboard','ptdash'],['Pipeline','partner'],['New Referral','partnernew'],['Collaterals','ptcollat']];
    // top bar — light on every screen (Sistema Claro)
    const topBarStyle = scr==='inbox' ? 'display:none;' : ('display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:' + (isMob ? '18px 20px 0 62px' : '34px 48px 0') + ';');
    const topTitleColor = '#0D0D0D';
    const topDividerStyle = scr==='inbox' ? 'display:none;' : ('height:0.5px;background:#E3E3E3;margin:' + (isMob ? '14px 20px 0' : '20px 48px 0') + ';');
    const heroSub = [
      { label:'HOT Leads', value:'9', sub:'of 42', color:'#0D0D0D' },
      { label:'Overdue Actions', value:'4', sub:'oldest 19d', color:'#E0655C' },
      { label:'Win Rate · YTD', value:'38%', sub:'12 of 32', color:'#FFFFFF' },
      { label:'Avg Deal Cycle', value:'64d', sub:'offer → close', color:'#FFFFFF' },
      { label:'Referral Share', value:'58%', sub:'of new pipeline', color:'#FFFFFF' },
      { label:'Agent · Overnight', value:'11', sub:'actions logged', color:'#FFFFFF' }
    ];

    const mkNavItem = (([label, id]) => {
      const active = scr === id;
      return {
        label, active, badge:'', hasBadge:false,
        onClick: () => this.nav(id),
        style: `display:flex;align-items:center;justify-content:space-between;border-radius:11px;padding:9px 12px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?600:400};font-size:13.5px;letter-spacing:0.01em;color:${active ? '#0D0D0D' : '#4A4A46'};cursor:pointer;transition:all 150ms;background:${active ? 'rgba(255,255,255,0.30)' : 'transparent'};border:1px solid ${active ? 'rgba(255,255,255,0.85)' : 'transparent'};box-shadow:${active ? '0 4px 16px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.95),inset 0 -1px 0 rgba(255,255,255,0.35)' : 'none'};`,
        hoverStyle: `color:#0D0D0D;background:${active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.20)'};`
      };
    });
    const navItems = navDefs.map(mkNavItem);
    const navMoreItems = navMoreDefs.map(mkNavItem);
    const navMoreOpen = !!this.state.navMoreOpen || navMoreDefs.some(d => scr === d[1]);

    const kpis = [
      { label:'Pipeline', value:'$402M', color:C.ink },
      { label:'Weighted', value:'$176M', color:C.ink },
      { label:'Potential GCI', value:'$12.1M', color:C.ink },
      { label:'Weighted GCI', value:'$5.2M', color:C.ink },
      { label:'HOT Leads', value:'9', color:C.ink },
      { label:'Overdue Actions', value:'4', color:C.ox }
    ];

    const callRows = [
      { dot:C.moss, tag:'HOT', name:'Marcelo C.', opp:'Rivage PH Acquisition', wgci:'$412K', point:'Toured PH-A Saturday; spouse concerned re: construction timeline — objective: confirm second visit + share developer schedule.' },
      { dot:C.moss, tag:'HOT', name:'Family Office · Zurich', opp:'Golden Beach Compound', wgci:'$288K', point:'Awaiting counter response since Thursday — objective: push principal call before Wednesday.' },
      { dot:C.moss, tag:'HOT', name:'R. Sterling', opp:'Acqualina 4802', wgci:'$196K', point:'Financing approved, comparing vs Estates unit — objective: schedule the decisive tour.' }
    ];

    const riskRows = [
      { lead:'Bal Harbour Listing', note:'19 days since last touch — HOT threshold is 14.' },
      { lead:'Brickell Commercial', note:'Probability 60% → 40% this week.' },
      { lead:'Sunny Isles 3801', note:'Expected close was Jun 30, still in Negotiation → re-forecast.' }
    ];

    const moneyHead = ['Deal','Stage','Close','W.GCI','Blocker'];
    const moneyRows = [
      { deal:'Continuum 2904 · Alvarez', stage:'Under Contract', close:'Jul 18', wgci:'$410K', blocker:'Appraisal pending' },
      { deal:'Faena 8C · Ravel', stage:'Negotiation', close:'Jul 25', wgci:'$530K', blocker:'HOA approval package pending — due Jul 11' },
      { deal:'Bal Harbour 1503 · Nakamura', stage:'Offer Submitted', close:'Jul 29', wgci:'$400K', blocker:'Awaiting counter' }
    ];

    const A = this.state.approvals;
    const proposals = [
      { id:'wa', label:'WhatsApp Draft · PT · Awaiting Approval', body:'Marcelo, bom dia. Confirmei a agenda de obra com a incorporadora — posso reservar sábado às 11h para a segunda visita da PH-A?', why:'Recommended: send — responds to the spouse\'s timeline concern while momentum is high.' },
      { id:'down', label:'Status Proposal', body:'Coral Gables buyer: HOT → WARM. Three unanswered touches over 11 days.', why:'Recommended: approve — keeps your queue honest; contact stays in agent-run cadence.' },
      { id:'merge', label:'Duplicate Merge', body:'Two records for "R. Sterling / Robert Sterling" — Acqualina 4802. Merge into a single contact?', why:'Recommended: merge — histories are complementary, no field conflicts.' }
    ].map(p => ({ ...p, isOpen: !A[p.id], isApproved: A[p.id]==='approved', isDismissed: A[p.id]==='dismissed', onApprove:()=>this.approve(p.id), onDismiss:()=>this.dismiss(p.id), onSnooze:()=>{ this.setState(s=>({ approvals: { ...s.approvals, [p.id]: 'snoozed' } })); this.pushAudit('Decision queue · snoozed — ' + p.label + ' · resurfaces tomorrow 07:00'); this.ciToast('Snoozed — resurfaces tomorrow 07:00'); } })).filter(p => A[p.id] !== 'snoozed');
    const allDecided = proposals.every(p=>!p.isOpen);
    const openDecisionCount = proposals.filter(p=>p.isOpen).length;
    const approveAllLabel = 'Approve all · ' + openDecisionCount;
    const showApproveAll = openDecisionCount > 1;
    const approveAll = ()=>{ proposals.filter(p=>p.isOpen).forEach(p=>this.approve(p.id)); this.pushAudit('Decision queue · approve all · ' + openDecisionCount + ' items — each executed per its recommendation'); };

    // ---- Mission Control ----
    const healthScore = 82;
    const healthFactors = [
      { label:'Coverage', value:'3.2×', w:'88%' },
      { label:'Velocity', value:'Good', w:'74%' },
      { label:'Aging', value:'Watch', w:'58%' },
      { label:'Hygiene', value:'Clean', w:'96%' }
    ];
    const moneyStrip = [
      { label:'Pipeline', value:'$402M', sub:'42 open' },
      { label:'Weighted GCI', value:'$5.2M', sub:'probability-adj' },
      { label:'Closed YTD', value:'$3.1M', sub:'12 days ahead of pace' },
      { label:'Next 30 Days', value:'$1.34M', sub:'3 closings' }
    ];

    const selMonth = this.state.selMonth || 'SEP';
    const whatIf = !!this.state.whatIf;
    const fRaw = [
      { m:'JUL', deals:[{n:'Continuum 2904 · Alvarez',v:410},{n:'Faena 8C · Ravel',v:530},{n:'Bal Harbour 1503 · Nakamura',v:400}] },
      { m:'AUG', deals:[{n:'Sunny Isles 3801 · Petrov',v:420}] },
      { m:'SEP', deals:[{n:'Marcelo · Rivage PH-A',v:412,slip:true},{n:'Zurich FO · Golden Beach',v:504},{n:'Faena Penthouse',v:460},{n:'Indian Creek Estate',v:3020}] },
      { m:'OCT', deals:[] },
      { m:'NOV', deals:[{n:'Estates at Acqualina · Klein',v:599}] },
      { m:'DEC', deals:[{n:'Fisher Island 6D',v:180}] }
    ];
    let fMonths = fRaw.map(f => ({ ...f, deals:[...f.deals] }));
    if (whatIf) {
      const sep = fMonths.find(f=>f.m==='SEP'), oct = fMonths.find(f=>f.m==='OCT');
      const idx = sep.deals.findIndex(d=>d.slip);
      if (idx>-1) oct.deals.push(...sep.deals.splice(idx,1));
    }
    const fmtK = (k)=> k>=1000 ? '$'+(k/1000).toFixed(2).replace(/\.?0+$/,'')+'M' : (k>0 ? '$'+k+'K' : '$0');
    fMonths = fMonths.map(f => { const tot = f.deals.reduce((n,d)=>n+d.v,0); return { ...f, tot, gci: fmtK(tot), deals: f.deals.map(d=>({ n:d.n, v:'$'+d.v+'K' })) }; });
    const fMax = Math.max(...fMonths.map(f=>f.tot), 1);
    fMonths = fMonths.map(f => ({ ...f, h: Math.max(Math.round(f.tot/fMax*100),2)+'%' }));
    const whatIfLabel = whatIf ? 'What-if ON · Rivage → Oct' : 'What-if · Rivage slips to Oct?';
    const whatIfStyle = `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${whatIf?400:300};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${whatIf?'#D0342C':'#8F8F8F'};cursor:pointer;transition:color 150ms;border-bottom:1px solid ${whatIf?'#D0342C':'transparent'};padding-bottom:2px;`;
    const toggleWhatIf = ()=>this.setState(s=>({whatIf:!s.whatIf}));
    const fBars = fMonths.map(f => {
      const on = f.m === selMonth;
      return { ...f,
        onClick:()=>this.setState({selMonth:f.m}),
        colStyle:'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;cursor:pointer;height:150px;',
        barStyle:`width:100%;height:${f.h};min-height:2px;background:${on?'#0D0D0D':'#D8D8D8'};transition:background 150ms;`,
        labStyle:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${on?400:300};font-size:10px;letter-spacing:0.08em;color:${on?'#0D0D0D':'#8F8F8F'};` };
    });
    const selData = fMonths.find(f => f.m === selMonth) || fMonths[0];
    const selDeals = selData.deals;
    const selMonthGci = selData.gci;

    const touchToday = [
      { dot:C.moss, tag:'HOT', name:'Marcelo Carvalho', ctx:'2nd visit + developer schedule', wgci:'$412K', due:'Overdue 1d', dueColor:'#D0342C' },
      { dot:C.moss, tag:'HOT', name:'Family Office · Zurich', ctx:'Push principal call', wgci:'$288K', due:'Today', dueColor:'#303030' },
      { dot:C.moss, tag:'HOT', name:'R. Sterling', ctx:'Schedule decisive tour', wgci:'$196K', due:'Today', dueColor:'#303030' },
      { dot:C.conc, tag:'WARM', name:'Coral Gables buyer', ctx:'Re-engage · 11d silent', wgci:'$96K', due:'Cadence', dueColor:'#8F8F8F' },
      { dot:C.pedra, tag:'PAST', name:'A. Bittencourt', ctx:'Referral ask · closed 94d', wgci:'—', due:'Cadence', dueColor:'#8F8F8F' }
    ];

    const riskSnooze = this.state.riskSnooze || {};
    const riskDone = this.state.riskDone || {};
    const riskDefs = [
      { id:'bal', lead:'Bal Harbour Listing', sev:'#D0342C', tag:'SLA BREACH', clock:'19d stale', gciK:294, note:'19 days since last touch — HOT threshold is 14. Sellers aligned on price; silence reads as drift.', remedy:'Re-touch draft ready — new angle: buyer-match update from your book', act:'Send re-touch' },
      { id:'faena8c', lead:'Faena 8C · Ravel', sev:'#B45309', tag:'DEADLINE', clock:'T-2 days', gciK:186, note:'HOA approval package due Jul 11 — incomplete without the estoppel letter.', remedy:'Chase to association drafted · attorney in CC', act:'Send chase' },
      { id:'brickell', lead:'Brickell Commercial', sev:'#B45309', tag:'MOMENTUM', clock:'−20 pts', gciK:420, note:'Probability 60% → 40% this week — anchor tenant renegotiated, buyer cooling.', remedy:'Re-qualify call scripted — keep, or park for the Q4 capital cycle', act:'Queue call' },
      { id:'nakamura', lead:'Sunny Isles 3801', sev:'#D0342C', tag:'RE-FORECAST', clock:'+30d slip', gciK:246, note:'Close slipped Jun 30 → Jul 30 on buyer financing. Every silent day weakens leverage.', remedy:'Backup buyer warm-up drafted — creates real pressure', act:'Warm backup' }
    ];
    const riskLive = riskDefs.filter(d => !riskSnooze[d.id]);
    const riskExposure = (() => { const k = riskLive.reduce((n, d) => n + d.gciK, 0); return k >= 1000 ? '$' + (k / 1000).toFixed(1) + 'M' : '$' + k + 'K'; })();
    const riskRadar = riskLive.map(d => { const done = !!riskDone[d.id]; return { ...d, gci: '$' + d.gciK + 'K',
      done, notDone: !done, actLabel: done ? 'Sent ✓' : d.act,
      onOpen: () => openDeal({ name: d.lead }),
      onApprove: () => { if ((this.state.riskDone || {})[d.id]) return; this.setState(s => ({ riskDone: { ...(s.riskDone || {}), [d.id]: true } })); this.pushAudit('Risk Radar · remedy approved — ' + d.lead + ' · ' + d.remedy); this.ciToast('Approved — ' + d.act + ' · logged'); },
      onSnooze: () => { this.setState(s => ({ riskSnooze: { ...(s.riskSnooze || {}), [d.id]: true } })); this.pushAudit('Risk Radar · snoozed 7 days — ' + d.lead + ' · resurfaces Jul 16'); this.ciToast('Snoozed — resurfaces Jul 16'); } };
    });

    const agentLedger = [
      { time:'02:14', tag:'Captured', text:'Structured 3 WhatsApp threads into logs — Sterling, Ravel, Alvarez.' },
      { time:'03:40', tag:'Sourced', text:'MLS sweep · 4 new matches for the Golden Beach buyer profile.' },
      { time:'05:02', tag:'Sent', text:'Chase sent to Title Co. — commitment due Jul 22.' },
      { time:'06:00', tag:'Prepared', text:'Morning brief assembled · 3 calls, 2 drafts ready for approval.' }
    ];

    // ---- Pipeline ----
    const goDeal = () => this.nav('deal');
    const openDeal = (c, stage) => this.setState(st => ({ prevScreen: st.screen, screen:'deal', dealId: c.name, dealCard: { ...c, stage: stage || c.stage }, dealView:'documents', dealTab:'activities', dlSent:false, dlMlsOpen:false, dlTourOpen:false, dlTourSent:false, mlsSel:{}, docSent:false, dlRelSel:null, dealActionsOpen:false }));
    // ---- per-deal record database ----
    const AUTO_DEALS = [
      ['Continuum South 3902','Denise Rocha','','buy','WARM','Collection · Buyers','Inbound · website','$6.8M','$204K',20,30,'PT','Steady →',0,'Jul 09','Qualify budget + timeline','Inbound buyer for the South tower mid-stack. Motivation stated as second home; budget and timeline still unverified — qualification call is the gate.'],
      ['Continuum North 1801','Peter Andersen','','buy','WARM','Collection · Buyers','Repeat client','$5.4M','$162K',30,35,'EN','Steady →',0,'Jul 09','Send parking + HOA docs','Repeat client sizing a pied-à-terre in the North tower. Practicalities first — parking count and HOA posture decide whether this advances.'],
      ['St Regis SI · Tower 2 PH · Sasson','Elie Sasson','','buy','HOT','Collection · Buyers · Pre-construction','Broker network','$29M','$870K',35,45,'EN','Strong ↑',2,'Jul 09','Convert reservation — contract out','Reservation holder on the Tower 2 penthouse. Developer paper is out; deposit schedule negotiated to 20/20/10. The conversion window closes with the next price release.'],
      ['Faena House 12B','Carolina Vidal','','buy','WARM','Collection · Buyers','Instagram DM','$9.2M','$276K',30,35,'ES','Steady →',1,'Jul 07','Send curated 3-unit set','Design-led buyer anchored on Faena House. Wants turnkey with provenance — a curated three-unit set is staged to test the 12B anchor against the market.'],
      ['Acqualina 4805','James Whitfield','','buy','WARM','Collection · Buyers','Open house','$10.6M','$318K',35,40,'EN','Steady →',1,'Jul 10','Follow up post-tour','Toured 4805 twice; likes the stack, hesitating on maintenance load. A same-line comp with lower carry is the persuasion lever.'],
      ['Bal Harbour 2201','Nadia Osman','','buy','WARM','Collection · Buyers','Referral · past client','$7.5M','$225K',35,40,'EN','Steady →',1,'Jul 08','Confirm financing letter','Financing-contingent buyer at the top of her band. Lender letter due this week decides whether the offer window opens or the search widens.'],
      ['Estates at Acqualina 5601','Farid Al-Rashid','','buy','HOT','Collection · Buyers','Family office intro','$16M','$480K',40,50,'EN','Strong ↑',1,'Jul 06','Confirm Sat 11am tour','Family-office principal flying in Saturday. Tour confirmed for 11am — decision cadence is fast once the principal sees the unit.'],
      ['Faena Penthouse','K. Volkov','','buy','HOT','Collection · Buyers','Attorney network','$34M','$1.02M',50,55,'EN','Strong ↑',3,'Jul 07','Await seller counter','Offer in at $31.5M against a $34M ask. Seller signaled a counter this week; spread is bridgeable if terms stay clean — cash, 30-day close.'],
      ['Zurich FO · Golden Beach','Anton Keller','keller','buy','HOT','Collection · Buyers','Direct · family office','$28M','$840K',60,65,'EN','Strong ↑',3,'Jul 07','Push principal call','Zurich family office in negotiation on the Golden Beach compound. Counter is on the table — a 15-minute principal call aligns the response before Wednesday.'],
      ['Sterling · Acqualina 4802','Robert Sterling','sterling','buy','HOT','Collection · Buyers · Cash','Past client','$11.4M','$342K',90,90,'EN','Strong ↑',4,'Jul 08','Inspection ends Jul 08','Under contract, cash, no financing contingency. Inspection window closes today — same-day summary, then the HOA package files.'],
      ['Continuum 2904 · Alvarez','Miguel Alvarez','','buy','HOT','Collection · Buyers','Referral · A. Bittencourt','$7.2M','$216K',100,100,'ES','Strong ↑',6,'Jul 18','Closing Jul 18','Won. Clear to close July 18 — walk-through scheduled, wire instructions verified by phone with the title company.'],
      ['Brickell Commercial','BR Capital LLC','','buy','WARM','Commercial','Cold outreach','$14M','$420K',40,25,'EN','At risk ↓',3,'Jul 11','Probability downgraded','Lost momentum after the anchor tenant renegotiated. Probability downgraded; file stays warm for the Q4 capital cycle.'],
      ['Fisher Island Villa','Estate of H. Brandt','','list','WARM','Collection · Sellers','Attorney network','$24M','$720K',15,25,'EN','Steady →',0,'Jul 10','Schedule listing consult','Estate sale on Fisher Island. Executor wants discretion and a single consult — valuation narrative decides whether A/CO takes the mandate.'],
      ['Indian Creek Estate','Villa Azul Trust','','list','WARM','Collection · Sellers · Trophy','Private referral','$52M','$1.56M',25,35,'EN','Strong ↑',1,'Jul 12','Prep valuation package','Trophy parcel on Indian Creek. Trust is valuation-sensitive — the package leads with land comps and dockage scarcity, not the improvements.'],
      ['Bal Harbour Listing','M. & C. Rosen','','list','WARM','Collection · Sellers','Past client','$9.8M','$294K',40,45,'EN','Steady →',2,'Jul 09','Sign exclusive agreement','Exclusive agreement out for signature. Sellers aligned on price strategy; marketing holds until the ink is dry.'],
      ['Golden Beach Villa','Bianca Ferraz','','list','HOT','Collection · Sellers','Referral · Bittencourt','$19M','$570K',55,60,'PT','Strong ↑',3,'Jul 11','Confirm stager schedule','Staging week. Stager confirmed for Thursday; photography follows Monday — launch narrative is “new to market” with a broker open in week one.'],
      ['Surfside Oceanfront','D. & P. Katz','','list','HOT','Collection · Sellers','Sphere','$12.5M','$375K',50,55,'EN','Strong ↑',4,'Jul 08','Launch campaign + shoot','Live to market this week. Shoot Tuesday, MLS Thursday, broker open the following Wednesday — buyer-match sweep already found four candidates in the book.'],
      ['Sunny Isles 3801','Yuki Nakamura','nakamura','list','WARM','Collection · Sellers','Past client','$8.2M','$246K',60,50,'EN','At risk ↓',5,'Jun 30','Re-forecast — close slipped','Buyer financing slipped past the June 30 target. Re-forecast to July 30; backup buyer from the book warmed as leverage.'],
      ['Portofino 2302 · Zanotti','Paolo Zanotti','zanotti','list','HOT','Collection · Sellers','Past client','$4.2M','$126K',100,100,'EN','Strong ↑',7,'—','Closed','Closed. Anniversary cadence armed — the relationship is the next listing.'],
      ['Brickell Loft','R. Duany','','list','WARM','Sellers','Inbound','$3.9M','$117K',30,20,'EN','At risk ↓',4,'Jun 20','Withdrawn','Withdrawn — seller chose to lease instead. Re-approach filed for January when the lease term ends.'],
      ['Continuum Rental 3A','Sofia Marchetti','','lease','WARM','Rentals','Website','$28K/mo','$16.8K',30,35,'EN','Steady →',1,'Jul 09','Qualify move-in date','Corporate relocation, flexible on floor but fixed on move-in. Date qualification decides which two units get shown.'],
      ['Setai Suite 1802','Leonard Okafor','','lease','WARM','Rentals','Referral','$22K/mo','$13.2K',25,30,'EN','Steady →',1,'Jul 10','Send 3 options','Seasonal tenant comparing Setai against two neighbors. Three-option set staged — the view premium is the deciding variable.'],
      ['Faena Residence 9B','Camille Laurent','','lease','HOT','Rentals','Broker network','$45K/mo','$27K',50,60,'EN','Strong ↑',2,'Jul 07','Schedule viewing','High-intent tenant, single property target. Viewing this week; application package pre-staged to compress the timeline.'],
      ['Bal Harbour 1801','Tom & Ana Becker','','lease','HOT','Rentals','Past client','$35K/mo','$21K',70,75,'PT','Strong ↑',4,'Jul 08','Draft lease','Terms agreed at $35K/mo, 24 months. Lease drafting today; landlord signature expected within 48 hours.']
    ];
    const TRACKS = { buy:['Qualified','Toured','Offer strategy','Offer & negotiation','Contract','Escrow · diligence','Closing'], list:['Consult','Valuation','Agreement','Prep & staging','Marketing','Offers','Contract','Closing'], lease:['Inquiry','Qualified','Showings','Application','Lease drafting','Signed'] };
    const FIRST = (n) => String(n||'').split(' ')[0].replace(/[^A-Za-zÀ-ÿ]/g,'') || 'there';
    const BLDG = (k) => String(k).split(/ ·|\d/)[0].trim();
    const mkDealSpec = (a) => {
      const [key, party, cid, track, heat, div, src, budget, gci, prob, probSug, lang, trend, stageIdx, due, next, narrative] = a;
      const bldg = BLDG(key), fn = FIRST(party), isB = track==='buy', isL = track==='list';
      const budgetNum = parseFloat(String(budget).replace(/[^0-9.]/g,''))||0;
      const typeLabel = isB ? 'Acquisition' : isL ? 'Listing' : 'Lease';
      const h = key.length % 3;
      const mls = isB
        ? [[bldg+' — same line, 4 floors up','$'+(budgetNum*1.06).toFixed(1)+'M','94%'],[bldg+' — B stack, higher floor','$'+(budgetNum*0.97).toFixed(1)+'M','91%'],['Corridor alternate · new to market','$'+(budgetNum*1.12).toFixed(1)+'M','87%']]
        : isL ? [['Matched buyer · '+['family office','private buyer','1031 exchange'][h]+' — from your book','pre-qualified','96%'],['Matched buyer · relocation mandate','proof of funds on file','90%'],['Broker-side inquiry · '+bldg+' watchlist','unverified','84%']]
        : [[bldg+' — comparable line, furnished','$'+budget,'93%'],['Neighbor tower · similar plan','−8% on ask','89%'],['Off-season alternate','−12% on ask','85%']];
      const plan = [
        [due, next, isB?'unblocks the next stage decision':'holds the launch cadence','Staged','#0D0D0D'],
        ['Jul 14', isB?'Follow-up — advance toward offer window':isL?'Marketing checkpoint — traffic vs. comp set':'Application package review','agent watches the response SLA','Planned','#B45309'],
        ['Jul 22', isB?'Offer strategy checkpoint with client':isL?'Price checkpoint — 14-day read':'Lease execution target','milestone · calendar hold placed','Milestone','#D0342C']
      ];
      const mem = [
        ['Jul 03','Note', (isB?'Interest confirmed — '+bldg+' shortlisted':'Mandate discussion — expectations aligned')],
        ['Jun 26', isB?'Call':'Meeting', (isB?'Budget frame '+budget+' discussed · timeline sketched':'Walkthrough — condition and positioning noted')],
        ['Jun 18','Origin','First contact — '+src.toLowerCase()]
      ];
      const rel = [ [party, isB?'Principal · buyer':(isL?'Principal · seller':'Tenant · principal'), cid], ['R. Weiss','Attorney',''], ['A/CO TC','Transaction coordinator',''] ];
      const crit = [ ['Due '+due, next, 'Wictor', true], ['Jul 14', plan[1][1], 'Wictor', false], ['Jul 22', plan[2][1], 'Wictor', false] ];
      const compA = isB ? bldg : key; const compB = ['Estates · Acqualina','Continuum South','Bal Harbour Tower'][h];
      const comp = { a: compA, b: compB, count: '2 in view', rows: [
        ['Ask', budget, '$'+(budgetNum*1.08).toFixed(1)+(String(budget).includes('/mo')?'K/mo':'M')],
        [isB||isL?'Interior':'Term','—','—'],['View','Direct ocean','Ocean / city'],
        [isL?'DOM':'Delivery', isL?'—':'Ready','45d'],['Client lean','Primary','Backup'] ] };
      const act = [
        ['Jul 04', isB?'Call':'Note','Advanced', false, mem[0][2]],
        ['Jun 28','WhatsApp','Neutral', false, 'Shared '+(isB?'building materials and floor plans':'positioning notes')+' — response '+(heat==='HOT'?'same day':'in 2 days')+'.'],
        ['Jun 20','Note','Neutral', true, narrative.split('. ')[0]+'.'],
        ['Jun 14','Origin','Neutral', false, 'Relationship opened — '+src.toLowerCase()+'.']
      ];
      const draftTxt = lang==='PT' ? [fn+' — tenho novidades sobre '+bldg+'. Posso te ligar hoje à tarde? Dois minutos.', fn+' — próximo passo: '+next.toLowerCase()+'. Confirmo até sexta?']
        : lang==='ES' ? [fn+' — tengo novedades sobre '+bldg+'. ¿Te llamo esta tarde? Dos minutos.', fn+' — próximo paso: '+next.toLowerCase()+'. ¿Confirmamos el viernes?']
        : [fn+' — quick update on '+bldg+'. Two minutes this afternoon?', fn+' — next step: '+next.toLowerCase()+'. Can we lock it by Friday?'];
      return { key, title: key.replace(' · ',' — '), party: party+' · '+typeLabel, partyName: party, cid, track, heat, div, src, budget, gci, prob, probSug, lang, trend, stageIdx, due, next, narrative, budgetNum,
        tiles: [ { label:'Momentum', value:String(Math.min(92, prob+((key.length*7)%22)+18)), unit:'/100', note: trend==='Strong ↑'?'Strong · trending up':trend==='At risk ↓'?'Soft · watch closely':'Steady · holding pace' },
          { label:'Stage Velocity', value:(3+(key.length%6))+'d', unit:'· avg 12d', note: heat==='HOT'?'Ahead of pace':'On pace' },
          { label:'Close Forecast', value:['Aug','Sep','Oct'][h], unit:'2026', note:'Re-forecast risk '+(trend==='At risk ↓'?'high':'low') },
          { label:'Competitive', value:'1 of 2', unit:'in view', note: (h===0?'Leading position':'Contested — watch pace') } ],
        momentum: [ ['Engagement', Math.min(95, prob+30)], ['Recency', 60+((key.length*3)%25)], ['Velocity', 50+((key.length*5)%30)] ],
        now: { label: heat+' · '+(isB?'BUYER':'MANDATE')+' · '+budget, head: next, draft: draftTxt[0], ch:'WhatsApp' },
        chip2: isB ? 'Tour planning — draft itinerary ›' : isL ? 'Launch checklist — review plan ›' : 'Application package — review ›',
        mlsChip: isB ? '2 new MLS matches for this search' : isL ? mls.length+' matched buyers in your book' : '3 comparable rentals live',
        mls, plan, mem, rel, crit, comp, act, drafts: [ ['Soft Touch', draftTxt[0]], ['Direct Advance', draftTxt[1]] ],
        assoc: { contacts: [[party, (isB?'Primary buyer':'Principal')+' · on file'], ['R. Weiss','Attorney']], companies: [], docs: [[bldg+' · working file','Updated Jul 03']] },
        drive: [ [key+' · working file.pdf','Edited Jul 03 · A. Arraes', true], [isB?'Comps · '+bldg+'.pdf':'Marketing plan · '+bldg+'.pdf','Edited Jun 27 · A. Arraes', false] ],
        docs: { price: budget, buyer: party, close: ['Aug 29, 2026','Sep 15, 2026','Oct 02, 2026'][h] },
        probText: 'Signals suggest momentum '+(probSug>prob?'above':'below')+' the stated {p}% — '+(probSug>prob?'recent engagement supports upside':'stall risk is real')+'. Consider '+probSug+'%.',
        hygiene: 'Hygiene · all checks pass' };
    };
    const dealDb = {};
    AUTO_DEALS.forEach(a => { dealDb[a[0]] = mkDealSpec(a); });
    // Rivage — the approved reference record, hand-built
    dealDb['Rivage PH-A · Marcelo C.'] = { ...mkDealSpec(['Rivage PH-A · Marcelo C.','Marcelo Carvalho','marcelo','buy','HOT','Collection · Buyers · Cash','Referral · A. Bittencourt','$18.5M','$555K',45,55,'PT','Strong ↑',3,'Jul 08','Send construction schedule','x']),
      title:'Rivage · PH-A', party:'Marcelo Carvalho · Acquisition',
      narrative:'Cash acquisition introduced via A. Bittencourt. Client toured PH-A with spouse over the weekend — strong response to layout and views, with a single open concern on construction timeline. Comparison set narrowed to Rivage vs Estates at Acqualina, with Rivage preferred. Momentum favors a second visit and a decisive close in Q3.',
      tiles: [ { label:'Momentum', value:'72', unit:'/100', note:'Strong · trending up' }, { label:'Stage Velocity', value:'3d', unit:'· avg 12d', note:'Ahead of pace' }, { label:'Close Forecast', value:'Sep', unit:'2026', note:'Re-forecast risk low' }, { label:'Competitive', value:'1 of 2', unit:'finalists', note:'Leading vs Estates' } ],
      momentum: [ ['Engagement',82], ['Recency',70], ['Velocity',64] ],
      now: { label:'HOT · OFFER STRATEGY APPROVED · $18.5M CEILING', head:'Send the construction schedule — confirm Saturday 11am second visit', draft:'Marcelo — consegui o cronograma de obra do PH-A e o schedule de depósitos. Sábado 11h para a segunda visita?', ch:'WhatsApp' },
      chip2:'Tour planning — draft itinerary ›', mlsChip:'2 new MLS matches for this search',
      mls: [ ['Rivage PH-B — same floorplate, east','$19.4M','95%'], ['Estates at Acqualina 5601 — finalist set','$16.0M','91%'], ['St Regis SI Tower 2 — pre-construction PH','$29.0M','83%'] ],
      plan: [ ['Jul 08','Send construction schedule + deposit terms','unblocks the second visit decision','Staged','#0D0D0D'], ['Jul 12','2nd visit follow-up — offer strategy window','ceiling approved at $18.5M cash','Planned','#B45309'], ['Jul 20','Contract target — developer paper','milestone · attorney pre-briefed','Milestone','#D0342C'], ['Jul 24','Deposit 1 wire window opens','20/20/10 schedule · escrow verified','Armed','#8F8F8F'] ],
      mem: [ ['Jul 05','Tour','Toured PH-A + PH-B — preferred the A stack, west terrace decisive'], ['Jul 03','Decision','Offer strategy approved · $18.5M ceiling, cash'], ['Jun 28','Doc','Proof of funds filed · J.P. Morgan — vault'], ['Jun 21','Origin','First contact — referral via A. Bittencourt'] ],
      rel: [ ['Marcelo Carvalho','Principal · buyer','marcelo'], ['Beatriz Carvalho','Spouse · co-decision',''], ['Sofia Duarte','Developer sales · listing side',''], ['R. Weiss','Attorney · buyer side',''], ['A/CO TC','Transaction coordinator',''] ],
      crit: [ ['Due Jul 08','Send developer construction schedule','Wictor', true], ['Jul 12','Confirm second visit — Saturday 11:00','Wictor', false], ['Aug 2026','Structure offer · anticipate 4.5% co-broke','Wictor', false] ],
      comp: { a:'Rivage PH-A', b:'Estates · Acqualina', count:'2 finalists', rows: [ ['Ask','$18.5M','$19.9M'], ['Interior','6,200 sf','5,850 sf'], ['View','Direct ocean','Ocean / city'], ['Delivery','Q4 2026','Move-in ready'], ['Client lean','Preferred','Backup'] ] },
      act: [ ['Jul 04','Showing','Advanced', false,'Toured PH-A with client and spouse. Strong response to layout and views; spouse raised construction timeline concern.'], ['Jul 02','WhatsApp','Neutral', false,'Shared developer brochure and finish schedule ahead of the visit.'], ['Jun 28','Call','Advanced', false,'Confirmed budget ceiling $18.5M; financing not required — cash acquisition.'], ['Jun 20','Note','Neutral', true,'Client comparing Rivage vs Estates at Acqualina; prefers Rivage views and floorplate.'], ['Jun 14','Note','Neutral', false,'Referral introduction via A. Bittencourt. Long-standing relationship, high intent.'] ],
      drafts: [ ['Soft Touch','Marcelo, espero que o fim de semana tenha sido ótimo. Fico à disposição para qualquer dúvida sobre a PH-A — sem pressa.'], ['Direct Advance','Marcelo, já tenho a agenda de obra da incorporadora. Podemos marcar a segunda visita no sábado às 11h para você e sua esposa reverem o cronograma?'] ],
      assoc: { contacts: [['Marcelo Carvalho','Primary buyer · +1 305 ···'], ['A. Bittencourt','Referrer · Prior client']], companies: [['Carvalho Family Office','São Paulo · Private capital']], docs: [['Offer letter · draft','Updated Jul 03'], ['Developer construction schedule','Pending send']] },
      drive: [ ['Offer letter · draft.pdf','Edited Jul 03 · A. Arraes', true], ['Rivage PH-A · floor plans.pdf','Edited Jun 28 · Developer', false], ['Comps · Rivage District.pdf','Edited Jun 20 · A. Arraes', false] ],
      docs: { price:'$17,900,000', buyer:'MC Holdings LLC (FL) · Marcelo Carvalho, Mgr', close:'Aug 29, 2026' },
      probText:'Notes suggest momentum above the stated {p}% — recent showing advanced, spouse concern addressable. Consider 55%.' };
    const TOT = (() => {
      const parseM = (s) => { s = String(s); if (s.includes('/mo')) return 0; const n = parseFloat(s.replace(/[^0-9.]/g,'')) || 0; return s.includes('K') ? n / 1000 : n; };
      const act = Object.values(dealDb).filter(s => s.prob > 0 && s.prob < 100 && !/withdrawn/i.test(s.next || ''));
      const vol = act.reduce((n,s) => n + parseM(s.budget), 0);
      const wvol = act.reduce((n,s) => n + parseM(s.budget) * s.prob / 100, 0);
      const gci = act.reduce((n,s) => n + parseM(s.gci), 0);
      const wgci = act.reduce((n,s) => n + parseM(s.gci) * s.prob / 100, 0);
      const hot = act.filter(s => s.heat === 'HOT').length;
      return { n: act.length, volStr: '$' + Math.round(vol) + 'M', wvolStr: '$' + Math.round(wvol) + 'M', gciStr: '$' + gci.toFixed(1) + 'M', wgciStr: '$' + wgci.toFixed(2) + 'M', hot };
    })();
    kpis[0].value = TOT.volStr; kpis[1].value = TOT.wvolStr; kpis[2].value = TOT.gciStr; kpis[3].value = TOT.wgciStr; kpis[4].value = String(TOT.hot);
    heroSub[0].value = String(TOT.hot); heroSub[0].sub = 'of ' + TOT.n;
    moneyStrip[0].value = TOT.volStr; moneyStrip[0].sub = TOT.n + ' open'; moneyStrip[1].value = TOT.wgciStr;
    const dealSpecFromCard = (c) => mkDealSpec([c.name, (c.opp||'Principal').replace(/Buyer.*|Seller.*|Tenant.*|Lease.*/,'').trim() || 'Principal · '+(c.opp||''), '', /seller|listing|staging|marketing/i.test((c.opp||'')+(c.stage||''))?'list':(/tenant|lease|\/mo/i.test((c.opp||'')+String(c.budget))?'lease':'buy'), c.status||'WARM', 'Collection', 'Pipeline', c.budget||'—', '$'+Math.round((c.weightedNum||0)*30)+'K', c.probNum||30, Math.min(95,(c.probNum||30)+10), 'EN', 'Steady →', 1, c.due||'Jul 12', c.next||'Advance next step', (c.opp||'Opportunity')+' — record initialized from the board card; the agent enriches it as activity lands.']);
    const curDealKey = this.state.dealId || 'Rivage PH-A · Marcelo C.';
    const dealSpec = dealDb[curDealKey] || dealSpecFromCard(this.state.dealCard || { name: curDealKey });
    const dlProbVal = dealSpec.probSug ?? dealSpec.prob; // agent-computed — health · pace · stage (no manual override)
    const goTc = () => this.nav('tc');

    // ---- Settings ----
    const cadState = this.state.cadence || { hot:3, warm:7, active:7, past:90, network:90 };
    const autoState = this.state.autonomy || { capture:true, hygiene:true, drafts:true, send:false, status:false, chase:true };
    const setProfile = [
      { label:'Name', value:'Wictor Arraes' },
      { label:'Role', value:'Principal' },
      { label:'Brokerage', value:'ARRAES & CO' },
      { label:'License', value:'FL SL3521487' },
      { label:'Phone · WhatsApp', value:'+1 305 ··· ····' },
      { label:'Email', value:'wictor@arraes.com' },
      { label:'Draft languages', value:'PT · EN · ES' },
      { label:'Signature', value:'W. Arraes · A/CO' }
    ];
    const cadDefs = [
      ['hot','HOT','Active buyers/sellers in decision window', '#0D0D0D'],
      ['warm','WARM','Qualified, not yet in motion', '#5D5D5D'],
      ['active','ACTIVE','Clients in transaction — status pulse', '#0D0D0D'],
      ['past','PAST','Closed relationships — referral capital', '#8F8F8F'],
      ['network','NETWORK','Vendors and referral partners', '#8F8F8F']
    ];
    const setCadence = cadDefs.map(([key,label,desc,dot]) => ({
      label, desc, dot, days: cadState[key],
      onChange: (e)=>{ const v = parseInt(e.target.value)||1; this.setState(s=>({cadence:{...(s.cadence||cadState), [key]:v}})); }
    }));
    const autoDefs = [
      ['capture','Capture & structure communication','WhatsApp, email and voice memos become logged activities on the right record'],
      ['hygiene','Data hygiene','Deduplicate, fix fields, reset clocks on inbound touches'],
      ['drafts','Prepare drafts','Messages, briefs and documents — always queued for approval'],
      ['send','Send routine messages','Confirmations and reminders go out without approval'],
      ['status','Change lead status','Upgrades/downgrades applied directly instead of proposed'],
      ['chase','Chase vendors','Follow up on overdue milestones with vendors autonomously']
    ];
    const setAutonomy = autoDefs.map(([key,label,desc]) => {
      const on = !!autoState[key];
      return { label, desc,
        state: on ? 'Autonomous' : 'Ask first',
        stateColor: on ? '#0D0D0D' : '#8F8F8F',
        trackStyle:`width:30px;height:14px;flex:none;border-radius:999px;border:0.5px solid ${on?'#10A37F':'#B4B4B4'};background:${on?'#10A37F':'transparent'};display:flex;align-items:center;justify-content:${on?'flex-end':'flex-start'};padding:1px;transition:all 150ms;`,
        knobStyle:`width:10px;height:10px;border-radius:50%;background:${on?'#FFFFFF':'#8F8F8F'};transition:all 150ms;`,
        onToggle: ()=>this.setState(s=>({autonomy:{...(s.autonomy||autoState), [key]:!on}}))
      };
    });
    // editable settings fields (dropdown/input pattern)
    const SV = this.state.setVals || {};
    const mkF = (id,label,value,opts) => ({ label,
      value: SV[id] !== undefined ? SV[id] : value,
      isSelect: !!opts, isText: !opts, opts: opts || [],
      onChange: (e)=>{ const v=e.target.value; this.setState(s=>({setVals:{...(s.setVals||{}),[id]:v}})); }
    });
    const setEcon = [
      mkF('e1','Standard commission','5.0%',['4.0%','4.5%','5.0%','5.5%','6.0%']),
      mkF('e2','Co-broke default split','50 / 50',['50 / 50','60 / 40','70 / 30']),
      mkF('e3','Referral fee out','25%',['20%','25%','30%','35%']),
      mkF('e4','Probability bands','HOT 60 · WARM 30 · NEW 10')
    ];
    // connectors · Google OAuth + WhatsApp Cloud API
    const connState = { google:true, wa:true, docusign:false, mls:true, ...(this.state.connState||{}) };
    const toggleConn = (k) => this.setState(s => ({ connState: { ...connState, ...(s.connState||{}), [k]: !connState[k] } }));
    const connectors = [
      { id:'google', name:'Google Workspace', kind:'One OAuth · wictor@arraes.com', on: connState.google,
        scopes:['Gmail — threads logged to records, attachments filed','Calendar — showings + D-1 confirmations','Drive — deal folders auto-created','Contacts — two-way sync · new contacts triaged before entering the pipeline'] },
      { id:'wa', name:'WhatsApp Business', kind:'Cloud API · +1 305 ··· · Meta verified', on: connState.wa,
        scopes:['Full capture — every thread logged','Drafts sent on approval · your voice','Transaction groups — deadlines extracted'] }
    ].map(c => ({ ...c,
      status: c.on ? 'Connected' : 'Disconnected',
      statusColor: c.on ? '#0D0D0D' : '#D0342C',
      dot: c.on ? '#0D0D0D' : '#D0342C',
      btnLabel: c.on ? 'Disconnect' : 'Connect',
      onToggle: () => toggleConn(c.id),
      btnStyle: c.on
        ? `background:transparent;border:1px solid #E3E3E3;padding:7px 14px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:#5D5D5D;cursor:pointer;white-space:nowrap;transition:all 150ms;`
        : `background:#E9E8E4;border:1px solid #E0DFDA;border-radius:999px;padding:7px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:#0D0D0D;cursor:pointer;white-space:nowrap;transition:opacity 150ms;`
    }));
    const setIntegrations = [
      { name:'DocuSign', on: connState.docusign, id:'docusign', desc:'Primary e-sign rail — embedded prepare & send · signed copy auto-files, milestones update' },
      { name:'Dropbox Sign', on: connState.dropbox === true, id:'dropbox', desc:'Alternative e-sign rail — same embedded send + webhook return · lower cost per envelope' },
      { name:'Meta · Facebook & Instagram', on: connState.meta !== false, id:'meta', desc:'Marketing hub publishing — IG/FB posts go out on approval · audience metrics and comments flow in' },
      { name:'MLS · Bridge API', on: connState.mls, id:'mls', desc:'Match sweeps against client profiles · comps on demand' }
    ].map(i => ({ ...i,
      status: i.on ? 'Connected' : 'Not connected',
      dot: i.on ? '#0D0D0D' : '#D0342C', dotColor: i.on ? '#0D0D0D' : '#D0342C',
      btnLabel: i.on ? 'Disconnect' : 'Connect',
      onToggle: () => toggleConn(i.id)
    }));

    // ---- Settings · extended customization ----
    const notifState = this.state.notif || { brief:true, digest:true, quiet:true, escalate:true, weekly:true, t3:true };
    const notifDefs = [
      ['brief','Morning brief · 6:00 AM','Daily command brief via WhatsApp before the day starts'],
      ['digest','Midday digest · 1:00 PM','What moved, what stalled, what arrived — one message'],
      ['t3','T-3 milestone alerts','Any transaction milestone entering the 3-day window'],
      ['escalate','Critical escalation','Deal at risk or SLA broken — immediate ping, bypasses quiet hours'],
      ['weekly','Sunday review · 6:00 PM','Weekly movement narrative + next week forecast'],
      ['quiet','Quiet hours · 22:00–07:00','Everything non-critical holds until morning']
    ];
    const setNotifs = notifDefs.map(([key,label,desc]) => {
      const on = !!notifState[key];
      return { label, desc,
        state: on ? 'On' : 'Off', stateColor: on ? '#0D0D0D' : '#8F8F8F',
        trackStyle:`width:30px;height:14px;flex:none;border-radius:999px;border:0.5px solid ${on?'#10A37F':'#B4B4B4'};background:${on?'#10A37F':'transparent'};display:flex;align-items:center;justify-content:${on?'flex-end':'flex-start'};padding:1px;transition:all 150ms;`,
        knobStyle:`width:10px;height:10px;border-radius:50%;background:${on?'#FFFFFF':'#8F8F8F'};transition:all 150ms;`,
        onToggle: ()=>this.setState(s=>({notif:{...(s.notif||notifState), [key]:!on}}))
      };
    });
    const setScoring = [
      { label:'Health Score weights', value:'Coverage 30 · Velocity 25 · Aging 25 · Hygiene 20', note:'How the 82/100 is composed — tune what "healthy" means for your book' },
      { label:'Momentum factors', value:'Engagement 40 · Recency 35 · Velocity 25', note:'Per-deal momentum used in probability-arbitrage suggestions' },
      { label:'Stale thresholds', value:'HOT 14d · WARM 30d · Listing 21d', note:'Days without touch before a record surfaces in Risk Radar' },
      { label:'Forecast weighting', value:'Probability × GCI · month of expected close', note:'What the GCI Forecast bars are built from' },
      { label:'Queue ranking', value:'Urgency × Weighted GCI', note:'Order of Touch Today — value-weighted, not just chronological' }
    ];
    const setVoice = [
      mkF('v1','Draft tone','Sober · direct',['Sober · direct','Warm · personal','Formal · institutional']),
      mkF('v2','Aphorism line','On · rotates weekly',['On · rotates weekly','On · fixed','Off']),
      mkF('v3','Templates','14 active · manage library'),
      mkF('v4','Per-contact language','Auto-detect from thread',['Auto-detect from thread','Always PT','Always EN','Ask per contact']),
      mkF('v5','Signature block','Short (WhatsApp) · Full (email)',['Short (WhatsApp) · Full (email)','Always short','Always full']),
      mkF('v6','Forbidden words','"stunning" · "dream" · "exclusive" · "!"')
    ];
    const setPrivacy = [
      { label:'Private vault', value:'Commission economics + sensitive notes · principal only' },
      { label:'Audit log', value:'Every agent action · 7-year retention' },
      { label:'Agent rollback', value:'Any automated change reversible for 30 days' },
      { label:'Client data export', value:'Full record on request · LGPD / CCPA' },
      { label:'Backups', value:'Daily · encrypted · 90-day history' },
      { label:'Session security', value:'2FA + device allowlist' }
    ];

    // ---- Settings · day-to-day flexibility ----
    const rhythmState = this.state.rhythm || { focus:true, cap:true, defer:true, weekend:false, vacation:false };
    const rhythmDefs = [
      ['focus','Focus block · 9:00–11:00','No pings, no queue additions — calls and tours only'],
      ['cap','Daily queue cap · 7 touches','Agent trims the queue to what a day actually holds; the rest rolls over ranked'],
      ['defer','Smart deferral','Non-urgent items auto-reschedule around showings and closings'],
      ['weekend','Weekend mode','Saturday/Sunday queue reduced to HOT + transaction-critical only'],
      ['vacation','Away mode','Agent holds drafts, extends cadences, escalates only deal-critical items']
    ];
    const setRhythm = rhythmDefs.map(([key,label,desc]) => {
      const on = !!rhythmState[key];
      return { label, desc,
        state: on ? 'On' : 'Off', stateColor: on ? '#0D0D0D' : '#8F8F8F',
        trackStyle:`width:30px;height:14px;flex:none;border-radius:999px;border:0.5px solid ${on?'#10A37F':'#B4B4B4'};background:${on?'#10A37F':'transparent'};display:flex;align-items:center;justify-content:${on?'flex-end':'flex-start'};padding:1px;transition:all 150ms;`,
        knobStyle:`width:10px;height:10px;border-radius:50%;background:${on?'#FFFFFF':'#8F8F8F'};transition:all 150ms;`,
        onToggle: ()=>this.setState(s=>({rhythm:{...(s.rhythm||rhythmState), [key]:!on}}))
      };
    });
    // Pipeline & Stages — full structured editor
    const defPipeOrder = ['Purchases','Listings','Rentals','Investments'];
    const defPipeData = {
      'Purchases':[{n:'Prospecting',p:10},{n:'Warm',p:30},{n:'Hot',p:60},{n:'Under Contract',p:90},{n:'Won',p:100},{n:'Lost',p:0}],
      'Listings':[{n:'Prospecting',p:10},{n:'Contract',p:40},{n:'Staging',p:60},{n:'Marketing',p:70},{n:'Won',p:100},{n:'Lost',p:0}],
      'Rentals':[{n:'Prospecting',p:10},{n:'Showings',p:40},{n:'Contract',p:80},{n:'Won',p:100},{n:'Lost',p:0}],
      'Investments':[{n:'Prospecting',p:10},{n:'Mandate',p:30},{n:'Presented',p:45},{n:'Underwriting',p:65},{n:'Committed',p:85},{n:'Won',p:100}]
    };
    const pOrder = this.state.pipesOrder || defPipeOrder;
    const pData = this.state.pipesData || defPipeData;
    let pSel = this.state.pipeEditSel || pOrder[0];
    if (!pOrder.includes(pSel)) pSel = pOrder[0];
    const pStages = pData[pSel] || [];
    const pCommit = (order, data, sel) => this.setState({ pipesOrder: order, pipesData: data, pipeEditSel: sel });
    const pipeTabsEdit = pOrder.map(name => {
      const active = name === pSel;
      return { name, canDel: pOrder.length > 1,
        onClick: ()=>this.setState({pipeEditSel:name}),
        onDel: (e)=>{ e.stopPropagation(); const order = pOrder.filter(x=>x!==name); const data = {...pData}; delete data[name]; pCommit(order, data, order[0]); },
        style:`display:flex;align-items:center;gap:8px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?400:300};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${active?'#0D0D0D':'#8F8F8F'};padding-bottom:7px;border-bottom:1px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const addPipe = () => {
      let name = 'New Pipeline', i = 2;
      while (pOrder.includes(name)) name = 'New Pipeline ' + (i++);
      pCommit([...pOrder, name], { ...pData, [name]:[{n:'Prospecting',p:10},{n:'Won',p:100},{n:'Lost',p:0}] }, name);
    };
    const renamePipe = (e) => {
      const nv = e.target.value;
      if (!nv || (pOrder.includes(nv) && nv !== pSel)) return;
      const order = pOrder.map(x => x===pSel ? nv : x);
      const data = {}; pOrder.forEach(x => { data[x===pSel?nv:x] = pData[x]; });
      pCommit(order, data, nv);
    };
    const setStageArr = (arr) => pCommit(pOrder, { ...pData, [pSel]: arr }, pSel);
    const stageRows = pStages.map((s, i) => ({
      idx: String(i+1).padStart(2,'0'), name: s.n, prob: s.p,
      isFirst: i===0, isLast: i===pStages.length-1,
      onName: (e)=>{ const a=[...pStages]; a[i]={...a[i], n:e.target.value}; setStageArr(a); },
      onProb: (e)=>{ const a=[...pStages]; a[i]={...a[i], p: Math.max(0, Math.min(100, parseInt(e.target.value)||0))}; setStageArr(a); },
      onUp: ()=>{ if(i===0) return; const a=[...pStages]; [a[i-1],a[i]]=[a[i],a[i-1]]; setStageArr(a); },
      onDown: ()=>{ if(i===pStages.length-1) return; const a=[...pStages]; [a[i],a[i+1]]=[a[i+1],a[i]]; setStageArr(a); },
      onDel: ()=>{ setStageArr(pStages.filter((_,x)=>x!==i)); },
      upColor: i===0 ? '#E3E3E3' : '#8F8F8F',
      downColor: i===pStages.length-1 ? '#E3E3E3' : '#8F8F8F'
    }));
    const addStage = () => setStageArr([...pStages, { n:'New Stage', p:50 }]);
    const pipeSelName = pSel;
    const setStages = [
      mkF('s1','Stage probabilities','Prospecting 10 · Warm 30 · Hot 60 · UC 90'),
      mkF('s2','Auto-advance rules','Documented events only',['Documented events only','Agent may move · logged','Manual only']),
      mkF('s3','Lost reasons','Price · Timing · Inventory · Cooled · Other broker'),
      mkF('s4','Milestone templates','Cash 9 · Financed 12 · Pre-construction 6')
    ];
    const setMls = [
      mkF('m0','Match source','IDX · arraescollection.com',['IDX · arraescollection.com','MIAMI MLS · RESO API (when live)','Manual entry only']),
      mkF('m1','Sweep frequency','Nightly',['Nightly','Twice daily','Weekly','Manual only']),
      mkF('m2','Match threshold','≥ 80% fit',['≥ 70% fit','≥ 80% fit','≥ 90% fit']),
      mkF('m3','Price tolerance','+10% above budget',['+5% above budget','+10% above budget','+15% above budget','Strict']),
      mkF('m4','Off-market sources','Network · expired · FSBO'),
      mkF('m5','Auto-suggest to client','Off — always via approval',['Off — always via approval','On — curated matches only']),
      mkF('m6','Comp radius','Same building · 0.5 mi fallback',['Same building · 0.5 mi fallback','0.5 mi','1 mi','Neighborhood'])
    ];
    const setDisplay = [
      mkF('d1','Landing screen','Command Center',['Command Center','Contacts · Queue','Pipeline','Activities']),
      mkF('d2','Currency · units','USD · sq ft',['USD · sq ft','USD · m²','BRL · m²']),
      mkF('d3','Timezone','America/New_York (EST)',['America/New_York (EST)','America/Sao_Paulo (BRT)','Europe/Zurich (CET)']),
      mkF('d4','Number format','$18.5M · compact',['$18.5M · compact','$18,500,000 · full']),
      mkF('d5','Density','Comfortable',['Comfortable','Compact']),
      mkF('d6','Week starts','Monday',['Monday','Sunday'])
    ];

    // ---- Network (vendors & partners) ----
    const netKpis = [
      { label:'Active Vendors', value:'14' },
      { label:'Referral Partners', value:'8' },
      { label:'Referrals YTD · In / Out', value:'11 / 6' },
      { label:'GCI via Network', value:'$2.3M' }
    ];
    const vendorHead = ['Vendor','Role','Deals Together','On-Time','Avg Response','SLA Signal','Cadence'];
    const vendorRows = [
      { name:'M. Delgado', role:'RE Attorney', deals:'9', ontime:'96%', resp:'2h', sla:'On pattern', slaColor:'#5D5D5D', cad:'Lunch · due this quarter' },
      { name:'Coastal Title Co.', role:'Title', deals:'7', ontime:'71%', resp:'26h', sla:'Slipping · day 7 of usual 5', slaColor:'#D0342C', cad:'—' },
      { name:'S. Whitfield', role:'Transaction Coord.', deals:'12', ontime:'98%', resp:'1h', sla:'On pattern', slaColor:'#5D5D5D', cad:'Quarterly check-in · Aug' },
      { name:'ProInspect Miami', role:'Inspector', deals:'6', ontime:'88%', resp:'5h', sla:'On pattern', slaColor:'#5D5D5D', cad:'—' },
      { name:'R. Katz', role:'Co-broke Agent', deals:'4', ontime:'—', resp:'3h', sla:'Compatible book · off-market channel', slaColor:'#5D5D5D', cad:'Coffee · due Jul' }
    ];
    const recipHead = ['Partner','Sent to You','You Sent','Balance','Suggested Move'];
    const recipRows = [
      { name:'A. Bittencourt', got:'7 referrals · $1.2M GCI', gave:'2 introductions', bal:'You owe', balColor:'#D0342C', move:'Send the Zurich FO attorney intro + lunch in São Paulo' },
      { name:'R. Katz · Co-broke', got:'2 buyers', gave:'2 listings', bal:'Even', balColor:'#5D5D5D', move:'Propose off-market sourcing sweep together' },
      { name:'M. Delgado', got:'1 referral', gave:'4 clients sent', bal:'Owes you', balColor:'#5D5D5D', move:'Natural ask: estate-planning clients relocating to FL' },
      { name:'Private Banker · Itaú Miami', got:'1 UHNW intro', gave:'0', bal:'You owe', balColor:'#D0342C', move:'Reciprocate: introduce the Duarte family' }
    ];
    const netCadence = [
      { when:'Jul', who:'R. Katz', what:'Coffee — explore off-market inventory swap', status:'Due', statusColor:'#D0342C' },
      { when:'Aug', who:'S. Whitfield', what:'Quarterly check-in + volume forecast for H2', status:'Scheduled', statusColor:'#5D5D5D' },
      { when:'Sep', who:'M. Delgado', what:'Lunch — 3 deals closed together this year', status:'Proposed', statusColor:'#5D5D5D' },
      { when:'Sep', who:'A. Bittencourt', what:'São Paulo trip — referral dinner', status:'Proposed', statusColor:'#5D5D5D' }
    ];

    // ---- Command bar (⌘K) ----
    const cmdQuery = this.state.cmdQuery || '';
    const cmdDefs = [
      { label:'Go to Welcome', hint:'navigate', run:()=>{ this.nav('command'); this.setState({cmdOpen:false}); } },
      { label:'Go to Contacts · Touch Today queue', hint:'navigate', run:()=>{ this.setState({screen:'contacts', contactView:'queue', cmdOpen:false}); } },
      { label:'Go to Pipeline · In Contract', hint:'navigate', run:()=>{ this.setState({screen:'pipeline', pipeTab:'tx', cmdOpen:false}); } },
      { label:'Go to Pipeline · Closed ledger', hint:'navigate', run:()=>{ this.setState({screen:'pipeline', pipeTab:'closed', cmdOpen:false}); } },
      { label:'Open Marcelo C. — Rivage PH-A', hint:'deal', run:()=>{ this.nav('deal'); this.setState({cmdOpen:false}); } },
      { label:'Log call · Marcelo — wants 2nd visit Saturday', hint:'agent · structures the log', run:()=>{ this.setState({cmdDone:'Logged · Call · Marcelo Carvalho · outcome Advanced · next action “Confirm Saturday 11:00” created.'}); } },
      { label:'How much closes in September?', hint:'agent · forecast', run:()=>{ this.setState({cmdDone:'September forecast: $4.40M weighted GCI across 4 expected closings — Rivage PH-A, Golden Beach, Faena PH, Indian Creek.'}); } },
      { label:'Draft WhatsApp · Zurich FO follow-up', hint:'agent · prepares draft', run:()=>{ this.setState({cmdDone:'Draft prepared (PT) · queued in Needs Your Decision for approval.'}); } },
      ...[['Log activity','log'],['New task','task'],['New appointment','appt'],['New comment','note'],['New contact','contact'],['New deal','deal']].map(([n,t]) => (
        { label:n, hint:'create · N '+(t==='log'?'L':t==='task'?'T':t==='appt'?'A':t==='note'?'N':t==='contact'?'C':'D'), run:()=>{ this.setState({cmdOpen:false, qcOpen:true, qcType:t}); } })),
      ...[['Marcelo Carvalho','marcelo'],['Anton Keller · Zurich FO','keller'],['Robert Sterling','sterling'],['Ana Bittencourt','bittencourt'],['Kenji Nakamura','nakamura'],['Elena Ravel','ravel'],['Carlos Alvarez','alvarez'],['Valdemar Zanotti','zanotti']].map(([n,id]) => (
        { label:'Open contact · '+n, hint:'contact', run:()=>{ this.openContact(id); this.setState({cmdOpen:false}); } })),
      ...[['Rivage PH-A · Marcelo','deal'],['Sterling — Acqualina 4802 · TC','tc']].map(([n,scr]) => (
        { label:'Open deal · '+n, hint:'deal', run:()=>{ this.nav(scr); this.setState({cmdOpen:false}); } })),
      ...Object.keys(dealDb).filter(k => k !== 'Rivage PH-A · Marcelo C.').map(k => (
        { label:'Open deal · ' + k, hint: dealDb[k].heat === 'HOT' ? 'deal record · hot' : 'deal record', run:()=>{ openDeal({ name: k }); this.setState({cmdOpen:false}); } }))
    ];
    const cmdResults = cmdDefs
      .filter(c => !cmdQuery || c.label.toLowerCase().includes(cmdQuery.toLowerCase()))
      .slice(0,9)
      .map((c,i) => ({ ...c, onClick:()=>c.run(),
        style:`display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:13px 20px;border-bottom:1px solid #E3E3E3;cursor:pointer;transition:background 150ms;${i===(this.state.cmdSel||0)?'background:rgba(255,255,255,0.55);':''}` }));
    // ---- Quick create (N-chord) ----
    const qcNames = ['Marcelo Carvalho','Anton Keller · Zurich FO','Robert Sterling','Ana Bittencourt','Kenji Nakamura','Elena Ravel','Carlos Alvarez','Valdemar Zanotti'];
    const qcDefs = {
      log:    { title:'Log Activity', save:'Logged · agent structures the entry', fields:[
        {l:'Type',k:'select',o:['Call','WhatsApp','Email','Showing','Note']},
        {l:'Contact',k:'select',o:qcNames},
        {l:'Outcome',k:'select',o:['Advanced','Neutral','Cooled']},
        {l:'What happened',k:'textarea',p:'Plain words — the agent extracts next action, dates and outcome'}] },
      task:   { title:'New Task', save:'Task created · scheduled in Next Actions', fields:[
        {l:'Task',k:'text',p:'e.g. Send developer schedule'},
        {l:'Related to',k:'select',o:qcNames},
        {l:'Due',k:'select',o:['Today','Tomorrow','This week','Next week','Custom date']}] },
      appt:   { title:'New Appointment', save:'Appointment set · calendar + D-1 confirmation', fields:[
        {l:'Title',k:'text',p:'e.g. 2nd visit · Rivage PH-A'},
        {l:'With',k:'select',o:qcNames},
        {l:'When',k:'text',p:'Sat · Jul 11 · 11:00'},
        {l:'Location',k:'text',p:'Rivage Sales Gallery'}] },
      note:   { title:'New Comment', save:'Comment pinned to the record', fields:[
        {l:'On record',k:'select',o:qcNames},
        {l:'Comment',k:'textarea',p:'Visible only to you'}] },
      contact:{ title:'New Contact', save:'Contact created · enrichment sweep queued', fields:[
        {l:'Name',k:'text',p:'Full name'},
        {l:'Phone · WhatsApp',k:'text',p:'+1 ···'},
        {l:'Status',k:'select',o:['NEW','WARM','HOT','SPHERE']},
        {l:'Source',k:'select',o:['Referral','Inbound','Event','Cold','Sphere']}] },
      deal:   { title:'New Deal', save:'Deal created · placed in Prospecting', fields:[
        {l:'Contact',k:'select',o:qcNames},
        {l:'Pipeline',k:'select',o:['Purchases','Listings','Rentals','Investments']},
        {l:'Opportunity',k:'text',p:'e.g. Rivage PH-B acquisition'},
        {l:'Budget',k:'text',p:'$'}] }
    };
    const qcType = this.state.qcType || 'log';
    const qcDef = qcDefs[qcType];
    const qcVals = {
      qcOpen: !!this.state.qcOpen,
      qcTitle: qcDef.title,
      qcFields: qcDef.fields.map(f => ({ ...f, isText: f.k==='text', isSelect: f.k==='select', isArea: f.k==='textarea', p: f.p||'', o: f.o||[] })),
      qcTabs: [['log','Log'],['task','Task'],['appt','Appointment'],['note','Comment'],['contact','Contact'],['deal','Deal']].map(([id,label]) => ({ label,
        onClick: ()=>this.setState({qcType:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${qcType===id?400:300};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${qcType===id?'#0D0D0D':'#8F8F8F'};padding-bottom:6px;border-bottom:1px solid ${qcType===id?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;` })),
      closeQc: ()=>this.setState({qcOpen:false}),
      saveQc: ()=>{ this.setState({qcOpen:false, qcToast:qcDef.save}); clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2600); },
      qcToast: this.state.qcToast || '',
      hasQcToast: !!this.state.qcToast,
      openQc: ()=>this.setState({qcOpen:true, qcType:'log'})
    };

    const cmdVals = {
      shortcutsOpen: !!this.state.shortcutsOpen,
      closeShortcuts: ()=>this.setState({shortcutsOpen:false}),
      openShortcuts: ()=>this.setState({shortcutsOpen:true, cmdOpen:false}),
      shortcutGroups: [
        { label:'Navigate · press G then…', keys:[{k:'G C',d:'Welcome'},{k:'G O',d:'Contacts'},{k:'G P',d:'Pipeline'},{k:'G N',d:'Contacts · Network segment'},{k:'G A',d:'Activities'},{k:'G I',d:'Intelligence'},{k:'G X',d:'Next Actions'},{k:'G R',d:'Reports'},{k:'G S',d:'Settings'},{k:'G D',d:'Deal · last open'},{k:'G T',d:'Transaction'},{k:'G G',d:'Back · previous screen'}] },
        { label:'Queue · Touch Today', keys:[{k:'J / K',d:'Move down / up'},{k:'L',d:'Log touch on selected'},{k:'S',d:'Snooze selected · 1d'}] },
        { label:'Tasks · Next Actions', keys:[{k:'J / K',d:'Move down / up'},{k:'L',d:'Complete selected'},{k:'S',d:'Push selected · +1d'}] },
        { label:'Create · press N then…', keys:[{k:'N L',d:'Log activity'},{k:'N T',d:'New task'},{k:'N A',d:'New appointment'},{k:'N N',d:'New comment'},{k:'N C',d:'New contact'},{k:'N D',d:'New deal'}] },
        { label:'System', keys:[{k:'⌘Z',d:'Undo — last action'},{k:'⌘K',d:'Command bar · ask anything'},{k:'/',d:'Command bar · quick open'},{k:'↑↓ · ↵',d:'Navigate + run in ⌘K'},{k:'?',d:'This panel'},{k:'ESC',d:'Close any overlay'}] }
      ],
      cmdOpen: !!this.state.cmdOpen,
      cmdQuery,
      cmdDone: this.state.cmdDone || '',
      hasCmdDone: !!this.state.cmdDone,
      setCmdQuery: (e)=>this.setState({cmdQuery:e.target.value, cmdDone:null, cmdSel:0}),
      cmdKeyDown: (e)=>{
        if (e.key==='ArrowDown') { e.preventDefault(); this.setState(s=>({cmdSel: Math.min((s.cmdSel||0)+1, cmdResults.length-1)})); }
        else if (e.key==='ArrowUp') { e.preventDefault(); this.setState(s=>({cmdSel: Math.max((s.cmdSel||0)-1, 0)})); }
        else if (e.key==='Enter') { const r = cmdResults[this.state.cmdSel||0] || cmdResults[0]; if (r) { r.run(); } else if ((cmdQuery||'').trim()) { this.setState({cmdOpen:false, cmdDone:null}); this.askSubmit(cmdQuery.trim()); } }
      },
      closeCmd: ()=>this.setState({cmdOpen:false, cmdDone:null}),
      cmdEmpty: cmdResults.length === 0 && !!(cmdQuery||'').trim(),
      openCmd: ()=>this.setState({cmdOpen:true, cmdQuery:'', cmdDone:null, cmdSel:0}),
      cmdResults
    };

    // ---- Pipeline ledger tabs (opportunities live with contacts; pipeline = contract onward) ----
    const pipeTab = 'board';
    const goQueue = () => this.setState({ screen:'contacts', contactView:'queue' });

    // ---- Pipeline report bar · metrics by relationship segment ----
    // ---- Report bar · contact-segment data (Contacts page) + transaction data (Pipeline page) ----
    const relData = {
      all:      { label:'All',       active:{v:'486',d30:'+34',dQ:'+92',dY:'+161'}, comp:{v:'87%',d30:'+2.1pp',dQ:'+4.8pp',dY:'+9.5pp'},  risk:{v:'23',d30:'-4',dQ:'-9',dY:'-15'}, fresh:{v:'34',d30:'+8',dQ:'+15',dY:'+22'}, resp:{v:'62%',d30:'+1.8pp',dQ:'+3.4pp',dY:'+6.9pp'} },
      clients:  { label:'Clients',   active:{v:'92', d30:'+6', dQ:'+14',dY:'+28'},  comp:{v:'94%',d30:'+1.2pp',dQ:'+2.6pp',dY:'+5.1pp'},  risk:{v:'3', d30:'-1',dQ:'-3',dY:'-6'},  fresh:{v:'6', d30:'+2',dQ:'+3', dY:'+5'},  resp:{v:'78%',d30:'+0.9pp',dQ:'+2.2pp',dY:'+4.6pp'} },
      prospects:{ label:'Prospects', active:{v:'164',d30:'+22',dQ:'+58',dY:'+96'},  comp:{v:'82%',d30:'+3.4pp',dQ:'+6.1pp',dY:'+11.2pp'}, risk:{v:'12',d30:'-2',dQ:'-4',dY:'-7'},  fresh:{v:'22',d30:'+5',dQ:'+9', dY:'+14'}, resp:{v:'54%',d30:'+2.6pp',dQ:'+4.8pp',dY:'+8.3pp'} },
      sphere:   { label:'Sphere',    active:{v:'148',d30:'+4', dQ:'+11',dY:'+24'},  comp:{v:'85%',d30:'+1.6pp',dQ:'+3.2pp',dY:'+7.4pp'},  risk:{v:'6', d30:'-1',dQ:'-2',dY:'-4'},  fresh:{v:'4', d30:'+1',dQ:'+2', dY:'+3'},  resp:{v:'66%',d30:'+1.1pp',dQ:'+2.5pp',dY:'+5.2pp'} },
      partners: { label:'Partners',  active:{v:'34', d30:'+1', dQ:'+3', dY:'+5'},   comp:{v:'91%',d30:'+0.8pp',dQ:'-1.4pp',dY:'+3.8pp'},  risk:{v:'1', d30:'0', dQ:'-1',dY:'-2'},  fresh:{v:'1', d30:'+1',dQ:'+1', dY:'+2'},  resp:{v:'74%',d30:'+0.7pp',dQ:'+1.9pp',dY:'+4.1pp'} },
      vendors:  { label:'Vendors',   active:{v:'48', d30:'+1', dQ:'+5', dY:'+9'},   comp:{v:'88%',d30:'+1.0pp',dQ:'+2.1pp',dY:'+4.4pp'},  risk:{v:'1', d30:'0', dQ:'0', dY:'-1'},  fresh:{v:'1', d30:'+1',dQ:'+2', dY:'+3'},  resp:{v:'70%',d30:'+0.9pp',dQ:'+1.7pp',dY:'+3.6pp'} }
    };
    const deltaCell = (period, txt, inv) => {
      const na = txt === '—' || txt === '' || txt == null;
      const neg = /^[-−]/.test(txt);
      const pos = /^\+/.test(txt);
      const good = inv ? neg : pos, bad = inv ? pos : neg;
      const color = na ? '#B8B8B8' : bad ? '#D0342C' : good ? '#10A37F' : '#5D5D5D';
      return { period, disp: (na ? '' : (neg ? '↓' : pos ? '↑' : '')) + String(txt).replace('pp',''),
        valStyle: `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:500;font-size:9.5px;letter-spacing:0;color:${color};` };
    };
    const mkReport = (label, sub, m, inv) => ({ label, sub, value: m.v,
      deltas: [deltaCell('30 D', m.d30, inv), deltaCell('QTR', m.dQ, inv), deltaCell('1 YR', m.dY, inv)] });

    // ---- Active Listings · seller reporting automations ----
    const sellerListing = { name:'Klein — Estates at Acqualina PH', owner:'D. Klein', meta:'Listed May 02 · $19.9M · 64 days on market · 3 visits last 14 days' };
    const sellerVisits = [
      { d:'Jul 03', who:'Buyer · via Compass', fb:'“Loved the flow; hesitant on west exposure.”', st:'Feedback in', stC:'#5D5D5D' },
      { d:'Jun 28', who:'Buyer · via ONE Sotheby’s', fb:'“Comparing with new construction nearby.”', st:'Feedback in', stC:'#5D5D5D' },
      { d:'Jun 24', who:'Buyer · direct inquiry', fb:'Awaiting feedback — chase 2 of 3 sent to buyer’s agent', st:'Chasing', stC:'#D0342C' }
    ];
    const mkSellerGen = (label, audit) => ()=>{ this.pushAudit(audit); this.setState({ qcToast: label }); clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2800); };
    // inbound showing requests on your active listing (other agents)
    const sellerInboundState = this.state.sellerInbound || {};
    const sellerInbound = [
      { id:'in1', agent:'P. Duarte · Compass', when:'Sat Jul 12 · 15:00–16:00', buyer:'Qualified buyer · proof of funds on file · 2nd visit — real interest signal' }
    ].map(r => { const st = sellerInboundState[r.id]; return { ...r,
      isOpen: !st, isApproved: st === 'ok', isAlt: st === 'alt',
      onApprove: ()=>{ this.pushAudit('Inbound showing approved · ' + r.agent + ' — access instructions sent, feedback chase scheduled T+24h'); this.setState(s=>({ sellerInbound:{ ...(s.sellerInbound||{}), [r.id]:'ok' }, qcToast:'Showing approved · access instructions sent · feedback chase armed' })); clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2800); },
      onAlt: ()=>{ this.pushAudit('Inbound showing · alternative window proposed to ' + r.agent); this.setState(s=>({ sellerInbound:{ ...(s.sellerInbound||{}), [r.id]:'alt' } })); }
    }; });
    const sellerReports = [
      { name:'Bi-weekly visit report → owner', next:'Next · Jul 15 · auto', desc:'Every visit + structured feedback + inquiries and saves, composed as an A/CO PDF. Queued for your approval before it reaches D. Klein.', action:'Generate now',
        onGen: mkSellerGen('Visit report generated · A/CO PDF · queued for approval', 'Seller reporting · bi-weekly visit report generated for Estates PH — 3 visits, 2 feedbacks, queued for approval') },
      { name:'Monthly action-plan review → seller', next:'Next · Aug 01 · auto', desc:'Agent reviews the plan and proposes adjustments — price positioning vs 3 new comps, photo refresh for fall light, private preview event. Ships with the detailed activity + market report, A/CO PDF.', action:'Preview draft',
        onGen: mkSellerGen('Action-plan review drafted · adjustments + market report · queued', 'Seller reporting · monthly action-plan review drafted for Estates PH — 3 adjustments proposed, market report attached') }
    ];

    // ---- Playbooks · per deal type closing procedures ----
    const pbDefaults = {
      'Purchase · Cash': [
        { n:'Executed contract distributed', d:'Effective +0d', o:'TC', a:'Auto — agent distributes to all parties' },
        { n:'Escrow deposit confirmed', d:'Effective +3d', o:'Client', a:'Reminder D-1 · receipt filed to Drive' },
        { n:'Inspection period ends', d:'Effective +14d', o:'Inspector', a:'Schedule on day 2 · chase report at T-2' },
        { n:'HOA / condo approval package', d:'Effective +17d', o:'TC', a:'Draft to association auto-prepared' },
        { n:'Title commitment received', d:'Effective +28d', o:'Title Co.', a:'Chase at T-3 · escalate at T-1' },
        { n:'Walk-through', d:'Closing −2d', o:'You', a:'Calendar event + client dossier' },
        { n:'Closing statement review', d:'Closing −1d', o:'You', a:'Agent flags deviations vs contract' },
        { n:'CDA / commission disbursement', d:'Closing', o:'TC', a:'Auto-prepared from split settings' } ],
      'Purchase · Financed': [
        { n:'Executed contract distributed', d:'Effective +0d', o:'TC', a:'Auto — agent distributes' },
        { n:'Escrow deposit confirmed', d:'Effective +3d', o:'Client', a:'Reminder D-1' },
        { n:'Loan application completed', d:'Effective +5d', o:'Client · Lender', a:'Chase lender confirmation' },
        { n:'Inspection period ends', d:'Effective +14d', o:'Inspector', a:'Schedule day 2 · chase report' },
        { n:'Appraisal ordered / completed', d:'Effective +21d', o:'Lender', a:'Track · alert if below contract price' },
        { n:'Loan approval · clear to close', d:'Closing −7d', o:'Lender', a:'Escalation chain at T-3' },
        { n:'Walk-through', d:'Closing −2d', o:'You', a:'Calendar + dossier' },
        { n:'Closing statement review', d:'Closing −1d', o:'You', a:'Agent flags deviations' },
        { n:'CDA / commission disbursement', d:'Closing', o:'TC', a:'Auto-prepared' } ],
      'Listing': [
        { n:'Listing agreement executed', d:'Signed +0d', o:'You', a:'Auto-filed · folder created' },
        { n:'Photography · staging scheduled', d:'Signed +5d', o:'Vendor', a:'Agent books preferred vendor' },
        { n:'MLS live + syndication check', d:'Signed +7d', o:'TC', a:'Listing QA checklist auto-run' },
        { n:'Private preview · broker open', d:'Signed +14d', o:'You', a:'Invite list from buyer-match sweep' },
        { n:'Seller report · showings + feedback', d:'Weekly', o:'Agent', a:'Auto-drafted · approve to send' },
        { n:'Price review checkpoint', d:'Signed +30d', o:'You', a:'Comp refresh + recommendation prepared' } ],
      'Rental': [
        { n:'Application + background check', d:'Application +2d', o:'TC', a:'Auto-ordered on receipt' },
        { n:'Lease draft circulated', d:'Application +4d', o:'Attorney', a:'Template pre-filled from terms' },
        { n:'Association approval', d:'Application +10d', o:'HOA', a:'Package auto-prepared · chase at T-3' },
        { n:'Move-in funds confirmed', d:'Lease −3d', o:'Tenant', a:'Reminder + receipt filed' },
        { n:'Move-in walk-through', d:'Lease start', o:'You', a:'Checklist + photos to Drive' } ],
      'Capital': [
        { n:'PSA executed · escrow opened', d:'PSA +0d', o:'Attorney', a:'Auto-distributed · critical dates extracted' },
        { n:'Due diligence begins', d:'PSA +1d', o:'You · Buyer', a:'DD checklist instantiated per asset class' },
        { n:'Third-party reports ordered', d:'PSA +5d', o:'Vendors', a:'Environmental · survey · PCA tracked' },
        { n:'DD period expires · go/no-go', d:'PSA +30d', o:'Buyer', a:'T-5 decision brief auto-prepared' },
        { n:'Financing contingency', d:'PSA +45d', o:'Lender', a:'Track · 1031 clocks if applicable' },
        { n:'Closing · proration review', d:'Per PSA', o:'Attorney', a:'Statement vs PSA deviation check' } ]
    };
    const pbData = this.state.pbData || pbDefaults;
    const pbOrder = Object.keys(pbData);
    let pbSel = this.state.pbSel || pbOrder[0];
    if (!pbOrder.includes(pbSel)) pbSel = pbOrder[0];
    const pbSteps = pbData[pbSel] || [];
    const pbCommit = (data) => this.setState({ pbData: data });
    const pbTabs = pbOrder.map(name => {
      const active = name === pbSel;
      return { name, onClick: ()=>this.setState({pbSel:name}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?600:400};font-size:13px;letter-spacing:0.01em;color:${active?'#0D0D0D':'#8F8F8F'};padding-bottom:7px;border-bottom:1.5px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;white-space:nowrap;` };
    });
    const pbSetSteps = (arr) => pbCommit({ ...pbData, [pbSel]: arr });
    const pbRows = pbSteps.map((s, i) => ({
      idx: String(i+1).padStart(2,'0'), name: s.n, due: s.d, owner: s.o, auto: s.a,
      onName: (e)=>{ const a=[...pbSteps]; a[i]={...a[i], n:e.target.value}; pbSetSteps(a); },
      onDue: (e)=>{ const a=[...pbSteps]; a[i]={...a[i], d:e.target.value}; pbSetSteps(a); },
      onOwner: (e)=>{ const a=[...pbSteps]; a[i]={...a[i], o:e.target.value}; pbSetSteps(a); },
      onAuto: (e)=>{ const a=[...pbSteps]; a[i]={...a[i], a:e.target.value}; pbSetSteps(a); },
      onUp: ()=>{ if(i===0) return; const a=[...pbSteps]; [a[i-1],a[i]]=[a[i],a[i-1]]; pbSetSteps(a); },
      onDown: ()=>{ if(i===pbSteps.length-1) return; const a=[...pbSteps]; [a[i],a[i+1]]=[a[i+1],a[i]]; pbSetSteps(a); },
      onDel: ()=>pbSetSteps(pbSteps.filter((_,x)=>x!==i)),
      upColor: i===0 ? '#E3E3E3' : '#8F8F8F',
      downColor: i===pbSteps.length-1 ? '#E3E3E3' : '#8F8F8F'
    }));
    const pbAddStep = () => pbSetSteps([...pbSteps, { n:'New action', d:'Effective +0d', o:'You', a:'—' }]);
    const pbSelName = pbSel;

    // ---- Playbook preferences + new types ----
    const pbPrefsDefaults = { anchor:'Effective date', autonomy:'Draft for approval', chase:'Chase T-3 · escalate T-1', notify:'Daily digest' };
    const pbPrefsAll = this.state.pbPrefs || {};
    const pbPrefsCur = { ...pbPrefsDefaults, ...(pbPrefsAll[pbSel]||{}) };
    const pbPrefsOpen = !!this.state.pbPrefsOpen;
    const togglePbPrefs = ()=>this.setState({ pbPrefsOpen: !this.state.pbPrefsOpen });
    const pbPrefsBtnStyle = `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${pbPrefsOpen?'#0D0D0D':'#8F8F8F'};border:0.5px solid ${pbPrefsOpen?'#0D0D0D':'#E3E3E3'};background:${pbPrefsOpen?'#ECECEC':'transparent'};padding:6px 14px;cursor:pointer;white-space:nowrap;transition:all 150ms;margin-bottom:7px;`;
    const setPbPref = (k)=>(e)=>this.setState({ pbPrefs: { ...pbPrefsAll, [pbSel]: { ...pbPrefsCur, [k]: e.target.value } } });
    const renamePb = (e)=>{ const nn=e.target.value; if(!nn.trim()) return;
      const nd={}; pbOrder.forEach(k=>{ nd[k===pbSel?nn:k]=pbData[k]; });
      const np={...pbPrefsAll}; if(np[pbSel]!==undefined){ np[nn]=np[pbSel]; delete np[pbSel]; }
      this.setState({ pbData:nd, pbSel:nn, pbPrefs:np }); };
    const pbAddType = ()=>{ let name='New Playbook', i=2; while(pbData[name]) name='New Playbook '+(i++);
      this.setState({ pbData:{ ...pbData, [name]:[{ n:'New action', d:'Effective +0d', o:'You', a:'—' }] }, pbSel:name, pbPrefsOpen:true });
      this.pushAudit('Playbook type created · "'+name+'" — edit name and preferences'); };
    const pbCanDelete = pbOrder.length > 1;
    const pbDeleteType = ()=>{ if(!pbCanDelete) return;
      const nd={...pbData}; delete nd[pbSel];
      const np={...pbPrefsAll}; delete np[pbSel];
      this.setState({ pbData:nd, pbPrefs:np, pbSel:Object.keys(nd)[0], pbPrefsOpen:false }); };
    const pbDelStyle = `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${pbCanDelete?'#D0342C':'#E3E3E3'};background:transparent;border:0.5px solid ${pbCanDelete?'#D0342C':'#E3E3E3'};padding:7px 14px;cursor:${pbCanDelete?'pointer':'default'};white-space:nowrap;`;
    const pbPrefSelects = [
      { l:'Due-date anchor', v:pbPrefsCur.anchor, onChange:setPbPref('anchor'), opts:['Effective date','Signed date','PSA date','Application date','Closing date','Lease start'] },
      { l:'Agent autonomy', v:pbPrefsCur.autonomy, onChange:setPbPref('autonomy'), opts:['Draft for approval','Auto-execute · notify','Suggest only'] },
      { l:'Notifications', v:pbPrefsCur.notify, onChange:setPbPref('notify'), opts:['Daily digest','Real-time','Weekly summary'] }
    ];
    const pbChaseVal = pbPrefsCur.chase;
    const onPbChase = setPbPref('chase');
    const txRowsBase = [
      { name:'Sterling — Acqualina 4802', meta:'Under Contract · Cash · Effective Jun 24', progressLabel:'2 of 9 milestones', pct:'22%', alert:'HOA overdue', alertColor:'#D0342C', gci:'$530K', closing:'Closing Aug 15', dot:'#D0342C', onClick:goTc },
      { name:'Alvarez — Continuum 2904', meta:'Under Contract · Financed · Effective Jun 12', progressLabel:'5 of 10 milestones', pct:'50%', alert:'On track', alertColor:'#5D5D5D', gci:'$410K', closing:'Closing Jul 30', dot:'#0D0D0D', onClick:goTc },
      { name:'Ravel — Faena 8C', meta:'Under Contract · Cash · Effective Jun 28', progressLabel:'3 of 9 milestones', pct:'33%', alert:'T-3 · inspection', alertColor:'#D0342C', gci:'$530K', closing:'Closing Aug 22', dot:'#D0342C', onClick:goTc },
      { name:'Chen — Waldorf Astoria 5301', meta:'Pre-construction · Deposit schedule 10/10/10 · Delivery 2028', progressLabel:'1 of 3 deposits', pct:'33%', alert:'2nd deposit Aug 01', alertColor:'#5D5D5D', gci:'$474K', closing:'TCO 2028', dot:'#0D0D0D', onClick:goTc },
      { name:'Sason — Rivage PH-B', meta:'Pre-construction · Construction milestones · Delivery Q4 2026', progressLabel:'Finish selections due', pct:'72%', alert:'Deadline Jul 21', alertColor:'#5D5D5D', gci:'$660K', closing:'TCO Q4 26', dot:'#0D0D0D', onClick:goTc },
      { name:'Klein — Estates at Acqualina PH', meta:'Active Listing · $19.9M ask · Listed May 02 · 64 DOM', progressLabel:'3 visits · 14 days', pct:'40%', alert:'Weekly report due', alertColor:'#5D5D5D', gci:'$498K', closing:'Seller side', dot:'#0D0D0D', onClick:goTc }
    ];
    const txPeekMeta = {
      'Sterling — Acqualina 4802': { budget:'$11.4M', budgetNum:11.4, probNum:90, prob:'90%', opp:'Buyer', status:'IN CONTRACT', dot:'#D0342C', next:'Inspection ends', due:'Jul 08', dueColor:C.ox, gciOverride:'$530K' },
      'Alvarez — Continuum 2904': { budget:'$7.2M', budgetNum:7.2, probNum:95, prob:'95%', opp:'Buyer · financed', status:'IN CONTRACT', dot:'#0D0D0D', next:'Clear to close', due:'Jul 23', dueColor:C.conc, gciOverride:'$410K' },
      'Ravel — Faena 8C': { budget:'$11.8M', budgetNum:11.8, probNum:90, prob:'90%', opp:'Buyer', status:'IN CONTRACT', dot:'#D0342C', next:'Inspection ends', due:'Jul 09', dueColor:C.ox, gciOverride:'$530K' },
      'Chen — Waldorf Astoria 5301': { budget:'$15.8M', budgetNum:15.8, probNum:97, prob:'97%', opp:'Buyer · pre-construction', status:'IN CONTRACT', dot:'#0D0D0D', next:'2nd deposit · 10%', due:'Aug 01', dueColor:C.conc, gciOverride:'$474K' },
      'Sason — Rivage PH-B': { budget:'$22M', budgetNum:22, probNum:97, prob:'97%', opp:'Buyer · pre-construction', status:'IN CONTRACT', dot:'#0D0D0D', next:'Finish selections', due:'Jul 21', dueColor:C.conc, gciOverride:'$660K' },
      'Klein — Estates at Acqualina PH': { budget:'$19.9M', budgetNum:19.9, probNum:60, prob:'60%', opp:'Seller · active listing', status:'ACTIVE LISTING', dot:'#0D0D0D', next:'Weekly seller report', due:'Jul 08', dueColor:C.conc, gciOverride:'$498K' }
    };
    const txDealType = (r) => { const meta = ((txPeekMeta[r.name]||{}).opp||'') + ' ' + r.meta; if(/Active Listing|Seller/i.test(meta)) return 'Listing'; if(/Rental|Lease|Tenant/i.test(meta)) return 'Rental'; if(/Investor|Capital/i.test(meta)) return 'Investment'; return 'Purchase'; };
    let txRows = [ ...(this.state.extraTx ? [{ dealType:'Purchase', ...this.state.extraTx, onClick: goTc }] : []), ...txRowsBase.map(r => { const pd = { ...(txPeekMeta[r.name]||{ budget:'—', budgetNum:0, probNum:90, prob:'90%', opp:'Buyer', status:'IN CONTRACT', dot:r.dot, next:r.alert, due:r.closing, dueColor:C.conc }), name:r.name, stage:'In Contract', isTx:true }; return { ...r, dealType: txDealType(r), onClick: ()=>this.setState({ peekDeal: pd }), onName: (e)=>{ e.stopPropagation(); openDealPage(buildPeekData(pd)); } }; }) ];

    // ---- In Contract table · sort + filter per column ----
    const txColDefs = [
      ['Deal','name'], ['Type','dealType'], ['Progress','progressLabel'], ['Status','alert'], ['GCI','gci'], ['Closing','closing'] ];
    const txSortKey = this.state.txSortKey || '';
    const txSortDir = this.state.txSortDir || 'asc';
    const txFilters = this.state.txFilters || {};
    const txFilterOpen = this.state.txFilterOpen || null;
    txRows = txRows.filter(r => txColDefs.every(([l,k]) => { const f=(txFilters[k]||'').trim().toLowerCase(); if(!f) return true; return String(r[k] ?? '').toLowerCase().includes(f); }));
    if (txSortKey) {
      const num = (v)=>parseFloat(String(v).replace(/[^0-9.]/g,''))||0;
      txRows = [...txRows].sort((a,b)=>{
        let x=a[txSortKey], y=b[txSortKey];
        if (txSortKey==='gci' || txSortKey==='progressLabel') { x = txSortKey==='gci'?num(x):num(a.pct); y = txSortKey==='gci'?num(y):num(b.pct); return txSortDir==='asc'?x-y:y-x; }
        return txSortDir==='asc' ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
      });
    }
    const txHead = txColDefs.map(([label,key]) => ({ label,
      arrow: txSortKey===key ? (txSortDir==='asc'?'\u2191':'\u2193') : '',
      onSort: ()=>this.setState(s=>({ txSortKey:key, txSortDir: (s.txSortKey||'')===key && (s.txSortDir||'asc')==='asc' ? 'desc' : 'asc' })),
      filterOn: txFilterOpen===key,
      filterColor: (txFilters[key]||'').trim() ? '#0D0D0D' : '#8F8F8F',
      filterBorder: (txFilters[key]||'').trim() ? '#0D0D0D' : 'transparent',
      toggleFilter: (e)=>{ e.stopPropagation(); this.setState({ txFilterOpen: txFilterOpen===key ? null : key }); },
      filterVal: txFilters[key]||'',
      onFilter: (e)=>this.setState({ txFilters: { ...txFilters, [key]: e.target.value } }),
      clearFilter: (e)=>{ e.stopPropagation(); this.setState({ txFilters: { ...txFilters, [key]:'' }, txFilterOpen:null }); } }));
    const closedKpis = [
      { label:'Closed Volume · YTD', value:'$74M' },
      { label:'Realized GCI · YTD', value:'$3.1M' },
      { label:'Deals Closed', value:'12' },
      { label:'Avg Days to Close', value:'64' }
    ];
    const closedHead = ['Deal','Asset','Closed','Volume','GCI','Post-Sale'];
    const closedRows = [
      { name:'Bittencourt — Fisher Island 7D', asset:'Condo · Purchase', closed:'Apr 02', volume:'$21.5M', gci:'$645K', post:'Referral ask overdue · 94d', postColor:'#D0342C' },
      { name:'Nakamura — Bal Harbour 1503', asset:'Condo · Purchase', closed:'Mar 18', volume:'$13.3M', gci:'$400K', post:'Quarterly touch · due Jul 18', postColor:'#5D5D5D' },
      { name:'Petrov — Sunny Isles 3801', asset:'Condo · Purchase', closed:'Feb 07', volume:'$14.0M', gci:'$420K', post:'Anniversary gesture · Aug 02', postColor:'#5D5D5D' },
      { name:'Klein — Estates at Acqualina', asset:'Condo · Listing', closed:'Jan 22', volume:'$19.9M', gci:'$597K', post:'Owns unlisted waterfront · cross-sell', postColor:'#5D5D5D' },
      { name:'Duarte — Golden Beach Lot', asset:'Land · Purchase', closed:'Jan 09', volume:'$8.4M', gci:'$252K', post:'Referral received · reciprocate', postColor:'#5D5D5D' }
    ];

    const monthIdx = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const mkCard = (name, opp, budget, hot, prob, next, due, overdue, toTc) => {
      const budgetNum = parseFloat(String(budget).replace(/[^0-9.]/g,'')) || 0;
      const parts = String(due).split(' ');
      const dueRank = (monthIdx[parts[0]] ?? 12) * 31 + (parseInt(parts[1],10) || 0);
      return {
        name, opp, budget, status: hot?'HOT':'WARM', prob: prob+'%', dot: hot?C.moss:C.pedra,
        next, due, dueColor: overdue?C.ox:C.conc, onClick: toTc ? goTc : goDeal, isTx: !!toTc,
        budgetNum, probNum: prob, weightedNum: budgetNum * prob / 100, dueRank
      };
    };
    const collPipe = this.state.collPipe || 'all';
    const col = (stage, cards, gci) => { const cs = cards.map(c => ({ ...c, stage, onClick: ()=>{ if (c.isTx) { goTc(); return; } openDeal(c, stage); }, onName: (e)=>{ e.stopPropagation(); if (c.isTx) { goTc(); return; } openDeal(c, stage); } })); return { stage, cards: cs, count: cs.length, gci: (gci !== undefined) ? gci : ('$' + cs.reduce((s,c)=>s+c.weightedNum,0).toFixed(1) + 'M') }; };
    const pipes = {
      purchases: [
        col('Prospecting', [
          ...((this.state.newOpps||[]).map(o => mkCard(o.name, o.opp, o.budget, false, 20, o.next, 'Jul 12', false))),
          mkCard('Continuum South 3902','Buyer inquiry','$6.8M',false,20,'Qualify budget + timeline','Jul 09',false),
          mkCard('Continuum North 1801','Buyer','$5.4M',false,30,'Send parking + HOA docs','Jul 09',false) ]),
        col('Warm', [
          mkCard('St Regis SI · Tower 2 PH · Sasson','Buyer · Pre-construction','$29M',true,35,'Convert reservation — contract out','Jul 09',false),
          mkCard('Faena House 12B','Buyer','$9.2M',false,30,'Send curated 3-unit set','Jul 07',false),
          mkCard('Acqualina 4805','Buyer','$10.6M',false,35,'Follow up post-tour','Jul 10',false),
          mkCard('Bal Harbour 2201','Buyer','$7.5M',false,35,'Confirm financing letter','Jul 08',false) ]),
        col('Hot', [
          mkCard('Estates at Acqualina 5601','Buyer','$16M',true,40,'Confirm Sat 11am tour','Jul 06',false),
          mkCard('Rivage PH-A · Marcelo C.','Buyer','$18.5M',true,45,'Send construction schedule','Jul 08',false),
          mkCard('Faena Penthouse','Buyer','$34M',true,50,'Await seller counter','Jul 07',false) ]),
        col('Under Contract', [
          mkCard('Sterling · Acqualina 4802','Buyer','$11.4M',true,90,'Inspection ends Jul 08','Jul 08',false,true),
          mkCard('Zurich FO · Golden Beach','Buyer','$28M',true,60,'Push principal call','Jul 07',false) ]),
        col('Won', [
          mkCard('Continuum 2904 · Alvarez','Buyer','$7.2M',true,100,'Closing Jul 18','Jul 18',false) ]),
        col('Lost', [
          mkCard('Brickell Commercial','Buyer','$14M',false,40,'Probability downgraded','Jul 11',false) ])
      ],
      listings: [
        col('Prospecting', [
          mkCard('Fisher Island Villa','Seller lead','$24M',false,15,'Schedule listing consult','Jul 10',false),
          mkCard('Indian Creek Estate','Seller','$52M',false,25,'Prep valuation package','Jul 12',false) ]),
        col('Contract', [
          mkCard('Bal Harbour Listing','Listing agreement','$9.8M',false,40,'Sign exclusive agreement','Jul 09',false) ]),
        col('Staging', [
          mkCard('Golden Beach Villa','Staging','$19M',true,55,'Confirm stager schedule','Jul 11',false) ]),
        col('Marketing', [
          mkCard('Surfside Oceanfront','Marketing','$12.5M',true,50,'Launch campaign + shoot','Jul 08',false) ]),
        col('Under Contract', [
          mkCard('Sunny Isles 3801','Seller','$8.2M',false,60,'Re-forecast — close slipped','Jun 30',true) ]),
        col('Won', [
          mkCard('Portofino 2302 · Zanotti','Seller','$4.2M',true,100,'Closed','—',false) ]),
        col('Lost', [
          mkCard('Brickell Loft','Seller','$3.9M',false,30,'Withdrawn','Jun 20',false) ])
      ],
      rentals: [
        col('Prospecting', [
          mkCard('Continuum Rental 3A','Tenant','$28K/mo',false,30,'Qualify move-in date','Jul 09',false),
          mkCard('Setai Suite 1802','Tenant','$22K/mo',false,25,'Send 3 options','Jul 10',false) ], ''),
        col('Showings', [
          mkCard('Faena Residence 9B','Tenant','$45K/mo',true,50,'Schedule viewing','Jul 07',false) ], ''),
        col('Contract', [
          mkCard('Bal Harbour 1801','Lease','$35K/mo',true,70,'Draft lease','Jul 08',false) ], ''),
        col('Won', [
          mkCard('Edition 2204','Lease','$30K/mo',true,100,'Keys handed','—',false) ], ''),
        col('Lost', [
          mkCard('Aria Rental 4B','Tenant','$18K/mo',false,20,'Chose competitor','Jun 28',false) ], '')
      ]
    };
    // Investments · clients interested in investing via Capital division
    pipes.investments = [
      col('Prospecting', [
        mkCard('Duarte Family','Investor · yield-focused','$15M',false,20,'Present Doral industrial teaser','Jul 10',false),
        mkCard('Sterling · redeploy proceeds','Investor · post-closing','$12M',false,25,'Teaser: Brickell retail NNN','Jul 12',false) ]),
      col('Mandate', [
        mkCard('Zurich FO · 1031 mandate','Investor · 45d clock day 31','$41M',true,65,'Phase II environmental due','Jul 15',true) ]),
      col('Presented', [
        mkCard('Itaú intro · Wexler FO','Investor · core+','$18M',false,30,'Follow up on Coral Gables OM','Jul 11',false) ]),
      col('Underwriting', [
        mkCard('Miami River Dev Site · Katz JV','Investor · covered land','$24M',true,45,'Counter on LOI terms','Jul 09',false) ]),
      col('Committed', [
        mkCard('Marchetti FO · Doral Industrial','Investor · sale-leaseback','$16M',true,80,'PSA redline turn','Jul 07',false) ]),
      col('Won', [
        mkCard('Aventura Medical Office','7.2% cap · closed May','$14M',true,100,'Quarterly LP report','—',false) ])
    ];
    // Off-Market · quiet mandates as opportunities
    const omStPr = { Quiet:20, Preview:40, Circulating:55 };
    const omReg = (this.state.omNewInv||[]).map(r => { const c = mkCard(r.name, 'Seller · ' + (r.src||'Owner direct') + ' · quiet mandate', r.ask, r.st==='Circulating', omStPr[r.st]||20, (r.matched && r.matched!=='—') ? (r.matched + ' buyer-book matches — arrange previews') : 'Dossier drafting — owner approval next', 'Jul 12', false); return { ...c, _st: r.st||'Quiet' }; });
    pipes.offmarket = [
      col('Quiet', [
        ...omReg.filter(c=>c._st==='Quiet'),
        mkCard('Estates at Acqualina 3805','Seller · Broker whisper · quiet','$9.2M',false,20,'2 buyer-book matches — owner reviewing previews','Jul 11',false),
        mkCard('Golden Beach — Compound lot','Seller · Attorney network · quiet','$24M',false,25,'1 match — assemble land dossier','Jul 14',false),
        mkCard('Indian Creek parcel','Seller · Family office · quiet','$38M',false,20,'Held 30d — owner pulse due','Jul 09',false) ]),
      col('Preview', [
        ...omReg.filter(c=>c._st==='Preview'),
        mkCard('Rivage PH-A','Seller · Owner direct · quiet','$18.9M',true,40,'4 matches — 2 previews booked this week','Jul 10',false) ]),
      col('Circulating', [
        ...omReg.filter(c=>c._st==='Circulating'),
        mkCard('Continuum South 1204','Seller · Past client · quiet','$6.4M',true,55,'Whisper network live — 3 agent inquiries','Jul 08',false) ]),
      col('Placed', [
        mkCard('Surf Club — quiet placement','Seller · Owner direct','$11.2M',true,100,'Converted to contract · May','—',false) ])
    ];
    const allOrder = ['Prospecting','Warm','Showings','Quiet','Preview','Circulating','Hot','Mandate','Presented','Staging','Marketing','Underwriting','Contract','Committed','Under Contract','Placed','Won','Lost'];
    pipes.all = allOrder.map(st => {
      const cards = ['purchases','listings','rentals','investments','offmarket'].flatMap(p => { const c = pipes[p].find(x=>x.stage===st); const pn = { purchases:'Purchases', listings:'Listings', rentals:'Rentals', investments:'Investments', offmarket:'Off-Market' }[p]; return c ? c.cards.map(cc=>({ ...cc, pipeName: pn })) : []; });
      return cards.length ? col(st, cards, '') : null;
    }).filter(Boolean);
    const columnsRaw = pipes[collPipe] || pipes.purchases;
    const dealTagMap = { 'St Regis SI · Tower 2 PH · Sasson':['Pre-construction','Cash'], 'Faena House 12B':['Waterfront'], 'Acqualina 4805':['Waterfront'], 'Continuum South 3902':['Referral'], 'Continuum North 1801':['Waterfront'], 'Fisher Island Villa':['Off-market'], 'Indian Creek Estate':['Off-market','Trophy'], 'Golden Beach Compound':['Cash','Off-market'], 'Bal Harbour Listing':['Waterfront'] };
    const dealTagsFor = (c) => { if (c.tags) return c.tags; const s = ((c.name||'') + ' ' + (c.opp||'') + ' ' + (c.status||'')).toLowerCase(); const out = dealTagMap[c.name] ? dealTagMap[c.name].slice() : []; if (/pre-construction|2028/.test(s) && out.indexOf('Pre-construction')<0) out.push('Pre-construction'); if (/cash/.test(s) && out.indexOf('Cash')<0) out.push('Cash'); if (/rental|\/mo/.test(s + (c.budget||''))) out.push('Rental'); if (/referral/.test(s) && out.indexOf('Referral')<0) out.push('Referral'); if (/off-market|whisper/.test(s) && out.indexOf('Off-market')<0) out.push('Off-market'); return out; };
    const pipeTagSel = this.state.pipeTag || 'all';
    const pipeTagCounts = {}; columnsRaw.forEach(col => col.cards.forEach(c => { dealTagsFor(c).forEach(tg => { pipeTagCounts[tg] = (pipeTagCounts[tg]||0) + 1; }); }));
    const columns = columnsRaw.map(col => { const cards = col.cards.map(c => { const tg = dealTagsFor(c); return Object.assign({}, c, { tags: tg, tagList: tg.slice(0,3), hasTags: tg.length > 0 }); }).filter(c => pipeTagSel === 'all' || c.tags.indexOf(pipeTagSel) >= 0); return Object.assign({}, col, { cards: cards, count: cards.length }); });
    const collPipeDefs = [['All','all'],['Purchases','purchases'],['Listings','listings'],['Rentals','rentals'],['Investments','investments'],['Off-Market','offmarket'],['Closed','closed']];
    const collPipes = collPipeDefs.map(([label,id]) => {
      const active = collPipe===id;
      return { label, onClick:()=>this.setState({collPipe:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?600:400};font-size:13px;letter-spacing:0.02em;color:${active?'#0D0D0D':'#8F8F8F'};padding-bottom:5px;border-bottom:1.5px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    // pipeline-specific KPI cockpit (reflects selected pipeline)
    const allCards = columns.flatMap(c => c.cards);
    const isRent = collPipe==='rentals';
    const fmt = (v) => isRent ? ('$' + Math.round(v) + 'K/mo') : ('$' + v.toFixed(1) + 'M');
    const sumBudget = allCards.reduce((s,c)=>s+c.budgetNum,0);
    const sumWeighted = allCards.reduce((s,c)=>s+c.budgetNum*c.probNum/100,0);
    const hotCount = allCards.filter(c=>c.status==='HOT').length;
    const wonC = columns.find(c=>c.stage==='Won'); const wonCount = wonC ? wonC.cards.length : 0;
    const lostC = columns.find(c=>c.stage==='Lost'); const lostCount = lostC ? lostC.cards.length : 0;
    const avgProb = allCards.length ? Math.round(allCards.reduce((s,c)=>s+c.probNum,0)/allCards.length) : 0;
    const pipeKpis = [
      { label: isRent?'Rent Roll':'Pipeline Value', value: fmt(sumBudget) },
      { label:'Weighted Value', value: fmt(sumWeighted) },
      { label:'Deals', value: String(allCards.length) },
      { label:'HOT', value: String(hotCount) },
      { label:'Avg Probability', value: avgProb + '%' },
      { label:'Won', value: String(wonCount) },
      { label:'Lost', value: String(lostCount) },
      { label: isRent?'Avg Rent':'Avg Ticket', value: fmt(allCards.length ? sumBudget/allCards.length : 0) }
    ];
    // sort
    const sortKey = this.state.sort || 'weighted';
    const sortDefs = [['Weighted GCI','weighted'],['Budget','budget'],['Probability','prob'],['Next Action','due'],['Name','name']];
    const cmp = { weighted:(a,b)=>b.weightedNum-a.weightedNum, budget:(a,b)=>b.budgetNum-a.budgetNum, prob:(a,b)=>b.probNum-a.probNum, due:(a,b)=>a.dueRank-b.dueRank, name:(a,b)=>a.name.localeCompare(b.name) }[sortKey];
    const sortedColumns = columns.map(col=>({...col, cards:[...col.cards].sort(cmp)}));
    const sortActive = sortDefs.find(d=>d[1]===sortKey) || sortDefs[0];
    const sortLabel = sortActive[0];
    const sortArrow = (sortKey==='due'||sortKey==='name') ? '↑' : '↓';
    const sortOptions = sortDefs.map(([label,id])=>{
      const active = sortKey===id;
      return { label, onClick:()=>this.setState({sort:id, sortOpen:false}),
        style:`padding:11px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${active?'#0D0D0D':'#5D5D5D'};background:${active?'rgba(255,255,255,0.62)':'transparent'};cursor:pointer;border-bottom:1px solid #E3E3E3;` };
    });
    // view
    const viewSel = this.state.view || 'board';
    const view = collPipe==='all' ? (viewSel==='week' ? 'week' : 'list') : viewSel;
    const viewDefs = [['Board','board'],['List','list'],['Week','week']];
    const viewToggle = (collPipe==='all' ? [['List','list'],['Week','week']] : viewDefs).map(([label,id])=>{
      const active = view===id;
      return { label, onClick:()=>this.setState({view:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?600:400};font-size:12.5px;letter-spacing:0.02em;color:${active?'#0D0D0D':'#8F8F8F'};padding-bottom:5px;border-bottom:1.5px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const oppQuery = (this.state.oppQuery || '').trim().toLowerCase();
    const matchOpp = (c) => !oppQuery || ((c.name || '') + ' ' + (c.opp || '')).toLowerCase().includes(oppQuery);
    const allDeals = sortedColumns.flatMap(col=>col.cards.map(c=>({...c, stage:col.stage, pipeName: c.pipeName || ({ purchases:'Purchases', listings:'Listings', rentals:'Rentals', investments:'Investments', offmarket:'Off-Market' }[collPipe] || '') }))).filter(matchOpp).sort(cmp);

    // ---- Deals list · per-column sort + multi filters ----
    const opColDefs = [['Pipeline','pipeName'],['Opportunity','opp'],['Stage','stage'],['Budget','budget'],['Prob','prob'],['Next Action','next'],['Due','due']];
    const opFilters = this.state.opFilters || {};
    const opFilterOpen = this.state.opFilterOpen || null;
    const opSortKey = this.state.opSortKey || '';
    const opSortDir = this.state.opSortDir || 'asc';
    const opSortVal = (c,k) => k==='budget' ? c.budgetNum : k==='prob' ? c.probNum : k==='due' ? c.dueRank : String(c[k]||'').toLowerCase();
    let dealRows = allDeals.filter(c => opColDefs.every(([l,k]) => { const f=(opFilters[k]||'').trim().toLowerCase(); if(!f) return true; return String(c[k] ?? '').toLowerCase().includes(f); }));
    if (opSortKey) dealRows = [...dealRows].sort((a,b)=>{ const va=opSortVal(a,opSortKey), vb=opSortVal(b,opSortKey); const r = (typeof va==='number' && typeof vb==='number') ? va-vb : String(va).localeCompare(String(vb)); return opSortDir==='asc' ? r : -r; });
    const oppHead = opColDefs.map(([label,key]) => ({ label,
      arrow: opSortKey===key ? (opSortDir==='asc'?'↑':'↓') : '',
      filterOn: opFilterOpen===key,
      filterColor: (opFilters[key]||'').trim() ? '#0D0D0D' : '#8F8F8F',
      filterBorder: (opFilters[key]||'').trim() ? '#0D0D0D' : 'transparent',
      toggleFilter: (e)=>{ e.stopPropagation(); this.setState({ opFilterOpen: opFilterOpen===key ? null : key }); },
      filterVal: opFilters[key]||'',
      onFilter: (e)=>this.setState({ opFilters: { ...opFilters, [key]: e.target.value } }),
      clearFilter: (e)=>{ e.stopPropagation(); this.setState({ opFilters: { ...opFilters, [key]:'' }, opFilterOpen:null }); },
      onClick: ()=>this.setState(s=>({ opSortKey:key, opSortDir: (s.opSortKey||'')===key && (s.opSortDir||'asc')==='asc' ? 'desc' : 'asc' })),
      style: 'font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:' + (opSortKey===key ? '#0D0D0D' : '#8F8F8F') + ';cursor:pointer;display:flex;align-items:center;gap:4px;' }));
    // ---- Week lens · deals by next-action date ----
    const weekDays = [['Mon','Jul 06'],['Tue','Jul 07'],['Wed','Jul 08'],['Thu','Jul 09'],['Fri','Jul 10']];
    const openForWeek = allDeals.filter(c => ['Won','Lost','Placed'].indexOf(c.stage) < 0);
    const weekCols = weekDays.map(([label, date]) => { const cards = openForWeek.filter(c => c.due === date); return { label, date, count: String(cards.length), cards }; });
    weekCols.push({ label:'Later', date:'beyond Fri', count: String(openForWeek.filter(c => !weekDays.some(d => d[1] === c.due)).length), cards: openForWeek.filter(c => !weekDays.some(d => d[1] === c.due)) });

    // ---- Opportunities > Pipeline > Stage sections ----
    const pipeNames = { purchases:'Purchases', listings:'Listings', rentals:'Rentals', investments:'Investments', offmarket:'Off-Market' };
    const secIds = collPipe==='all' ? ['purchases','listings','rentals','investments','offmarket'] : (collPipe==='closed' ? [] : (pipeNames[collPipe] ? [collPipe] : ['purchases']));
    const showClosedSec = collPipe==='all' || collPipe==='closed';
    const pipeSections = secIds.map(pid => {
      const cols = pipes[pid].map(c0 => {
        const cards = c0.cards.map(c => { const tg = dealTagsFor(c); return { ...c, tags:tg, tagList:tg.slice(0,3), hasTags:tg.length>0 }; })
          .filter(c => (pipeTagSel==='all' || c.tags.indexOf(pipeTagSel)>=0) && matchOpp(c)).sort(cmp);
        return { ...c0, cards, count:cards.length, onPlaybook: ()=>this.setState({ spbSel:{ pipe:pid, stage:c0.stage } }) };
      });
      const flat = cols.flatMap(c=>c.cards);
      const open = cols.filter(c=>c.stage!=='Won'&&c.stage!=='Lost').reduce((s,c)=>s+c.cards.length,0);
      const rent = pid==='rentals';
      const val = flat.reduce((s,c)=>s+c.budgetNum,0);
      return { name:pipeNames[pid], columns:cols, hasAction: pid==='offmarket', noAction: pid!=='offmarket', onAction: ()=>this.openOmForm(), meta: open + ' open · ' + (rent ? ('$'+Math.round(val)+'K/mo') : ('$'+val.toFixed(1)+'M')) };
    });

    // ---- Unified opportunities report (per pipeline filter) ----
    // Closed · won + lost combined, Won default
    const closedSeg = this.state.closedSeg || 'won';
    const lostRows = ['purchases','listings','rentals','investments','offmarket'].flatMap(p => {
      const c = pipes[p].find(x=>x.stage==='Lost');
      const pn = { purchases:'Purchases', listings:'Listings', rentals:'Rentals', investments:'Investments', offmarket:'Off-Market' }[p];
      return c ? c.cards.map(cc=>({ name:cc.name, pipe:pn, budget:cc.budget, when:cc.due, reason:cc.next })) : [];
    });
    const closedSegs = [['Won','won'],['Lost','lost']].map(([label,id]) => {
      const active = closedSeg === id;
      return { label,
        onClick: ()=>this.setState({ closedSeg:id }),
        style: 'display:inline-flex;align-items:center;border-radius:999px;padding:5px 13px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:' + (active?'500':'400') + ';font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;transition:all 150ms;' + (active ? 'background:#E9E8E4;color:#0D0D0D;border:1px solid #0D0D0D;' : 'background:transparent;color:#8F8F8F;border:1px solid #E3E3E3;') };
    });
    const closedSecMeta = '2026 YTD · 14 won · $3.1M GCI realized · ' + lostRows.length + ' lost';
    const oppDeltas = {
      all:        { opps:['+6','+13','+21'],  value:['+7.3%','+19.1%','+42.6%'], weighted:['+6.8%','+17.4%','+39.0%'], gci:['+6.4%','+16.8%','+38.4%'], win:['+2pp','+5pp','+8pp'] },
      purchases:  { opps:['+3','+7','+11'],   value:['+8.1%','+20.6%','+45.2%'], weighted:['+7.6%','+18.9%','+41.7%'], gci:['+7.2%','+18.1%','+40.3%'], win:['+3pp','+6pp','+9pp'] },
      listings:   { opps:['+2','+4','+6'],    value:['+5.9%','+15.2%','+33.8%'], weighted:['+5.4%','+13.8%','+30.9%'], gci:['+5.1%','+13.2%','+29.6%'], win:['+1pp','+4pp','+7pp'] },
      rentals:    { opps:['+1','+2','+4'],    value:['+3.2%','+8.4%','+18.6%'],  weighted:['+2.9%','+7.7%','+17.1%'],  gci:['+2.7%','+7.3%','+16.2%'],  win:['+2pp','+3pp','+6pp'] },
      offmarket:  { opps:['+2','+4','+7'],    value:['+21.0%','+34.2%','+58.7%'], weighted:['+19.4%','+31.0%','+52.3%'], gci:['+18.6%','+29.8%','+50.1%'], win:['+5pp','+9pp','+14pp'] },
      investments:{ opps:['+2','+5','+8'],    value:['+11.4%','+26.3%','+52.1%'],weighted:['+10.6%','+24.4%','+48.7%'],gci:['+10.1%','+23.2%','+46.5%'], win:['+4pp','+7pp','+12pp'] }
    };
    const dl = oppDeltas[collPipe] || oppDeltas.all;
    const mkD = (v, arr) => ({ v, d30:arr[0], dQ:arr[1], dY:arr[2] });
    const openCount = columns.filter(c=>c.stage!=='Won'&&c.stage!=='Lost').reduce((s,c)=>s+c.cards.length,0);
    const moneyCards = allCards.filter(c => !/\/mo/.test(c.budget||''));
    const valM = moneyCards.reduce((s,c)=>s+c.budgetNum,0);
    const wgtM = moneyCards.reduce((s,c)=>s+c.weightedNum,0);
    const feeRate = collPipe==='investments' ? 0.01 : (collPipe==='all' ? 0.028 : 0.03);
    const gciM2 = wgtM * feeRate;
    const repVal = isRent ? ('$'+Math.round(sumBudget)+'K/mo') : ('$'+valM.toFixed(1)+'M');
    const repWgt = isRent ? ('$'+Math.round(sumWeighted)+'K/mo') : ('$'+wgtM.toFixed(1)+'M');
    const repGci = isRent ? ('$'+Math.round(sumWeighted)+'K') : (gciM2>=1 ? '$'+gciM2.toFixed(1)+'M' : '$'+Math.round(gciM2*1000)+'K');
    const winDen = wonCount + lostCount;
    const winRate = winDen ? Math.round(wonCount*100/winDen) : 0;
    const oppReports = (collPipe==='closed') ? [
      mkReport('Closed Deals', '2026 year to date', { v:'14', d30:'+2', dQ:'+5', dY:'+14' }),
      mkReport('Closed Volume', 'realized · YTD', { v:'$128M', d30:'+9.8%', dQ:'+24.0%', dY:'+36.5%' }),
      mkReport('Realized GCI', 'booked · YTD', { v:'$3.1M', d30:'+8.9%', dQ:'+22.3%', dY:'+34.8%' }),
      mkReport('Avg Days to Close', 'contract → close', { v:'41', d30:'-3', dQ:'-6', dY:'-9' }, true),
      mkReport('Referrals from Closed', 'post-sale engine', { v:'9', d30:'+1', dQ:'+3', dY:'+6' })
    ] : [
      mkReport('Opportunities', 'open · pre-close', mkD(String(openCount), dl.opps)),
      mkReport(isRent?'Rent Roll':'Pipeline Value', isRent?'monthly · open leases':'gross volume', mkD(repVal, dl.value)),
      mkReport('Weighted Value', 'probability-adjusted', mkD(repWgt, dl.weighted)),
      mkReport('Projected GCI', isRent?'one-month fee':'at close', mkD(repGci, dl.gci)),
      mkReport('Win Rate', 'won vs. lost · YTD', mkD(winRate+'%', dl.win))
    ];
    const oppReportMeta = (collPipe==='closed') ? 'Closed · 2026 YTD · trend vs. same period last year' : ((collPipe==='all' ? 'All pipelines' : (pipeNames[collPipe]||'')) + ' · ' + openCount + ' open · trend vs. prior period');

    // ---- Stage playbooks (per pipeline type × stage) ----
    const spbDefaults = {
      purchases: {
        'Prospecting': [['Qualify budget, timeline, financing','Agent drafts intake summary from first call'],['Assemble curated unit set','Agent pulls 3-5 matches from inventory + off-market'],['Book discovery tour','Agent proposes slots from calendar']],
        'Warm': [['Send curated set + market brief','Agent drafts · you approve before send'],['Schedule showings','Agent coordinates with listing side'],['Confirm proof of funds','Agent requests + files to vault']],
        'Hot': [['Tour debrief within 24h','Agent drafts recap + next step'],['Prepare offer strategy','Agent assembles comps + terms scenarios'],['Draft LOI / offer','Agent pre-fills from deal record']],
        'Under Contract': [['Instantiate contract playbook','Agent reads contract, creates real-date milestones'],['Track contingencies','Agent chases inspection, HOA, financing'],['Coordinate closing','Agent aligns title, escrow, walk-through']],
        'Won': [['File closing package','Agent archives docs to vault'],['Launch post-close nurture','Agent starts 12-month cadence'],['Request referral + review','Agent drafts ask at day 30']],
        'Lost': [['Log loss reason','Agent tags record for pattern analysis'],['Move to quarterly nurture','Agent assigns touch cadence']]
      },
      listings: {
        'Prospecting': [['Prep valuation package','Agent assembles comps + pricing bands'],['Schedule listing consult','Agent proposes slots'],['Draft pre-listing checklist','Agent generates from property type']],
        'Contract': [['Send exclusive agreement','Agent pre-fills listing terms'],['Collect owner disclosures','Agent chases document set'],['Order photography + video','Agent books vendor']],
        'Staging': [['Confirm stager + schedule','Agent coordinates access'],['Track punch-list','Agent monitors completion'],['Route owner sign-off','Agent sends final-look approval']],
        'Marketing': [['Launch campaign + whisper network','Agent schedules channels'],['Weekly seller report','Agent auto-drafts every Friday'],['Collect showing feedback','Agent chases buyer agents · 3 attempts']],
        'Under Contract': [['Instantiate contract playbook','Agent reads contract, creates milestones'],['Track buyer contingencies','Agent monitors deadlines'],['Coordinate closing','Agent aligns title + escrow']],
        'Won': [['Closing gift + handoff','Agent schedules delivery'],['Start post-sale nurture','Agent assigns cadence'],['Testimonial request','Agent drafts at day 21']],
        'Lost': [['Log withdrawal reason','Agent tags record'],['Quarterly re-list check-in','Agent sets reminder']]
      },
      rentals: {
        'Prospecting': [['Qualify move-in date + budget','Agent drafts intake'],['Send 3-option set','Agent curates from rental inventory']],
        'Showings': [['Schedule viewings','Agent coordinates access'],['Send application checklist','Agent tracks docs received']],
        'Contract': [['Draft lease','Agent pre-fills terms'],['Track deposits + insurance','Agent chases proof before keys']],
        'Won': [['Key handoff + move-in sheet','Agent coordinates with building'],['Renewal reminder · month 10','Agent sets clock']],
        'Lost': [['Log outcome','Agent tags record']]
      },
      investments: {
        'Prospecting': [['Qualify mandate + yield target','Agent drafts investor profile'],['Present matching teaser','Agent matches from Capital inventory']],
        'Mandate': [['File mandate terms','Agent confirms scope + fee'],['Track 1031 clock','Agent monitors deadline daily']],
        'Presented': [['Follow up on OM · 48h','Agent chases automatically'],['Arrange site visit','Agent coordinates access']],
        'Underwriting': [['Update underwriting model','Agent refreshes with counter terms'],['Coordinate due diligence','Agent tracks environmental, title, zoning']],
        'Committed': [['Route PSA redlines','Agent coordinates attorneys'],['Confirm deposit to escrow','Agent files receipt']],
        'Won': [['Quarterly LP reporting','Agent auto-drafts'],['Exit / redeploy trigger','Agent watches hold period']]
      },
      offmarket: {
        'Quiet': [['Sweep buyer book on entry','Agent matches against active briefs'],['Watermarked dossier per recipient','Agent generates + logs every share'],['Owner circle only','No outreach without explicit approval']],
        'Preview': [['Handpicked previews · 1:1','Agent schedules through listing attorney'],['Signed NDA before any tour','Agent collects + files to vault'],['Feedback within 24h','Agent chases and logs']],
        'Circulating': [['Whisper network release','Agent tracks who received what'],['Weekly owner pulse','Agent drafts discreet update'],['Watch for public comps','Agent alerts if a comparable hits the MLS']],
        'Placed': [['Convert to contract','Agent instantiates transaction playbook'],['Close the loop quietly','Agent notifies owner circle · no announcement']]
      }
    };
    const spbSel = this.state.spbSel;
    const spbShow = !!spbSel;
    const spbClose = ()=>this.setState({ spbSel:null });
    let spbView = { title:'', rows:[], onAdd:()=>{} };
    if (spbSel) {
      const spbKey = spbSel.pipe + '|' + spbSel.stage;
      const spbDef = (spbDefaults[spbSel.pipe] || {})[spbSel.stage] || [['Define standard actions for this stage','Agent executes on stage entry']];
      const spbCur = (this.state.spb && this.state.spb[spbKey]) || spbDef.map(d => ({ a:d[0], auto:d[1] }));
      const spbSave = (rows) => this.setState(s => ({ spb: { ...(s.spb||{}), [spbKey]: rows } }));
      spbView = {
        title: (pipeNames[spbSel.pipe]||'') + ' · ' + spbSel.stage,
        rows: spbCur.map((r, i) => ({ idx: String(i+1).padStart(2,'0'), a:r.a, auto:r.auto,
          onA: (e)=>spbSave(spbCur.map((x,j)=>j===i?{...x,a:e.target.value}:x)),
          onAuto: (e)=>spbSave(spbCur.map((x,j)=>j===i?{...x,auto:e.target.value}:x)),
          onDel: ()=>spbSave(spbCur.filter((_,j)=>j!==i)) })),
        onAdd: ()=>spbSave([...spbCur, { a:'New action', auto:'Describe what the agent automates' }])
      };
    }

    // ---- Deal peek card (board/list click) ----
    const pk = this.state.peekDeal;
    const peekOpen = !!pk;
    const closePeek = ()=>this.setState({ peekDeal:null });
    const buildPeekData = (pk) => {
      const h = [...pk.name].reduce((s,ch)=>s+ch.charCodeAt(0),0);
      const isRental = /\/mo/.test(pk.budget);
      const isInv = /Investor/.test(pk.opp);
      const side = /Seller|Listing|Staging|Marketing/.test(pk.opp + ' ' + (pk.stage||'')) ? 'Listing · seller side' : /Tenant|Lease/.test(pk.opp) ? 'Rental' : isInv ? 'Investment · Capital division' : 'Purchase · buyer side';
      const gciNum = pk.gciOverride ? parseFloat(pk.gciOverride.replace(/[^0-9.]/g,'')) : (isRental ? pk.budgetNum : pk.budgetNum * (isInv ? 10 : 30)); // $K
      const gciStr = pk.gciOverride ? (pk.gciOverride + ' · per split') : (isRental ? ('$' + pk.budgetNum + 'K · one month') : ('$' + Math.round(gciNum) + 'K · ' + (isInv ? '1%' : '3%')));
      const wGciStr = '$' + Math.round(gciNum * pk.probNum / 100) + 'K';
      const curated = {
        'Rivage PH-A · Marcelo C.': {
          address:'Rivage Bal Harbour · PH-A', specs:'4 BD · 5.5 BA · 6,240 SF · full floor · private elevator', ppsf:'$2,965 / SF', delivery:'Pre-construction · delivery Q4 2027',
          contacts:[['Marcelo Carvalho','Principal · buyer'],['Sofia Duarte','Developer sales · listing side'],['R. Weiss','Attorney · buyer side']],
          acts:[['Jul 05','Toured PH-A + PH-B — preferred the A stack'],['Jul 03','Offer strategy approved · $18.5M ceiling'],['Jun 28','Proof of funds filed · J.P. Morgan']],
          dues:[['Send construction schedule','Jul 08'],['Deposit schedule review','Jul 12'],['Contract target','Jul 20']],
          tx:{ effective:'— pre-contract', escrow:'Deposit schedule 20/20/10', escrowAgent:'Developer escrow', titleCo:'TBD at contract', financing:'Cash', source:'Referral · A. Duarte' } },
        'Sterling · Acqualina 4802': {
          address:'Acqualina · Residence 4802', specs:'3 BD · 4.5 BA · 4,100 SF · flow-through', ppsf:'$2,780 / SF', delivery:'Under contract · closing Aug 15',
          contacts:[['R. Sterling','Principal · buyer'],['A. Gómez','Listing agent · co-broke'],['A/CO TC','Transaction coordinator']],
          acts:[['Jul 04','Inspection scheduled Jul 07 · vendor confirmed'],['Jun 27','Escrow deposit confirmed · receipt filed'],['Jun 24','Contract effective · milestones instantiated']],
          dues:[['Inspection period ends','Jul 08'],['HOA approval package','Jul 11'],['Closing','Aug 15']],
          tx:{ effective:'Jun 24 2026', escrow:'$1.14M · received', escrowAgent:'First American', titleCo:'First American Title', financing:'Cash', source:'Repeat client' } },
        'Alvarez — Continuum 2904': {
          address:'Continuum South Tower · 2904', specs:'3 BD · 3.5 BA · 2,910 SF · SE corner', ppsf:'$2,474 / SF', delivery:'Under contract · closing Jul 30',
          contacts:[['C. Alvarez','Principal · buyer'],['M. Torres','Listing agent · co-broke'],['First American','Title & escrow']],
          acts:[['Jul 02','Appraisal came in at value — lender notified'],['Jun 30','Loan application complete · lender confirmed'],['Jun 12','Contract effective · milestones instantiated']],
          dues:[['Clear to close','Jul 23'],['Walk-through','Jul 28'],['Closing','Jul 30']],
          tx:{ effective:'Jun 12 2026', escrow:'$720K · received', escrowAgent:'First American', titleCo:'First American Title', financing:'Financed · 60% LTV', source:'Sphere · past client' } },
        'Ravel — Faena 8C': {
          address:'Faena House · 8C', specs:'4 BD · 4.5 BA · 3,830 SF · direct ocean', ppsf:'$3,081 / SF', delivery:'Under contract · closing Aug 22',
          contacts:[['D. Ravel','Principal · buyer'],['L. Stein','Listing agent · co-broke'],['R. Weiss','Attorney · buyer side']],
          acts:[['Jul 05','Inspection scheduled Jul 09 · vendor confirmed'],['Jul 01','Escrow receipt filed to Drive'],['Jun 28','Contract effective']],
          dues:[['Inspection period ends','Jul 09'],['Condo approval package','Jul 15'],['Closing','Aug 22']],
          tx:{ effective:'Jun 28 2026', escrow:'$1.18M · received', escrowAgent:'Chicago Title', titleCo:'Chicago Title', financing:'Cash', source:'Referral · attorney' } },
        'Chen — Waldorf Astoria 5301': {
          address:'Waldorf Astoria Residences · 5301', specs:'3 BD + den · 4 BA · 3,940 SF', ppsf:'$4,010 / SF', delivery:'Pre-construction · delivery 2028',
          contacts:[['W. Chen','Principal · buyer'],['PMG Inside Sales','Developer sales'],['A/CO TC','Deposit schedule tracking']],
          acts:[['Jun 20','1st deposit wired · receipt filed'],['Jun 18','Reservation converted to contract'],['Jun 10','Unit selected · 53 line']],
          dues:[['2nd deposit · 10%','Aug 01'],['3rd deposit · at top-off','Q2 27'],['TCO / closing','2028']],
          tx:{ effective:'Jun 18 2026', escrow:'$1.58M · 1st deposit', escrowAgent:'Developer escrow · PMG', titleCo:'At TCO', financing:'Cash · deposit schedule', source:'Developer event' } },
        'Sason — Rivage PH-B': {
          address:'Rivage Bal Harbour · PH-B', specs:'5 BD · 6.5 BA · 7,120 SF · full floor', ppsf:'$3,090 / SF', delivery:'Pre-construction · delivery Q4 2026',
          contacts:[['E. Sason','Principal · buyer'],['Sofia Duarte','Developer sales'],['Studio Mia','Interior architect']],
          acts:[['Jul 03','Finish selections 70% complete'],['Jun 25','Site visit — slab at 40th floor'],['Jun 12','Deposit 3 of 4 confirmed']],
          dues:[['Finish selections deadline','Jul 21'],['4th deposit · at TCO','Q4 26'],['Closing / TCO','Q4 26']],
          tx:{ effective:'Mar 02 2025', escrow:'3 of 4 deposits · $6.6M', escrowAgent:'Developer escrow', titleCo:'At TCO', financing:'Cash · deposit schedule', source:'Repeat client' } },
        'Klein — Estates at Acqualina PH': {
          address:'Estates at Acqualina · Penthouse', specs:'6 BD · 8.5 BA · 9,200 SF · full floor + rooftop', ppsf:'$2,163 / SF', delivery:'Active listing · listed May 02 · 64 DOM',
          contacts:[['D. Klein','Principal · seller'],['A/CO Listing Team','Marketing & showings'],['R. Weiss','Attorney · seller side']],
          acts:[['Jul 03','Showing · buyer via Compass — feedback chased'],['Jul 01','Weekly seller report sent · opened 2×'],['Jun 30','Price review checkpoint armed for Aug 01']],
          dues:[['Weekly seller report','Jul 08'],['Broker open','Jul 15'],['Price review checkpoint','Aug 01']],
          tx:{ effective:'Listed May 02 2026', escrow:'— pre-contract', escrowAgent:'—', titleCo:'—', financing:'—', source:'Sphere · repeat seller' } }
      };
      curated['Sterling — Acqualina 4802'] = curated['Sterling · Acqualina 4802'];
      const cur = curated[pk.name] || {};
      const beds = 2 + (h % 4);
      const sqft = 2200 + (h % 38) * 95;
      const ppsfCalc = pk.budgetNum >= 1 ? '$' + Math.round(pk.budgetNum * 1000000 / sqft).toLocaleString() + ' / SF' : '—';
      const specsGen = isInv ? 'Commercial asset · OM + rent roll on file' : (isRental ? beds + ' BD · furnished · ' + sqft.toLocaleString() + ' SF' : beds + ' BD · ' + beds + '.5 BA · ' + sqft.toLocaleString() + ' SF');
      const clientGuess = (pk.name.split('·')[1] || '').trim();
      const data = {
        name: pk.name, stage: pk.stage, status: pk.status, prob: pk.prob, dot: pk.dot, budget: pk.budget, side,
        gci: gciStr, wGci: wGciStr, probLabel: pk.prob + ' probability',
        address: cur.address || pk.name.split('·')[0].trim(),
        specs: cur.specs || specsGen,
        ppsf: cur.ppsf || (isInv || isRental ? '—' : ppsfCalc),
        delivery: cur.delivery || (pk.stage + ' · ' + pk.opp),
        contacts: (cur.contacts || [
          [clientGuess && clientGuess.length > 2 ? clientGuess : 'Principal — on file', isInv ? 'Investor · principal' : 'Principal'],
          [side.startsWith('Listing') ? 'Buyer agent — co-broke' : 'Listing agent — co-broke', 'Counterparty'],
          ['A/CO TC', 'Transaction support'] ]).map(([n,r]) => ({ n, r, initials: n.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase() })),
        acts: (cur.acts || [
          ['Jul 05', 'Next action set — ' + pk.next],
          ['Jul 01', 'Touch logged · WhatsApp — client responsive'],
          ['Jun 24', 'Moved to ' + pk.stage + ' · playbook cadence attached'] ]).map(([d,t]) => ({ d, t })),
        dues: (cur.dues || [
          [pk.next, pk.due],
          ['Cadence touch — agent-run', 'T+7d'],
          ['Re-qualify if no response', 'T+21d'] ]).map(([l,d],i) => ({ l, d, dColor: i===0 ? pk.dueColor : '#8F8F8F' })),
        tx: cur.tx || null,
        logTouch: ()=>this.setState({ peekDeal:null, screen:'activities', actView:'activity', logOpen:true, logType:'Note', logName: pk.name, logBody:'' })
      };
      data.openFull = ()=>openDealPage(data);
      return data;
    };
    const peek = pk ? buildPeekData(pk) : { contacts:[], acts:[], dues:[] };

    // ---- Full deal page (editable record) ----
    const dpStore = this.state.dealPages || {};
    const openDealPage = (d) => {
      const gciClean = (d.gci || '').replace(' · per split','').replace(/ · (1%|3%|one month)/,'');
      const txd = d.tx || {};
      const init = dpStore[d.name] || {
        name:d.name, stage:d.stage, side:d.side, status:d.status, prob: parseInt(d.prob) || 50,
        budget:d.budget, gci: gciClean || '—', closing: (d.dues && d.dues.length ? d.dues[d.dues.length-1].d : '—'),
        address:d.address, specs:d.specs, ppsf:d.ppsf, delivery:d.delivery,
        effective: txd.effective || '—', escrow: txd.escrow || '—', escrowAgent: txd.escrowAgent || '—',
        titleCo: txd.titleCo || '—', financing: txd.financing || (/financed/i.test(d.side+d.name) ? 'Financed' : 'Cash'), source: txd.source || 'Referral',
        contacts: (d.contacts||[]).map(c=>({ n:c.n, r:c.r })), dues: (d.dues||[]).map(x=>({ l:x.l, d:x.d })), acts: (d.acts||[]).map(a=>({ d:a.d, t:a.t }))
      };
      this.setState({ screen:'dealpage', pageDealName:d.name, dealPages:{ ...dpStore, [d.name]:init }, peekDeal:null, dpTab:'record' });
    };
    const dpKey = this.state.pageDealName;
    const dp = dpStore[dpKey];
    const isDealPage = scr==='dealpage' && !!dp;
    let dpv = {};
    if (isDealPage) {
      const save = (patch) => this.setState({ dealPages:{ ...dpStore, [dpKey]:{ ...dp, ...patch } } });
      const onF = (k)=>(e)=>save({ [k]: e.target.value });
      const gciK = parseFloat(String(dp.gci).replace(/[^0-9.]/g,'')) || 0;
      const stages = ['Prospecting','Warm','Hot','Under Contract','In Contract','Won','Lost'];
      dpv = {
        name: dp.name, side: dp.side, status: dp.status, stage: dp.stage,
        onName: onF('name'),
        stageSel: { value: dp.stage, onChange: onF('stage'), opts: stages.includes(dp.stage) ? stages : [dp.stage, ...stages] },
        probVal: String(dp.prob), onProb: (e)=>save({ prob: Math.max(0, Math.min(100, parseInt(e.target.value)||0)) }),
        econ: [
          { l:'Budget', k:'budget', v:dp.budget, onInput:onF('budget') },
          { l:'Est. GCI', k:'gci', v:dp.gci, onInput:onF('gci') },
          { l:'Closing / target', k:'closing', v:dp.closing, onInput:onF('closing') } ],
        weighted: '$' + Math.round(gciK * dp.prob / 100) + 'K',
        txFields: [
          { l:'Effective date', v:dp.effective, onInput:onF('effective') },
          { l:'Escrow deposit', v:dp.escrow, onInput:onF('escrow') },
          { l:'Escrow agent', v:dp.escrowAgent, onInput:onF('escrowAgent') },
          { l:'Title / escrow co.', v:dp.titleCo, onInput:onF('titleCo') },
          { l:'Financing', v:dp.financing, onInput:onF('financing') },
          { l:'Source', v:dp.source, onInput:onF('source') } ],
        propFields: [
          { l:'Address / unit', v:dp.address, onInput:onF('address') },
          { l:'Specs', v:dp.specs, onInput:onF('specs') },
          { l:'$ / SF', v:dp.ppsf, onInput:onF('ppsf') },
          { l:'Delivery / status', v:dp.delivery, onInput:onF('delivery') } ],
        contacts: dp.contacts.map((c,i)=>({ n:c.n, r:c.r, initials: c.n.split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(),
          onN:(e)=>{ const a=[...dp.contacts]; a[i]={...a[i], n:e.target.value}; save({contacts:a}); },
          onR:(e)=>{ const a=[...dp.contacts]; a[i]={...a[i], r:e.target.value}; save({contacts:a}); },
          onDel:()=>save({ contacts: dp.contacts.filter((_,x)=>x!==i) }) })),
        addContact: ()=>save({ contacts:[...dp.contacts, { n:'New contact', r:'Role' }] }),
        dues: dp.dues.map((x,i)=>({ l:x.l, d:x.d,
          onL:(e)=>{ const a=[...dp.dues]; a[i]={...a[i], l:e.target.value}; save({dues:a}); },
          onD:(e)=>{ const a=[...dp.dues]; a[i]={...a[i], d:e.target.value}; save({dues:a}); },
          onDel:()=>save({ dues: dp.dues.filter((_,x2)=>x2!==i) }) })),
        addDue: ()=>save({ dues:[...dp.dues, { l:'New milestone', d:'—' }] }),
        acts: dp.acts,
        noteVal: this.state.dpNote || '',
        onNote: (e)=>this.setState({ dpNote: e.target.value }),
        addNote: ()=>{ const v=(this.state.dpNote||'').trim(); if(!v) return;
          const entry = { id:'log'+Date.now(), type:'Note', name:dp.name, body:v, date:'Jul 06', outcome:'Logged' };
          this.setState(s=>({ dealPages:{ ...(s.dealPages||{}), [dpKey]:{ ...dp, acts:[{ d:'Jul 06', t:v }, ...dp.acts] } }, dpNote:'', loggedActs:[entry, ...(s.loggedActs||[])] }));
          this.pushAudit('Activity logged · ' + dp.name + ' — ' + v.slice(0,60)); },
        tabs: ['record','path','docs','acts', ...(/Listing|Seller/i.test(dp.side) ? ['seller'] : [])].map(id => {
          const labels = { record:'Record', path:'Critical Path', docs:'Documents', acts:'Activities', seller:'Seller Report' };
          const active = (this.state.dpTab||'record')===id;
          return { label:labels[id], onClick:()=>this.setState({ dpTab:id }),
            style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?400:300};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${active?'#0D0D0D':'#8F8F8F'};padding:14px 0;border-bottom:1px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;` };
        }),
        isRecord: (this.state.dpTab||'record')==='record',
        isPath: this.state.dpTab==='path',
        isDocs: this.state.dpTab==='docs',
        isActs: this.state.dpTab==='acts',
        isSeller: this.state.dpTab==='seller',
        path: (function(){
          const pathCurated = {
            'Sterling — Acqualina 4802': { closing:'Aug 15', days:'40', status:'2 items at risk', ml:[
              { d:'Jun 24', l:'Contract effective · distributed to all parties', o:'TC', st:'done' },
              { d:'Jun 27', l:'Escrow deposit confirmed · receipt filed to Drive', o:'Client', st:'done' },
              { d:'Jul 08', l:'Inspection period ends', o:'Inspector', st:'current', note:'Inspection Jul 07 confirmed · report chase armed T-2' },
              { d:'Jul 11', l:'HOA approval package', o:'TC', st:'risk', note:'Association requires 21 days — package must go out by Jul 11' },
              { d:'Jul 28', l:'Title commitment received', o:'Title Co.', st:'next' },
              { d:'Aug 13', l:'Walk-through', o:'You', st:'next' },
              { d:'Aug 14', l:'Closing statement review', o:'You', st:'next', note:'Agent flags deviations vs contract automatically' },
              { d:'Aug 15', l:'Closing · CDA disbursement', o:'TC', st:'next' } ],
              risks:[ 'HOA: 21-day approval window vs 38 days to close — package out by Jul 11 or closing slips', 'Inspection shortened by contract (10d vs 14 standard) — report due Jul 08, no extension' ] }
          };
          const pc = pathCurated[dp.name];
          const mlRaw = pc ? pc.ml : [
            ...dp.acts.slice(0,3).reverse().map(a=>({ d:a.d, l:a.t, o:'', st:'done' })),
            ...dp.dues.map((x,i)=>({ d:x.d, l:x.l, o:'', st: i===0?'current':'next' })) ];
          const chipDefs = { done:['✓ done','#8F8F8F'], current:['in motion','#0D0D0D'], risk:['at risk','#D0342C'], next:['upcoming','#8F8F8F'] };
          return {
            closing: pc?pc.closing:dp.closing, days: pc?pc.days:'—',
            status: pc?pc.status:'On track — agent chasing next item',
            statusColor: pc && /risk/i.test(pc.status) ? '#D0342C' : '#0D0D0D',
            ml: mlRaw.map(m=>({ ...m, note:m.note||'', hasNote:!!m.note, owner:m.o||'—',
              dot: m.st==='risk'?'#D0342C':(m.st==='current'?'#0D0D0D':(m.st==='done'?'#C7C7C7':'#E3E3E3')),
              chip: chipDefs[m.st][0], chipColor: chipDefs[m.st][1],
              labelColor: m.st==='done'?'#8F8F8F':'#0D0D0D', labelWeight: m.st==='current'||m.st==='risk'?500:400 })),
            risks: pc?pc.risks:[], hasRisks: !!(pc && pc.risks.length)
          };
        })(),
        drivePath: 'Drive / Transactions / 2026 / ' + dp.name,
        docStacks: (function(){
          const docsCurated = {
            'Sterling — Acqualina 4802': [
              { stack:'HOA / Condo', pri:'Action needed', docs:[
                { n:'HOA application package', st:'Draft ready — needs your approval', pri:'high' },
                { n:'Condo financials · budget', st:'Requested from association', pri:'med' } ] },
              { stack:'Diligence', pri:'Action needed', docs:[
                { n:'Inspection report', st:'Due Jul 08 · chase armed', pri:'high' },
                { n:'Seller disclosures', st:'Filed', d:'Jun 25', pri:'ok' } ] },
              { stack:'Contract', pri:'Complete', docs:[
                { n:'PSA · executed', st:'Filed', d:'Jun 24', pri:'ok' },
                { n:'Rider A · condominium', st:'Filed', d:'Jun 24', pri:'ok' },
                { n:'Escrow receipt', st:'Filed', d:'Jun 27', pri:'ok' } ] },
              { stack:'Title & Closing', pri:'Upcoming', docs:[
                { n:'Title commitment', st:'Ordered · due Jul 28', pri:'med' },
                { n:'Closing statement', st:'Aug 14 · deviation check armed', pri:'low' },
                { n:'CDA', st:'Auto-prepared at closing', pri:'low' } ] } ]
          };
          const raw = docsCurated[dp.name] || [
            { stack:'Contract', pri: dp.effective==='—' ? 'Upcoming' : 'Complete', docs:[
              { n:'Executed contract', st: dp.effective==='—' ? 'Pending — filed on receipt' : 'Filed · '+dp.effective, pri: dp.effective==='—'?'med':'ok' },
              { n:'Riders & addenda', st:'Auto-attached by deal type', pri:'low' } ] },
            { stack:'Escrow & Title', pri:'Upcoming', docs:[
              { n:'Escrow receipt', st:'Agent chases on effective date', pri:'med' },
              { n:'Title commitment', st:'Ordered at contract', pri:'med' } ] },
            { stack:'Diligence', pri:'Upcoming', docs:[
              { n:'Inspection report', st:'Scheduled by agent · chased T-2', pri:'med' },
              { n:'Disclosures', st:'Requested from counterparty', pri:'med' } ] },
            { stack:'Closing', pri:'Upcoming', docs:[
              { n:'Closing statement', st:'Deviation check vs contract — automatic', pri:'low' },
              { n:'CDA / commission', st:'Auto-prepared from split settings', pri:'low' } ] } ];
          return raw.map(s=>({ ...s,
            priColor: /action/i.test(s.pri)?'#D0342C':(/complete/i.test(s.pri)?'#0D0D0D':'#8F8F8F'),
            docs: s.docs.map(x=>({ ...x, meta: x.st + (x.d ? ' · '+x.d : ''),
              dot: { ok:'#0D0D0D', high:'#D0342C', med:'#5D5D5D', low:'#C7C7C7' }[x.pri]||'#8F8F8F' })) }));
        })(),
        mlsOpen: !!this.state.dpMlsOpen,
        toggleMls: ()=>this.setState({ dpMlsOpen: !this.state.dpMlsOpen }),
        mlsChevron: this.state.dpMlsOpen ? '▴' : '▾',
        mlsRows: (({
          'Sterling — Acqualina 4802': [['MLS #','A11482093'],['List date','Mar 14 2026 · 102 DOM'],['Year built','2015'],['Taxes · 2025','$118,400'],['Maintenance','$4,890 / mo'],['Parking','2 assigned + valet'],['Waterfront','Direct ocean · 400 ft frontage'],['Folio','12-2226-032-0480'],['Last sale','$8.9M · 2019'],['Furnished','Negotiable']],
          'Alvarez — Continuum 2904': [['MLS #','A11458761'],['List date','Feb 02 2026 · 142 DOM'],['Year built','2008'],['Taxes · 2025','$74,200'],['Maintenance','$3,610 / mo'],['Parking','2 assigned'],['Waterfront','Direct ocean · South of Fifth'],['Folio','02-4203-317-1120'],['Last sale','$5.1M · 2016'],['Furnished','No']],
          'Ravel — Faena 8C': [['MLS #','A11491377'],['List date','Apr 22 2026 · 63 DOM'],['Year built','2016'],['Taxes · 2025','$121,700'],['Maintenance','$5,240 / mo'],['Parking','2 + beach club'],['Waterfront','Direct ocean · Faena District'],['Folio','02-3226-081-0290'],['Last sale','Developer · 2016'],['Furnished','Partially']],
          'Chen — Waldorf Astoria 5301': [['MLS #','Pre-construction · developer'],['Contract date','Jun 18 2026'],['Delivery','2028 · TCO est. Q3'],['Deposit schedule','10 / 10 / 10 · balance at TCO'],['Maintenance est.','$4.10 / SF / mo'],['Parking','2 + storage'],['View','Biscayne Bay + skyline'],['Floor plan','53 line · 3,940 SF'],['Developer','PMG'],['Furnished','Decorator-ready']],
          'Sason — Rivage PH-B': [['MLS #','Pre-construction · developer'],['Contract date','Mar 02 2025'],['Delivery','Q4 2026 · slab at 40th floor'],['Deposit schedule','20 / 20 / 10 · balance at TCO'],['Maintenance est.','$3.85 / SF / mo'],['Parking','4 + private garage'],['View','Direct ocean · full floor'],['Floor plan','PH-B · 7,120 SF + 2,400 SF terrace'],['Developer','Related Group'],['Furnished','Finish selections in progress']],
          'Rivage PH-A · Marcelo C.': [['MLS #','Pre-construction · developer'],['Reservation','Jun 15 2026'],['Delivery','Q4 2027'],['Deposit schedule','20 / 20 / 10 · balance at TCO'],['Maintenance est.','$3.85 / SF / mo'],['Parking','4 + private garage'],['View','Direct ocean · full floor'],['Floor plan','PH-A · 6,240 SF + 2,100 SF terrace'],['Developer','Related Group'],['Furnished','Decorator-ready']]
        })[dp.name] || [['MLS #','Pending — pull from MLS'],['List date','—'],['Year built','—'],['Taxes','—'],['Maintenance','—'],['Parking','—'],['Waterfront / view','—'],['Folio','—'],['Last sale','—'],['Furnished','—']]).map(([l,v])=>({ l, v })),
        back: ()=>this.nav('pipeline'),
        openLegacy: ()=>{ (/(Sterling|Alvarez|Ravel|Chen|Sason)/.test(dp.name) ? goTc : goDeal)(); }
      };
    }

    // ---- Deal detail ----
    const prob = this.state.prob;
    const weighted = Math.round(555 * prob / 100);
    const weightedStr = '$' + weighted + 'K';
    const activity = dealSpec.act.map(a => ({ date:a[0], type:a[1], tag:a[2], tagColor: a[2]==='Advanced'?C.moss:C.conc, voice:!!a[3], body:a[4] }));
    // deal summary + associations
    const summaryFields = [
      { label:'Amount', value:'$18.5M' },
      { label:'Close Date', value:'Sep 2026' },
      { label:'Pipeline', value:'Buyers' },
      { label:'Division', value:'Collection' },
      { label:'Stage', value:'Tour Completed' },
      { label:'Asset Type', value:'Condo' },
      { label:'Source', value:'Referral · A. Bittencourt' }
    ];
    const quickActions = ['Note','Email','Call','Task','Meeting','More'];
    const dealActDefs = [['Log a call','Call'],['Send message','WhatsApp'],['Send email','Email'],['Schedule showing','Showing'],['Add note','Note'],['Add task','Task']];
    const dealActionOptions = dealActDefs.map(([label,val]) => ({ label,
      onClick:()=>this.setState({ screen:'activities', actView:'activity', logOpen:true, logType:val, logName: dealSpec.title, logBody:'', dealActionsOpen:false }) })).concat([{ label:'Voice memo → actions', onClick:()=>this.setState({ vmOpen:true, dealActionsOpen:false }) }]);

    const dealTab = this.state.dealTab;

    // ---- Deal · Documents & Compliance ----
    const dealView = this.state.dealView || 'documents';
    const docResolved = this.state.docResolved || {};
    const docSent = !!this.state.docSent;
    const docFieldDefs = [
      { label:'Purchase Price', value: dealSpec.docs.price, src:'CRM · approved offer strategy', review:false },
      { label:'Buyer', value: dealSpec.docs.buyer, src:'CRM · entity record', review:false },
      { label:'Escrow Deposit', value:'$1,790,000 · 10%', src:'assumed from deal norm — confirm', review:true, id:'escrow' },
      { label:'Escrow Agent', value:'Gables Title & Escrow', src:'proposed — used in 4 prior A/CO deals', review:true, id:'escrowAgent' },
      { label:'Closing Date', value: dealSpec.docs.close, src:'delivery schedule · confirmed', review:false },
      { label:'Inspection Period', value:'15 days · AS-IS right to cancel', src:'FAR/BAR AS-IS default', review:false },
      { label:'Financing', value:'Cash · no contingency · POF attached', src:'CRM · proof of funds Jun 26', review:false }
    ];
    const docFields = docFieldDefs.map(f => {
      const open = f.review && !docResolved[f.id];
      return { ...f,
        needs: open,
        rowBorder: open ? '#D0342C' : 'transparent',
        srcColor: open ? '#D0342C' : '#8F8F8F',
        tag: open ? 'NEEDS REVIEW' : (f.review ? 'CONFIRMED' : 'FILLED'),
        tagColor: open ? '#D0342C' : '#8F8F8F',
        onConfirm: ()=>this.setState(s=>({docResolved:{...(s.docResolved||{}), [f.id]:true}})) };
    });
    const docNeedsCount = docFields.filter(f=>f.needs).length;
    const canSendDoc = docNeedsCount === 0 && !docSent;
    const docSendLabel = docSent ? 'Sent · Out for signature' : (docNeedsCount>0 ? `Resolve ${docNeedsCount} field${docNeedsCount>1?'s':''} to send` : 'Approve & send · DocuSign');
    const docSendStyle = `border:0.5px solid ${docSent?'#8F8F8F':'#C9C7C1'};background:${canSendDoc?'#E9E8E4':'transparent'};color:${canSendDoc?'#0D0D0D':'#8F8F8F'};padding:12px 22px;white-space:nowrap;height:auto;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:300;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;cursor:${canSendDoc?'pointer':'default'};transition:all 150ms;`;
    const sendDoc = ()=>{ if(!canSendDoc) return; this.setState(s => ({ docSent:true, dsStage: { ...(s.dsStage||{}), [curDealKey]: 1 } })); this.pushAudit('DocuSign · envelope sent — ' + dealSpec.title + ' · ' + dsBuyer.split(' ·')[0] + ' → ' + dsSeller.split(' ·')[0]); this.ciToast('Envelope sent — DocuSign'); };
    const dsStage = docSent ? Math.max(1, (this.state.dsStage || {})[curDealKey] || 1) : 0;
    const dsSetStage = (n) => this.setState(s => ({ dsStage: { ...(s.dsStage || {}), [curDealKey]: n } }));
    const dsBuyer = (dealSpec.partyName || 'Buyer') + ' · ' + (dealSpec.track === 'list' ? 'seller' : dealSpec.track === 'lease' ? 'tenant' : 'buyer');
    const dsSeller = curDealKey.indexOf('Rivage') === 0 ? 'Rivage Development LLC · seller' : (dealSpec.track === 'list' ? 'Buyer side · counterparty' : dealSpec.track === 'lease' ? 'Landlord · counterparty' : 'Seller · listing side');
    const dsDone = dsStage >= 4;
    const docEnvelope = !docSent ? [] : [
      { who: dsBuyer, st: dsStage >= 3 ? 'Signed ✓ · today' : dsStage === 2 ? 'Viewed · in the envelope now' : 'Sent · awaiting signature', dot: dsStage >= 3 ? '#10A37F' : dsStage === 2 ? '#B45309' : '#D0342C' },
      { who: dsSeller, st: dsStage >= 4 ? 'Signed ✓ — envelope complete' : dsStage >= 3 ? 'Sent · signs 2nd — active now' : 'Queued · signs 2nd', dot: dsStage >= 4 ? '#10A37F' : dsStage >= 3 ? '#D0342C' : '#8F8F8F' },
      { who: 'A. Arraes · broker copy', st: dsStage >= 4 ? 'Delivered · executed copy' : 'Auto-CC on execution', dot: dsStage >= 4 ? '#10A37F' : '#8F8F8F' }
    ];
    const hasEnvelope = docSent;
    const dsStatusLine = ['', 'Envelope sent — the agent watches the webhook · reminder chase arms at T+24h', 'Opened 12 min ago — the agent holds the reminder while the envelope is active', 'First signature in — routed to the second signer automatically · nudge arms at T+24h', 'Fully executed — nothing left to chase on this envelope'][dsStage] || '';
    const dsEnvId = 'ENV-2607-' + (Math.abs(curDealKey.length * 137) % 900 + 100);
    const dsPillTxt = dsDone ? 'COMPLETED' : dsStage === 3 ? 'SIGNER 2 OF 2' : dsStage === 2 ? 'VIEWED' : 'SENT';
    const dsPillStyle = F0 + 'font-weight:600;font-size:8.5px;letter-spacing:0.12em;border-radius:999px;padding:3px 10px;' + (dsDone ? 'color:#10A37F;border:1px solid #B7E0D2;background:rgba(16,163,127,0.06);' : 'color:#B45309;border:1px solid #EAD9BF;background:rgba(180,83,9,0.05);');
    const dsPoll = () => { if (!docSent || dsDone) return; const n = dsStage + 1; dsSetStage(n);
      const msg = n === 2 ? 'DocuSign · envelope viewed by ' + (dealSpec.partyName || 'signer 1') : n === 3 ? 'DocuSign · signer 1 signed — routed to signer 2' : 'DocuSign · fully executed — filed to Drive · milestone updated';
      this.pushAudit(msg + ' — ' + dealSpec.title); this.ciToast(msg.replace('DocuSign · ', '')); };
    const dsRemind = () => { if (!docSent || dsDone) return; const who = dsStage >= 3 ? dsSeller : dsBuyer; this.pushAudit('DocuSign · manual reminder sent — ' + who + ' · ' + dealSpec.title); this.ciToast('Reminder sent — logged'); };
    const dsVoid = () => { this.setState(s => ({ docSent: false, dsStage: { ...(s.dsStage || {}), [curDealKey]: 0 } })); this.pushAudit('DocuSign · envelope voided — ' + dealSpec.title + ' · draft retained'); this.ciToast('Envelope voided — draft retained'); };
    const docChecklist = [
      { step:'01', form:'Buyer-Broker Agreement', meta:'Executed Jun 18 · DocuSign · filed to Drive', due:'done Jun 18', dot:'#0D0D0D', st:'Executed', pend:false },
      { step:'02', form:'Wire Fraud Advisory', meta:'Sent to client Jul 02 · acknowledged', due:'done Jul 02', dot:'#0D0D0D', st:'Done', pend:false },
      { step:'03', form:'FAR/BAR AS-IS Contract · rev. 6/25', meta: docSent ? (dsStage >= 4 ? 'Fully executed · filed to Drive · vault' : dsStage >= 3 ? 'Signature 2 of 2 · counterparty side' : 'Envelope out · signature order 1 of 2') : (docNeedsCount>0 ? docNeedsCount+' fields need review — gates everything below' : 'Ready to send · DocuSign'), due: docSent && dsStage >= 4 ? 'done' : 'due Jul 12', dot: docSent ? (dsStage >= 4 ? '#10A37F' : '#B45309') : '#D0342C', st: docSent ? (dsStage >= 4 ? 'Executed' : 'Out for signature') : 'Needs you', pend: !(docSent && dsStage >= 4) },
      { step:'04', form:'Rider A · Condominium', meta:'Auto-attached · signs together with the contract', due:'due Jul 12', dot:'#B45309', st:'Draft ready', pend:true },
      { step:'05', form:'Escrow Deposit Receipt', meta:'FREC rule — 3 business days after effective date · agent chases the receipt', due:'due Jul 17', dot:'#D0342C', st:'Upcoming', pend:true },
      { step:'06', form:'FIRPTA Certification', meta:'N/A · buyer is US entity', due:'—', dot:'#DCDCD8', st:'N/A', pend:false }
    ].map(d => ({ ...d,
      formStyle: 'font-family:system-ui,-apple-system,sans-serif;font-weight:' + (d.pend ? 500 : 400) + ';font-size:12.5px;color:' + (d.pend ? '#0D0D0D' : '#5D5D5D') + ';',
      metaStyle: 'font-family:system-ui,-apple-system,sans-serif;font-weight:300;font-size:11px;color:' + (d.pend ? '#5D5D5D' : '#8F8F8F') + ';margin-top:2px;',
      dueStyle: 'flex:none;font-family:system-ui,-apple-system,sans-serif;font-weight:' + (d.pend ? 500 : 300) + ';font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:' + (d.pend ? (d.dot === '#D0342C' ? '#D0342C' : '#B45309') : '#B8B8B8') + ';'
    }));
    const dlStepOf = (nm5) => { const n5 = String(nm5 || '').toLowerCase(); if (/rider/.test(n5)) return '04'; if (/escrow|deposit/.test(n5)) return '05'; if (/wire/.test(n5)) return '02'; if (/broker/.test(n5)) return '01'; if (/psa|purchase|contract|far|bar/.test(n5)) return '03'; return null; };
    docTools.dropDocs.forEach(f5 => { f5.stepLink = dlStepOf(f5.name); f5.unfiled = !f5.stepLink; });
    docChecklist.forEach(d5 => { d5.files = docTools.dropDocs.filter(f5 => f5.stepLink === d5.step); d5.hasFiles = d5.files.length > 0; });

    const complianceRail = [
      { rule:'Buyer-broker agreement before first showing', note:'Executed Jun 18 — gate passed', ok:true },
      { rule:'Form versions current', note:'FAR/BAR AS-IS rev. 6/25 · library up to date', ok:true },
      { rule:'Escrow deposit · FREC 3-business-day rule', note:'Clock starts at effective date — receipt will be chased', ok:false },
      { rule:'No legal advice', note:'Attorney review offered to client · logged', ok:true }
    ].map(r => ({ ...r, barColor: r.ok ? '#0D0D0D' : '#D0342C' }));
    const dlChatKey = curDealKey;
    const dlChatHist = (this.state.dealChats || {})[dlChatKey] || [];
    const dlStIdx = Math.min((this.state.dealStageOv||{})[curDealKey] ?? dealSpec.stageIdx, TRACKS[dealSpec.track].length - 1);
    const dealStageLabel = TRACKS[dealSpec.track][dlStIdx] || 'Qualified';
    const dlAgentReply = (qq) => {
      const q = qq.toLowerCase();
      const S = dealSpec; const first = (S.partyName || 'the client').split(' ')[0];
      const fc = S.tiles[2].value + ' ' + S.tiles[2].unit; const mom = S.tiles[0].value; const vel = S.tiles[1].value;
      const rows = S.comp.rows.map(r => r[0] + ' — ' + S.comp.a + ' ' + r[1] + ' · ' + S.comp.b + ' ' + r[2]).join('\n');
      if (/stress|risk|fall|wrong|weak/.test(q)) return 'Three ways ' + S.title + ' falls apart:\n1 · Momentum is priced in — stated ' + dlProbVal + '% vs signal ' + S.probSug + '%. A silent week erases the gap.\n2 · ' + (S.trend === 'At risk ↓' ? 'The trend already reads at-risk — every day without a logged touch compounds it.' : 'Single-option anchoring — ' + first + ' has no live alternative in play, which weakens urgency at the table.') + '\n3 · Calendar risk — ' + S.next + ' is due ' + S.due + '; miss it and the ' + fc + ' forecast slips a cycle.\n\nNumber 1 is the one I would kill first — want the pre-emptive touch drafted in ' + S.lang + '?';
      if (/offer|price|negoti|counter|bid/.test(q)) return (S.track === 'buy' ? 'Read the spread first: ' + S.comp.a + ' at ' + S.comp.rows[0][1] + ' vs ' + S.comp.b + ' at ' + S.comp.rows[0][2] + '. With ' + S.heat + ' heat and momentum ' + mom + '/100, I would open at roughly 94% of ask — cash posture, 30-day close, clean contingencies — and trade price for terms, not the reverse. Non-price levers: deposit schedule, inspection window, closing-date flexibility.' : S.track === 'list' ? 'Pricing power peaks in the first 14 days. Hold ' + S.budget + ' through week two, meet the market with staged proof — traffic, saves, broker feedback — and pre-commit the seller to one checkpoint: no offer above 96% by day 21, adjust once, decisively.' : 'On ' + S.budget + ': the lever is term length, not rate. Trade a longer commitment for the ask, or hold rate and give one month of flexibility on the start date.') + '\n\nWant this turned into a one-page strategy note for ' + first + '?';
      if (/comp|final|versus| vs |estates|alternat/.test(q)) return 'Head-to-head — ' + S.comp.a + ' vs ' + S.comp.b + ' (' + S.comp.count + '):\n' + rows + '\n\nNet: price the difference, not the unit. ' + S.comp.a + ' carries the client lean; make ' + S.comp.b + ' pay for its advantage in the negotiation narrative.';
      if (/close|timeline|path|when|forecast|schedule/.test(q)) return 'From ' + dealStageLabel + ', the remaining path: ' + (TRACKS[S.track].slice(dlStIdx + 1).join(' → ') || 'closing only') + '.\nCheckpoints on the calendar:\n' + S.plan.map(p => p[0] + ' — ' + p[1]).join('\n') + '\n\nForecast holds at ' + fc + ' if ' + S.due + ' lands. Velocity is ' + vel + ' per stage against a 12d book average — ' + (S.heat === 'HOT' ? 'ahead of pace.' : 'on pace, no slack.');
      if (/today|now|next|first|priorit/.test(q)) return 'One thing today: ' + S.next + ' — due ' + S.due + '. The draft is already staged in ' + S.lang + ' on the Dashboard tab; approve it and I watch the reply SLA. Right behind it: ' + S.plan[1][1] + ' (' + S.plan[1][0] + ').\n\nIf there is no reply by tomorrow 09:00 I stage the follow-up angle automatically — want that armed?';
      if (/draft|write|message|whats|email/.test(q)) return 'Two drafts are staged in ' + S.lang + ' — Soft Touch and Direct Advance. For ' + first + ' I would send Direct Advance: short, one concrete next step, a time anchor. Nothing goes out without your approval; inline edits are fine.\n\nWant a third angle — a scarcity read built on the comp set?';
      if (/client|who is|relationship|profile|language/.test(q)) return first + ' — ' + S.party + '. ' + S.narrative + '\nLanguage: everything goes out in ' + S.lang + '. On file: ' + S.rel.map(r => r[0] + ' (' + r[1] + ')').join(', ') + '.\n\nWhat angle do you want on the relationship — trust, urgency, or expansion to the family office?';
      return S.title + ' right now: ' + S.heat + ' · ' + dlProbVal + '% · ' + dealStageLabel + ' stage · momentum ' + mom + '/100 (' + S.trend + ') · velocity ' + vel + ' vs 12d avg. The move that matters: ' + S.next + ', due ' + S.due + '.\n\nPush me on any of it — offer strategy, stress-test, the comp set, or the close path.';
    };
    const dlChatSend = (raw) => {
      const q = (typeof raw === 'string' ? raw : (this.state.dlChatInput || '')).trim();
      if (!q) return;
      const reply = dlAgentReply(q);
      this.setState(s => ({ dlChatInput: '', dlChatTyping: true, dealChats: { ...(s.dealChats || {}), [dlChatKey]: [ ...((s.dealChats || {})[dlChatKey] || []), { who: 'u', txt: q } ] } }));
      this._chatEnd(); clearTimeout(this._dlChatT);
      this._dlChatT = setTimeout(() => { this._chatEnd(); this.setState(s => ({ dlChatTyping: false, dealChats: { ...(s.dealChats || {}), [dlChatKey]: [ ...((s.dealChats || {})[dlChatKey] || []), { who: 'a', txt: reply } ] } })); }, 900);
    };
    const dlChatSeed = 'This file is loaded — ' + dealSpec.title + ': ' + dealSpec.budget + ' · ' + dealSpec.heat + ' · ' + dlProbVal + '% at ' + dealStageLabel + ' stage. Ask me anything on this deal — strategy, risk, comps, timing — or start from a prompt below. Analysis stays here; nothing reaches ' + (dealSpec.partyName || 'the client').split(' ')[0] + ' without your approval.';
    const finP = (s) => { s = String(s || ''); const n = parseFloat(s.replace(/[^0-9.]/g, '')) || 0; return s.includes('M') ? n * 1000 : n; };
    const finGciK = finP(dealSpec.gci);
    const finOv = (this.state.finOverrides || {})[curDealKey] || {};
    const finRefSrc = /bittencourt/i.test(dealSpec.src || '');
    const finRefPctV = finOv.ref ?? (finRefSrc ? 25 : 0);
    const finHousePctV = finOv.house ?? 20;
    const setFinPct = (k2) => (e) => { const v = Math.max(0, Math.min(100, parseFloat(String(e.target.value).replace(/[^0-9.]/g, '')) || 0)); this.setState(s => ({ finOverrides: { ...(s.finOverrides || {}), [curDealKey]: { ...(((s.finOverrides || {})[curDealKey]) || {}), [k2]: v, touched: true } } })); };
    const finRefOn = /bittencourt/i.test(dealSpec.src || '');
    const finRefK = finRefOn ? finGciK * finRefPctV / 100 : 0;
    const finHouseK = (finGciK - finRefK) * finHousePctV / 100;
    const finNetK = finGciK - finRefK - finHouseK;
    const finFmt = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(2) + 'M' : '$' + (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + 'K';
    const finPct = (k) => finGciK ? Math.max(2, Math.round(k / finGciK * 100)) + '%' : '0%';
    const finClosed = dlProbVal >= 100;
    const finPayable = dlProbVal >= 90 && !finClosed;
    const finStatus = finClosed ? ['Received ✓', '#10A37F'] : finPayable ? ['Payable at closing', '#0D0D0D'] : ['Projected', '#B45309'];
    const finPre = /st regis|pre.?construction/i.test((dealSpec.title || '') + ' ' + (dealSpec.div || ''));
    const finClose = (dealSpec.docs && dealSpec.docs.close) || '—';
    const finKpis = [
      { label: 'Gross Commission', value: finFmt(finGciK), note: 'on ' + dealSpec.budget + ' · ' + finStatus[0].toLowerCase() },
      { label: 'Referral out', value: finRefOn ? '−' + finFmt(finRefK) : '—', note: finRefOn ? 'A. Bittencourt · ' + finRefPctV + '% — §6' : 'no referral on this file' },
      { label: 'Brokerage split', value: '−' + finFmt(finHouseK), note: finHousePctV + '% post-referral · house' },
      { label: 'Net income', value: finFmt(finNetK), note: finClosed ? 'settled' : 'projected · ' + finClose }
    ];
    const finFlow = [
      { label: 'Gross Commission — GCI', amt: finFmt(finGciK), w: '100%', c: '#0D0D0D' },
      ...(finRefOn ? [{ label: 'Referral fee — A. Bittencourt · ' + finRefPctV + '%', amt: '−' + finFmt(finRefK), w: finPct(finRefK), c: '#B45309' }] : []),
      { label: 'Brokerage split · ' + finHousePctV + '%', amt: '−' + finFmt(finHouseK), w: finPct(finHouseK), c: '#8F8F8F' },
      { label: 'Net income — yours', amt: finFmt(finNetK), w: finPct(finNetK), c: '#10A37F' }
    ];
    const finSched = finPre ? [
      { d: 'Jul 24, 2026', label: 'Deposit 1 · 20% — pro-rata commission §6.5', amt: finFmt(finGciK * 0.2), st: 'Armed', c: '#0D0D0D' },
      { d: 'Jan 2027', label: 'Deposit 2 · 20% — pro-rata commission', amt: finFmt(finGciK * 0.2), st: 'Projected', c: '#B45309' },
      { d: 'At delivery', label: 'Closing balance — remaining commission', amt: finFmt(finGciK * 0.6), st: 'Projected', c: '#B45309' }
    ] : [
      { d: finClose, label: 'Commission received — brokerage', amt: finFmt(finGciK), st: finStatus[0], c: finStatus[1] },
      ...(finRefOn ? [{ d: '+15 business days', label: 'Referral payout — wire costs to partner §7', amt: '−' + finFmt(finRefK), st: finClosed ? 'Paid ✓' : 'Scheduled', c: finClosed ? '#10A37F' : '#8F8F8F' }] : []),
      { d: 'Same day', label: 'Net disbursement — your account', amt: finFmt(finNetK), st: finClosed ? 'Settled ✓' : 'Auto', c: finClosed ? '#10A37F' : '#8F8F8F' }
    ];
    const qd0 = (this.state.dlQDone || {})[curDealKey] || {};
    const qPend = (this.state.dlSent ? 0 : 1) + ((dealSpec.mls || []).length > 0 && !qd0.mls ? 1 : 0) + (!qd0.tour && !this.state.dlTourSent ? 1 : 0) + (docNeedsCount > 0 && !docSent && !qd0.docs ? 1 : 0);
    const dealViewTabs = [['Overview','documents'],['Actions','dashboard'],['Agent','agent']].map(([label,id]) => {
      const active = dealView === id;
      const badge = id==='dashboard' && qPend > 0 ? ' · '+qPend : '';
      return { label: label+badge, onClick:()=>this.setState({dealView:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?500:400};font-size:12.5px;letter-spacing:0.04em;color:${active?'#0D0D0D':(id==='dashboard'&&qPend>0?'#D0342C':'#8F8F8F')};padding:7px 20px;border-radius:999px;background:${active?'#FFFFFF':'transparent'};box-shadow:${active?'0 2px 8px rgba(0,0,0,0.06)':'none'};cursor:pointer;transition:all 150ms;` };
    });

    const dealTabDefs = [['Overview','overview'],['Activities','activities']];
    const dealTabs = dealTabDefs.map(([label,id]) => {
      const active = dealTab === id;
      return { label, onClick:()=>this.setState({dealTab:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?400:300};font-size:13px;letter-spacing:0.06em;color:${active?C.ink:C.pedra};padding:16px 0;border-bottom:2px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });

    const actFilter = this.state.actFilter;
    const filterDefs = [['All','all',null],['Notes','notes','Note'],['Calls','calls','Call'],['Messages','messages','WhatsApp'],['Showings','showings','Showing']];
    const actFilters = filterDefs.map(([label,id]) => {
      const active = actFilter === id;
      return { label, onClick:()=>this.setState({actFilter:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${active?C.ink:C.pedra};padding-bottom:5px;border-bottom:1px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const filterType = (filterDefs.find(f => f[1] === actFilter) || [])[2];

    const associations = [ { title:'Contacts', count:String(dealSpec.assoc.contacts.length), items: dealSpec.assoc.contacts.map(x => ({ name:x[0], meta:x[1] })) }, ...(dealSpec.assoc.companies.length ? [{ title:'Companies', count:String(dealSpec.assoc.companies.length), items: dealSpec.assoc.companies.map(x => ({ name:x[0], meta:x[1] })) }] : []), { title:'Documents', count:String(dealSpec.assoc.docs.length), items: dealSpec.assoc.docs.map(x => ({ name:x[0], meta:x[1] })) } ];

    const D = this.state.drafts;
    const drafts = dealSpec.drafts.map((x, i) => ({ id: curDealKey + '|d' + i, kind: x[0], text: x[1] })).map(d => ({ ...d, approved: !!D[d.id], onApprove:()=>this.approveDraft(d.id) }));

    // ---- Deal dashboard ----
    // Path to Close · deal-specific track (not the funnel)
    const effStageIdx = Math.min((this.state.dealStageOv||{})[curDealKey] ?? dealSpec.stageIdx, TRACKS[dealSpec.track].length - 1);
    const pathToClose = TRACKS[dealSpec.track].map((label, i) => ({ label, st: i < effStageIdx ? 'done' : i === effStageIdx ? 'current' : 'future' }));
    const nextStageName = TRACKS[dealSpec.track][effStageIdx + 1] || null;
    const advLabel = nextStageName ? 'Advance · ' + nextStageName + ' ›' : 'Final stage ✓';
    const advBtnStyle = nextStageName
      ? F0 + 'font-weight:500;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#0D0D0D;background:#E9E8E4;border:1px solid #E0DFDA;border-radius:999px;padding:8px 16px;cursor:pointer;transition:opacity 150ms;'
      : F0 + 'font-weight:400;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#8F8F8F;background:transparent;border:1px solid #E3E3E3;border-radius:999px;padding:8px 16px;cursor:default;';
    const advanceStage = () => { if (!nextStageName) return; this.setState(s => ({ dealStageOv: { ...(s.dealStageOv||{}), [curDealKey]: effStageIdx + 1 } })); this.pushAudit('Stage advanced — ' + dealSpec.title + ' → ' + nextStageName + ' · ⌘Z to undo'); this.ciToast('Advanced — ' + nextStageName); };
    const stageSteps = pathToClose.map(({label, st}, i) => {
      const last = i === pathToClose.length - 1;
      return { label: (st==='done' ? '✓ ' : '') + label, last,
        sepStyle:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:200;font-size:12px;color:#C7C7C7;padding:0 8px 7px;${last?'display:none;':''}`,
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${st==='current'?400:300};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${st==='future'?'#8F8F8F':'#0D0D0D'};padding-bottom:7px;border-bottom:2px solid ${st==='current'?'#0D0D0D':'transparent'};white-space:nowrap;` };
    });

    const momentumFactors = dealSpec.momentum.map(m => ({ label:m[0], pct:String(m[1]), w:m[1]+'%' }));
    const intelTiles = dealSpec.tiles;
    const criticalPath = dealSpec.crit.map(c => ({ when:c[0], text:c[1], owner:c[2], whenColor: c[3] ? '#0D0D0D' : '#8F8F8F' }));
    const compRows = dealSpec.comp.rows.map(r => ({ label:r[0], a:r[1], b:r[2] }));

    // ---- TC ----
    const tcHead = ['Milestone','Owner','Deadline','Status','Action'];
    const mDone = { dot:C.moss, state:'Complete' };
    const mWait = { dot:C.pedra, state:'Pending' };
    const mCrit = { dot:C.ox, state:'Attention' };
    const milestones = [
      { name:'Executed contract distributed', owner:'TC', deadline:'Jun 24', ...mDone, textColor:C.ink, action:'—' },
      { name:'Escrow deposit confirmed', owner:'Buyer', deadline:'Jun 27', ...mDone, textColor:C.ink, action:'—' },
      { name:'Inspection period ends', owner:'Buyer', deadline:'Jul 08', dot:C.pedra, state:'T-2', textColor:C.ink, action:'Confirm report receipt' },
      { name:'HOA approval package', owner:'Seller', deadline:'Jul 11', dot:C.ox, state:'Prep overdue', textColor:C.ox, action:'Draft to association ready' },
      { name:'Title commitment', owner:'Title Co.', deadline:'Jul 22', ...mWait, textColor:C.ink, action:'—' },
      { name:'Insurance binder', owner:'Buyer', deadline:'Jul 29', ...mWait, textColor:C.ink, action:'—' },
      { name:'Walk-through', owner:'Buyer', deadline:'Aug 13', ...mWait, textColor:C.ink, action:'—' },
      { name:'Closing statement review', owner:'TC', deadline:'Aug 14', ...mWait, textColor:C.ink, action:'—' },
      { name:'CDA', owner:'Brokerage', deadline:'Aug 15', ...mWait, textColor:C.ink, action:'—' }
    ];

    // ---- Intelligence ----
    const intel = [
      { title:'Cluster Plays', body:'Four active buyers targeting the Acqualina / Rivage corridor — combined intent $61M. Proposed: an off-market sourcing sweep paired with a private preview event.' },
      { title:'Cross-Sell', body:'Two clients own unlisted waterfront assets. Listing conversations suggested while relationships are warm.' },
      { title:'Referral Mining', body:'Three WON relationships in the past 90 days without a referral ask — introduction drafts prepared.' }
    ].map((x,i)=>({ ...x, idx:'0'+(i+6) }));
    // ---- Reports ----
    const period = this.state.period || 'ytd';
    const periodDefs = [['This Month','month'],['This Quarter','quarter'],['Year to Date','ytd'],['All Time','all']];
    const periods = periodDefs.map(([label,id]) => {
      const active = period === id;
      return { label, onClick:()=>this.setState({period:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${active?C.ink:C.pedra};padding-bottom:5px;border-bottom:1px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const reportKpis = [
      { label:'Pipeline Value', value:'$397M' },
      { label:'Weighted Value', value:'$176.7M' },
      { label:'Potential GCI', value:'$12.0M' },
      { label:'Weighted GCI', value:'$5.3M' },
      { label:'HOT Leads', value:'34' },
      { label:'Closings · 30d', value:'3' },
      { label:'Overdue Follow-ups', value:'0' },
      { label:'Average Ticket', value:'$6.7M' }
    ];
    // Pipeline by Status
    const funnel = [
      { stage:'HOT', count:'34', width:'57%', conv:'' },
      { stage:'WARM', count:'16', width:'27%', conv:'' },
      { stage:'NURTURING', count:'60', width:'100%', conv:'' },
      { stage:'ON HOLD', count:'0', width:'1%', conv:'' },
      { stage:'WON', count:'0', width:'1%', conv:'' },
      { stage:'LOST', count:'9', width:'15%', conv:'' }
    ];
    // Activity & Outreach · productivity by period
    const actvP = this.state.repPeriod || 'month';
    const ACTV_DATA = {
      week:    { total:'142 touches this week', note:'vs 128 prior week', metrics:[
        ['Messages','48',12],['Calls','19',19],['Emails','27',-13],
        ['Showings','6',50],['Follow-ups','31',29],['Notes','11',10] ] },
      month:   { total:'566 touches this month', note:'vs 502 prior month', metrics:[
        ['Messages','193',9],['Calls','74',4],['Emails','108',-6],
        ['Showings','22',29],['Follow-ups','128',12],['Notes','41',8] ] },
      quarter: { total:'1,704 touches this quarter', note:'vs 1,488 prior quarter', metrics:[
        ['Messages','587',14],['Calls','221',8],['Emails','341',2],
        ['Showings','68',19],['Follow-ups','372',16],['Notes','115',6] ] }
    };
    const actvCur = ACTV_DATA[actvP];
    const actvScopeNote = 'scoped to ' + ({week:'this week',month:'this month',quarter:'this quarter'})[actvP] + ' — switch above';
    const actvMetrics = actvCur.metrics.map(([label,value,pct])=>{
      const neg = pct < 0;
      return { label, value, delta: (neg?'\u2193 ':'\u2191 ') + Math.abs(pct) + '%', deltaColor: neg ? '#B45309' : '#10A37F' }; });
    const actvPeriods = [['week','Week'],['month','Month'],['quarter','Quarter']].map(([id,label])=>{ const on = actvP===id;
      return { label, onClick:()=>this.setState({actvPeriod:id}),
        style:`cursor:pointer;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${on?600:400};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${on?'#0D0D0D':'#8F8F8F'};padding-bottom:3px;border-bottom:1px solid ${on?'#0D0D0D':'transparent'};transition:color 150ms;` }; });
    const repPeriods = [['week','Week'],['month','Month'],['quarter','Quarter']].map(([id,label])=>{ const on = actvP===id;
      return { label, onClick:()=>this.setState({repPeriod:id}),
        style:`cursor:pointer;user-select:none;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${on?600:400};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${on?'#0D0D0D':'#8F8F8F'};padding-bottom:3px;border-bottom:1px solid ${on?'#0D0D0D':'transparent'};transition:color 150ms;` }; });
    const repExport = () => { this.pushAudit('Reports · exported — PDF · scope ' + actvP); this.ciToast('Exported — PDF ready'); };
    // 12-month forecast · expected closings
    const production = [
      { m:'Jul', h:'5%', v:'3' },
      { m:'Aug', h:'2%', v:'1' },
      { m:'Sep', h:'50%', v:'30' },
      { m:'Oct', h:'1%', v:'0' },
      { m:'Nov', h:'27%', v:'16' },
      { m:'Dec', h:'1%', v:'0' },
      { m:'Jan', h:'100%', v:'60' },
      { m:'Feb', h:'1%', v:'0' }
    ];
    // Pipeline by Stage
    const divisionGci = [
      { label:'Qualified', value:'110', width:'100%' },
      { label:'Negotiation', value:'0', width:'1%' },
      { label:'Under Contract', value:'0', width:'1%' },
      { label:'Lost', value:'9', width:'8%' }
    ];
    // Pipeline by Asset Type (value)
    const sources = [
      { name:'Condo', deals:'', gci:'$274.5M' },
      { name:'Commercial', deals:'', gci:'$50.0M' },
      { name:'Listing', deals:'', gci:'$49.1M' },
      { name:'Development', deals:'', gci:'$14.0M' },
      { name:'Industrial', deals:'', gci:'$8.5M' },
      { name:'Investment Acquisition', deals:'', gci:'$5.0M' }
    ];
    const forecast = [
      { m:'July', value:'$152K' },
      { m:'August', value:'$42K' },
      { m:'September', value:'$4.40M' },
      { m:'October', value:'$0' },
      { m:'November', value:'$599K' },
      { m:'December', value:'$0' }
    ];
    const topDeals = [
      { name:'Zurich FO · Golden Beach', wgci:'$504K', width:'100%' },
      { name:'Faena Penthouse', wgci:'$460K', width:'91%' },
      { name:'Marcelo · Rivage PH-A', wgci:'$412K', width:'82%' },
      { name:'Sterling · Acqualina 4802', wgci:'$308K', width:'61%' },
      { name:'Estates at Acqualina', wgci:'$256K', width:'51%' },
      { name:'Continuum 2904 · Alvarez', wgci:'$216K', width:'43%' }
    ];
    const velocity = [
      { stage:'Lead → Qualified', days:'6d', width:'14%' },
      { stage:'Qualified → Tour', days:'9d', width:'21%' },
      { stage:'Tour → Offer', days:'14d', width:'33%' },
      { stage:'Offer → Negotiation', days:'11d', width:'26%' },
      { stage:'Negotiation → Contract', days:'18d', width:'43%' },
      { stage:'Contract → Close', days:'42d', width:'100%' }
    ];
    const priceBands = [
      { band:'$4–10M', count:'18', h:'100%' },
      { band:'$10–20M', count:'14', h:'78%' },
      { band:'$20–35M', count:'9', h:'50%' },
      { band:'$35M +', count:'5', h:'28%' }
    ];
    const geography = [
      { area:'Sunny Isles', value:'$118M', width:'100%' },
      { area:'Bal Harbour', value:'$96M', width:'82%' },
      { area:'Golden Beach', value:'$80M', width:'68%' },
      { area:'Fisher Island', value:'$64M', width:'54%' },
      { area:'Brickell', value:'$44M', width:'40%' }
    ];
    const lossReasons = [
      { reason:'Price / valuation gap', count:'9', width:'100%' },
      { reason:'Timeline / delivery', count:'6', width:'67%' },
      { reason:'Chose competitor', count:'5', width:'56%' },
      { reason:'Financing', count:'3', width:'33%' }
    ];
    const assetMix = [
      { label:'Condo', pct:'52%', shade:'#0D0D0D' },
      { label:'Estate', pct:'24%', shade:'#303030' },
      { label:'Waterfront lot', pct:'14%', shade:'#5D5D5D' },
      { label:'Commercial', pct:'10%', shade:'#8F8F8F' }
    ];

    // ---- Contacts ----
    const contacts = [ ...(this.state.gcAdded || []),
      { id:'marcelo', name:'Marcelo Carvalho', category:'client', relationship:'Client · Buyer', location:'São Paulo, BR', dot:C.moss, status:'HOT',
        phone:'+55 11 9 8842 ····', email:'m.carvalho@···', since:'2026', lifetime:'$555K', dealsWon:'0', active:'1', lastTouch:'Jul 04',
        tags:['Ultra-HNW','Cash buyer','Referral'], prefAsset:'Penthouse condo', prefAreas:'Sunny Isles · Bal Harbour', prefBudget:'$15–20M',
        narrative:'Introduced by A. Bittencourt. High-conviction cash buyer relocating part-time to Miami. Decisive once the family aligns; spouse weighs heavily on final call. Prefers privacy and off-market access.',
        agentNote:'Confirm the second Rivage visit before Wednesday — momentum is above the stated probability.',
        deals:[{ name:'Rivage PH-A', stage:'Tour Completed', value:'$18.5M', side:'Buyer', prob:'45%', close:'Sep 2026', wgci:'$412K', source:'Referral · A. Bittencourt', next:'Confirm 2nd visit · send developer schedule', nextDate:'Jul 08', specs:'4 BD · 5.5 BA · 6,240 SF · full floor', ppsf:'$2,965 / SF', financing:'Cash' }],
        touches:[
          { date:'Jul 04', type:'Showing', body:'Toured PH-A with spouse. Strong response to layout; open concern on construction timeline.' },
          { date:'Jul 02', type:'WhatsApp', body:'Shared developer brochure and finish schedule.' },
          { date:'Jun 14', type:'Note', body:'Referral introduction via A. Bittencourt.' } ] },
      { id:'keller', name:'Anton Keller', category:'prospect', relationship:'Prospect · Family Office', location:'Zurich, CH', dot:C.moss, status:'HOT',
        phone:'+41 44 ··· ····', email:'a.keller@zfo.ch', since:'2026', lifetime:'—', dealsWon:'0', active:'1', lastTouch:'Jul 03',
        tags:['Family office','Institutional','Discreet'], prefAsset:'Waterfront compound', prefAreas:'Golden Beach · Indian Creek', prefBudget:'$25–30M',
        narrative:'Represents a Zurich family office seeking a trophy waterfront compound. Process-driven; decisions require principal sign-off. Values discretion above speed.',
        agentNote:'Push a principal call before Wednesday — counter has been open since Thursday.',
        deals:[{ name:'Golden Beach Compound', stage:'Negotiation', value:'$28M' }],
        touches:[
          { date:'Jul 03', type:'Call', body:'Reviewed counter terms; principal availability next week.' },
          { date:'Jun 26', type:'Email', body:'Sent comparative valuation on two compounds.' } ] },
      { id:'sterling', name:'Robert Sterling', category:'client', relationship:'Client · Buyer', location:'New York, US', dot:C.moss, status:'HOT',
        phone:'+1 212 ··· ····', email:'r.sterling@···', since:'2025', lifetime:'$196K', dealsWon:'1', active:'1', lastTouch:'Jul 03',
        tags:['Repeat client','Cash buyer'], prefAsset:'Oceanfront condo', prefAreas:'Sunny Isles', prefBudget:'$10–12M',
        narrative:'Repeat client, second acquisition. Financing approved but paying cash. Comparing the Acqualina unit against an Estates listing — leaning Acqualina on services.',
        agentNote:'Schedule the decisive tour this week; inspection window closes Jul 08.',
        deals:[{ name:'Acqualina 4802', stage:'Under Contract', value:'$11.4M' }],
        touches:[
          { date:'Jul 03', type:'Call', body:'Confirmed financing; scheduling final tour.' },
          { date:'Jun 21', type:'Note', body:'Comparing Acqualina vs Estates unit.' } ] },
      { id:'bittencourt', name:'Ana Bittencourt', category:'sphere', relationship:'Sphere · Referrer', location:'Miami, US', dot:C.pedra, status:'SPHERE',
        phone:'+1 305 ··· ····', email:'ana@···', since:'2019', lifetime:'$1.2M', dealsWon:'7', active:'0', lastTouch:'Jun 30',
        tags:['Top referrer','Sphere','Advocate'], prefAsset:'—', prefAreas:'—', prefBudget:'—',
        net:{ got:'7 referrals · $1.2M GCI', gave:'2 introductions', bal:'You owe', balColor:'#D0342C', move:'Zurich FO attorney intro + lunch in São Paulo', slaLine:'' },
        narrative:'Longest-standing referral source. Introduced seven closed relationships since 2019, including Marcelo Carvalho. Warm, well-connected across São Paulo private capital.',
        agentNote:'No referral ask in 90 days — draft a warm re-engagement prepared.',
        deals:[],
        touches:[
          { date:'Jun 30', type:'Note', body:'Introduced Marcelo Carvalho; thanked and kept warm.' },
          { date:'Apr 12', type:'Meeting', body:'Coffee in São Paulo; discussed two upcoming buyers.' } ] },
      { id:'zanotti', name:'Valdemar Zanotti', category:'client', relationship:'Client · Past', location:'Miami, US', dot:C.pedra, status:'PAST',
        phone:'+1 305 ··· ····', email:'v.zanotti@···', since:'2012', lifetime:'$410K', dealsWon:'1', active:'0', lastTouch:'2024',
        tags:['Past client','Advocate'], prefAsset:'Tower condo', prefAreas:'Sunny Isles', prefBudget:'$3–5M',
        narrative:'Closed Portofino Tower #2302 in 2012. Loyal advocate and occasional referrer. Candidate for a cross-sell conversation on an unlisted waterfront asset.',
        agentNote:'Owns an unlisted waterfront asset — listing conversation suggested.',
        deals:[{ name:'Portofino Tower #2302', stage:'Closed Won', value:'$4.2M' }],
        touches:[
          { date:'Dec 2024', type:'Note', body:'Annual check-in; mentioned waterfront lot holding.' } ] },
      { id:'nakamura', name:'Kenji Nakamura', category:'prospect', relationship:'Prospect · Buyer', location:'Tokyo, JP', dot:C.pedra, status:'WARM',
        phone:'+81 3 ···· ····', email:'k.nakamura@···', since:'2026', lifetime:'—', dealsWon:'0', active:'1', lastTouch:'Jul 01',
        tags:['Institutional','Long horizon'], prefAsset:'Oceanfront condo', prefAreas:'Bal Harbour', prefBudget:'$8–10M',
        narrative:'Represents a Tokyo holding company. Long decision horizon; values documentation and clear process. Offer submitted, awaiting counter.',
        agentNote:'Follow up on the open offer — response due this week.',
        deals:[{ name:'Bal Harbour 1503', stage:'Offer Submitted', value:'$9.8M' }],
        touches:[
          { date:'Jul 01', type:'Email', body:'Submitted offer package; awaiting counter.' } ] },
      { id:'ravel', name:'Elena Ravel', category:'prospect', relationship:'Prospect · Buyer', location:'Paris, FR', dot:C.pedra, status:'WARM',
        phone:'+33 1 ·· ·· ·· ··', email:'e.ravel@···', since:'2026', lifetime:'—', dealsWon:'0', active:'1', lastTouch:'Jun 28',
        tags:['Design-led','Discreet'], prefAsset:'Branded residence', prefAreas:'Faena · Brickell', prefBudget:'$8–10M',
        narrative:'Design-led buyer drawn to branded residences. Responsive to curated, editorial presentation. In negotiation on the Faena unit.',
        agentNote:'HOA approval package pending — due Jul 11; keep momentum.',
        deals:[{ name:'Faena 8C', stage:'Negotiation', value:'$9.2M' }],
        touches:[
          { date:'Jun 28', type:'Showing', body:'Second viewing of Faena 8C; positive on finishes.' } ] },
      { id:'alvarez', name:'Carlos Alvarez', category:'client', relationship:'Client · Buyer', location:'Bogotá, CO', dot:C.pedra, status:'WARM',
        phone:'+57 1 ··· ····', email:'c.alvarez@···', since:'2025', lifetime:'$410K', dealsWon:'1', active:'1', lastTouch:'Jul 02',
        tags:['Repeat client'], prefAsset:'Tower condo', prefAreas:'Sunny Isles', prefBudget:'$6–8M',
        narrative:'Repeat buyer under contract on Continuum 2904. Appraisal pending; otherwise clean cash transaction.',
        agentNote:'Appraisal pending — confirm receipt before Jul 18 close.',
        deals:[{ name:'Continuum 2904', stage:'Under Contract', value:'$7.2M' }],
        touches:[
          { date:'Jul 02', type:'Call', body:'Confirmed appraisal ordered; close on track for Jul 18.' } ] },
      { id:'delgado', name:'M. Delgado', category:'vendor', relationship:'Vendor · RE Attorney', location:'Miami, US', dot:C.moss, status:'VENDOR',
        phone:'+1 305 ··· ····', email:'delgado@···law.com', since:'2021', lifetime:'9 deals', dealsWon:'9', active:'2', lastTouch:'Jul 01',
        tags:['Attorney','Top vendor','96% on-time'], prefAsset:'—', prefAreas:'—', prefBudget:'—',
        narrative:'Primary RE attorney. Nine transactions together — 96% on-time, 2h average response. Handles both A/CO sides when permitted.',
        agentNote:'Cadence: lunch due this quarter — 3 closings together this year.',
        net:{ got:'Legal cover on 9 closings', gave:'9 transactions of work', bal:'Even', balColor:'#5D5D5D', move:'Quarterly lunch — due this quarter', slaLine:'On pattern · 2h avg response · 96% on-time' },
        deals:[], touches:[
          { date:'Jul 01', type:'Email', body:'Sterling HOA package — legal review returned same day.' },
          { date:'Jun 12', type:'Call', body:'Alvarez contract — rider language agreed.' } ] },
      { id:'coastal', name:'Coastal Title Co.', category:'vendor', relationship:'Vendor · Title', location:'Miami, US', dot:C.ox, status:'SLIPPING',
        phone:'+1 305 ··· ····', email:'orders@coastal···', since:'2022', lifetime:'7 deals', dealsWon:'7', active:'1', lastTouch:'Jun 30',
        tags:['Title','SLA watch'], prefAsset:'—', prefAreas:'—', prefBudget:'—',
        narrative:'Title company on 7 transactions. SLA slipping — current commitment on day 7 of a usual 5. 71% on-time, 26h response.',
        agentNote:'Chase title commitment today — day 7 of usual 5. Consider First American for next contract.',
        net:{ got:'Title on 7 closings', gave:'7 orders', bal:'Watch', balColor:'#D0342C', move:'Chase today · reassess after this closing', slaLine:'Slipping · 26h response · 71% on-time' },
        deals:[], touches:[
          { date:'Jun 30', type:'Email', body:'Chased Ravel title commitment — no response yet.' } ] },
      { id:'katz', name:'R. Katz', category:'partner', relationship:'Partner · Co-broke', location:'Miami, US', dot:C.moss, status:'PARTNER',
        phone:'+1 786 ··· ····', email:'rkatz@···', since:'2023', lifetime:'$380K', dealsWon:'4', active:'1', lastTouch:'Jun 22',
        tags:['Co-broke','Referral partner'], prefAsset:'—', prefAreas:'—', prefBudget:'—',
        narrative:'Co-broke partner across Sunny Isles inventory. Two buyers sent, two listings shared — relationship in balance and productive.',
        agentNote:'Coffee due this month — explore off-market inventory swap.',
        net:{ got:'2 buyers', gave:'2 listings', bal:'Even', balColor:'#5D5D5D', move:'Coffee · July — off-market inventory swap', slaLine:'' },
        deals:[], touches:[
          { date:'Jun 22', type:'WhatsApp', body:'Shared feedback on Acqualina 4805 showing.' } ] },
      { id:'itau', name:'Private Banker · Itaú Miami', category:'partner', relationship:'Partner · Private Bank', location:'Miami, US', dot:C.ox, status:'YOU OWE',
        phone:'+1 305 ··· ····', email:'—', since:'2024', lifetime:'1 intro', dealsWon:'1', active:'0', lastTouch:'May 28',
        tags:['Private bank','UHNW pipeline'], prefAsset:'—', prefAreas:'—', prefBudget:'—',
        narrative:'Sent one UHNW introduction that became a client. Nothing reciprocated yet — balance pending on your side.',
        agentNote:'Reciprocate: introduce the Duarte family this month.',
        net:{ got:'1 UHNW intro', gave:'0', bal:'You owe', balColor:'#D0342C', move:'Introduce the Duarte family — this month', slaLine:'' },
        deals:[], touches:[
          { date:'May 28', type:'Meeting', body:'Coffee — discussed referral flow both ways.' } ] }
    ];
    const contactSegDefs = [['All','all'],['Clients','client'],['Prospects','prospect'],['Sphere','sphere'],['Partners','partner'],['Vendors','vendor']];
    const seg = this.state.contactSeg || 'all';

    // ---- Contacts · Queue (day-to-day engine) ----
    const cView = this.state.contactView || 'directory';
    const contactViews = [['Directory','directory'],['Queue','queue']].map(([label,id]) => {
      const active = cView === id;
      return { label, onClick:()=>this.setState({contactView:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?400:300};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${active?'#0D0D0D':'#8F8F8F'};padding-bottom:8px;border-bottom:1px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;`};
    });
    const isQueueView = cView === 'queue';
    const isDirView = cView === 'directory';
    const touched = this.state.touchedQueue || {};
    const snoozed = this.state.snoozedQueue || {};
    const queueRaw = [
      { id:'q1', name:'Marcelo Carvalho', status:'HOT', cycle:'3d', clock:'Day 4 of 3', overdue:true, ctx:'Confirm 2nd visit · send developer construction schedule', wgci:'$412K', draft:true, best:'17–19h BRT', min:8, mode:'You', channel:'Call', signal:'↗ replied 2× faster this week',
        brief:{ last:'Toured PH-A Sat with spouse — loved layout, concern on construction timeline', goal:'Confirm 2nd visit + hand over developer schedule (attached)', draft:'"Marcelo, consegui o cronograma oficial da obra — 3 pontos que respondem a preocupação da Fernanda. Te ligo às 17h?"' } },
      { id:'q2', name:'Family Office · Zurich', status:'HOT', cycle:'3d', clock:'Day 3 of 3', overdue:false, ctx:'Counter pending since Thu — push principal call before Wed', wgci:'$288K', draft:true, best:'08–10h CET', min:10, mode:'You', channel:'Call',
        brief:{ last:'Counter open since Thursday — Keller reviewing with principal', goal:'Force the principal call before Wednesday — offer two windows', draft:'"Anton — the seller is entertaining a second party Thursday. Can we get the principal on for 15 minutes tomorrow 8-10h your time?"' } },
      { id:'q3', name:'R. Sterling', status:'HOT', cycle:'3d', clock:'Day 2 of 3', overdue:false, ctx:'Financing approved — schedule decisive tour vs Estates', wgci:'$196K', draft:true, best:'12–14h EST', min:6, mode:'You', channel:'WhatsApp', signal:'↗ opened tour report 3× yesterday',
        brief:{ last:'Financing approved Jul 03 — still comparing vs Estates unit', goal:'Lock the decisive tour this week — inspection window closes Jul 08', draft:'"Robert — both units available Thursday afternoon. One visit, side by side, and you decide. 2pm?"' } },
      { id:'q4', name:'Coral Gables buyer', status:'WARM', cycle:'7d', clock:'Day 11 of 7', overdue:true, ctx:'3 unanswered touches — re-engage with new angle (agent suggests downgrade)', wgci:'$96K', draft:true, min:4, mode:'Assisted', channel:'WhatsApp',
        brief:{ last:'3 unanswered touches over 11 days', goal:'One last angle (new inventory) — if silent, approve downgrade to agent-run', draft:'"Saiu uma unidade nova no perfil que você procurava — quer que eu segure antes de abrir ao mercado?"' } },
      { id:'q5', name:'D. Nakamura', status:'WARM', cycle:'7d', clock:'Day 6 of 7', overdue:false, ctx:'Bal Harbour 1503 closing Jul 18 — pre-closing check-in', wgci:'$400K', draft:false, min:5, mode:'You', channel:'Call',
        brief:{ last:'Clean transaction — appraisal in, closing Jul 18', goal:'Pre-closing reassurance call — walk-through logistics', draft:'' } },
      { id:'q6', name:'A. Bittencourt', status:'PAST', cycle:'90d', clock:'Day 94 of 90', overdue:true, ctx:'WON 94 days ago, no referral ask — draft prepared', wgci:'—', draft:true, min:3, mode:'Assisted', channel:'WhatsApp',
        brief:{ last:'7 referrals lifetime — none asked in 94 days', goal:'Warm referral ask + retribute (Zurich FO attorney intro)', draft:'"Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?"' } },
      { id:'q7', name:'V. Petrov', status:'PAST', cycle:'90d', clock:'Day 61 of 90', overdue:false, ctx:'Anniversary of Sunny Isles purchase Aug 02 — gesture proposed', wgci:'—', draft:false, min:2, mode:'Run', channel:'WhatsApp',
        brief:{ last:'Purchase anniversary Aug 02 — agent proposes a gesture', goal:'Approve the gesture — agent executes end to end', draft:'' } }
    ];
    const qSelIdx = this.state.qSel || 0;
    const queueRows = queueRaw.map((q,i) => {
      const done = !!touched[q.id];
      const snooze = snoozed[q.id];
      const inactive = done || !!snooze;
      const isSel = i === qSelIdx;
      return { ...q, rank: String(i+1).padStart(2,'0'),
        done, isSnoozed: !!snooze, isActive: !inactive,
        rowBg: isSel ? '#ECECEC' : 'transparent',
        selBar: isSel ? '#0D0D0D' : 'transparent',
        snoozeLabel: snooze ? ('Snoozed · returns ' + snooze) : '',
        onLog: ()=>this.setState(s=>{ const t={...(s.touchedQueue||{})}; t[q.id]=!t[q.id]; return {touchedQueue:t}; }),
        onSnooze1: ()=>this.setState(s=>{ const t={...(s.snoozedQueue||{})}; t[q.id] = t[q.id] ? undefined : 'Tue'; return {snoozedQueue:t}; }),
        onSnooze3: ()=>this.setState(s=>{ const t={...(s.snoozedQueue||{})}; t[q.id] = t[q.id] ? undefined : 'Thu'; return {snoozedQueue:t}; }),
        dot: inactive ? '#8F8F8F' : (q.overdue ? '#D0342C' : (q.status==='HOT' ? '#0D0D0D' : '#8F8F8F')),
        nameColor: inactive ? '#8F8F8F' : '#0D0D0D',
        deco: done ? 'line-through' : 'none',
        rowOpacity: snooze ? '0.55' : '1',
        clockColor: inactive ? '#8F8F8F' : (q.overdue ? '#D0342C' : '#5D5D5D'),
        clockLabel: q.status+' · '+q.cycle+' cadence · '+q.clock,
        hasBest: !!q.best && !inactive,
        bestLabel: q.best ? ('best window · ' + q.best) : '',
        hasSignal: !!q.signal && !inactive, signalLabel: q.signal || '',
        modeChip: q.mode === 'You' ? 'YOU' : (q.mode === 'Assisted' ? 'ASSISTED' : 'AGENT-RUN'),
        modeColor: q.mode === 'You' ? '#0D0D0D' : '#8F8F8F',
        minLabel: q.min + ' min',
        perMin: q.wgci !== '—' ? ('$' + Math.round((parseFloat(q.wgci.replace(/[^0-9.]/g,''))||0) / q.min) + 'K/min') : 'relationship',
        briefOpen: this.state.qBriefOpen === q.id,
        onBrief: ()=>this.setState(s=>({ qBriefOpen: s.qBriefOpen === q.id ? null : q.id })),
        briefLast: q.brief ? q.brief.last : '', briefGoal: q.brief ? q.brief.goal : '',
        briefDraft: q.brief ? q.brief.draft : '', hasBriefDraft: !!(q.brief && q.brief.draft),
        sentLabel: (this.state.qSent||{})[q.id] || '', isSent: !!(this.state.qSent||{})[q.id], notSent: !((this.state.qSent||{})[q.id]),
        id: q.id,
        waSelectable: (q.channel||'WhatsApp') === 'WhatsApp' && !inactive && !((this.state.qSent||{})[q.id]),
        waSel: !!((this.state.qWaSel||{})[q.id]),
        onWaSel: (e)=>{ e.stopPropagation(); this.setState(s=>({ qWaSel: { ...(s.qWaSel||{}), [q.id]: !((s.qWaSel||{})[q.id]) } })); },
        waCheckBg: ((this.state.qWaSel||{})[q.id]) ? '#0D0D0D' : 'transparent',
        showDraftLine: !!(q.brief && q.brief.draft) && (q.channel||'WhatsApp') === 'WhatsApp' && !inactive && !((this.state.qSent||{})[q.id]),
        draftLine: (q.brief && typeof q.brief.draft === 'string') ? String(q.brief.draft).replace(/^"|"$/g,'') : '',
        onSendWa: ()=>{ this.setState(s=>({ qSent:{ ...(s.qSent||{}), [q.id]:'Sent · WhatsApp · queued to clipboard' }, touchedQueue:{ ...(s.touchedQueue||{}), [q.id]:true } })); this.pushAudit('Queue · draft sent via WhatsApp · ' + q.name); },
        onSendEmail: ()=>{ this.setState(s=>({ qSent:{ ...(s.qSent||{}), [q.id]:'Sent · Email · via Gmail' }, touchedQueue:{ ...(s.touchedQueue||{}), [q.id]:true } })); this.pushAudit('Queue · draft sent via Email · ' + q.name); }
      };
    });
    const queueOpenCount = String(queueRows.filter(q=>q.isActive).length);
    const queueDoneCount = String(queueRows.filter(q=>q.done).length);
    const queueAllDone = queueRows.every(q=>!q.isActive);
    // batching by context + attention budget + defended value
    const chanOrder = ['Call','WhatsApp','Field'];
    const queueGroups = chanOrder.map(ch => {
      const rows = queueRows.filter(q => (q.channel||'WhatsApp') === ch);
      const mins = rows.filter(q=>q.isActive).reduce((s,q)=>s+q.min,0);
      if (!rows.length) return null;
      const isWa = ch === 'WhatsApp';
      const waRows = isWa ? rows.filter(r => r.waSelectable) : [];
      const selRows = waRows.filter(r => r.waSel);
      const waSendAll = (list, how) => { if (!list.length) return; const qs = { ...(this.state.qSent||{}) }, tq = { ...(this.state.touchedQueue||{}) }; list.forEach(r => { qs[r.id] = 'Sent · WhatsApp · queued to clipboard'; tq[r.id] = true; }); this.setState({ qSent: qs, touchedQueue: tq, qWaSel: {} }); this.pushAudit('Queue · WhatsApp batch approved (' + how + ') — ' + list.length + ' draft(s) sent 1:1, each in the contact language · all logged'); this.ciToast(list.length + ' approved — agent sending 1:1 · logged'); };
      return { label: ch === 'Call' ? 'Calls' : (ch === 'WhatsApp' ? 'WhatsApp · approve & send' : 'Field'), mins: mins + ' min', rows,
        isWa: isWa && waRows.length > 0, hasWaSel: selRows.length > 0, waSelCount: String(selRows.length),
        onWaApproveSel: ()=>waSendAll(selRows, 'selected'), onWaApproveAll: ()=>waSendAll(waRows, 'all remaining') };
    }).filter(Boolean);
    const qPlannedMin = queueRows.filter(q=>q.isActive).reduce((s,q)=>s+q.min,0);
    const qDoneMin = queueRows.filter(q=>q.done).reduce((s,q)=>s+q.min,0);
    const qDefended = queueRows.filter(q=>q.done).reduce((s,q)=>s+(parseFloat((q.wgci||'').replace(/[^0-9.]/g,''))||0),0);
    const qBudgetLine = 'Attention budget · ' + qPlannedMin + ' min planned';
    const qDefendedLine = qDefended > 0 ? ('Defended today · $' + Math.round(qDefended) + 'K weighted GCI in ' + qDoneMin + ' min') : 'Nothing touched yet — the queue is worth $1.39M weighted';

    const contactSegments = contactSegDefs.map(([label,id]) => {
      const active = seg === id;
      return { label, onClick:()=>this.setState({contactSeg:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${active?C.ink:C.pedra};padding-bottom:5px;border-bottom:1px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const ctSegKey = { all:'all', client:'clients', prospect:'prospects', sphere:'sphere', partner:'partners', vendor:'vendors' }[seg] || 'all';
    const ctSel = relData[ctSegKey] || relData.all;
    const contactReports = [
      mkReport('Active Contacts', 'in segment', ctSel.active),
      mkReport('Touch Compliance', 'cadence on time', ctSel.comp),
      mkReport('At-Risk', 'overdue · cooling', ctSel.risk, true),
      mkReport('New Contacts', 'added · 30 days', ctSel.fresh),
      mkReport('Response Rate', 'outreach replied', ctSel.resp)
    ];
    const contactReportMeta = ctSel.label + ' · ' + ctSel.active.v + ' active · relationship health · trend vs. prior period';
    const ctSortKey = this.state.ctSortKey || 'name';
    const ctSortDir = this.state.ctSortDir || 'asc';
    const parseMoney = s => { const n = parseFloat(String(s).replace(/[^0-9.]/g,''))||0; return /M/i.test(s)?n*1e6:(/K/i.test(s)?n*1e3:n); };
    const ctSortVal = (c,k) => {
      if(k==='active') return parseFloat(c.active)||0;
      if(k==='lifetime') return parseMoney(c.lifetime);
      if(k==='lastTouch'){ const d=Date.parse(c.lastTouch+' 2026'); return isNaN(d)?0:d; }
      return String(c[k]||'').toLowerCase();
    };
    const ctTagSel = this.state.ctTag || 'all';
    let contactList = contacts.filter(c => (seg==='all' || c.category===seg) && (ctTagSel==='all' || (c.tags||[]).includes(ctTagSel))).map(c => ({ ...c, tagList:(c.tags||[]).slice(0,3), hasTags:(c.tags||[]).length>0, onClick:()=>this.setState({ peekContact:c.id }), onName:(e)=>{ e.stopPropagation(); this.openContact(c.id); } }));

    // ---- Contact peek drawer ----
    const pkcId = this.state.peekContact;
    const pkc = pkcId ? contacts.find(c=>c.id===pkcId) : null;
    const cPeekOpen = !!pkc;
    const closeCPeek = ()=>this.setState({ peekContact:null });
    const contactTasks = {
      marcelo:[{ t:'Send developer construction schedule', due:'Jul 08' },{ t:'Confirm second visit', due:'Jul 06' }],
      keller:[{ t:'Push principal call before Wednesday', due:'Jul 07' }],
      sterling:[{ t:'Confirm inspection report receipt', due:'Jul 08' }],
      bittencourt:[{ t:'Send referral re-engagement note', due:'Jul 09' }],
      zanotti:[{ t:'Open cross-sell conversation on waterfront lot', due:'Jul 15' }],
      nakamura:[{ t:'Follow up on open offer', due:'Jul 12' }],
      ravel:[{ t:'Submit HOA approval package', due:'Jul 11' }],
      alvarez:[{ t:'Confirm appraisal receipt', due:'Jul 18' }]
    };
    const cPeek = pkc ? {
      name: pkc.name, rel: pkc.relationship, status: pkc.status, dot: pkc.dot, location: pkc.location,
      nums: [ { l:'Lifetime GCI', v:pkc.lifetime }, { l:'Active deals', v:pkc.active }, { l:'Last touch', v:pkc.lastTouch } ],
      tasks: (contactTasks[pkc.id] || []).map((x,i) => { const tid = pkc.id + '-t' + i; const done = !!((this.state.doneAct||{})[tid]); return { t:x.t, due:x.due, onToggle:()=>this.toggleActDone(tid), checkBg: done?'#0D0D0D':'transparent', color: done?'#8F8F8F':'#0D0D0D', deco: done?'line-through':'none' }; }),
      openTaskCount: String((contactTasks[pkc.id] || []).filter((x,i)=>!((this.state.doneAct||{})[pkc.id+'-t'+i])).length),
      noTasks: (contactTasks[pkc.id] || []).length === 0,
      info: [ { l:'Phone', v:pkc.phone }, { l:'Email', v:pkc.email }, { l:'Client since', v:pkc.since }, { l:'Deals won', v:pkc.dealsWon } ],
      prefs: [ { l:'Asset', v:pkc.prefAsset }, { l:'Areas', v:pkc.prefAreas }, { l:'Budget', v:pkc.prefBudget } ],
      hasPrefs: pkc.prefAsset !== '—',
      deals: (pkc.deals||[]).map(d=>({ ...d })),
      hasDeals: !!(pkc.deals||[]).length,
      touches: (pkc.touches||[]).slice(0,4),
      agentNote: pkc.agentNote || '', hasNote: !!pkc.agentNote,
      hasNet: !!pkc.net,
      netRows: pkc.net ? [ { l:'They sent', v:pkc.net.got, c:'#303030' }, { l:'You sent', v:pkc.net.gave, c:'#303030' }, { l:'Balance', v:pkc.net.bal, c:pkc.net.balColor }, { l:'Suggested move', v:pkc.net.move, c:'#303030' }, ...(pkc.net.slaLine ? [{ l:'SLA', v:pkc.net.slaLine, c:'#303030' }] : []) ] : [],
      openFull: ()=>{ this.setState({ peekContact:null }); this.openContact(pkc.id); },
      logTouch: ()=>this.setState({ peekContact:null, screen:'activities', actView:'activity', logOpen:true, logType:'Note', logName:pkc.name, logBody:'' })
    } : { nums:[], info:[], prefs:[], deals:[], touches:[] };
    contactList.sort((a,b)=>{ const va=ctSortVal(a,ctSortKey), vb=ctSortVal(b,ctSortKey); const r = va<vb?-1:(va>vb?1:0); return ctSortDir==='asc'?r:-r; });

    // ---- Google Contacts sync · triage + nurturing playbooks ----
    const gcPlaybooks = {
      NEW:   { name:'First 10 Days', cadence:'Onboarding', steps:['D0 · Intro WhatsApp in your voice — queued for approval','D2 · Market note on the corridor of interest','D5 · Discovery call — agent preps the dossier','D10 · First curated set — 3 properties'] },
      WARM:  { name:'Stay Close', cadence:'Every 7 days', steps:['Bi-weekly touch, alternating channel','Monthly market report on the saved corridor','Monthly MLS sweep against the profile','Re-qualify signal check every 30 days'] },
      HOT:   { name:'Decision Window', cadence:'Every 3 days', steps:['Touch every 3 days at the best window','Tour push with curated options','Developer and inventory updates as they land','Decision-maker map + objection tracking'] },
      SPHERE:{ name:'Permanence', cadence:'Quarterly', steps:['Quarterly personal touch','Anniversary and key-date gestures','Referral ask inside the 90-day warm window','Event and preview invitations'] }
    };
    const gcStatusSel = this.state.gcStatus || 'NEW';
    const gcPlay = gcPlaybooks[gcStatusSel] || gcPlaybooks.NEW;
    const gcFields = [
      { l:'Full name', v:'Isabela Fontes' },
      { l:'Email', v:'isabela.fontes@fontesgroup.com' },
      { l:'Phone · WhatsApp', v:'+55 21 9 7712 ····' },
      { l:'Website', v:'fontesgroup.com' },
      { l:'Address', v:'Rio de Janeiro, BR' },
      { l:'Dates', v:'Birthday · Mar 14' },
      { l:'Notes', v:'Met at Faena preview event Jul 02 — interested in oceanfront pied-à-terre.' }
    ];
    const mkGcSel = (key, def, opts) => ({
      value: this.state[key] || def, opts,
      onChange: (e)=>this.setState({ [key]: e.target.value })
    });
    const gcVals = {
      gcPendShow: !this.state.gcHandled && !this.state.gcSnoozed,
      gcTriageOpen: !!this.state.gcTriageOpen,
      gcOpenTriage: ()=>this.setState({gcTriageOpen:true}),
      gcCloseTriage: ()=>this.setState({gcTriageOpen:false}),
      gcLater: ()=>this.setState({gcSnoozed:true, gcTriageOpen:false}),
      gcFields,
      gcSelCat: mkGcSel('gcCat','Prospect',['Client','Prospect','Sphere','Vendor / Partner']),
      gcSelStatus: mkGcSel('gcStatus','NEW',['NEW','WARM','HOT','SPHERE']),
      gcSelSource: mkGcSel('gcSource','Event',['Referral','Event','Inbound','Cold','Sphere']),
      gcSelAsset: mkGcSel('gcAsset','Oceanfront condo',['Oceanfront condo','Waterfront home','Penthouse','Pre-construction','Land','Investment']),
      gcSelBudget: mkGcSel('gcBudget','$4–6M',['$2–4M','$4–6M','$6–10M','$10–20M','$20M+']),
      gcPlayName: gcPlay.name, gcPlayCadence: gcPlay.cadence, gcPlaySteps: gcPlay.steps,
      gcSave: ()=>this.gcSave(gcPlay.name)
    };

    // ---- Directory: addable columns ----
    const extraColDefs = [['Tags','tags'],['Status','status'],['Phone','phone'],['Email','email'],['Client Since','since'],['Deals Won','dealsWon'],['Category','category'],['Preferred Asset','prefAsset'],['Budget Range','prefBudget']];
    const extraCols = this.state.ctExtraCols || [];
    const ctColMenuOpen = !!this.state.ctColMenuOpen;
    const toggleColMenu = ()=>this.setState(s=>({ctColMenuOpen:!s.ctColMenuOpen}));
    const ctColMenuItems = extraColDefs.filter(([l,k])=>!extraCols.includes(k)).map(([label,key])=>({ label,
      onClick:()=>this.setState(s=>({ctExtraCols:[...(s.ctExtraCols||[]),key], ctColMenuOpen:false})) }));
    const ctColMenuEmpty = ctColMenuItems.length === 0;
    const ctGridStyle = `min-width:940px;grid-template-columns:1.6fr 1.3fr 1.2fr 0.7fr 1fr 0.9fr${' 1.1fr'.repeat(extraCols.length)} 40px;`;
    contactList = contactList.map(c => ({ ...c, extras: extraCols.map(k => { const v = c[k]; return Array.isArray(v) ? (v.length ? v.join(' · ') : '—') : String(v ?? '—'); }) }));
    const ctColDefs = [['Name','name'],['Relationship','relationship'],['Location','location'],['Active','active'],['Lifetime GCI','lifetime'],['Last Touch','lastTouch']];
    const activeExtraDefs = extraColDefs.filter(d=>extraCols.includes(d[1]));
    const allCtCols = [...ctColDefs, ...activeExtraDefs];
    const ctFilters = this.state.ctFilters || {};
    const ctFilterOpen = this.state.ctFilterOpen || null;
    contactList = contactList.filter(c => allCtCols.every(([l,k]) => { const f=(ctFilters[k]||'').trim().toLowerCase(); if(!f) return true; return String(c[k] ?? '').toLowerCase().includes(f); }));
    const contactHead = allCtCols.map(([label,key]) => ({ label,
      removable: extraCols.includes(key),
      onRemove: (e)=>{ e.stopPropagation(); this.setState(s=>({ ctExtraCols:(s.ctExtraCols||[]).filter(k=>k!==key), ctFilterOpen:null })); }, arrow: ctSortKey===key ? (ctSortDir==='asc'?'\u2191':'\u2193') : '',
      filterOn: ctFilterOpen===key,
      filterColor: (ctFilters[key]||'').trim() ? '#0D0D0D' : '#8F8F8F',
      filterBorder: (ctFilters[key]||'').trim() ? '#0D0D0D' : 'transparent',
      toggleFilter: (e)=>{ e.stopPropagation(); this.setState({ ctFilterOpen: ctFilterOpen===key ? null : key }); },
      filterVal: ctFilters[key]||'',
      onFilter: (e)=>this.setState({ ctFilters: { ...ctFilters, [key]: e.target.value } }),
      clearFilter: (e)=>{ e.stopPropagation(); this.setState({ ctFilters: { ...ctFilters, [key]:'' }, ctFilterOpen:null }); },
      onClick:()=>this.setState(s=>({ ctSortKey:key, ctSortDir: (s.ctSortKey||'name')===key && (s.ctSortDir||'asc')==='asc' ? 'desc' : 'asc' })),
      style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${ctSortKey===key?'#0D0D0D':'#8F8F8F'};cursor:pointer;display:flex;align-items:center;gap:5px;` }));
    const ct = contacts.find(c => c.id === this.state.contactId) || contacts[0];

    // ---- Pre-meeting brief (agent dossier) ----
    const briefOpen = !!this.state.briefOpen;
    const toggleBrief = ()=>this.setState(s=>({briefOpen:!s.briefOpen}));
    const briefMap = {
      marcelo: {
        objections:['Spouse concerned re: construction timeline — developer schedule in hand, addressable.','Comparing vs Estates at Acqualina — leaning Rivage on layout.'],
        family:['Wife weighs heavily on the final call — include her in the 2nd visit.','Two children · school calendar drives relocation timing (Jan).'],
        comps:['Rivage PH-A ask $18.5M · $2,980/sf.','Estates PH $19.9M · move-in ready — his fallback.','Last Rivage PH sale: $2,870/sf (May).'],
        objective:'Confirm the second visit for Saturday 11:00 with his wife present, and neutralize the timeline concern using the developer schedule. Do not discuss price yet.'
      },
      keller: {
        objections:['Process requires principal sign-off — speed is not a lever, precision is.','Counter pending since Thursday.'],
        family:['Institution, not family — treat the analyst as the relationship.'],
        comps:['Golden Beach compound ask $28M.','Indian Creek comparable traded $31M (Apr).'],
        objective:'Secure the principal call before Wednesday. Lead with the comparative valuation, not urgency.'
      }
    };
    const bd = briefMap[ct.id] || {
      objections:['No open objections logged.'],
      family:['No family notes on record.'],
      comps:['No active comps attached.'],
      objective:'Re-establish contact and surface the next natural step.'
    };
    const lastTouches = (ct.touches||[]).slice(0,3).map(t=>t.date+' · '+t.type+' — '+t.body);
    const briefSections = [
      { label:'Who', items:[ ct.relationship+' · '+ct.location+' · since '+ct.since, (ct.tags||[]).join(' · ') ] },
      { label:'Last Touches', items: lastTouches.length?lastTouches:['No touches logged.'] },
      { label:'Open Objections', items: bd.objections },
      { label:'Family & Context', items: bd.family },
      { label:'Comps in Play', items: bd.comps }
    ];
    const briefFor = ct.name;
    const briefObjective = bd.objective;

    const cTab = this.state.contactTab || 'profile';
    const contactTabDefs = [['Overview','overview'],['Profile','property'],['Activity','activities'],['Tours','showings'],['Deals','deals']];
    const ctShowings = (ct.touches || []).filter(t => t.type === 'Showing');
    const contactTabs = contactTabDefs.map(([label,id]) => {
      const active = cTab === id;
      return { label, onClick:()=>this.setState({contactTab:id, nameMenuOpen:false}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?400:300};font-size:13px;letter-spacing:0.06em;color:${active?C.ink:C.pedra};padding:16px 0;border-bottom:2px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const cStats = [
      { label:'Lifetime GCI', value: ct.lifetime },
      { label:'Deals Won', value: ct.dealsWon },
      { label:'Active Deals', value: ct.active },
      { label:'Since', value: ct.since }
    ];
    const sourceMap = { marcelo:'Referral · A. Bittencourt', keller:'Referral · Private bank', sterling:'Repeat client', bittencourt:'Sphere', zanotti:'Past client', nakamura:'Inbound', ravel:'Referral · Architect', alvarez:'Repeat client' };
    const cFields = [
      { label:'Phone', value: ct.phone },
      { label:'Email', value: ct.email },
      { label:'Source', value: sourceMap[ct.id] || '—' }
    ];
    const cdone = this.state.doneAct || {};
    const ctTasks = (contactTasks[ct.id] || []).map((x,i) => {
      const id = ct.id + '-t' + i; const done = !!cdone[id];
      return { ...x, id, done, onToggle:()=>this.toggleActDone(id), checkBg: done?'#0D0D0D':'transparent',
        color: done?'#8F8F8F':'#0D0D0D', deco: done?'line-through':'none', dueColor: done?'#8F8F8F':'#5D5D5D' };
    });
    const ctTasksOpen = ctTasks.filter(t => !t.done).length;

    // ---- Calendar + Gmail sync · linked to contact + property ----
    const ctCalMap = {
      marcelo: [
        { when:'Sat Jul 11 · 11:00', what:'2nd visit — spouse attending', link:'Rivage PH-A', note:'D-1 confirmation queued · dossier attaches 30 min before' },
        { when:'Tue Jul 15 · 09:30', what:'Call — developer schedule review', link:'Rivage PH-A', note:'Best window · 17–19h BRT held' } ],
      sterling: [
        { when:'Tue Jul 08 · 10:00', what:'Inspection window closes — confirm report receipt', link:'Acqualina 4802', note:'T-2 alert active' },
        { when:'Fri Aug 15 · 14:00', what:'Closing', link:'Acqualina 4802', note:'Walk-through Aug 13 held on calendar' } ],
      keller: [
        { when:'Wed Jul 09 · 08:30', what:'Principal call — counter terms', link:'Golden Beach Compound', note:'08–10h CET window · agenda attached' } ]
    };
    const ctEmailMap = {
      marcelo: [
        { from:'Marcelo Carvalho', subj:'Re: Construction schedule', snip:'Grateful for the timeline — my wife would like to see the finish samples on Saturday.', date:'Jul 05', link:'Rivage PH-A', filed:'Logged to record' },
        { from:'Developer Sales · Rivage', subj:'Updated delivery milestones', snip:'Please find attached the revised construction calendar for PH-A…', date:'Jul 03', link:'Rivage PH-A', filed:'Attachment filed to Drive' } ],
      sterling: [
        { from:'Coastal Title Co.', subj:'Commitment — Acqualina 4802', snip:'Title search under way; commitment expected by Jul 22 as scheduled…', date:'Jul 04', link:'Acqualina 4802', filed:'Milestone updated' },
        { from:'Robert Sterling', subj:'Final tour', snip:'Friday afternoon works. Send the address to my assistant, please.', date:'Jul 03', link:'Acqualina 4802', filed:'Logged to record' } ],
      keller: [
        { from:'Anton Keller', subj:'Counter — Golden Beach', snip:'Received — let’s discuss the counter next week with the principal.', date:'Jun 26', link:'Golden Beach Compound', filed:'Logged to record' } ]
    };
    const ctCal = ctCalMap[ct.id] || [];
    const ctEmails = ctEmailMap[ct.id] || [];

    // ---- Showing coordination · agent-run with listing agents ----
    const showCoordMap = {
      marcelo: [
        { prop:'Rivage PH-A', agent:'R. Katz · Douglas Elliman', ch:'WhatsApp', status:'Confirming · Sat 11:00', statusColor:'#D0342C',
          steps:[
            { t:'Suggested · Jul 02', st:'done' },
            { t:'Client: “wants a 2nd visit with spouse” · Jul 04 — captured from WhatsApp', st:'done' },
            { t:'Access request sent to listing agent · Jul 06 · WhatsApp', st:'done' },
            { t:'Awaiting confirmation — chase in 24h if silent', st:'current' },
            { t:'Tour → client feedback → auto-draft to listing agent', st:'future' } ] },
        { prop:'Estates at Acqualina PH', agent:'M. Duran · ONE Sotheby’s', ch:'Email', status:'Toured · feedback sent', statusColor:'#5D5D5D',
          steps:[
            { t:'Suggested · Jun 20', st:'done' },
            { t:'Toured · Jun 28', st:'done' },
            { t:'Client feedback captured · voice memo · Jun 28', st:'done' },
            { t:'Feedback auto-sent to listing agent · Jun 29: “Impressed by services; prefers new construction.”', st:'done' } ] }
      ],
      sterling: [
        { prop:'Acqualina 4802', agent:'L. Pires · Compass', ch:'WhatsApp', status:'Under contract', statusColor:'#5D5D5D',
          steps:[
            { t:'Suggested · May 12', st:'done' },
            { t:'Toured · May 20', st:'done' },
            { t:'Feedback auto-sent to listing agent · May 21', st:'done' },
            { t:'Offer → Under Contract · Jun 24', st:'done' } ] }
      ]
    };
    const ctShowCoord = (showCoordMap[ct.id] || []).map(c => ({ ...c,
      steps: c.steps.map(s => ({ ...s,
        dotColor: s.st==='done' ? '#0D0D0D' : (s.st==='current' ? '#D0342C' : '#C7C7C7'),
        textColor: s.st==='future' ? '#8F8F8F' : '#303030',
        weight: s.st==='current' ? 500 : 400 })) }));

    // ---- Tour Planner · itinerary + confirmation board + A/CO PDF ----
    const tourFix = !!this.state.tourFix;
    const tourPdfSent = !!this.state.tourPdfSent;
    const tourExtraRaw = this.state.tourExtra || [];
    const tourBase = !tourFix ? [
      { n:'01', time:'11:00', prop:'8842 Ocean Drive · Golden Beach', agent:'R. Katz · Douglas Elliman', st:'Confirmed', stC:'#0D0D0D', note:'Access confirmed · listing agent present' },
      { n:'02', time:'12:15', prop:'12 Indian Creek Island Rd', agent:'S. Weiss · Brown Harris', st:'Conflict', stC:'#D0342C', note:'Agent unavailable before 14:00 — recalibration proposed below' },
      { n:'03', time:'13:30', prop:'305 Ocean Blvd · Golden Beach', agent:'M. Duran · ONE Sotheby’s', st:'Pending', stC:'#8F8F8F', note:'Access requested Jul 06 · chase in 24h if silent' }
    ] : [
      { n:'01', time:'11:00', prop:'8842 Ocean Drive · Golden Beach', agent:'R. Katz · Douglas Elliman', st:'Confirmed', stC:'#0D0D0D', note:'Access confirmed · listing agent present' },
      { n:'02', time:'12:30', prop:'305 Ocean Blvd · Golden Beach', agent:'M. Duran · ONE Sotheby’s', st:'Confirmed', stC:'#0D0D0D', note:'Confirmed after swap · 10 min drive from stop 01' },
      { n:'03', time:'14:30', prop:'12 Indian Creek Island Rd', agent:'S. Weiss · Brown Harris', st:'Confirmed', stC:'#0D0D0D', note:'Rescheduled 14:30 · lunch buffer 13:15–14:15 held' }
    ];
    const tourExtra = tourExtraRaw.map((e, i) => ({ ...e,
      n: String(tourBase.length + i + 1).padStart(2, '0'),
      stC: e.st === 'Confirmed' ? '#0D0D0D' : '#8F8F8F',
      canConfirm: e.st !== 'Confirmed',
      onConfirm: ()=>{ this.pushAudit('Tour Planner · access confirmed · ' + e.prop.split(' ·')[0]); this.setState(s => ({ tourExtra: (s.tourExtra||[]).map((x,xi) => xi===i ? { ...x, st:'Confirmed', note: x.offMarket ? 'Owner confirmed · discretion mode · NDA on file' : 'Listing agent confirmed · access set' } : x) })); }
    }));
    const tourStops = [...tourBase, ...tourExtra];
    const tourConfirmedN = tourStops.filter(s=>s.st==='Confirmed').length;
    const tourPendN = tourStops.filter(s=>s.st==='Pending').length;
    const tourConfN = tourStops.filter(s=>s.st==='Conflict').length;
    const tourAllOk = tourFix && tourPendN === 0 && tourConfN === 0;
    const tourAddOpen = !!this.state.tourAddOpen;
    const addTourStop = (stop) => { this.pushAudit('Tour Planner · stop added · ' + stop.prop + ' — ' + stop.src); this.setState(s => ({ tourExtra: [ ...(s.tourExtra||[]), stop ], tourAddOpen:false, tourPdfSent:false, tourMlsNum:'' })); };
    const tourMlsNum = this.state.tourMlsNum || '';
    const tourDossier = [
      { prop:'8842 Ocean Drive · Golden Beach · 11:00', facts:'$24.5M · $2,187/sf · 64 DOM · taxes $198K/yr · no HOA · 118 ft frontage', fit:'Matches: waterfront · turn-key · deep-water dock. Watch: west exposure — spouse disliked late sun at Estates.', ask:'Seller timeline · dock depth for 80 ft · seawall year · furniture negotiable', access:'Listing agent present (R. Katz) · gate code on file' },
      { prop:'305 Ocean Blvd · Golden Beach · 12:30', facts:'$18.9M · $2,198/sf · 41 DOM · taxes $152K/yr · rebuilt 2022', fit:'Matches: turn-key · smart home · rooftop pool. Watch: smaller lot — no dock, day mooring only.', ask:'Rooftop structural warranty · generator capacity · flood history', access:'M. Duran meets at door · shoes-off house' },
      { prop:'12 Indian Creek Island Rd · 14:30', facts:'$41.0M · $2,662/sf · 12 DOM · taxes $310K/yr · Indian Creek security', fit:'Stretch above budget (+38%) — include only to calibrate ceiling. Strong privacy signal for the family.', ask:'Club membership transfer · staff quarters config · seller motivation', access:'S. Weiss + island security clearance · IDs required' }
    ];
    const tourVals = {
      hasTour: true,
      tourIsEmpty: ct.id !== 'marcelo',
      tourHasPlan: ct.id === 'marcelo',
      tourStops,
      tourStopCount: String(tourStops.length),
      tourNeedsFix: !tourFix,
      tourAllConfirmed: tourAllOk,
      tourStatusLine: tourPdfSent ? 'All stops confirmed · itinerary sent to client' : (tourAllOk ? 'All stops confirmed — itinerary ready to send' : `${tourConfirmedN} confirmed${tourPendN ? ' · ' + tourPendN + ' pending' : ''}${tourConfN ? ' · ' + tourConfN + ' conflict' : ''}`),
      tourAddOpen,
      toggleTourAdd: ()=>this.setState(s=>({tourAddOpen:!s.tourAddOpen})),
      tourAddMls: ()=>{ this.setState({tourAddOpen:false, contactTab:'mlsmatch'}); },
      tourAddAddr: ()=>addTourStop({ time:'15:45', prop:'4741 Pine Tree Dr · by address', agent:'Listing agent — pulled from MLS record', st:'Pending', note:'Agent identified the listing agent from the MLS record · access request drafted', src:'added by address' }),
      tourAddOff: ()=>addTourStop({ time:'17:00', prop:'Casa Costanera · Bal Harbour — off-market', agent:'Owner direct · intro via A. Bittencourt (Network)', st:'Pending', note:'Discretion mode · no marketing materials · access via owner · NDA template ready', src:'off-market · Network', offMarket:true }),
      tourExpanded: !!this.state.tourExpanded,
      tourExpLabel: this.state.tourExpanded ? 'Hide ▴' : 'Show details ▾',
      toggleTourExp: ()=>this.setState(s=>({tourExpanded:!s.tourExpanded})),
      tourMlsNum,
      onTourMlsInput: (e)=>this.setState({tourMlsNum:e.target.value}),
      onTourMlsKey: (e)=>{ if(e.key==='Enter' && tourMlsNum.trim()){ const num = tourMlsNum.trim().toUpperCase(); this.pushAudit('Tour Planner · MLS ' + num + ' fetched from arraescollection.com IDX — listing agent L. Mendes imported to Network, thread linked'); addTourStop({ time:'16:15', prop: num + ' · 6301 Collins Ave 4507', agent:'L. Mendes · Coldwell Banker — imported to Network', st:'Pending', note:'Fetched from arraescollection.com IDX · agent record created in Network (phone + email from MLS) · access request drafted', src:'by MLS #' }); } },
      tourDossier, hasTourDossier: ct.id === 'marcelo',
      acceptRecalib: ()=>{ this.pushAudit('Tour Planner · recalibration accepted — stops 02↔03 swapped, Indian Creek 14:30, route preserved'); this.setState({ tourFix:true }); },
      declineRecalib: ()=>{ this.pushAudit('Tour Planner · recalibration declined — agent will counter-propose Sunday window'); },
      tourPdfSent,
      sendTourPdf: ()=>{ if (!tourAllOk || tourPdfSent) return; this.pushAudit('Tour Planner · A/CO itinerary PDF generated and sent to ' + ct.name + ' via WhatsApp — touch logged, calendar holds final'); this.setState({ tourPdfSent:true, qcToast:'Itinerary PDF sent · A/CO template · logged to record' }); clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2800); },
      tourPdfLabel: tourPdfSent ? 'Itinerary sent · Jul 06 ✓' : 'Send itinerary · A/CO PDF',
      tourPdfStyle: tourAllOk && !tourPdfSent
        ? `cursor:pointer;display:flex;align-items:center;background:#E9E8E4;color:#0D0D0D;padding:10px 18px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;transition:opacity 150ms;`
        : `cursor:default;display:flex;align-items:center;background:transparent;border:1px solid #E3E3E3;color:#8F8F8F;padding:10px 18px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;`
    };
    const prefsX = {
      marcelo:{ beds:'3–4', baths:'4', sqft:'4,000–6,000', notes:'Ocean views · high floor · turnkey' },
      keller:{ beds:'5+', baths:'6', sqft:'8,000+', notes:'Waterfront · privacy · dock' },
      sterling:{ beds:'3', baths:'3.5', sqft:'3,000–4,000', notes:'Oceanfront · full services' },
      bittencourt:{ beds:'—', baths:'—', sqft:'—', notes:'—' },
      zanotti:{ beds:'2–3', baths:'2', sqft:'2,000–3,000', notes:'Tower · Sunny Isles' },
      nakamura:{ beds:'3', baths:'3', sqft:'3,000–3,500', notes:'Bal Harbour · long horizon' },
      ravel:{ beds:'2–3', baths:'3', sqft:'2,500–3,500', notes:'Branded · design-led' },
      alvarez:{ beds:'2–3', baths:'2.5', sqft:'2,000–2,800', notes:'Tower · Sunny Isles' }
    };
    const px = prefsX[ct.id] || { beds:'—', baths:'—', sqft:'—', notes:'—' };
    const propFields = [
      { label:'Asset Type', value: ct.prefAsset },
      { label:'Target Areas', value: ct.prefAreas },
      { label:'Budget', value: ct.prefBudget },
      { label:'Bedrooms', value: px.beds },
      { label:'Baths', value: px.baths },
      { label:'Interior SqFt', value: px.sqft },
      { label:'Notes', value: px.notes }
    ];
    const ctTotalDeals = String((parseInt(ct.dealsWon,10)||0) + (parseInt(ct.active,10)||0));
    const contactDash = [
      { label:'Lifetime GCI', value: ct.lifetime },
      { label:'Last Contact', value: ct.lastTouch },
      (() => { const act8 = parseInt(ct.active, 10) || 0; const won8 = parseInt(ct.dealsWon, 10) || 0; return { label:'Active Deals', value: String(act8), periods: [ { p:'QTR', v:'↑+' + act8 }, { p:'1 YR', v:'↑+' + (act8 + won8) } ], sub: (ct.deals && ct.deals.length ? ct.deals[0].value + ' · ' + ct.deals[0].stage : 'no live pipeline') }; })()
    ].map((d,i,arr) => ({ ...d, cellStyle: `padding:2px 44px 2px 0;margin-right:22px;${i<arr.length-1?'border-right:1px solid #E3E3E3;':''}` }));
    // ---- Contact workstation · journey, since-line, next-action, pinned, drive, prev/next, composer ----
    const jSeq = ['Prospect','Qualified','Active client','Closed','Advocate'];
    const jIdxMap = { marcelo:2, keller:1, sterling:2, bittencourt:4, zanotti:3, nakamura:2, ravel:2, alvarez:2 };
    const jCur = jIdxMap[ct.id] !== undefined ? jIdxMap[ct.id] : 1;
    const hasJourney = !['partner','vendor'].includes(ct.category);
    const ctJourney = jSeq.map((label,i) => ({
      label: (i<jCur?'✓ ':'')+label, last: i===jSeq.length-1,
      sepStyle:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:200;font-size:12px;color:#C7C7C7;padding:0 8px 7px;${i===jSeq.length-1?'display:none;':''}`,
      style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${i===jCur?400:300};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${i>jCur?'#8F8F8F':'#0D0D0D'};padding-bottom:7px;border-bottom:2px solid ${i===jCur?'#0D0D0D':'transparent'};white-space:nowrap;` }));
    const sinceMap = {
      marcelo:'Since yesterday: opened the tour report 2× · replied on WhatsApp · Saturday visit confirmed by spouse.',
      keller:'Since Friday: counter still open · principal availability confirmed for this week.',
      sterling:'Since yesterday: opened the tour report 3× · dwelled 4 min on unit 4802.',
      bittencourt:'Since last month: no inbound — referral ask now 94 days overdue.' };
    const ctSinceLine = sinceMap[ct.id] || 'Since your last visit: no new activity — cadence clock running.';
    const qByContact = { marcelo:'q1', keller:'q2', sterling:'q3', bittencourt:'q6', nakamura:'q5' };
    const ctQ = queueRows.find(q => q.id === qByContact[ct.id]);
    const hasCtNext = !!ctQ && (ctQ.isActive || ctQ.isSent);
    const ctNextBan = ctQ ? { clock: ctQ.clockLabel, ctx: ctQ.ctx, draft: ctQ.briefDraft, hasDraft: ctQ.hasBriefDraft && !ctQ.isSent, min: ctQ.minLabel,
      onWa: ctQ.onSendWa, onEmail: ctQ.onSendEmail, isSent: ctQ.isSent, sentLabel: ctQ.sentLabel } : { clock:'', ctx:'', draft:'' };
    const pinnedMap = {
      marcelo:['Spouse decides','Prefers WhatsApp · PT','No calls before 10h BRT'],
      keller:['Principal signs off on everything','Discretion above speed','Mondays · 08–10h CET'],
      sterling:['Cash · services matter most','Repeat client — direct tone'],
      bittencourt:['Top referrer · 7 closed intros','Coffee in São Paulo works'] };
    const ctPinned = pinnedMap[ct.id] || []; // tags now live in the header — pinned row only shows curated facts
    const ctDrive = 'Drive · ' + (4 + (ct.id.length % 5)) + ' files';
    const ctIdxNav = contacts.findIndex(c => c.id === ct.id);
    const ctPrevNav = ()=>{ const p = contacts[(ctIdxNav-1+contacts.length)%contacts.length]; this.openContact(p.id); };
    const ctNextNav = ()=>{ const n = contacts[(ctIdxNav+1)%contacts.length]; this.openContact(n.id); };
    const momMap = { marcelo:'↗', sterling:'↗', keller:'→', bittencourt:'↘', nakamura:'→' };
    const ctLogged = (this.state.ctLogs||{})[ct.id] || [];
    // ---- Now · Story · File (Apple-grammar contact) ----
    const cTabN = (cTab==='now'||cTab==='file') ? 'overview' : (cTab==='property' ? 'mlsmatch' : cTab);
    const ctFile = this.state.ctLayout === 'file';
    const ctTabDefs = [['Overview','overview'],['Agent','agent'],['Activity','activities'],['Contact Info','contact'],['MLS Match','mlsmatch'],['Tours & Showings','showings'],['Deals','deals'],['Drive','drive'],['Related','related']];
    const ctTabMoreOpen = !!this.state.ctTabMoreOpen;
    const ctTabMoreItems = ctTabDefs.filter(([label,id]) => cTabN !== id).map(([label,id]) => ({ label, hasBadge: id==='mlsmatch', badge:'2', onClick: ()=>this.setState({ contactTab:id, ctTabMoreOpen:false }) }));
    const ctTabs = ctTabDefs.filter(([label,id]) => id === 'overview' || id === 'agent' || cTabN === id).map(([label,id]) => {
      const active = cTabN===id;
      return { label, hasBadge: id==='mlsmatch', badge: '2',
        onClick: ()=>this.setState({ contactTab:id }),
        style:`padding:13px 0 11px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?500:400};font-size:11.5px;letter-spacing:0.06em;text-transform:uppercase;color:${active?'#0D0D0D':'#8F8F8F'};border-bottom:2px solid ${active?'#0D0D0D':'transparent'};cursor:pointer;white-space:nowrap;transition:color 150ms;` };
    });
    const isFileView = ctFile || (cTabN!=='overview' && cTabN!=='agent');
    const ctRelatedMap = {
      marcelo:[ {name:'Beatriz Carvalho', role:'Spouse · decision maker', note:'Aligned on Rivage after Saturday tour'}, {name:'Dr. Paulo Mendes', role:'Attorney', note:'Reviews every contract before signature'}, {name:'Ana Bittencourt', role:'Referred by', note:'Introduced Mar 2026 · São Paulo dinner'} ],
      keller:[ {name:'The Principal', role:'UHNW client · signs off', note:'Reachable Mondays 08–10h CET only'}, {name:'Stefan Rüegg', role:'Family office advisor', note:'Day-to-day counterpart in Zurich'} ],
      sterling:[ {name:'Margaret Sterling', role:'Spouse', note:'Prefers Acqualina over the Estates unit'}, {name:'David Katz', role:'CPA', note:'Handles 1031 timing'} ],
      bittencourt:[ {name:'Marcelo Carvalho', role:'Referral · active', note:'$15–20M cash buyer'}, {name:'Camila Duarte', role:'Referral · nurturing', note:'Introduced Feb 2026'} ] };
    const ctRelated = (ctRelatedMap[ct.id] || [ {name:'No related contacts yet', role:'', note:'Link family, attorneys, referral partners'} ]).map(r=>({ ...r, hasRole: !!r.role, onOpen: ()=>this.pushAudit('Related contact opened · '+r.name) }));
    const ctCritMap = {
      marcelo:[ ['Budget','$15–20M · cash'], ['Areas','Surfside · Bal Harbour · Miami Beach'], ['Type','New construction PH · waterfront'], ['Beds / Baths','4+ / 5+'], ['SqFt','6,000 – 9,000'], ['Must-haves','Private pool · service elevator'] ],
      keller:[ ['Budget','$25–30M'], ['Areas','Golden Beach · Indian Creek'], ['Type','Gated compound · waterfront'], ['Beds / Baths','6+ / 7+'], ['SqFt','10,000+'], ['Must-haves','Discretion · staff quarters · dock'] ],
      sterling:[ ['Budget','$8–12M · cash'], ['Areas','Sunny Isles · Acqualina'], ['Type','Turn-key condo · high floor'], ['Beds / Baths','4 / 4.5'], ['SqFt','3,500 – 5,000'], ['Must-haves','Full service · ocean view'] ] };
    const ctCritSummary = (ctCritMap[ct.id] || [ ['Budget','—'], ['Areas','—'], ['Type','—'], ['Beds / Baths','—'], ['SqFt','—'], ['Must-haves','—'] ]).map(([l,v])=>({l,v}));
    const ctHeadStats = [...contactDash, (() => { const q7 = (ct.touches || []).length + ctLogged.length; const d30 = q7; const qtr7 = q7 + ((parseInt(ct.dealsWon, 10) || 0) * 2) + 2; const yr7 = qtr7 + ((parseInt(ct.dealsWon, 10) || 0) * 6) + 4; return { label:'Interactions', value: String(yr7 + 9), periods: [ { p:'QTR', v:'↑+' + qtr7 }, { p:'1 YR', v:'↑+' + yr7 } ] }; })()].map((d,i,arr)=>({ label:d.label, value:d.value, sub:d.sub || '', hasSub: !!d.sub, periods: d.periods || [], hasPeriods: !!d.periods, hasValue: String(d.value || '') !== '', color:'#0D0D0D',
      style:`padding:14px 24px 14px ${i===0?'0':'24px'};${i<arr.length-1?'border-right:1px solid #E3E3E3;':''}` }));
    const ctSegments = [['Profile','profile'],['Now','now'],['Agent','agent']].map(([label,id]) => {
      const active = id==='file' ? isFileView : id==='agent' ? cTabN==='agent' : id==='now' ? (cTab==='now'||cTab==='overview') : cTab===id;
      return { label, onClick:()=>this.setState({ contactTab:id, ctTabMoreOpen:false }),
        style: F0 + 'font-weight:' + (active?500:400) + ';font-size:12.5px;letter-spacing:0.04em;color:' + (active?'#0D0D0D':'#8F8F8F') + ';padding:7px 20px;border-radius:999px;background:' + (active?'rgba(255,255,255,0.8)':'transparent') + ';box-shadow:' + (active?'0 2px 8px rgba(0,0,0,0.06)':'none') + ';cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' };
    });
    const essenceMap = {
      marcelo:'Cash buyer, $15–20M — Rivage PH-A toured twice, spouse aligned on Saturday. Momentum above stated probability.',
      keller:'Zurich family office, $25–30M compound — counter open, everything waits on one principal call.',
      sterling:'Repeat client, cash — deciding between Acqualina 4802 and the Estates unit this week.',
      bittencourt:'Your best referral source — seven closed relationships, none asked of her in 94 days.' };
    const ctEssence = essenceMap[ct.id] || (ct.narrative||'').split('. ').slice(0,1).join('.') + '.';
    const ctPinnedLine = ctPinned.join('   ·   ');
    const ctNowStats = [
      { l:'Weighted', v: (ct.deals&&ct.deals.length? '$'+Math.round((parseFloat(String(ct.deals[0].value).replace(/[^0-9.]/g,''))||0)*30*( ({marcelo:45,keller:60,sterling:90})[ct.id]||40 )/100)+'K' : ct.lifetime) },
      { l:'Last touch', v: ct.lastTouch },
      { l:'Cadence', v: (ctQ? ctQ.clockLabel.split(' cadence')[0].replace(ct.status+' · ','') : 'on schedule'), alert: !!(ctQ && ctQ.isActive && /overdue|Day \d+ of \d/.test(ctQ.clockLabel) && queueRaw.find(q=>q.id===qByContact[ct.id]||'')) && (queueRaw.find(q=>q.id===qByContact[ct.id])||{}).overdue }
    ].map(s=>({ ...s, color: s.alert ? '#D0342C' : '#0D0D0D' }));
    const ctNextEvent = (ctCalMap[ct.id]||[])[0] || null;
    // ---- Contact enrichment · agent scans LinkedIn + public sources ----
    const enSt = this.state.ctEnrich || 'idle';
    const enName = ((ct && ct.name) || 'Contact').trim();
    const enLn = enName.split(' ').slice(-1)[0];
    const enSlug = enName.toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-+|-+$/g,'');
    const enApplied = enSt === 'applied';
    const enrichData = { company: enLn + ' Capital Group', title: 'Founder & CEO', workPhone: '+1 305 892 ····', linkedin: 'linkedin.com/in/' + (enSlug || 'profile'), industry: 'Investment management' };
    const enrichRows = [
      { field:'Company', value: enrichData.company, source:'LinkedIn' },
      { field:'Job Title', value: enrichData.title, source:'LinkedIn' },
      { field:'Work Phone', value: enrichData.workPhone, source:'Company site' },
      { field:'LinkedIn', value: enrichData.linkedin, source:'Public profile' },
      { field:'Profile note', value:'Art collector · sailing — add to interests', source:'Press · maritime club roster' }
    ];
    const fileRows = [
      { id:'overview', label:'Relationship', sum:'narrative & how you met' },
      { id:'mlsmatch', label:'Profile & search', sum:'search criteria · MLS match' },
      { id:'showings', label:'Tours & showings', sum:'tour planner · coordination · feedback' },
      { id:'deals', label:'Deals', sum:(ct.active||'0') + ' active · ' + (ct.dealsWon||'0') + ' won' },
      { id:'drive', label:'Drive', sum: ctDrive.replace('Drive · ','') }
    ].map(r => ({ ...r, active: cTab===r.id,
      chevron: cTab===r.id ? '▴' : '›',
      onClick: ()=>{ if(r.id==='drive'){ this.pushAudit('Drive folder opened · '+ct.name); return; } this.setState({ contactTab: cTab===r.id ? 'file' : r.id }); },
      rowStyle:`display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 22px;border-bottom:1px solid #E3E3E3;cursor:pointer;background:${cTab===r.id?'#FFFFFF':'transparent'};transition:background 150ms;` }));
    const cNow = cTab==='now';
    const ctWorkVals = {
      ctJourney, hasJourney, ctSinceLine, hasCtNext, ctNextBan, ctPinned, hasCtPinned: ctPinned.length>0, ctDrive, ctPrevNav, ctNextNav,
      ctNoNext: !hasCtNext,
      ctSegments, isFileView, fileRows, cNow, ctEssence, ctPinnedLine, ctNowStats, ctBodyOld: false,
      ctTabs, cOverviewNew: false, ctShowFileRows: false,
      ctAgentTab: cTabN === 'agent',
      ctNowVisible: cTabN !== 'agent',
      ...(() => {
        const lang3 = ({ marcelo:'PT', bittencourt:'PT', alvarez:'ES' })[ct.id] || 'EN';
        const first3 = (ct.name || 'the client').split(' ')[0];
        const touches3 = (ct.touches || []);
        const lastT = touches3[0] ? (touches3[0].date + ' · ' + touches3[0].type) : 'no touch logged yet';
        const key3 = 'ct|' + (ct.id || ct.name);
        const hist3 = (this.state.contactChats || {})[key3] || [];
        const reply3 = (qq) => {
          const q = qq.toLowerCase();
          if (/relationship|read|profile|who|history/.test(q)) return first3 + ' — ' + ct.relationship + ' · ' + ct.status + ' · in the book since ' + ct.since + ' (' + ct.location + '). ' + touches3.length + ' touches on file, last: ' + lastT + '. Language: everything goes out in ' + lang3 + '.\n\nThe relationship read: consistent responder, decision pace is deliberate — pressure works against you here. Want the trust angle or the urgency angle worked up?';
          if (/next|today|do |move|priorit/.test(q)) return 'Next move on ' + first3 + ': ' + (ct.status === 'HOT' ? 'lock the pending step this week — the window is open and momentum decays fast at this heat.' : 'a value touch, not a check-in — send something that reads as insider signal (off-market movement, corridor pricing), then let the response set the cadence.') + '\n\nI can stage it in ' + lang3 + ' for your approval — one tap and it goes to Needs Your Decision.';
          if (/draft|outreach|message|write|whats|email/.test(q)) return 'Two angles for ' + first3 + ', both in ' + lang3 + ':\n1 · Soft — market signal share, no ask. Keeps presence warm.\n2 · Direct — one concrete next step with a time anchor.\n\nGiven ' + ct.status + ' status I would send Direct. Approve and I queue it — nothing goes out without you.';
          if (/match|mls|propert|listing|inventor/.test(q)) return 'The matching sweep runs nightly against ' + first3 + '\u2019s profile — 2 live candidates are sitting in the MLS Match tab right now, both inside the stated corridor. The stronger fit is the one with the west exposure.\n\nWant me to package both as a suggestion in ' + lang3 + ', or draft a tour around the top fit?';
          if (/expan|referral|famil|network|grow/.test(q)) return 'Expansion read on ' + first3 + ': ' + ct.relationship + ' with ' + ct.since + ' tenure is exactly the profile that refers — the moment is right after a win or a well-handled problem, not mid-negotiation.\n\nTwo routes: family office (asset diversification narrative) or peer referral (one introduction, framed as access). I can draft the ask so it reads as privilege, not request.';
          return first3 + ' right now: ' + ct.relationship + ' · ' + ct.status + ' · last touch ' + lastT + '. The file behind this chat is current.\n\nPush me on any of it — the relationship read, the next move, a draft in ' + lang3 + ', MLS matching, or the expansion angle.';
        };
        const send3 = (raw) => {
          const q = (typeof raw === 'string' ? raw : (this.state.ctChatInput || '')).trim();
          if (!q) return;
          const rep = reply3(q);
          this.setState(s => ({ ctChatInput: '', ctChatTyping: true, contactChats: { ...(s.contactChats || {}), [key3]: [ ...((s.contactChats || {})[key3] || []), { who:'u', txt:q } ] } }));
          this._chatEnd(); clearTimeout(this._ctChatT);
          this._ctChatT = setTimeout(() => { this._chatEnd(); this.setState(s => ({ ctChatTyping: false, contactChats: { ...(s.contactChats || {}), [key3]: [ ...((s.contactChats || {})[key3] || []), { who:'a', txt:rep } ] } })); }, 900);
        };
        return {
          ctChatRows: [ { isA:true, isU:false, txt: 'File loaded — ' + ct.name + ': ' + ct.relationship + ' · ' + ct.status + ' · ' + touches3.length + ' touches · speaks ' + lang3 + '. Ask me anything on this relationship — strategy, next move, drafts, matching. Analysis stays here; nothing reaches ' + first3 + ' without your approval.' }, ...hist3.map(m => ({ isA: m.who === 'a', isU: m.who !== 'a', txt: m.txt })) ],
          ctChatTyping: !!this.state.ctChatTyping,
          ctChatInput2: this.state.ctChatInput || '',
          onCtChatInput: (e) => this.setState({ ctChatInput: e.target.value }),
          onCtChatKeyD: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send3(); } },
          ctChatGo: () => send3(),
          ctChatChips: ['Read this relationship','What should I do next?','Draft outreach','MLS matches for them','Referral / expansion angle'].map(c => ({ label:c, onClick: () => send3(c) }))
        };
      })(),
      cDriveTab: cTabN==='drive', cRelatedTab: cTabN==='related',
      ctRelated, ctCritSummary, ctHeadStats,
      goTabContact: ()=>this.setState({contactTab:'contact'}), goTabProperty: ()=>this.setState({contactTab:'mlsmatch', scOpen:true}),
      goTabDrive: ()=>this.setState({contactTab:'drive'}), goTabRelated: ()=>this.setState({contactTab:'related'}),
      goTabMls: ()=>this.setState({contactTab:'mlsmatch'}),
      ...(()=>{
        const acts = {
          marcelo: { label:'HOT · CADENCE DAY 4 OF 3 · 3 MIN', head:'Second visit + developer schedule — confirm Saturday 11am', draft:'Marcelo — consegui o cronograma de obra do PH-A. Sábado 11h para a segunda visita? Levo o schedule de depósitos também.', chan:'WhatsApp' },
          bittencourt: { label:'PAST · 90D CADENCE · DAY 94 OF 90', head:'WON 94 days ago, no referral ask — draft prepared', draft:'Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?', chan:'WhatsApp' },
          keller: { label:'WARM · DECISION WINDOW', head:'Principal call before Wednesday — Golden Beach counter', draft:'Anton — the Golden Beach window is moving. 15 minutes tomorrow to align the counter before Wednesday?', chan:'WhatsApp' },
          sterling: { label:'IN CONTRACT · T-3', head:'Inspection ends today — same-day summary staged', draft:'Robert — inspection wraps today. Summary tonight; the HOA package files right after.', chan:'WhatsApp' } };
        const act = acts[ct.id] || { label:'CADENCE · ON SCHEDULE', head:'Next value touch — draft prepared by the agent', draft:'A short note tailored to the profile — approve and it goes out in the right language.', chan:'WhatsApp' };
        const sentT = !!((this.state.ctTlSent||{})[ct.id]);
        const futBase = ({
          marcelo: [
            { d:'Jul 09', what:'Value touch — corridor market brief', why:'cadence · draft staged the night before', st:'Scheduled', c:'#0D0D0D' },
            { d:'Jul 18', what:'Re-qualify goals against the mandate', why:'relationship check · agent prepares the brief', st:'Planned', c:'#B45309' },
            { d:'Aug 12', what:'Beatriz birthday — gesture armed', why:'important date · shortlist ready for approval', st:'Armed', c:'#8F8F8F' },
            { d:'Deal →', what:'Search milestones — via Rivage search', why:'2nd visit · contract target · deposits live on the opportunity', st:'Mirror', c:'#5D5D5D', goDeal: true } ] })[ct.id] || [
            { d:'Jul 10', what:'Value touch — tailored market intel', why:'cadence · agent drafts in the contact language', st:'Scheduled', c:'#0D0D0D' },
            { d:'Jul 18', what:'Re-qualify goals against the mandate', why:'quarterly check · agent prepares the brief', st:'Planned', c:'#B45309' },
            { d:'Aug 01', what:'Key date — gesture armed', why:'important date from the profile', st:'Armed', c:'#8F8F8F' } ];
        const hovT = this.state.tlHov;
        const shifts = this.state.ctTlShift || {};
        const fut = futBase.map((f, i) => { const k = ct.id + '|' + i; const dLbl = shifts[k] || f.d;
          const shift = (days) => { const mm = /([A-Za-z]{3}) (\d+)/.exec(dLbl); if (!mm) return; const lbl = mm[1] + ' ' + (parseInt(mm[2],10) + days); this.setState(s=>({ ctTlShift: { ...(s.ctTlShift||{}), [k]: lbl } })); this.pushAudit('Plan adjusted · ' + ct.name + ' — \u201C' + f.what + '\u201D → ' + lbl + ' · agent re-plans around it'); this.ciToast('Moved to ' + lbl + ' — agent re-plans'); };
          return { ...f, d: dLbl, hov: (hovT === k) && !f.goDeal, onGo: (f.goDeal ? ()=>this.nav('deal') : null), cur: (f.goDeal ? 'pointer' : 'default'), onEnter: ()=>this.setState({ tlHov: k }), onLeave: ()=>this.setState({ tlHov: null }), onP1: ()=>shift(1), onP7: ()=>shift(7) }; });
        const learned = !!((this.state.ctLearnDone||{})[ct.id]);
        return {
          tlActLabel: act.label, tlActHead: act.head, tlActDraft: act.draft, tlActChan: act.chan,
          hasTlDealLink: ct.id === 'marcelo',
          tlDealGo: ()=>this.nav('deal'),
          tlSent: sentT, tlOpen: !sentT,
          tlCardDyn: sentT ? 'max-height:0;opacity:0;' : '',
          tlUndo: ()=>this.undoLast(),
          tlApprove: ()=>{ this.setState(s=>({ ctTlSent: { ...(s.ctTlSent||{}), [ct.id]: true } })); this.pushAudit('Timeline · approved & sent — ' + ct.name + ' · ' + act.chan + ' · logged'); this.ciToast('Sent — ' + act.chan + ' · logged'); },
          tlSkip: ()=>{ this.setState(s=>({ ctTlSent: { ...(s.ctTlSent||{}), [ct.id]: true } })); this.pushAudit('Timeline · action skipped for ' + ct.name + ' — agent will re-propose'); this.ciToast('Skipped — agent will re-propose'); },
          tlSignals: [
            { dot:'#B45309', t:'No inbound in 12 days — silence watch armed', go: ()=>{}, cur:'default' },
            { dot:'#10A37F', t:'Opened your last message 2× yesterday — good window now', go: ()=>{}, cur:'default' } ],
          tlMlsOpen: false,
          tlMlsToggle: ()=>this.setState(s=>({ tlMlsOpen: !s.tlMlsOpen })),
          tlFuture: fut,
          tlPast: [ ...ctLogged.map(a=>({ date:a.date, type:a.type, body:a.body })), ...(ct.touches||[]).map(a=>({ date:a.date, type:a.type, body:a.body })) ].slice(0, 12),
          hasTlLearn: !learned,
          tlLearn: { text:'From the Jul 04 call — birthday Mar 12 · spouse Beatriz (co-decision maker). Save to the profile?',
            onSave: ()=>{ this.setState(s=>({ ctLearnDone: { ...(s.ctLearnDone||{}), [ct.id]: true }, ctFieldVals: { ...(s.ctFieldVals||{}), [ct.id + '|birthday']: 'Mar 12', [ct.id + '|spouse']: 'Beatriz' } })); this.pushAudit('Profile enriched from conversation · ' + ct.name + ' — birthday + spouse saved, source logged'); this.ciToast('Saved to profile — source logged'); },
            onDismiss: ()=>this.setState(s=>({ ctLearnDone: { ...(s.ctLearnDone||{}), [ct.id]: true } })) },
          ctIdOpen: !!this.state.ctIdOpen,
          ctIdHint: 'type to edit · auto-saved · the agent fills gaps from conversations',
          openCtId: ()=>{ clearTimeout(this._ctIdT); this.setState({ ctIdOpen: true }); },
          closeCtId: ()=>{ if (this.state.ctIdPin) return; clearTimeout(this._ctIdT); this._ctIdT = setTimeout(()=>this.setState({ ctIdOpen: false }), 340); },
          pinCtId: ()=>this.setState(s=>({ ctIdPin: !s.ctIdPin, ctIdOpen: !s.ctIdPin }))
        };
      })(),
      ctInfoSections: (()=>{
        const defs = [
          { num:'01', label:'Personal', rows:[
            ['name','Full Name','Name', ct.name], ['nick','Preferred Name','Nickname',''], ['occupation','Occupation','Title / role', enApplied ? enrichData.title : ''], ['langs','Nationality · Languages','e.g. BR · PT / EN',''] ] },
          { num:'02', label:'Professional', rows:[
            ['company','Company','Company name', enApplied ? enrichData.company : ''], ['jobtitle','Job Title','Role / title', enApplied ? enrichData.title : ''], ['workphone','Work Phone','+1 …', enApplied ? enrichData.workPhone : ''], ['linkedin','LinkedIn','linkedin.com/in/…', enApplied ? enrichData.linkedin : ''], ['industry','Industry','Sector', enApplied ? enrichData.industry : ''], ['assistant','Assistant / Gatekeeper','Name · contact',''] ] },
          { num:'03', label:'Reachability', rows:[
            ['phone','Mobile','+1 …', ct.phone], ['email','Email','name@…', ct.email], ['channel','Preferred Channel','WhatsApp / Call / Email','WhatsApp'], ['address','Mailing Address','Street, city, ZIP',''] ] },
          { num:'04', label:'Family', rows:[
            ['spouse','Spouse / Partner','Name', ct.spouse || ''], ['spousecontact','Partner Contact','Phone / email',''], ['children','Children','Names & ages',''], ['household','Household Notes','Pets, staff…',''] ] },
          { num:'05', label:'Important Dates', rows:[
            ['birthday','Birthday','MM / DD',''], ['pbirthday','Partner Birthday','MM / DD',''], ['anniversary','Anniversary','MM / DD',''], ['homeanniv','Home Purchase','MM / DD / YYYY',''] ] },
          { num:'06', label:'Preferences & Notes', rows:[
            ['interests','Interests','Golf, art, sailing…',''], ['howmet','How We Met','Referral, event…',''], ['hospitality','Hospitality Prefs','Wine, restaurants, dietary…',''], ['privnotes','Private Notes','Anything that matters',''] ] }
        ];
        const fv = this.state.ctFieldVals || {};
        const idEdit = !!this.state.ctIdEdit;
        return defs.map(s => {
          const rows = s.rows.map(([key, label, ph, def]) => {
            const k = ct.id + '|' + key;
            const val = (fv[k] !== undefined) ? fv[k] : (def || '');
            return { label, ph: ph || '—', val, show: idEdit || !!String(val || '').trim(),
              onInput: (e)=>{ const v = e.target.value; this.setState(st=>({ ctFieldVals: { ...(st.ctFieldVals||{}), [k]: v } })); } };
          });
          const filled = rows.filter(r => (r.val || '').trim()).length;
          return { num: s.num, label: s.label, rows, hasVisible: idEdit || filled > 0,
            meta: idEdit ? (filled + ' filled · ' + (rows.length - filled) + ' empty · type to edit · auto-saved') : (filled + ' filled · ' + (rows.length - filled) + ' empty hidden') };
        });
      })(),
      ctIdEdit: !!this.state.ctIdEdit,
      ctIdEditToggle: () => this.setState(s7 => ({ ctIdEdit: !s7.ctIdEdit })),
      ctIdEditLabel: this.state.ctIdEdit ? 'Done · hide empty fields' : 'Edit contact info',
      ctSubItems: [ { v: ct.phone, kind:'phone' }, { v: ct.email, kind:'email' }, (ct.spouse ? { v:'Spouse · ' + ct.spouse, kind:'plain' } : null) ].filter(x => x && x.v).map((x, i) => {
        const copyGo = ()=>{ try { navigator.clipboard.writeText(String(x.v)); } catch (e) {} this.ciToast('Copied — ' + x.v); };
        const toInbox = (msg, audit) => { this.setState({ screen:'inbox' }); this.selectThread(ct.id); if (audit) this.pushAudit(audit); this.ciToast(msg); };
        const acts = x.kind === 'phone' ? [
          { label:'Call', onGo: ()=>{ this.pushAudit('Call started · ' + ct.name + ' — ' + x.v + ' · notes will be logged'); this.ciToast('Calling ' + ct.name + ' — logged'); } },
          { label:'WhatsApp', onGo: ()=>toInbox('WhatsApp thread aberto no Inbox', 'WhatsApp thread opened · ' + ct.name) },
          { label:'Copy', onGo: copyGo }
        ] : x.kind === 'email' ? [
          { label:'Email · via Inbox', onGo: ()=>toInbox('Inbox aberto — draft do agent staged', 'Email composer opened in Inbox · ' + ct.name + ' — agent draft staged') },
          { label:'Copy', onGo: copyGo }
        ] : [ { label:'Copy', onGo: copyGo } ];
        return { v: x.v, acts, hovOn: this.state.ctSubHov === i,
          onEnter: ()=>{ clearTimeout(this._ctSubT); this.setState({ ctSubHov: i }); }, onLeave: ()=>{ clearTimeout(this._ctSubT); this._ctSubT = setTimeout(()=>this.setState(s=>(s.ctSubHov===i ? { ctSubHov:null } : null)), 300); }, onCopy: copyGo };
      }),
      goTabActivity: ()=>this.setState({contactTab:'activities'}),
      ...(() => {
        const ov6 = (this.state.ctMeta || {})[ct.id] || {};
        const relParts = String(ct.relationship || '').split(' · ');
        const setMeta6 = (patch6) => this.setState(s6 => ({ ctMeta: { ...(s6.ctMeta || {}), [ct.id]: { ...((s6.ctMeta || {})[ct.id] || {}), ...patch6 } } }));
        const statusRaw6 = ov6.status || (ct.status ? (ct.status.charAt(0) + ct.status.slice(1).toLowerCase()) : (relParts[0] || 'Not classified'));
        const customS6 = this.state.ctCustomStatuses || [];
        const canonS6 = ['Hot','Warm','Nurturing','Won','Lost','Not classified', ...customS6];
        const statusV = canonS6.indexOf(statusRaw6) >= 0 ? statusRaw6 : (({ 'Client':'Won', 'Past client':'Won', 'Prospect':'Warm', 'Sphere':'Nurturing', 'Partner':'Nurturing', 'VIP':'Hot' })[statusRaw6] || 'Not classified');
        const statusDot6 = ({ 'Hot':'#D0342C', 'Warm':'#B45309', 'Nurturing':'#10A37F', 'Won':'#0D0D0D', 'Lost':'#8F8F8F' })[statusV] || '#D9D9D9';
        const typeV = ov6.type || relParts[1] || 'Buyer';
        const tagsV = ov6.tags || ct.tags || [];
        const optList6 = (cur6, base6) => (base6.indexOf(cur6) < 0 && cur6 ? [cur6, ...base6] : base6);
        return {
          ctStatusVal: statusV,
          ...(() => {
            const cad6 = { 'Hot':'follow-up within 24–48h', 'Warm':'touch every 7 days', 'Nurturing':'monthly value touch', 'Won':'post-close care — quarterly + key dates', 'Lost':'re-engage ping every 90d', 'Not classified':'agent watches signals and proposes a cadence' };
            return {
              ctStatusOpts: [...canonS6.map(o6 => ({ value: o6, label: o6 })), { value: '__addst', label: '＋ Customize status…' }],
              ctStatusAddOpen: !!this.state.ctStatusAddOpen,
              ctNewStatus: this.state.ctNewStatus ?? '',
              onCtNewStatus: (e) => this.setState({ ctNewStatus: e.target.value }),
              ctAddStatus: () => { const v6 = String(this.state.ctNewStatus || '').trim(); if (!v6) { this.ciToast('Type a status name first'); return; } this.setState(s6 => ({ ctCustomStatuses: [ ...(s6.ctCustomStatuses || []).filter(x6 => x6 !== v6), v6 ], ctNewStatus: '', ctStatusAddOpen: false })); setMeta6({ status: v6 }); this.pushAudit('Contact · custom status created — ' + v6 + ' · applied to ' + ct.name + ' · agent will propose a cadence'); this.ciToast('Status added — ' + v6); },
              ctStatusAddCancel: () => this.setState({ ctStatusAddOpen: false, ctNewStatus: '' }),
              goSettingsCad: () => { this.nav('settings'); this.setState({ setSec: '02' }); this.ciToast('Settings — Cadence Rules'); },
              goSettingsTypes: () => { this.nav('settings'); this.setState({ setSec: '18' }); this.ciToast('Settings — Contact Types'); },
              ctStatusCadence: cad6[statusV] || 'custom cadence — set by the agent from history',
              ctStatusDot: statusDot6,
              onCtStatus: (e) => { const nv6 = e.target.value; if (nv6 === '__addst') { this.setState({ ctStatusAddOpen: true, contactTab: 'profile' }); return; } setMeta6({ status: nv6 }); this.pushAudit('Contact · status → ' + nv6 + ' · ' + ct.name + ' · default cadence armed: ' + (cad6[nv6] || 'custom')); this.ciToast('Status → ' + nv6 + ' — agent schedules: ' + (cad6[nv6] || 'custom cadence')); }
            };
          })(),
          ctTypeVal: typeV,
          ...(() => {
            const custom6 = this.state.ctCustomTypes || [];
            const base6 = ['Buyer','Seller','Tenant','Landlord','Investor','Developer', ...custom6];
            return {
              ctTypeOpts: [...optList6(typeV, base6).map(o6 => ({ value: o6, label: o6 })), { value: '__add', label: '＋ Add type…' }],
              onCtType: (e) => { const nv6 = e.target.value; if (nv6 === '__add') { this.setState({ ctTypeAddOpen: true }); return; } setMeta6({ type: nv6 }); this.pushAudit('Contact · type → ' + nv6 + ' · ' + ct.name); },
              ctTypeAddOpen: !!this.state.ctTypeAddOpen,
              ctNewType: this.state.ctNewType ?? '',
              onCtNewType: (e) => this.setState({ ctNewType: e.target.value }),
              ctAddType: () => { const v6 = String(this.state.ctNewType || '').trim(); if (!v6) { this.ciToast('Type a name first'); return; } this.setState(s6 => ({ ctCustomTypes: [ ...(s6.ctCustomTypes || []).filter(x6 => x6 !== v6), v6 ], ctNewType: '', ctTypeAddOpen: false })); setMeta6({ type: v6 }); this.pushAudit('Contact · new type created — ' + v6 + ' · applied to ' + ct.name); this.ciToast('Type added — ' + v6); },
              ctTypeAddCancel: () => this.setState({ ctTypeAddOpen: false, ctNewType: '' })
            };
          })(),
          ctTags: tagsV.map((t6, i6) => ({ label: t6, onRemove: () => setMeta6({ tags: tagsV.filter((x6, xi6) => xi6 !== i6) }) })),
          ctNewTag: this.state.ctNewTag ?? '',
          onCtNewTag: (e) => this.setState({ ctNewTag: e.target.value }),
          ctAddTag: () => { const v6 = String(this.state.ctNewTag || '').trim(); if (!v6) return; setMeta6({ tags: [...tagsV, v6] }); this.setState({ ctNewTag: '' }); this.pushAudit('Contact · tag added — ' + v6 + ' · ' + ct.name); },
          ctGoProfile: () => this.setState({ contactTab: 'profile', ctTabMoreOpen: false }),

          ctProfileTab: cTab === 'profile',
          ctNotProfile: cTab !== 'profile',
          ctProfileFields: [
            ['Preferred asset','prefAsset'],['Preferred areas','prefAreas'],['Budget range','prefBudget']
          ].map(([lb6, k6]) => ({ label: lb6, value: String(ov6[k6] ?? ct[k6] ?? ''), onInput: (e) => setMeta6({ [k6]: e.target.value }) }))
        };
      })(),
      ctTabMoreOpen, ctTabMoreItems,
      toggleCtTabMore: ()=>this.setState(s=>({ ctTabMoreOpen: !s.ctTabMoreOpen })),
      ctCurTabLabel: ctFile ? 'Full file · one scroll' : (ctTabDefs.find(d=>d[1]===cTabN) || ['Overview'])[0],
      ctLayoutSections: ()=>this.setState({ ctLayout: 'sections' }),
      ctLayoutFile: ()=>this.setState({ ctLayout: 'file' }),
      ctLaySecStyle: 'border-radius:999px;padding:5px 12px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:' + (ctFile?400:500) + ';font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 150ms;' + (ctFile ? 'background:transparent;border:1px solid #E3E3E3;color:#8F8F8F;' : 'background:#E9E8E4;border:1px solid #E0DFDA;color:#0D0D0D;'),
      ctLayFileStyle: 'border-radius:999px;padding:5px 12px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:' + (ctFile?500:400) + ';font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 150ms;' + (ctFile ? 'background:#E9E8E4;border:1px solid #E0DFDA;color:#0D0D0D;' : 'background:transparent;border:1px solid #E3E3E3;color:#8F8F8F;'),
      ctSubInfo: [ct.phone, ct.email, (ct.spouse ? ('Spouse · ' + ct.spouse) : null)].filter(Boolean).join('   ·   '),
      ctSecCardOpen: !!this.state.ctSecCardOpen,
      toggleCtSecCard: ()=>this.setState(s=>({ ctSecCardOpen: !s.ctSecCardOpen })),
      ctSecChevron: this.state.ctSecCardOpen ? '⌃' : '⌄',
      ctMlsTabStyle: `padding:13px 0 11px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${cTabN==='mlsmatch'?500:400};font-size:11.5px;letter-spacing:0.06em;text-transform:uppercase;color:${cTabN==='mlsmatch'?'#0D0D0D':'#8F8F8F'};border-bottom:1px solid ${cTabN==='mlsmatch'?'#0D0D0D':'transparent'};cursor:pointer;transition:color 150ms;`,
      openCtTabMenu: ()=>this.setState({ ctTabMoreOpen:true }),
      closeCtTabMenu: ()=>this.setState({ ctTabMoreOpen:false }),
      ctMandateVal: ((this.state.ctMandates||{})[ct.id]) ?? '',
      onCtMandate: (e)=>{ const v = e.target.value; this.setState(s=>({ ctMandates: { ...(s.ctMandates||{}), [ct.id]: v } })); },
      newDealFromMandate: ()=>{
        const mv = ((this.state.ctMandates||{})[ct.id] || '').trim();
        const bm = mv.match(/\$\s?([\d.]+)\s?(?:[–—-]\s?([\d.]+))?\s?M/i);
        const budget = bm ? ('$' + (bm[2] || bm[1]) + 'M') : '$—';
        const opp = { name: ct.name + ' — new search', opp: 'Buyer · from mandate', budget, next: mv ? 'Qualify against mandate — brief drafting' : 'Write the mandate — agent completes the brief' };
        this.setState(s => ({ newOpps: [opp, ...(s.newOpps||[])], screen: 'pipeline', collPipe: 'purchases', view: 'board', pipeTab: 'board' }));
        this.pushAudit('Opportunity created · ' + ct.name + ' — Purchases · Prospecting, pre-filled from the mandate' + (bm ? (' · budget ' + budget) : '') + ' — agent drafts the search brief');
        this.ciToast('Opportunity created — Prospecting · pre-filled from the mandate');
      },
      saveCtMandate: ()=>{ const v = ((this.state.ctMandates||{})[ct.id]||'').trim(); if (!v) { this.ciToast('Write the mandate first — profile, objective, goals.'); return; } this.setState(s=>({ ctPlanOn: { ...(s.ctPlanOn||{}), [ct.id]: true }, ctMandateOpen:false })); this.pushAudit('Mandate updated · ' + ct.name + ' — agent recalibrated plan + monitoring, cadence rebalanced to the stated goal'); this.ciToast('Mandate saved — plan & monitoring recalibrated'); },
      hasCtPlan: !!((this.state.ctPlanOn||{})[ct.id]),
      mandExpanded: !((this.state.ctPlanOn||{})[ct.id]) || !!this.state.ctMandateOpen,
      mandCollapsed: !!((this.state.ctPlanOn||{})[ct.id]) && !this.state.ctMandateOpen,
      toggleMandate: ()=>this.setState(s=>({ ctMandateOpen: !s.ctMandateOpen })),
      mandateBtnLabel: ((this.state.ctPlanOn||{})[ct.id]) ? 'Update mandate' : 'Save mandate',
      mandateNote: ((this.state.ctPlanOn||{})[ct.id]) ? 'Agent recalibrates on every save' : 'Unique per contact · agent derives the plan',
      ctPlanItems: ['Weekly value touch — intel matched to the stated profile', 'Continuous sweep — inventory + off-market against the goal', 'Escalate the moment a signal matches the objective'],
      ctWatchItems: ['New inventory in the stated corridor & band', 'Price movement on watched assets', 'Life & company events around the relationship'],
      ctInfoOpen: !!this.state.ctInfoOpen,
      toggleCtInfo: ()=>this.setState(s=>({ ctInfoOpen: !s.ctInfoOpen })),
      ctInfoChevron: this.state.ctInfoOpen ? '⌃' : '⌄',
      ctInfoBarDyn: this.state.ctInfoOpen ? 'max-height:120px;opacity:1;' : 'max-height:0;opacity:0;',
      ctInfoItems: [
        ['Mobile', ct.phone || '—'],
        ['Email', ct.email || '—'],
        ['Source', ct.source || 'Referral · sphere'],
        ['Spouse / Partner', ct.spouse || '—'],
        ['Company', enApplied ? (enrichData.company + ' · ' + enrichData.title) : '—']
      ].map(([label, value], i) => ({ label, value, style: 'flex:none;display:flex;flex-direction:column;gap:5px;' + (i ? 'padding:0 26px;border-left:1px solid #E3E3E3;' : 'padding:0 26px 0 0;') })),
      scOpen: !!this.state.scOpen,
      toggleSc: ()=>this.setState(s=>({ scOpen: !s.scOpen })),
      scChevron: this.state.scOpen ? 'Collapse ▴' : 'Expand ▾',
      ctStoryFeed: [ ...ctLogged.map(a=>({ date:a.date, type:a.type, body:a.body })), ...(ct.touches||[]).map(a=>({ date:a.date, type:a.type, body:a.body })) ].slice(0,8),
      hasCtNextEvent: !!ctNextEvent, ctNextEvent: ctNextEvent || { when:'', what:'', link:'', note:'' },
      ctStrip: contactDash.map((d,i,arr)=>({ label:d.label, value:d.value, style:`padding:16px 22px 14px;${i<arr.length-1?'border-right:1px solid #E3E3E3;':''}${d.label==='Momentum'?'background:rgba(255,255,255,0.55);':''}` })),
      ctCalOpen: !!this.state.ctCalOpen, toggleCtCal: ()=>this.setState(s=>({ctCalOpen:!s.ctCalOpen})), ctCalChevron: this.state.ctCalOpen?'▴':'▾',
      ctMailOpen: !!this.state.ctMailOpen, toggleCtMail: ()=>this.setState(s=>({ctMailOpen:!s.ctMailOpen})), ctMailChevron: this.state.ctMailOpen?'▴':'▾',
      ctLogged, hasCtLogged: ctLogged.length>0,
      ctComposerVal: this.state.ctComposer || '',
      onCtComposer: (e)=>this.setState({ ctComposer:e.target.value }),
      onCtComposerKey: (e)=>{ if(e.key==='Enter' && (this.state.ctComposer||'').trim()){ const v=this.state.ctComposer.trim();
        this.setState(s=>({ ctLogs:{ ...(s.ctLogs||{}), [ct.id]:[{ date:'Jul 06', type:'Note', body:v }, ...((s.ctLogs||{})[ct.id]||[])] }, ctComposer:'' }));
        this.pushAudit('Activity logged · ' + ct.name + ' — ' + v.slice(0,60)); } }
    };
    const logTouchDefs = [['Call','Call'],['Message','WhatsApp'],['Email','Email'],['Showing','Showing'],['Note','Note'],['Task','Task']];
    const logTouchOptions = logTouchDefs.map(([label,val]) => ({ label,
      onClick:()=>this.setState({ screen:'activities', logOpen:true, logType:val, logName:ct.name, logBody:'', logTouchOpen:false }) }));

    // ---- Next Actions ----
    const naDone = this.state.doneActions || {};
    const naFilterKey = this.state.naFilter || 'all';
    const naFilterDefs = [['All','all'],['Calls','Call'],['Messages','Message'],['Documents','Document'],['Showings','Showing'],['Tasks','Task']];
    const bucketDot = { overdue:'#D0342C', today:'#303030', week:'#8F8F8F', later:'#8F8F8F' };
    const naRaw = [
      { id:'a1', name:'Bal Harbour Listing', action:'Re-engage seller — 19 days without contact', type:'Task', wgci:'', due:'Jun 24', bucket:'overdue' },
      { id:'a2', name:'Sunny Isles 3801', action:'Re-forecast — expected close slipped', type:'Task', wgci:'', due:'Jun 30', bucket:'overdue' },
      { id:'a3', name:'Estates at Acqualina 5601', action:'Confirm Saturday 11am tour', type:'Call', wgci:'', due:'Jul 06', bucket:'today' },
      { id:'a4', name:'Marcelo C. · Rivage PH', action:'Confirm second visit', type:'Call', wgci:'$412K', due:'Jul 06', bucket:'today' },
      { id:'a5', name:'Family Office · Zurich', action:'Push principal call before Wednesday', type:'Call', wgci:'$288K', due:'Jul 07', bucket:'week' },
      { id:'a6', name:'Faena Penthouse', action:'Prompt seller counter', type:'Message', wgci:'', due:'Jul 07', bucket:'week' },
      { id:'a7', name:'Marcelo C. · Rivage PH', action:'Send developer construction schedule', type:'Document', wgci:'$412K', due:'Jul 08', bucket:'week' },
      { id:'a8', name:'Sterling · Acqualina 4802', action:'Confirm inspection report receipt', type:'Task', wgci:'$196K', due:'Jul 08', bucket:'week' },
      { id:'a9', name:'Faena 8C · Ravel', action:'Submit HOA approval package', type:'Document', wgci:'', due:'Jul 11', bucket:'week' },
      { id:'a10', name:'Indian Creek Estate', action:'Prepare valuation package', type:'Document', wgci:'', due:'Jul 12', bucket:'later' },
      { id:'a11', name:'Nakamura · Bal Harbour 1503', action:'Follow up on open offer', type:'Message', wgci:'', due:'Jul 12', bucket:'later' },
      { id:'a12', name:'Estates at Acqualina 5601', action:'Conduct Saturday 11am showing', type:'Showing', wgci:'', due:'Jul 06', bucket:'today' },
      { id:'a13', name:'Elena Ravel · Faena 8C', action:'Third viewing walk-through', type:'Showing', wgci:'', due:'Jul 09', bucket:'week' }
    ];
    // user-created + agent-proposed tasks
    const naUser = this.state.naUserTasks || [];
    const naResch = this.state.naResched || {};
    const naFollow = this.state.naFollow || {};
    const naSelIdx = this.state.naSel || 0;
    const naAll = [...naUser, ...naRaw].map(a => {
      const r = naResch[a.id];
      return r ? { ...a, due: r.due, bucket: r.bucket, resched: r.tag } : a;
    });
    this._naNameById = {}; naAll.forEach(a => { this._naNameById[a.id] = a.name; });
    const naActions = naAll.map(a => {
      const done = !!naDone[a.id];
      const naCnt = { a1:3, ...(this.state.naReschCount||{}) };
      const deferCount = naCnt[a.id] || 0;
      const isEscalated = deferCount >= 3 && !done;
      return { ...a, done, isEscalated,
        escText: 'Deferred ' + deferCount + '× — do it today or kill it. Every deferral is logged.',
        onCommit: ()=>this.commitToday(a.id, a.name),
        onKill: ()=>this.killTask(a.id, a.name),
        onToggle:()=>this.toggleAction(a.id), dot: bucketDot[a.bucket],
        checkBg: done?'#0D0D0D':'transparent', checkBorder: done?'#0D0D0D':'#8F8F8F',
        nameColor: done?'#8F8F8F':'#0D0D0D', actionColor: done?'#8F8F8F':'#303030',
        deco: done?'line-through':'none',
        hasFollow: !!naFollow[a.id], followText: naFollow[a.id] || '',
        isAgentParsed: !!a.agentParsed,
        reschedTag: a.resched || '',
        hasResched: !!a.resched,
        onR1: ()=>this.resched(a.id, a.name, { due:'Jul 07', bucket:'week', tag:'+1d' }),
        onR3: ()=>this.resched(a.id, a.name, { due:'Jul 09', bucket:'week', tag:'+3d' }),
        onRW: ()=>this.resched(a.id, a.name, { due:'Jul 13', bucket:'later', tag:'+1w' }),
        dueColor: done?'#8F8F8F':(a.bucket==='overdue'?'#D0342C':'#5D5D5D') };
    });
    const naFilters = naFilterDefs.map(([label,id]) => {
      const active = naFilterKey === id;
      const count = id==='all' ? naActions.length : naActions.filter(a=>a.type===id).length;
      return { label, count: String(count), onClick:()=>this.setState({naFilter:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${active?C.ink:C.pedra};padding-bottom:5px;border-bottom:1px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });
    const naFiltered = naActions.filter(a => naFilterKey==='all' || a.type===naFilterKey);
    const bucketMeta = [['overdue','Overdue'],['today','Today · Jul 06'],['week','This Week'],['later','Later']];
    let naFlatIdx = 0;
    const naFlatIds = [];
    const naCollapsed = this.state.naCollapsed || {};
    const naGroups = bucketMeta.map(([b,label]) => {
      const items = naFiltered.filter(a => a.bucket===b).map(a => {
        const isSel = naFlatIdx === naSelIdx;
        naFlatIds.push(a.id); naFlatIdx++;
        return { ...a, rowBg: isSel ? '#ECECEC' : 'transparent', selBar: isSel ? '#0D0D0D' : 'transparent' };
      });
      const collapsed = !!naCollapsed[b];
      return { bucket:b, label, items, count: String(items.length), collapsed, open: !collapsed,
        caret: collapsed ? '\u203A' : '\u2304',
        onToggle: ()=>this.setState(s=>({ naCollapsed: { ...(s.naCollapsed||{}), [b]: !(s.naCollapsed||{})[b] } })) };
    }).filter(g => g.items.length);
    this._naFlatIds = naFlatIds;
    const naSummary = [
      { label:'Overdue', value: String(naActions.filter(a=>a.bucket==='overdue' && !a.done).length) },
      { label:'Today', value: String(naActions.filter(a=>a.bucket==='today' && !a.done).length) },
      { label:'This Week', value: String(naActions.filter(a=>a.bucket==='week' && !a.done).length) },
      { label:'Open', value: String(naActions.filter(a=>!a.done).length) }
    ];

    // natural-language quick add
    const naQuick = this.state.naQuick || '';
    const naParse = (t) => {
      const lo = t.toLowerCase();
      const nameMap = [['marcelo','Marcelo C. · Rivage PH'],['keller','Family Office · Zurich'],['zurich','Family Office · Zurich'],['sterling','Sterling · Acqualina 4802'],['bittencourt','A. Bittencourt'],['ana ','A. Bittencourt'],['nakamura','Nakamura · Bal Harbour 1503'],['ravel','Faena 8C · Ravel'],['alvarez','Alvarez · Continuum 2904']];
      const hit = nameMap.find(([k]) => lo.includes(k));
      const type = /call|ligar|ligação/.test(lo) ? 'Call' : /whats|message|msg|mensagem|follow/.test(lo) ? 'Message' : /tour|showing|visita/.test(lo) ? 'Showing' : /send|enviar|doc|contract|package/.test(lo) ? 'Document' : 'Task';
      let due = 'Jul 08', bucket = 'week';
      if (/today|hoje/.test(lo)) { due='Jul 06'; bucket='today'; }
      else if (/tomorrow|amanh/.test(lo)) { due='Jul 07'; bucket='week'; }
      else if (/friday|sexta/.test(lo)) { due='Jul 10'; bucket='week'; }
      else if (/monday|segunda|next week|semana que vem/.test(lo)) { due='Jul 13'; bucket='later'; }
      return { id:'u'+Date.now(), name: hit ? hit[1] : 'General', action: t, type, wgci:'', due, bucket, agentParsed:true };
    };
    const naQuickVals = {
      naQuick,
      onNaQuick: (e)=>this.setState({naQuick:e.target.value}),
      onNaQuickKey: (e)=>{ if (e.key==='Enter' && naQuick.trim()) { const task = naParse(naQuick.trim()); this.setState(s=>({ naUserTasks:[task, ...(s.naUserTasks||[])], naQuick:'' })); this.pushAudit('Created · ' + task.name + ' — ' + task.type + ' due ' + task.due + ' (agent-parsed)'); } }
    };

    // agent follow-up proposals
    const naPropsHandled = this.state.naPropsHandled || {};
    const naPropDefs = [
      { id:'p1', text:'Marcelo went quiet after the showing — propose a check-in call Thursday.', task:{ name:'Marcelo C. · Rivage PH', action:'Check-in call — post-showing temperature', type:'Call', due:'Jul 09', bucket:'week' } },
      { id:'p2', text:'Nakamura offer has no response in 5 days — nudge the listing agent.', task:{ name:'Nakamura · Bal Harbour 1503', action:'Nudge listing agent on open offer', type:'Message', due:'Jul 07', bucket:'week' } },
      { id:'p3', text:'Bittencourt referral window — 94 days since close, ask lands well now.', task:{ name:'A. Bittencourt', action:'Referral ask — soft, with market note attached', type:'Message', due:'Jul 08', bucket:'week' } }
    ];
    const naProposals = naPropDefs.filter(p => !naPropsHandled[p.id]).map(p => ({ ...p,
      onAccept: ()=>{ this.setState(s=>({ naUserTasks:[{ id:'u'+p.id, wgci:'', agentParsed:true, ...p.task }, ...(s.naUserTasks||[])], naPropsHandled:{...(s.naPropsHandled||{}), [p.id]:'accepted'} })); this.pushAudit('Follow-up accepted · ' + p.task.name + ' — ' + p.task.type + ' due ' + p.task.due); },
      onDismiss: ()=>this.setState(s=>({ naPropsHandled:{...(s.naPropsHandled||{}), [p.id]:'dismissed'} }))
    }));
    const hasNaProposals = naProposals.length > 0;
    const naProposalCount = String(naProposals.length);

    // follow-up sequences (agent-run chains)
    const seqState = this.state.seqState || {};
    const seqDefs = [
      { id:'sq1', name:'Coral Gables buyer · re-engagement', rule:'Stops at first reply', steps:[
        { label:'WhatsApp soft · Jul 03', st:'done' }, { label:'Call · Jul 07', st:'current' }, { label:'Downgrade proposal · Jul 10 · if silent', st:'future' }] },
      { id:'sq2', name:'Nakamura · offer chase', rule:'Stops on counter', steps:[
        { label:'Nudge listing agent · Jul 07', st:'current' }, { label:'Escalate to broker · Jul 09', st:'future' }, { label:'Reset client expectation · Jul 11', st:'future' }] }
    ];
    const naSequences = seqDefs.filter(q => seqState[q.id] !== 'stopped').map(q => {
      const paused = seqState[q.id] === 'paused';
      return { ...q, paused,
        pauseLabel: paused ? 'Resume' : 'Pause',
        statusText: paused ? 'Paused' : ('Active · ' + q.rule),
        statusColor: paused ? '#8F8F8F' : '#0D0D0D',
        onPause: ()=>{ this.setState(s=>({seqState:{...(s.seqState||{}), [q.id]: paused ? undefined : 'paused'}})); this.pushAudit((paused?'Sequence resumed':'Sequence paused') + ' · ' + q.name); },
        onStop: ()=>{ this.setState(s=>({seqState:{...(s.seqState||{}), [q.id]:'stopped'}})); this.pushAudit('Sequence stopped · ' + q.name + ' — remaining steps cancelled'); },
        steps: q.steps.map((st, si) => ({ ...st,
          arrowStyle: `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:200;font-size:11px;color:#C7C7C7;${si===q.steps.length-1?'display:none;':''}`,
          dotColor: st.st==='done' ? '#0D0D0D' : (st.st==='current' ? (paused ? '#8F8F8F' : '#D0342C') : '#C7C7C7'),
          textColor: st.st==='future' ? '#8F8F8F' : '#303030',
          weight: st.st==='current' ? 400 : 300 }))
      };
    });
    const hasNaSequences = naSequences.length > 0;

    // ---- Activities (global feed) ----
    const gactFilter = this.state.gactFilter || 'all';
    const gactRange = this.state.gactRange || 'last30';
    const rangeDefs = [['Today','today'],['This week','week'],['This month','month'],['Last 30 days','last30']];
    const REF_DAY = Date.parse('Jul 06 2026'); const DAY_MS = 86400000;
    const inGactRange = d => { const t = Date.parse(d+' 2026'); if(isNaN(t)) return true;
      if(gactRange==='today') return t===REF_DAY;
      if(gactRange==='week') return t<=REF_DAY && (REF_DAY-t)<=6*DAY_MS;
      if(gactRange==='month'){ const dt=new Date(t), r=new Date(REF_DAY); return dt.getMonth()===r.getMonth() && dt.getFullYear()===r.getFullYear(); }
      return t<=REF_DAY && (REF_DAY-t)<=30*DAY_MS; };
    const gactDefs = [['All','all'],['Tasks','Task'],['Calls','Call'],['Messages','WhatsApp'],['Emails','Email'],['Showings','Showing'],['Notes','Note']];
    const outcomeColor = { Advanced:'#0D0D0D', Neutral:'#8F8F8F', Cooled:'#303030', Logged:'#8F8F8F', Open:'#0D0D0D', Done:'#8F8F8F' };
    // log composer
    const logType = this.state.logType || 'Call';
    const logTypeDefs = [['Task','Task'],['Call','Call'],['Message','WhatsApp'],['Email','Email'],['Showing','Showing'],['Note','Note']];
    const logTypeOptions = logTypeDefs.map(([label,val]) => {
      const active = logType === val;
      return { label, onClick:()=>this.setState({logType:val}),
        style:`padding:8px 16px;border-radius:999px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${active?'#0D0D0D':'#5D5D5D'};background:${active?'#0D0D0D':'rgba(255,255,255,0.5)'};border:1px solid ${active?'#0D0D0D':'#E3E3E3'};cursor:pointer;transition:all 150ms;` };
    });

    const gactRaw = [
      { date:'Jul 06', type:'Call', name:'Estates at Acqualina 5601', body:'Confirmed Saturday 11am tour with buyer.', outcome:'Advanced', agent:false },
      { date:'Jul 04', type:'Showing', name:'Marcelo C. · Rivage PH-A', body:'Toured with spouse. Strong response to layout; spouse raised construction timeline concern.', outcome:'Advanced', agent:true },
      { date:'Jul 03', type:'Call', name:'Robert Sterling · Acqualina 4802', body:'Financing confirmed; scheduling final tour.', outcome:'Advanced', agent:false },
      { date:'Jul 03', type:'Call', name:'Anton Keller · Golden Beach', body:'Reviewed counter terms; principal call next week.', outcome:'Neutral', agent:false },
      { date:'Jul 02', type:'WhatsApp', name:'Marcelo C. · Rivage PH-A', body:'Shared developer brochure and finish schedule.', outcome:'Neutral', agent:false },
      { date:'Jul 02', type:'Call', name:'Carlos Alvarez · Continuum 2904', body:'Confirmed appraisal ordered; close on track for Jul 18.', outcome:'Neutral', agent:false },
      { date:'Jul 01', type:'Email', name:'Kenji Nakamura · Bal Harbour 1503', body:'Submitted offer package; awaiting counter.', outcome:'Neutral', agent:false },
      { date:'Jun 30', type:'Note', name:'Ana Bittencourt', body:'Introduced Marcelo Carvalho; thanked and kept warm.', outcome:'Neutral', agent:false },
      { date:'Jun 28', type:'Showing', name:'Elena Ravel · Faena 8C', body:'Second viewing of Faena 8C; positive on finishes.', outcome:'Advanced', agent:false },
      { date:'Jun 28', type:'WhatsApp', name:'Faena Penthouse', body:'Prompted seller for a counter response.', outcome:'Neutral', agent:false },
      { date:'Jun 26', type:'Email', name:'Anton Keller · Golden Beach', body:'Sent comparative valuation on two compounds.', outcome:'Neutral', agent:false },
      { date:'Jun 21', type:'Note', name:'Robert Sterling', body:'Comparing Acqualina vs Estates unit; leaning Acqualina.', outcome:'Neutral', agent:false }
    ];
    const doneAct = this.state.doneAct || {};
    const gactSource = [ ...(this.state.loggedActs || []), ...gactRaw ];
    const gact = gactSource.map(a => {
      const done = !!(a.id && doneAct[a.id]);
      return { ...a, isTask: a.type==='Task', done,
        dot: done ? '#8F8F8F' : (outcomeColor[a.outcome] || '#8F8F8F'),
        onToggle: a.id ? (()=>this.toggleActDone(a.id)) : (()=>{}),
        outcomeShown: (a.type==='Task') ? (done ? 'Done' : 'Open') : a.outcome,
        checkBg: done ? '#0D0D0D' : 'transparent',
        nameColor: done ? '#8F8F8F' : '#0D0D0D', actionColor: done ? '#8F8F8F' : '#303030', deco: done ? 'line-through' : 'none' };
    });
    const gactInRange = gact.filter(a => inGactRange(a.date));
    const gactFilters = gactDefs.map(([label,id]) => {
      const active = gactFilter === id;
      const count = id==='all' ? gactInRange.length : gactInRange.filter(a=>a.type===id).length;
      return { label, count: String(count), onClick:()=>this.setState({gactFilter:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?500:400};font-size:12.5px;color:${active?'#0D0D0D':'#5D5D5D'};background:${active?'rgba(255,255,255,0.62)':'transparent'};border:1px solid ${active?'#D9D9D9':'#E3E3E3'};border-radius:999px;padding:6px 14px;cursor:pointer;transition:all 150ms;` };
    });
    const rangeLabel = (rangeDefs.find(([,id])=>id===gactRange)||rangeDefs[3])[0];
    const rangeOptions = rangeDefs.map(([label,id]) => ({ label, onClick:()=>this.setState({gactRange:id, gactRangeOpen:false}),
      style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${gactRange===id?C.ink:C.conc};padding:11px 16px;cursor:pointer;border-bottom:1px solid #E3E3E3;white-space:nowrap;` }));
    const gactFiltered = gactInRange.filter(a => gactFilter==='all' || a.type===gactFilter);
    const gactDates = [];
    gactFiltered.forEach(a => { let g = gactDates.find(x=>x.date===a.date); if(!g){ g={date:a.date, items:[]}; gactDates.push(g); } g.items.push(a); });
    const actBand = [
      { label:'Interactions · 14d', value: String(gact.length), deltas: [deltaCell('30 D','+12%'), deltaCell('QTR','+31%')] },
      { label:'Advanced', value: String(gact.filter(a=>a.outcome==='Advanced').length), deltas: [deltaCell('30 D','+9%'), deltaCell('QTR','+24%')] },
      { label:'Showings', value: String(gact.filter(a=>a.type==='Showing').length), deltas: [deltaCell('30 D','+2'), deltaCell('QTR','+5')] },
      { label:'Calls', value: String(gact.filter(a=>a.type==='Call').length), deltas: [deltaCell('30 D','+8%'), deltaCell('QTR','+19%')] }
    ];

    // ---- Message center (Inbox) ----
    const actView = this.state.actView || 'inbox';
    const threadId = this.state.threadId || 'marcelo';
    const inboxCh = this.state.inboxChannel || 'all';
    const tSearch = (this.state.threadSearch || '').toLowerCase();
    const sentMsgs = this.state.sentMsgs || {};
    const readT = this.state.readThreads || {};
    const threadData = [
      { id:'marcelo', name:'Marcelo Carvalho', sub:'Rivage PH-A', channel:'WhatsApp', initials:'MC', unread:2, time:'09:12',
        msgs:[ {dir:'in',text:'Bom dia! We really enjoyed the Rivage tour on Saturday.',time:'Sat 14:20'},
          {dir:'out',text:'So glad — the PH-A layout suits your brief. Happy to walk through the finish timeline whenever works.',time:'Sat 15:02'},
          {dir:'in',text:'My wife is a little concerned about the construction schedule. Could you send the developer\u2019s latest?',time:'Sat 16:45'},
          {dir:'out',text:'Of course — sending the developer\u2019s finish schedule and brochure now.',time:'Sun 10:05'},
          {dir:'in',text:'Perfect, thank you. Saturday 11am works for a second visit.',time:'09:12'} ] },
      { id:'nakamura', name:'Kenji Nakamura', sub:'Bal Harbour 1503', channel:'Email', initials:'KN', unread:1, time:'Jul 05',
        msgs:[ {dir:'out',text:'Kenji, submitted the offer package this morning. I\u2019ll flag the moment we hear back.',time:'Jul 01 09:30'},
          {dir:'in',text:'Thank you. Reviewing with my advisor — will revert on the counter shortly.',time:'Jul 05 18:10'} ] },
      { id:'sterling', name:'Robert Sterling', sub:'Acqualina 4802', channel:'SMS', initials:'RS', unread:0, time:'Jul 03',
        msgs:[ {dir:'in',text:'Financing is confirmed on my end.',time:'Jul 03 11:02'},
          {dir:'out',text:'Excellent — scheduling the final tour. Does Friday afternoon suit you?',time:'Jul 03 11:20'} ] },
      { id:'ravel', name:'Elena Ravel', sub:'Faena 8C', channel:'WhatsApp', initials:'ER', unread:0, time:'Jun 28',
        msgs:[ {dir:'in',text:'Loved the finishes on the second viewing.',time:'Jun 28 16:40'},
          {dir:'out',text:'Wonderful. I\u2019ll prepare a summary of terms so you can review at your pace.',time:'Jun 28 17:15'} ] },
      { id:'keller', name:'Anton Keller', sub:'Golden Beach', channel:'Email', initials:'AK', unread:0, time:'Jun 26',
        msgs:[ {dir:'out',text:'Sent the comparative valuation on both compounds for your review.',time:'Jun 26 10:00'},
          {dir:'in',text:'Received — let\u2019s discuss the counter next week.',time:'Jun 26 14:30'} ] },
      { id:'alvarez', name:'Carlos Alvarez', sub:'Continuum 2904', channel:'WhatsApp', initials:'CA', unread:0, time:'Jul 02',
        msgs:[ {dir:'out',text:'Appraisal is ordered — close remains on track for Jul 18.',time:'Jul 02 12:05'},
          {dir:'in',text:'Great, appreciate the update.',time:'Jul 02 12:40'} ] },
      { id:'bittencourt', name:'Ana Bittencourt', sub:'Referral partner', channel:'WhatsApp', initials:'AB', unread:0, time:'Jun 30',
        msgs:[ {dir:'in',text:'Happy to introduce a couple more clients this quarter.',time:'Jun 30 09:15'},
          {dir:'out',text:'That means a great deal, Ana — thank you. Lunch on me soon.',time:'Jun 30 09:50'} ] }
    ];
    const threadsAll = threadData.map(t => {
      const messages = [ ...t.msgs, ...(sentMsgs[t.id] || []) ];
      const last = messages[messages.length - 1] || { text:'', dir:'in' };
      const unread = readT[t.id] ? 0 : t.unread;
      return { ...t, messages, last, unread };
    });
    const at = threadsAll.find(t => t.id === threadId) || threadsAll[0];
    const channelDefs = [['All','all'],['WhatsApp','WhatsApp'],['Email','Email'],['SMS','SMS']];
    const channelFilters = channelDefs.map(([label,id]) => {
      const active = inboxCh === id;
      return { label, onClick:()=>this.setState({inboxChannel:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?500:400};font-size:11px;letter-spacing:0.03em;text-transform:uppercase;color:${active?'#0D0D0D':'#5D5D5D'};background:${active?'rgba(255,255,255,0.62)':'transparent'};border:1px solid ${active?'#D9D9D9':'transparent'};border-radius:999px;padding:5px 12px;cursor:pointer;transition:all 150ms;` };
    });
    let threadsF = threadsAll.filter(t => inboxCh==='all' || t.channel===inboxCh);
    if (tSearch) threadsF = threadsF.filter(t => (t.name+' '+t.sub).toLowerCase().includes(tSearch));
    const threads = threadsF.map(t => {
      const sel = t.id === at.id;
      const snippet = (t.last.dir==='out' ? 'You: ' : '') + t.last.text;
      return { name:t.name, initials:t.initials, channel:t.channel, time:t.time, snippet,
        unread:String(t.unread), hasUnread: t.unread>0, onClick:()=>this.selectThread(t.id),
        rowStyle:`display:flex;align-items:center;gap:12px;padding:11px 12px;margin:2px 8px;border-radius:12px;cursor:pointer;transition:background 150ms;background:${sel?'rgba(255,255,255,0.6)':'transparent'};`,
        avatarBorder: sel?'#C7C7C7':'#E3E3E3', avatarColor: sel?C.ink:C.pedra,
        snippetColor: t.unread>0 ? C.graf : C.conc };
    });
    const qrLangMap = { marcelo:'PT', bittencourt:'PT', alvarez:'ES' };
    const qrLang = qrLangMap[at.id] || 'EN';
    const qrFirst = at.name.split(' ')[0];
    const qrSets = {
      PT: [ ['Confirmar', qrFirst + ' — confirmado! Sábado 11h, encontro vocês no lobby.'], ['Enviar docs', qrFirst + ' — enviando agora o cronograma e os documentos. Qualquer dúvida, me chama.'], ['Follow-up', qrFirst + ' — só passando para saber se conseguiu revisar. Sigo à disposição.'] ],
      ES: [ ['Confirmar', qrFirst + ' — ¡confirmado! Sábado 11h, los encuentro en el lobby.'], ['Enviar docs', qrFirst + ' — te envío ahora el cronograma y los documentos. Cualquier duda, me escribes.'], ['Follow-up', qrFirst + ' — ¿pudiste revisar lo que te envié? Quedo a tu disposición.'] ],
      EN: [ ['Confirm', qrFirst + ' — confirmed. I will meet you in the lobby at 11am Saturday.'], ['Send docs', qrFirst + ' — sending the schedule and documents now. Any questions, just message me.'], ['Follow up', qrFirst + ' — checking in: did you get a chance to review? Happy to walk through it.'] ]
    };
    const quickReplies = qrSets[qrLang].map(([l, txt]) => ({ label: l, onClick: ()=>this.setState({ chatInput: txt }) }));
    const qrLangLabel = 'Auto · ' + qrLang;
    const activeThread = { name:at.name, sub:at.sub, channel:at.channel,
      onOpenDeal:()=>this.nav('deal'), onOpenContact:()=>this.nav('contacts'),
      messages: at.messages.map(m => { const out = m.dir==='out';
        return { text:m.text, time:m.time,
          rowStyle:`display:flex;justify-content:${out?'flex-end':'flex-start'};`,
          bubbleStyle:`max-width:74%;padding:12px 16px;border-radius:${out?'20px 20px 6px 20px':'20px 20px 20px 6px'};background:${out?'rgba(22,22,21,0.68)':'rgba(255,255,255,0.40)'};backdrop-filter:blur(14px) saturate(1.6);-webkit-backdrop-filter:blur(14px) saturate(1.6);border:1px solid ${out?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.65)'};box-shadow:inset 0 1px 0 ${out?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.75)'};`,
          textColor: out?C.branco:C.graf, metaColor: out?'rgba(255,255,255,0.6)':C.pedra }; }) };
    const totalUnread = threadsAll.reduce((n,t)=>n+t.unread,0);
    const navAct = navItems.concat(navMoreItems).find(n=>n.label==='Inbox');
    if (navAct && totalUnread > 0) { navAct.badge = String(totalUnread); navAct.hasBadge = true; }
    const actModeDefs = [['Inbox','inbox'],['Activity','activity']];
    const actModes = actModeDefs.map(([label,id]) => {
      const active = actView === id;
      return { label, count: id==='inbox' ? (totalUnread?String(totalUnread):'') : String(gact.length),
        onClick:()=>this.setState({actView:id}),
        style:`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${active?600:400};font-size:14px;letter-spacing:0.01em;color:${active?C.ink:C.pedra};padding-bottom:6px;border-bottom:1.5px solid ${active?C.ink:'transparent'};cursor:pointer;transition:color 150ms;` };
    });

    const deltas = [
      { label:'New', value:'+3', color:C.moss },
      { label:'Advanced', value:'+5', color:C.moss },
      { label:'Slipped', value:'2', color:C.ox },
      { label:'Dead', value:'1', color:C.conc },
      { label:'Weighted GCI Δ', value:'+$310K', color:C.moss }
    ];

    const intelSecDefaults = { act:true, risk:true, plays:false, perf:false, agent:false, net:false, metrics:false };
    const mkIntelSec = (key, extra) => {
      const st = this.state.intelSec || {};
      const open = (key in st) ? !!st[key] : intelSecDefaults[key];
      const base = {
        open: open, closed: !open,
        chevStyle: 'display:inline-block;width:14px;flex:none;text-align:center;font-size:16px;line-height:1;color:#8F8F8F;transform:rotate(' + (open ? 90 : 0) + 'deg);transition:transform 150ms;',
        toggle: () => this.setState(s => { const cur = s.intelSec || {}; const next = {}; for (const k in cur) next[k] = cur[k]; next[key] = !open; return { intelSec: next }; })
      };
      if (extra) for (const k in extra) base[k] = extra[k];
      return base;
    };
    const metricsOpenNow = (() => { const st = this.state.intelSec || {}; return ('metrics' in st) ? !!st.metrics : false; })();
    const intelSecTools = {
      secMetrics: mkIntelSec('metrics', { label: metricsOpenNow ? 'Hide detail metrics' : 'More metrics — leads, actions, aging, win rate' }),
      secAct: mkIntelSec('act', { hasBadge: true, badge: String(openDecisionCount), summary: openDecisionCount + ' decisions · ' + touchToday.length + ' touches queued' }),
      secRisk: mkIntelSec('risk', { hasBadge: riskRadar.length > 0, badge: String(riskRadar.length), summary: riskRadar.length ? (riskRadar.length + ' risks · ' + riskExposure + ' GCI exposed · a remedy staged for each') : 'all clear — nothing aging past threshold' }),
      secPlays: mkIntelSec('plays', { hasBadge: true, badge: String(intel.length), summary: intel.length + ' plays proposed — cluster, cross-sell, referral' }),
      secPerf: mkIntelSec('perf', { hasBadge: false, badge: '', summary: selMonth + ' expected ' + selMonthGci + ' · net +$310K this week' }),
      secAgent: mkIntelSec('agent', { hasBadge: true, badge: String(agentLedger.length), summary: agentLedger.length + ' overnight actions · 2 learnings · Oct–Nov cash valley' }),
      secNet: mkIntelSec('net', { hasBadge: false, badge: '', summary: vendorRows.length + ' vendors tracked · 2 balances to settle · 1 cadence due' })
    };

    const mktTab = this.state.mktTab || 'campaigns';
    const mktG = '#10A37F', mktA = '#B45309', mktGR = '#8F8F8F', mktIG = '#C13584', mktLI = '#0A66C2';
    const mktPillStyle = (active) => "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:" + (active ? 500 : 400) + ';font-size:13px;color:' + (active ? '#0D0D0D' : '#5D5D5D') + ';background:' + (active ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (active ? '#D9D9D9' : 'transparent') + ';border-radius:999px;padding:7px 16px;cursor:pointer;transition:all 150ms;user-select:none;';
    const mktApproved = !!this.state.mktCampaignApproved;
    const mktBatchOk = !!this.state.mktBatchApproved;
    const mktWeekOk = !!this.state.mktWeekApproved;
    const mktBtnStyle = (done) => 'background:' + (done ? '#FFFFFF' : '#0D0D0D') + ';border:1px solid ' + (done ? '#E3E3E3' : '#0D0D0D') + ';border-radius:999px;padding:10px 20px;font-weight:500;font-size:11.5px;letter-spacing:0.05em;text-transform:uppercase;color:' + (done ? '#5D5D5D' : '#FFFFFF') + ';cursor:' + (done ? 'default' : 'pointer') + ';transition:opacity 150ms;';
    const mktCalPosts = {
      '0706':[{ chan:'LI', lang:'EN', title:'PH scarcity — data carousel', dot:mktLI, st:'\u25CF' }],
      '0707':[{ chan:'IG', lang:'PT', title:'Rivage walkthrough reel · 7 PM', dot:mktIG, st:'\u25D0' }],
      '0708':[{ chan:'WA', lang:'auto', title:'Report broadcast — corridor', dot:mktG, st:'\u25CF' }, { chan:'Email', lang:'auto', title:'Dossier — localized', dot:mktGR, st:'\u25CF' }],
      '0709':[{ chan:'IG', lang:'EN', title:'Story — comparison poll · 7 PM', dot:mktIG, st:'\u25D0' }],
      '0710':[{ chan:'Email', lang:'EN', title:'Family-office nurture ep 3', dot:mktGR, st:'\u25CF' }],
      '0711':[{ chan:'IG', lang:'PT', title:'Client visit — behind the scenes', dot:mktIG, st:'\u25CB' }],
      '0712':[{ chan:'IG', lang:'PT', title:'$2,780/SF series · ep 3', dot:mktIG, st:'\u25D0' }],
      '0713':[{ chan:'Email', lang:'auto', title:'July report PDF — all actives', dot:mktGR, st:'\u25CF' }],
      '0714':[{ chan:'IG', lang:'EN', title:'Data reel · 7 PM', dot:mktIG, st:'\u25CB' }],
      '0715':[{ chan:'WA', lang:'auto', title:'Broker open — reminder', dot:mktG, st:'\u25CF' }, { chan:'LI', lang:'EN', title:'Broker open — live recap', dot:mktLI, st:'\u25CB' }],
      '0716':[{ chan:'IG', lang:'PT', title:'Broker open recap', dot:mktIG, st:'\u25CB' }],
      '0719':[{ chan:'LI', lang:'EN', title:'\u201cCost of waiting\u201d — article', dot:mktLI, st:'\u25CB' }],
      '0721':[{ chan:'IG', lang:'EN', title:'Data reel · 7 PM', dot:mktIG, st:'\u25CB' }],
      '0723':[{ chan:'Email', lang:'EN', title:'Family-office nurture ep 4', dot:mktGR, st:'\u25CF' }],
      '0724':[{ chan:'LI', lang:'EN', title:'New Sunny Isles projects — comparison', dot:mktLI, st:'\u25CB' }],
      '0726':[{ chan:'IG', lang:'PT', title:'$2,780/SF series · ep 4', dot:mktIG, st:'\u25CB' }],
      '0729':[{ chan:'WA', lang:'auto', title:'August preview — corridor broadcast', dot:mktG, st:'\u25CB' }],
      '0803':[{ chan:'Email', lang:'auto', title:'August report PDF', dot:mktGR, st:'\u25CB' }],
      '0806':[{ chan:'IG', lang:'EN', title:'Data reel · 7 PM', dot:mktIG, st:'\u25CB' }]
    };
    const mktCalHl = { '0711':1, '0715':1 };
    const mktCalPage = Math.max(0, Math.min(3, this.state.mktCalPage || 0));
    const mktCalNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const mktCalMon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mktCalDays = [];
    for (let ci = 0; ci < 14; ci++) {
      const d = new Date(2026, 6, 6 + mktCalPage * 14 + ci);
      const key = ('0' + (d.getMonth()+1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      mktCalDays.push({ day: mktCalNames[d.getDay()], n: ('0' + d.getDate()).slice(-2), bg: mktCalHl[key] ? 'rgba(255,255,255,0.5)' : 'transparent', posts: mktCalPosts[key] || [] });
    }
    const mktCalStart = new Date(2026, 6, 6 + mktCalPage * 14), mktCalEnd = new Date(2026, 6, 6 + mktCalPage * 14 + 13);
    const mktCalFmt = (d) => mktCalMon[d.getMonth()] + ' ' + ('0' + d.getDate()).slice(-2);
    const offMarketInv = [
      ...(this.state.omNewInv||[]),
      { id:'om1', name:'Rivage PH-A', src:'Owner direct', ask:'$18.9M', psf:'$2,610/SF', specs:'4 BD · 5.5 BA · 6,200 SF · double-height', st:'Preview', stColor:'#B45309', matched:'4', held:'12d' },
      { id:'om2', name:'Estates at Acqualina 3805', src:'Broker whisper', ask:'$9.2M', psf:'$2,140/SF', specs:'3 BD · 4 BA · 3,900 SF', st:'Quiet', stColor:'#8F8F8F', matched:'2', held:'5d' },
      { id:'om3', name:'Golden Beach — Compound lot', src:'Attorney network', ask:'$24M', psf:'land', specs:'32,000 SF lot · 100 ft water frontage', st:'Quiet', stColor:'#8F8F8F', matched:'1', held:'21d' },
      { id:'om4', name:'Continuum South 1204', src:'Past client', ask:'$6.4M', psf:'$2,290/SF', specs:'2 BD · 2.5 BA · 2,800 SF', st:'Circulating', stColor:'#10A37F', matched:'3', held:'8d' },
      { id:'om5', name:'Indian Creek parcel', src:'Family office', ask:'$38M', psf:'land', specs:'1.4 acre · dockage', st:'Quiet', stColor:'#8F8F8F', matched:'1', held:'30d' }
    ];
    const mktTools = {
      isMarketing: scr === 'marketing',
      mktTabs: [['Campaigns','campaigns'],['Content','content'],['Audiences','audiences'],['Trends','trends']].map(([label, id]) => ({ label, onClick: () => this.setState({ mktTab: id }), style: mktPillStyle(mktTab === id) })),
      mktCamp: mktTab === 'campaigns', mktCont: mktTab === 'content', mktAud: mktTab === 'audiences', mktTrends: mktTab === 'trends',
      mktGoTrends: () => this.setState({ mktTab: 'trends' }),
      mktApproveCampaign: () => { if (mktApproved) return; this.setState({ mktCampaignApproved: true }); this.pushAudit('Marketing · campaign approved — Rivage PH-A off-market preview · agent runs the 5-step sequence, localized per contact'); },
      mktApproveLabel: mktApproved ? 'Approved · executing ✓' : 'Approve campaign',
      mktApproveStyle: mktBtnStyle(mktApproved),
      mktApproveBatch: () => { if (mktBatchOk) return; this.setState({ mktBatchApproved: true }); this.pushAudit('Marketing · WhatsApp batch approved — 12 personalized 1:1 drafts sent in each contact\u2019s language'); },
      mktBatchLabel: mktBatchOk ? 'Batch sent · 12 ✓' : 'Approve batch · 12',
      mktBatchStyle: 'background:transparent;border:1px solid ' + (mktBatchOk ? '#E3E3E3' : '#0D0D0D') + ';border-radius:999px;padding:6px 14px;font-size:10.5px;letter-spacing:0.04em;text-transform:uppercase;color:' + (mktBatchOk ? '#8F8F8F' : '#0D0D0D') + ';cursor:' + (mktBatchOk ? 'default' : 'pointer') + ';',
      mktApproveWeek: () => { if (mktWeekOk) return; this.setState({ mktWeekApproved: true }); this.pushAudit('Marketing · content plan approved — 13 posts scheduled across 2 weeks, agent publishes at peak times'); },
      mktWeekLabel: mktWeekOk ? '2 weeks approved · 13 scheduled ✓' : 'Approve 2 weeks',
      mktWeekStyle: mktBtnStyle(mktWeekOk).replace('padding:10px 20px', 'padding:8px 16px'),
      mktCampaigns: [ ...(this.state.mktNewCampaigns || []),
        { name:'Rivage PH-A — Off-market preview', type:'Listing launch', aud:'HOT · Corridor (12)', ch:'WA → IG → LI → Email', dot:mktA, stColor:'#B45309', status:'Awaiting approval', prog: mktApproved ? '20%' : '0%', step: mktApproved ? '1/5' : '0/5' },
        { name:'Market Report — July', type:'Monthly report', aud:'All active (64)', ch:'Email → WA → LI', dot:mktG, stColor:'#10A37F', status:'Executing', prog:'60%', step:'3/5' },
        { name:'Nurture — Family offices', type:'Nurture', aud:'Trophy interest (6)', ch:'Email → LI', dot:mktG, stColor:'#10A37F', status:'Executing', prog:'40%', step:'2/5' },
        { name:'Broker Open — Estates PH · Jul 15', type:'Event', aud:'Corridor brokers (38)', ch:'Email → WA', dot:mktA, stColor:'#B45309', status:'Awaiting approval', prog:'20%', step:'1/5' },
        { name:'Series \u201cWhat $2,780/SF buys\u201d', type:'Personal brand', aud:'IG + LI public', ch:'IG → LI', dot:mktG, stColor:'#10A37F', status:'Executing', prog:'50%', step:'ep 2/4' }
      ],
      mktSeq: [
        { day:'D0', chan:'WhatsApp', what:'1:1 personalized — 12 HOT in the corridor', dot: mktApproved ? mktG : mktA, st: mktApproved ? 'executing' : '12 drafts ready', stColor: mktApproved ? '#10A37F' : '#B45309' },
        { day:'D1', chan:'Instagram', what:'Story teaser — the double-height ceiling detail', dot:'#C7C7C7', st:'brief ready · needs photo', stColor:'#8F8F8F' },
        { day:'D3', chan:'LinkedIn', what:'EN post — corridor PH scarcity', dot:'#C7C7C7', st:'agent draft', stColor:'#8F8F8F' },
        { day:'D5', chan:'Email', what:'Dossier PDF — localized per contact', dot:'#C7C7C7', st:'template ready', stColor:'#8F8F8F' },
        { day:'D7', chan:'WhatsApp', what:'Follow-up — only opened, no reply', dot:'#C7C7C7', st:'conditional', stColor:'#8F8F8F' }
      ],
      mktSegments: [
        { name:'HOT · Acqualina corridor', def:'stage HOT + interest Acqualina/Rivage', n:'12', langs:'8 PT · 3 EN · 1 ES', last:'Off-market preview · today' },
        { name:'Family offices · trophy', def:'entities + $15M+ budget + flow-through', n:'6', langs:'6 EN', last:'Nurture EN · running' },
        { name:'BR buyers · FX window', def:'BR nationality + strong BRL + nurture', n:'9', langs:'9 PT', last:'June report · 4 opens' },
        { name:'Active sellers', def:'live listings + bi-weekly reporting', n:'4', langs:'2 PT · 2 EN', last:'Visit report · Jul 01' },
        { name:'Nurture 90d+ untouched', def:'no reply in 90d · re-engagement', n:'28', langs:'14 PT · 11 EN · 3 ES', last:'— proposed: trends series' }
      ],
      mktTrendsList: [
        { src:'Market', title:'Corridor PH inventory down 18% QoQ', rel:'92%', why:'relevance 92 · touches 9 HOT · suggests WA 1:1 + data reel' },
        { src:'Macro', title:'Fed signals September cut', rel:'88%', why:'relevance 88 · urgency for cash buyers to lock price · 14 contacts' },
        { src:'Social', title:'\u201cCalm-voice walkthrough\u201d format +34% saves', rel:'84%', why:'relevance 84 · apply to PH Rivage · Reel 24\u201334s · Tue/Thu 7 PM' },
        { src:'Macro', title:'BRL at 4.9 — window for Brazilian buyers', rel:'79%', why:'relevance 79 · BR segment (9) · PT broadcast + PT IG post' },
        { src:'Market', title:'3 new projects announced in Sunny Isles', rel:'71%', why:'relevance 71 · comparison content — 2028 delivery vs ready now · LI carousel' }
      ],
      mktWeek: mktCalDays,
      mktKanban: [
        { col:'Brief', n:'2', cards:[ { chan:'IG Reel', title:'BRL 4.9 — BR window', dot:mktIG }, { chan:'LI', title:'Cost of waiting', dot:mktLI } ] },
        { col:'Draft', n:'3', cards:[ { chan:'WA 1:1', title:'Off-market Rivage — 12 HOT', dot:mktG }, { chan:'Email', title:'July report PDF', dot:mktGR } ] },
        { col:'Approval', n:'2', cards:[ { chan:'IG Reel', title:'Calm-voice walkthrough', dot:mktIG }, { chan:'WA', title:'Broker open reminder', dot:mktG } ] },
        { col:'Scheduled', n:'4', cards:[ { chan:'IG Story', title:'Poll Thu 7 PM', dot:mktIG }, { chan:'LI', title:'Scarcity carousel Mon', dot:mktLI } ] },
        { col:'Live', n:'3', cards:[ { chan:'Email', title:'Nurture ep 2 — 67% open', dot:mktGR }, { chan:'IG', title:'$/SF series ep 2 — 214 saves', dot:mktIG } ] }
      ],
      mktMatrix: [
        { int:'Acqualina–Rivage corridor', hot:'9', warm:'6', nur:'11', langs:'PT · EN' },
        { int:'Trophy / flow-through $15M+', hot:'3', warm:'4', nur:'6', langs:'EN' },
        { int:'Pre-construction 2028', hot:'2', warm:'5', nur:'8', langs:'EN · ES' },
        { int:'Sellers · corridor', hot:'2', warm:'2', nur:'3', langs:'PT · EN' }
      ]
    };

    const tagPill = (active) => "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:" + (active ? 500 : 400) + ';font-size:11.5px;color:' + (active ? '#0D0D0D' : '#5D5D5D') + ';background:' + (active ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (active ? '#D9D9D9' : '#E3E3E3') + ';border-radius:999px;padding:5px 12px;cursor:pointer;transition:all 150ms;user-select:none;';
    const ctTagCounts = {}; contacts.forEach(c => { (c.tags||[]).forEach(tg => { ctTagCounts[tg] = (ctTagCounts[tg]||0) + 1; }); });
    const mktSrcSel = this.state.mktSrcSel || null;
    const mktMlsDemo = { name:'Faena House 8C', ask:'$12.5M', psf:'$4,386/SF', specs:'3 BD · 4.5 BA · 2,850 SF · oceanfront', st:'Active · 6 DOM' };
    const mktSrcObj = mktSrcSel ? (mktSrcSel.kind === 'off' ? offMarketInv.find(o => o.id === mktSrcSel.id) : Object.assign({}, mktMlsDemo, { mls: mktSrcSel.num })) : null;
    const glassPalettes = {
      'Sand & Ocean':  { base:'linear-gradient(135deg,#EFE7D8 0%,#DEE8E4 45%,#D8E0EC 100%)', b1:'rgba(219,190,138,0.55)', b2:'rgba(139,184,175,0.55)', b3:'rgba(160,181,214,0.50)' },
      'Miami Dusk':    { base:'linear-gradient(135deg,#F2E3DC 0%,#E6DEEC 45%,#D8DFF0 100%)', b1:'rgba(224,168,140,0.50)', b2:'rgba(178,166,214,0.50)', b3:'rgba(150,178,222,0.45)' },
      'Emerald Coast': { base:'linear-gradient(135deg,#E3EDE7 0%,#DCE9E9 50%,#D9E4EE 100%)', b1:'rgba(126,188,162,0.50)', b2:'rgba(120,180,190,0.45)', b3:'rgba(214,196,160,0.40)' },
      'Champagne':     { base:'linear-gradient(135deg,#F5EBDD 0%,#F1E7DB 50%,#EDE4D8 100%)', b1:'rgba(226,196,148,0.50)', b2:'rgba(236,216,180,0.48)', b3:'rgba(212,184,148,0.38)' },
      'Rosé':          { base:'linear-gradient(135deg,#F6E8E4 0%,#F2E4E8 50%,#EEE2EE 100%)', b1:'rgba(230,168,158,0.45)', b2:'rgba(216,170,196,0.40)', b3:'rgba(240,200,180,0.40)' },
      'Sky':           { base:'linear-gradient(135deg,#E8F0F6 0%,#E4ECF4 50%,#DFE8F2 100%)', b1:'rgba(150,190,226,0.45)', b2:'rgba(170,206,232,0.42)', b3:'rgba(196,218,238,0.40)' },
      'Lavender':      { base:'linear-gradient(135deg,#EFEAF6 0%,#EAE6F2 50%,#E6E4F0 100%)', b1:'rgba(186,168,216,0.45)', b2:'rgba(202,186,226,0.40)', b3:'rgba(168,178,222,0.35)' },
      'Ivory Calm':    { base:'linear-gradient(135deg,#F6F3EC 0%,#F0EFEA 50%,#EAECEF 100%)', b1:'rgba(214,196,160,0.30)', b2:'rgba(168,196,190,0.28)', b3:'rgba(190,203,220,0.26)' }
    };
    const glassSelName = (this.state.setVals && this.state.setVals.amb !== undefined) ? this.state.setVals.amb : 'Sand & Ocean';
    const glassPal = glassPalettes[glassSelName] || glassPalettes['Sand & Ocean'];
    const featTools = {
      glassOptions: Object.keys(glassPalettes).map((nm) => {
        const p = glassPalettes[nm]; const act = nm === glassSelName;
        return { name: nm,
          onClick: () => this.setState(s => { const sv = {}; const cur = s.setVals || {}; for (const k in cur) sv[k] = cur[k]; sv.amb = nm; return { setVals: sv }; }),
          swatchStyle: 'width:56px;height:36px;border-radius:9px;background:radial-gradient(circle at 28% 22%,' + p.b1 + ',transparent 62%),radial-gradient(circle at 76% 82%,' + p.b2 + ',transparent 62%),' + p.base + ';border:2px solid ' + (act ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.08)') + ';box-shadow:' + (act ? '0 0 0 1.5px rgba(0,0,0,0.22), 0 4px 14px rgba(0,0,0,0.14)' : 'none') + ';transition:all 150ms;',
          nameStyle: "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:10px;margin-top:6px;letter-spacing:0.02em;" + (act ? 'font-weight:600;color:#0D0D0D;' : 'font-weight:400;color:#8F8F8F;') };
      }),
      ambientBaseStyle: 'position:fixed;inset:0;z-index:0;pointer-events:none;background:' + glassPal.base + ';',
      ambientBlob1: 'position:fixed;top:-140px;left:340px;width:560px;height:560px;border-radius:50%;z-index:0;pointer-events:none;background:radial-gradient(circle,' + glassPal.b1 + ',transparent 70%);',
      ambientBlob2: 'position:fixed;bottom:-200px;right:-100px;width:640px;height:640px;border-radius:50%;z-index:0;pointer-events:none;background:radial-gradient(circle,' + glassPal.b2 + ',transparent 70%);',
      ambientBlob3: 'position:fixed;top:280px;left:-180px;width:520px;height:520px;border-radius:50%;z-index:0;pointer-events:none;background:radial-gradient(circle,' + glassPal.b3 + ',transparent 70%);',
      pipeTagChips: [{ label:'All', id:'all' }].concat(Object.keys(pipeTagCounts).sort().map(tg => ({ label: tg + ' · ' + pipeTagCounts[tg], id: tg }))).map(o => ({ label: o.label, onClick: () => this.setState({ pipeTag: o.id }), style: tagPill(pipeTagSel === o.id) })),
      ctTagChips: [{ label:'All tags', id:'all' }].concat(Object.keys(ctTagCounts).sort((a,b) => ctTagCounts[b] - ctTagCounts[a]).slice(0, 9).map(tg => ({ label: tg + ' · ' + ctTagCounts[tg], id: tg }))).map(o => ({ label: o.label, onClick: () => this.setState({ ctTag: o.id }), style: tagPill(ctTagSel === o.id) })),
      offMktRows: offMarketInv.map(o => Object.assign({}, o, {
        onCampaign: () => { this.setState({ screen:'marketing', mktTab:'campaigns', mktSrcSel:{ kind:'off', id:o.id } }); this.pushAudit('Marketing · campaign draft opened from off-market listing — ' + o.name); },
        onShare: () => this.pushAudit('Off-market · private preview link generated for ' + o.name + ' — watermarked, expires in 72h')
      })),
      offMktCount: String(offMarketInv.length),
      mktCalRange: mktCalFmt(mktCalStart) + ' – ' + mktCalFmt(mktCalEnd),
      mktCalPrev: () => this.setState({ mktCalPage: Math.max(0, mktCalPage - 1) }),
      mktCalNext: () => this.setState({ mktCalPage: Math.min(3, mktCalPage + 1) }),
      mktCalPrevStyle: 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:1px solid #E3E3E3;border-radius:8px;font-size:14px;color:' + (mktCalPage > 0 ? '#0D0D0D;cursor:pointer;' : '#C7C7C7;cursor:default;') + 'user-select:none;transition:all 150ms;',
      mktCalNextStyle: 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:1px solid #E3E3E3;border-radius:8px;font-size:14px;color:' + (mktCalPage < 3 ? '#0D0D0D;cursor:pointer;' : '#C7C7C7;cursor:default;') + 'user-select:none;transition:all 150ms;',
      mktMlsVal: this.state.mktMls || '',
      onMktMls: (e) => this.setState({ mktMls: e.target.value }),
      onMktMlsKey: (e) => { if (e.key === 'Enter' && (this.state.mktMls||'').trim()) this.setState({ mktSrcSel: { kind:'mls', num: this.state.mktMls.trim().toUpperCase() }, mktOffOpen:false }); },
      mktPull: () => { const v = (this.state.mktMls||'').trim(); if (v) this.setState({ mktSrcSel: { kind:'mls', num: v.toUpperCase() }, mktOffOpen:false }); },
      mktOffToggle: () => this.setState(s => ({ mktOffOpen: !s.mktOffOpen })),
      mktOffOpen: !!this.state.mktOffOpen,
      mktOffOptions: offMarketInv.map(o => ({ name: o.name, ask: o.ask, onClick: () => this.setState({ mktSrcSel:{ kind:'off', id:o.id }, mktOffOpen:false }) })),
      mktSrcShow: !!mktSrcObj,
      mktSrcTag: mktSrcSel && mktSrcSel.kind === 'off' ? 'Off-market · pipeline' : 'MLS ' + (mktSrcSel && mktSrcSel.num ? mktSrcSel.num : ''),
      mktSrcTagColor: mktSrcSel && mktSrcSel.kind === 'off' ? '#B45309' : '#10A37F',
      mktSrcTagBorder: mktSrcSel && mktSrcSel.kind === 'off' ? '#E5C8A8' : '#B7E0D2',
      mktSrcName: mktSrcObj ? mktSrcObj.name : '', mktSrcAsk: mktSrcObj ? mktSrcObj.ask : '', mktSrcPsf: mktSrcObj ? mktSrcObj.psf : '', mktSrcSpecs: mktSrcObj ? mktSrcObj.specs : '', mktSrcSt: mktSrcObj ? (mktSrcObj.st + (mktSrcObj.matched ? ' · ' + mktSrcObj.matched + ' matched buyers in your book' : '')) : '',
      mktSrcPlan: mktSrcSel && mktSrcSel.kind === 'off' ? 'Quiet sequence — WhatsApp 1:1 to matched buyers → private email dossier · no public channels, watermarked previews' : 'Launch sequence — WhatsApp 1:1 to matched buyers → IG reel + story → LinkedIn post → email blast · localized per contact',
      mktClearSrc: () => this.setState({ mktSrcSel: null }),
      mktCreateFromSrc: () => { if (!mktSrcObj) return; const off = mktSrcSel.kind === 'off'; const camp = { name: mktSrcObj.name + ' — ' + (off ? 'Off-market preview' : 'Listing launch'), type: off ? 'Off-market · quiet' : 'Listing launch', aud: off ? ('Matched buyers (' + (mktSrcObj.matched||'0') + ')') : 'Corridor + IG public', ch: off ? 'WA → Email' : 'WA → IG → LI → Email', dot:'#B45309', stColor:'#B45309', status:'Awaiting approval', prog:'0%', step:'0/5' }; this.setState(s => ({ mktNewCampaigns: [camp, ...(s.mktNewCampaigns||[])], mktSrcSel:null, mktMls:'' })); this.pushAudit('Marketing · campaign drafted from ' + (off ? 'off-market listing' : 'MLS listing') + ' — ' + mktSrcObj.name + ' · sequence proposed, awaiting your approval'); }
    };
    const loginGo = (how) => {
      if (how === 'email') {
        const em = (this.state.loginEmail || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.ciToast('Enter a valid e-mail'); return; }
        if (!(this.state.loginPass || '').trim()) { this.ciToast('Enter your password'); return; }
      }
      try { localStorage.setItem('aco_authed', '1'); } catch (e) {}
      this.setState({ authed: true, loginPass: '' });
      this.pushAudit('Signed in — ' + (how === 'google' ? 'Google Workspace SSO' : 'e-mail + password') + ' · 2FA verified · device logged');
    };
    const loginTools = {
      showLogin: !this.state.authed,
      loginBgStyle: (featTools.ambientBaseStyle || '') + 'position:fixed;inset:0;z-index:400;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;',
      loginEmail: this.state.loginEmail || '', onLoginEmail: (e) => this.setState({ loginEmail: e.target.value }),
      loginPass: this.state.loginPass || '', onLoginPass: (e) => this.setState({ loginPass: e.target.value }),
      onLoginKey: (e) => { if (e.key === 'Enter') loginGo('email'); },
      doLogin: () => loginGo('email'),
      doGoogle: () => loginGo('google'),
      doForgot: () => this.ciToast('Reset link sent — check your inbox')
    };
    const onbTools = (() => {
      const step = this.state.onbStep || null;
      const docType = this.state.onbDocType || 'Passport';
      const inp = (k) => (e) => this.setState({ [k]: e.target.value });
      const V = (k) => this.state[k] || '';
      const startEmail = (this.state.onbEmail !== undefined) ? this.state.onbEmail : (this.state.tmInvite || '');
      const stepIdx = step === 'pass' ? 1 : 0;
      return {
        onbRegOpen: step === 'reg',
        onbPassOpen: step === 'pass',
        onbStart: () => this.setState({ onbStep: 'reg', tmInvOpen: false }),
        onbClose: () => this.setState({ onbStep: null }),
        onbBack: () => this.setState({ onbStep: 'reg' }),
        onbSteps: [['1','Register'],['2','Create login'],['3','Portal']].map(([n, l], i) => ({ n, l,
          numStyle: 'width:19px;height:19px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;' + F0 + 'font-weight:600;font-size:9.5px;color:' + (i <= stepIdx ? '#FFFFFF' : '#8F8F8F') + ';background:' + (i <= stepIdx ? '#0D0D0D' : 'rgba(255,255,255,0.6)') + ';border:1px solid ' + (i <= stepIdx ? '#0D0D0D' : '#D9D9D9') + ';',
          labStyle: F0 + 'font-weight:' + (i === stepIdx ? 600 : 400) + ';font-size:11px;letter-spacing:0.04em;color:' + (i === stepIdx ? '#0D0D0D' : '#8F8F8F') + ';' })),
        onbName: V('onbName'), onOnbName: inp('onbName'),
        onbEmailV: startEmail, onOnbEmail: inp('onbEmail'),
        onbPhone: V('onbPhone'), onOnbPhone: inp('onbPhone'),
        onbAddr: V('onbAddr'), onOnbAddr: inp('onbAddr'),
        onbCity: V('onbCity'), onOnbCity: inp('onbCity'),
        onbZip: V('onbZip'), onOnbZip: inp('onbZip'),
        onbFirm: V('onbFirm'), onOnbFirm: inp('onbFirm'),
        onbDocNum: V('onbDocNum'), onOnbDocNum: inp('onbDocNum'),
        onbLic: V('onbLic'), onOnbLic: inp('onbLic'),
        onbDocOpts: ["Driver's license",'Passport','CPF'].map(x => ({ label: x, onClick: () => this.setState({ onbDocType: x }),
          style: F0 + 'font-weight:' + (docType === x ? 500 : 400) + ';font-size:11px;color:' + (docType === x ? '#0D0D0D' : '#5D5D5D') + ';background:' + (docType === x ? 'rgba(255,255,255,0.75)' : 'transparent') + ';border:1px solid ' + (docType === x ? '#0D0D0D' : '#D9D9D9') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' })),
        onbContinue: () => {
          const need = [['onbName','full legal name'],['onbPhone','phone / WhatsApp'],['onbAddr','street address'],['onbCity','city · state · country'],['onbFirm','firm / brokerage'],['onbDocNum','document number'],['onbLic','license number']];
          for (let i = 0; i < need.length; i++) { if (!String(this.state[need[i][0]] || '').trim()) { this.ciToast('Missing — ' + need[i][1]); return; } }
          const em = String(startEmail).trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.ciToast('Enter a valid e-mail'); return; }
          this.setState({ onbStep: 'pass', onbEmail: em });
        },
        onbPassV: V('onbPass'), onOnbPass: inp('onbPass'),
        onbPass2V: V('onbPass2'), onOnbPass2: inp('onbPass2'),
        onbFinish: () => {
          const p1 = this.state.onbPass || '', p2 = this.state.onbPass2 || '';
          if (p1.length < 8) { this.ciToast('Password — minimum 8 characters'); return; }
          if (p1 !== p2) { this.ciToast('Passwords do not match'); return; }
          const nm = (this.state.onbName || 'Partner').trim();
          this.pushAudit('Partner onboarding · complete — ' + nm + ' · ' + (this.state.onbFirm || '') + ' · ' + docType + ' on file · license ' + (this.state.onbLic || '') + ' pending verification (§8) · login created · 2FA armed');
          this.setState({ onbStep: null, onbPass: '', onbPass2: '', viewAs: { name: nm, role: 'Referral Partner' }, screen: 'ptdash' });
          this.ciToast('Welcome, ' + nm.split(' ')[0] + ' — portal live · license verification pending');
        },
        onbBg: (featTools.ambientBaseStyle || '') + 'position:fixed;inset:0;z-index:380;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;padding:36px 20px;box-sizing:border-box;'
      };
    })();
    const SIDE_BASE = "width:230px;flex:none;background:rgba(255,255,255,0.30);backdrop-filter:blur(20px) saturate(1.9);-webkit-backdrop-filter:blur(20px) saturate(1.9);color:#0D0D0D;display:flex;flex-direction:column;padding:30px 18px 22px;position:sticky;top:14px;height:calc(100vh - 28px);margin:14px 0 14px 14px;border-radius:18px;border:1px solid rgba(255,255,255,0.55);box-shadow:0 10px 34px rgba(0,0,0,0.06);z-index:2;";
    const notifSeed = [
      { id:'n1', c:'#B45309', t:'07:40', txt:'Zurich FO counter — response draft awaiting your approval', go:()=>this.nav('command') },
      { id:'n2', c:'#D0342C', t:'07:10', txt:'Nakamura · Bal Harbour 1503 — reply SLA breached · 19h since inbound', go:()=>{ this.setState({ screen:'inbox' }); this.selectThread('nakamura'); } },
      { id:'n3', c:'#10A37F', t:'Yesterday 18:22', txt:'Sterling PSA addendum — signed by all parties · filed to Drive', go:()=>this.nav('tc') },
      { id:'n4', c:'#0D0D0D', t:'Yesterday 16:05', txt:'2 new MLS matches — Rivage PH-A search', go:()=>this.setState({ screen:'deal', dealId:'Rivage PH-A · Marcelo C.', dealCard:null, dlSent:false, mlsSel:{}, dlMlsOpen:true }) },
      { id:'n5', c:'#8F8F8F', t:'Yesterday 09:41', txt:'Beatriz Lima — off-market open blocked · no grant', go:()=>this.setState({ screen:'settings', setSec:'16' }) }
    ];
    const nRead = this.state.notifRead || {};
    const notifRows = notifSeed.map(n => ({ txt: n.txt, t: n.t, dot: n.c, op: nRead[n.id] ? '0.45' : '1',
      onGo: ()=>{ this.setState(s => ({ notifOpen:false, notifRead: { ...(s.notifRead||{}), [n.id]: true } })); n.go(); } }));
    const notifUnreadN = notifRows.filter(n => n.op === '1').length;
    const doSignOut = ()=>{ try { localStorage.removeItem('aco_authed'); } catch (e) {} this.pushAudit('Signed out — session ended' + (this.state.rememberDev !== false ? ' · device remembered' : '')); this.setState({ authed:false, profileOpen:false, mobNavOpen:false, notifOpen:false }); };
    const netForecast = [['Jul',0.32],['Aug',0.61],['Sep',0.74],['Oct',0.46],['Nov',0.35],['Dec',0.29]].map(([m2, v2]) => ({ m: m2, v: '$' + v2.toFixed(2) + 'M', barStyle: 'height:6px;background:#0D0D0D;width:' + Math.round(v2 / 0.74 * 100) + '%;' }));
    const scStats = [ { label:'Autonomous actions', v:'34', sub:'this week · +8 vs W26' }, { label:'Approved by you', v:'12', sub:'avg 41s to approve' }, { label:'Awaiting approval', v:'3', sub:'in Needs Your Decision' }, { label:'Time saved', v:'≈6.5h', sub:'vs manual entry · estimate' } ];
    const scRows = [ { label:'Drafts written', v:'14', sub:'11 sent after approval · 3 pending' }, { label:'Activities logged', v:'9', sub:'calls, tours, notes — structured from voice + chat' }, { label:'Chases & reminders', v:'6', sub:'SLA · signatures · deposits' }, { label:'Docs filed to Drive', v:'5', sub:'auto-foldered by deal' }, { label:'MLS sweeps', v:'4', sub:'2 matches surfaced to you' } ];
    const shellTools = {
      notifOpen: !!this.state.notifOpen,
      toggleNotif: ()=>this.setState(s => ({ notifOpen: !s.notifOpen, profileOpen:false })),
      notifRows, notifUnread: String(notifUnreadN), hasNotifUnread: notifUnreadN > 0, notifAllClear: notifUnreadN === 0,
      markAllNotif: ()=>{ const all = {}; notifSeed.forEach(n => { all[n.id] = true; }); this.setState({ notifRead: all }); this.ciToast('All notifications read'); },
      profileOpen: !!this.state.profileOpen,
      toggleProfile: ()=>this.setState(s => ({ profileOpen: !s.profileOpen, notifOpen:false })),
      goSettingsFromMenu: ()=>{ this.nav('settings'); this.setState({ profileOpen:false }); },
      rememberDevOn: this.state.rememberDev !== false,
      remDevMark: this.state.rememberDev !== false ? '✓' : '—',
      remDevColor: this.state.rememberDev !== false ? '#10A37F' : '#B8B8B8',
      toggleRememberDev: ()=>{ const on = !(this.state.rememberDev !== false); this.setState({ rememberDev: on }); this.ciToast(on ? 'This device will be remembered — 30 days' : 'Device forgotten — 2FA on every login'); },
      doSignOut,
      vaOn: !!this.state.viewAs, vaName: (this.state.viewAs || {}).name || '', vaRole: (this.state.viewAs || {}).role || '',
      vaExit: ()=>{ this.setState({ viewAs: null, screen:'settings', setSec:'16' }); this.ciToast('Exited view-as — full access restored'); },
      isMob, mobNavOpen: !!this.state.mobNavOpen,
      toggleMobNav: ()=>this.setState(s => ({ mobNavOpen: !s.mobNavOpen })),
      mobNavItems: navItems.map(n => ({ ...n, onClick: ()=>{ n.onClick(); this.setState({ mobNavOpen:false }); } })),
      mobGoSettings: ()=>{ this.nav('settings'); this.setState({ mobNavOpen:false }); },
      sideStyle: isMob ? SIDE_BASE + 'display:none;' : isTab ? SIDE_BASE.replace('width:230px', 'width:198px') : SIDE_BASE
    };
    const partnerTools = (() => {
      const T_BUY = ['Qualified','Toured','Offer strategy','Negotiation','Contract','Escrow','Closing'];
      const T_LIST = ['Consult','Valuation','Agreement','Prep & staging','Marketing','Offers','Contract','Closing'];
      const cardDefs = [
        { id:'rivage', title:'Rivage · PH-A', lead:'Marcelo C.', kind:'Acquisition · $18.5M', track:T_BUY, idx:2,
          hl:[['Jul 05','Toured PH-A + PH-B with spouse — strong response'],['Jul 03','Offer strategy approved · ceiling set'],['Jun 28','Proof of funds filed — cash acquisition'],['Jun 21','Your referral registered · protection active']],
          miles:[['Jul 08','Construction schedule to client','done'],['Jul 12','Second visit — Sat 11:00','next'],['Jul 20','Contract target — developer paper','future']],
          next:'Second visit — Sat 11:00', baseGci:'$555K', fee:'$138.8K', feeSt:'projected', feeColor:'#B45309', feeWhen:'at closing · Sep 2026', col:0, docs:[['Pre-referral registration','Timestamped Jun 21 · protection active'],['Referral agreement — 25% of Gross Commission','Signed · on file']],
          seedCmt:[['A. Bittencourt','Jul 04','Marcelo values discretion — avoid e-mail, WhatsApp only.'],['Wictor','Jul 04','Noted — the whole thread runs on WhatsApp. Good instinct.']] },
        { id:'golden', title:'Golden Beach Villa', lead:'Bianca F.', kind:'Listing · $19M', track:T_LIST, idx:3,
          hl:[['Jul 08','Stager confirmed Thursday · photos Monday'],['Jul 03','Exclusive signed — launch week set'],['Jun 26','Walkthrough — positioning aligned']],
          miles:[['Jul 10','Staging complete','next'],['Jul 14','Photography + floor plans','future'],['Jul 17','MLS live + broker open invites','future']],
          next:'Launch — broker open in week one', baseGci:'$570K', fee:'$142.5K', feeSt:'projected', feeColor:'#B45309', feeWhen:'at closing · Q4 2026', col:0, docs:[['Pre-referral registration','Timestamped May 30 · protection active'],['Referral agreement — 25% of Gross Commission','Signed · on file']], seedCmt:[] },
        { id:'continuum', title:'Continuum 2904', lead:'Miguel A.', kind:'Acquisition · $7.2M', track:T_BUY, idx:6,
          hl:[['Jul 06','Walk-through scheduled · wire verified'],['Jul 02','Financing cleared — all contingencies met']],
          miles:[['Jul 16','Final walk-through','next'],['Jul 18','Closing · your fee disburses','future']],
          next:'Closing — Jul 18', baseGci:'$216K', fee:'$54.0K', feeSt:'payable', feeColor:'#0D0D0D', feeWhen:'disburses at closing · Jul 18', col:1, docs:[['Referral agreement — 25% of Gross Commission','Signed · on file'],['Fee statement — $54.0K','Issues at closing · Jul 18']], tcMiles:[['Contract signed','Jul 02','done'],['Inspection cleared','Jul 06','done'],['HOA approval','Jul 10','done'],['Final walk-through','Jul 16','current'],['Closing','Jul 18','future'],['Your fee disburses','Jul 18','future']],
          seedCmt:[['Wictor','Jul 06','Clean file — no financing contingency left. Expect the wire same day.']] },
        { id:'setai', title:'Setai 1201', lead:'R. Almeida', kind:'Acquisition · closed Dec 2025', track:T_BUY, idx:7,
          hl:[['Dec 12','Referral fee wired — $48.0K'],['Nov 30','Closed · 94 days referral-to-close']],
          miles:[['Dec 12','Fee wired ✓','done']],
          next:'—', baseGci:'$192K', fee:'$48.0K', feeSt:'paid', feeColor:'#10A37F', feeWhen:'wired Dec 12, 2025', col:2, docs:[['Fee statement — $48.0K','Paid · Dec 12, 2025'],['Wire receipt','Dec 12, 2025']], seedCmt:[] }
      ];
      const cmtState = this.state.ptCmts || {};
      const openId = this.state.ptOpenCard || null;
      const mkCard = (d) => {
        const open = openId === d.id;
        const done = d.idx >= d.track.length;
        const pct = Math.round(Math.min(1, d.idx / (d.track.length - 1)) * 100) + '%';
        const cmts = [ ...d.seedCmt.map(c => ({ who:c[0], when:c[1], text:c[2], mine:c[0] !== 'Wictor' })), ...(cmtState[d.id] || []) ];
        return { ...d, pct, open, closed: !open, stage: done ? 'Paid ✓' : d.track[d.idx],
          hlTop: d.hl.slice(0, 2),
          chev: 'display:inline-block;width:12px;flex:none;text-align:center;font-size:14px;line-height:1;color:#8F8F8F;transform:rotate(' + (open ? 90 : 0) + 'deg);transition:transform 150ms;',
          onToggle: () => this.setState(s => ({ ptOpenCard: s.ptOpenCard === d.id ? null : d.id, ptCmtText: '' })),
          onOpenRec: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.setState({ screen:'ptrecord', ptRecId: d.id, ptRecTab:'timeline', ptCmtText:'' }); },
          path: d.track.map((label, i) => ({ label, dot: i < d.idx ? '#0D0D0D' : i === d.idx ? '#B45309' : '#D9D9D9', cl: i === d.idx ? '#0D0D0D' : '#8F8F8F', w: i === d.idx ? '600' : '400' })),
          milesRows: d.miles.map(m => ({ d: m[0], txt: m[1], dot: m[2] === 'done' ? '#10A37F' : m[2] === 'next' ? '#B45309' : '#D9D9D9' })),
          feeMath: d.baseGci + ' GCI × 25% = ' + d.fee,
          cmtRows: cmts.map(c => ({ who: c.who, when: c.when, text: c.text, wc: c.mine ? '#0D0D0D' : '#B45309' })),
          cmtCount: String(cmts.length) };
      };
      const cards = cardDefs.map(mkCard);
      const sendCmt = () => {
        const txt = (this.state.ptCmtText || '').trim();
        const id = (scr === 'ptrecord') ? (this.state.ptRecId || 'rivage') : this.state.ptOpenCard;
        if (!id) return;
        if (!txt) { this.ciToast('Write a note first'); return; }
        const card = cardDefs.find(c => c.id === id);
        this.setState(s => ({ ptCmts: { ...(s.ptCmts || {}), [id]: [ ...((s.ptCmts || {})[id] || []), { who:'A. Bittencourt', when:'Today', text: txt, mine: true } ] }, ptCmtText: '' }));
        this.pushAudit('Partner portal · comment — ' + card.title + ' · by A. Bittencourt: “' + txt.slice(0, 80) + '”');
        this.ciToast('Sent — Wictor sees it on the deal record');
      };
      const regSeed = [
        { id:'r1', name:'Marcelo Carvalho', reg:'Jun 21, 2026', st:'Converted → Rivage · PH-A', c:'#10A37F', note:'protection runs through the transaction' },
        { id:'r2', name:'Bianca Ferraz', reg:'May 30, 2026', st:'Converted → Golden Beach Villa', c:'#10A37F', note:'protection runs through the transaction' },
        (() => { const d = (this.state.ptRegDecisions || {}).rosen; return { id:'r3', name:'D. Rosen', reg:'Jul 07, 2026', st: d === 'accepted' ? 'Protected · 12 months' : d === 'declined' ? 'Declined — already in book' : 'Pending acknowledgment', c: d === 'accepted' ? '#10A37F' : d === 'declined' ? '#D0342C' : '#B45309', note: d === 'accepted' ? 'accepted by Wictor · validity to Jul 07, 2027 · auto-updates ON' : d === 'declined' ? 'notified with reason (§9)' : 'ack within 2 business days · deemed accepted in 5 (§3.5)' }; })(),
        { id:'r4', name:'L. Prado', reg:'Apr 12, 2026', st:'Declined — already in book', c:'#D0342C', note:'active client of the brokerage · notified same day (§3.4)' }
      ];
      const regs = [ ...(this.state.ptRegs || []), ...regSeed ];
      const ack = !!this.state.ptRegAck;
      const doRegister = () => {
        const nm = (this.state.ptRegName || '').trim();
        const ct = ((this.state.ptRegEmail || '') + (this.state.ptRegWhats || '')).trim();
        if (!nm) { this.ciToast('Add the lead name'); return; }
        if (!ct) { this.ciToast('E-mail or WhatsApp is required — §3.2'); return; }
        if (!this.state.ptRegAck) { this.ciToast('Acknowledge the agreement terms first'); return; }
        this.setState(s => ({ ptRegs: [ { id:'rg' + Date.now(), name: nm, reg:'Today', st:'Pending acknowledgment', c:'#B45309', note:'timestamped — your priority is protected (§3.3) · ack within 2 business days' }, ...(s.ptRegs || []) ], ptRegName:'', ptRegContact:'', ptRegEmail:'', ptRegWhats:'', ptRegSpouse:'', ptRegBiz:'', ptRegCargo:'', ptRegInterest:'', ptRegCtx:'', ptRegNat:'', ptRegBudget:'', ptRegTime:'', ptRegAck:false }));
        this.pushAudit('Partner portal · referral registered — ' + nm + ' · by A. Bittencourt · timestamp governs priority (§3.3) · 12-month validity starts at registration (§4.1)');
        this.ciToast('Registered — timestamped · acknowledgment within 2 business days');
      };
      const recId = this.state.ptRecId || 'rivage';
      const recCard = mkCard(cardDefs.find(c => c.id === recId) || cardDefs[0]);
      const recTab = this.state.ptRecTab || 'timeline';
      return {
        isPartnerPortal: scr === 'partner',
        isPartnerNew: scr === 'partnernew',
        isPtRecord: scr === 'ptrecord',
        goPtBoard: () => this.nav('partner'),
        recTitle: recCard.title, recLead: recCard.lead, recKind: recCard.kind,
        recStage: recCard.stage,
        recProt: recCard.col === 2 ? 'Completed · fee paid' : 'Protection active · runs through the transaction',
        recProtColor: recCard.col === 2 ? '#10A37F' : '#0D0D0D',
        recNums: [
          { label:'Base GCI', value: recCard.baseGci, note:'full commission on the file' },
          { label:'Your share · 25%', value: recCard.fee, note: recCard.feeSt + ' · ' + recCard.feeWhen },
          { label:'Next', value: recCard.stage, note: recCard.next }
        ],
        recPath: recCard.path, recMiles: recCard.milesRows, recHist: recCard.hl,
        recDocs: (recCard.docs || []).map(x => ({ name: x[0], meta: x[1] })),
        recHasTc: !!recCard.tcMiles,
        recTc: (recCard.tcMiles || []).map((m, i, arr) => ({ label: m[0], date: m[1], dot: m[2] === 'done' ? '#0D0D0D' : m[2] === 'current' ? '#B45309' : '#D9D9D9', cl: m[2] === 'future' ? '#8F8F8F' : '#0D0D0D', w: m[2] === 'current' ? '600' : '400', line: i < arr.length - 1 })),
        recCmts: recCard.cmtRows, recCmtCount: recCard.cmtCount,
        recTabs: [['timeline','Timeline'],['documents','Documents'],['notes','Notes with Wictor']].map(([id2, label]) => ({ label, onClick: () => this.setState({ ptRecTab: id2 }), style: F0 + 'cursor:pointer;user-select:none;font-weight:' + (recTab === id2 ? 600 : 400) + ';font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:' + (recTab === id2 ? '#0D0D0D' : '#8F8F8F') + ';padding-bottom:7px;border-bottom:1px solid ' + (recTab === id2 ? '#0D0D0D' : 'transparent') + ';transition:color 150ms;' })),
        recTabTl: recTab === 'timeline', recTabDocs: recTab === 'documents', recTabNotes: recTab === 'notes',
        ptName: (this.state.viewAs && this.state.viewAs.role === 'Referral Partner' && this.state.viewAs.name) || 'A. Bittencourt',
        goPtNew: () => this.nav('partnernew'),
        goPtDash: () => this.nav('ptdash'),
        ...(() => {
          const PLANG = this.state.ptLang || 'EN';
          const PLD = {
            EN: { c1:'Only what you referred', c2:'Every touch logged', c3:'Timestamp governs priority — §3.3', newRef:'New referral', feeT:'Fee pipeline — your 25%', byS:'by status', outT:'Outcomes', life:'lifetime', valT:'Lead validity — 12-month protection', fromReg:'from registration date · §4', commT:'Referral commission track', boardT:'Referral pipeline — every stage, live', col1:'In progress', col2:'Closing', col3:'Paid', regT:'Register a referral', regS:'Registration is your protection — it timestamps the introduction and starts the agreement before any outreach happens.', regBtn:'Register referral', collT:'Pre-development collaterals', collS:'every active pre-construction we represent — brochures, floor plans, price lists, always current', dl:'kit' },
            PT: { c1:'Só o que você indicou', c2:'Todo contato registrado', c3:'Timestamp define prioridade — §3.3', newRef:'Nova indicação', feeT:'Pipeline de fees — seus 25%', byS:'por status', outT:'Resultados', life:'histórico', valT:'Validade do lead — proteção de 12 meses', fromReg:'a partir do registro · §4', commT:'Extrato de comissões de referral', boardT:'Pipeline de indicações — cada etapa, ao vivo', col1:'Em andamento', col2:'Fechamento', col3:'Pago', regT:'Registrar uma indicação', regS:'O registro é a sua proteção — cria o timestamp da introdução e ativa o acordo antes de qualquer contato.', regBtn:'Registrar indicação', collT:'Colaterais de pré-lançamento', collS:'todos os pré-lançamentos que representamos — brochuras, plantas, tabelas de preço, sempre atualizados', dl:'kit' },
            ES: { c1:'Solo lo que usted refirió', c2:'Cada contacto registrado', c3:'El timestamp define prioridad — §3.3', newRef:'Nueva referencia', feeT:'Pipeline de fees — su 25%', byS:'por estado', outT:'Resultados', life:'histórico', valT:'Validez del lead — protección de 12 meses', fromReg:'desde el registro · §4', commT:'Extracto de comisiones de referral', boardT:'Pipeline de referencias — cada etapa, en vivo', col1:'En curso', col2:'Cierre', col3:'Pagado', regT:'Registrar una referencia', regS:'El registro es su protección — sella la introducción con timestamp y activa el acuerdo antes de cualquier contacto.', regBtn:'Registrar referencia', collT:'Colaterales de pre-construcción', collS:'cada pre-construcción que representamos — brochures, planos, listas de precios, siempre al día', dl:'kit' }
          };
          const plk = PLD[PLANG];
          const ctId2 = this.state.contactId || 'marcelo';
          const ctRefMap = {
            marcelo: { by:'A. Bittencourt', reg:'Jun 21, 2026', ends:'Jun 21, 2027', left:'346 days left', pw:'5%' },
            alvarez: { by:'A. Bittencourt', reg:'Feb 02, 2026', ends:'Feb 02, 2027', left:'207 days left', pw:'43%' }
          };
          const ctRefCur = ((this.state.ctRefAssign || {})[ctId2]) || ctRefMap[ctId2] || null;
          const autoOn = (this.state.ctRefAuto || {})[ctId2] !== false;
          const ptDec = this.state.ptRegDecisions || {};
          const decideReg = (id, verdict, name2) => {
            this.setState(s => ({ ptRegDecisions: { ...(s.ptRegDecisions || {}), [id]: verdict } }));
            if (verdict === 'accepted') { this.pushAudit('Partner referral · accepted — ' + name2 + ' · by A. Bittencourt · 12-month protection starts (§4.1) · partner auto-updates ON'); this.ciToast('Accepted — protection active · partner notified'); }
            else { this.pushAudit('Partner referral · declined — ' + name2 + ' · §9 duplicate check · partner notified with reason'); this.ciToast('Declined — partner notified with reason'); }
          };
          return {
            showPtLang: ['ptdash','partner','partnernew','ptrecord','ptcollat'].indexOf(scr) >= 0,
            ptLangOpts: ['EN','PT','ES'].map(L => ({ label: L, onClick: () => this.setState({ ptLang: L }), style: F0 + 'font-weight:' + (PLANG === L ? 600 : 400) + ';font-size:10px;letter-spacing:0.06em;color:' + (PLANG === L ? '#0D0D0D' : '#8F8F8F') + ';background:' + (PLANG === L ? 'rgba(255,255,255,0.75)' : 'transparent') + ';border-radius:999px;padding:5px 10px;cursor:pointer;user-select:none;transition:all 150ms;' })),
            plk,
            ptRegEmail: this.state.ptRegEmail || '', onPtRegEmail: (e) => this.setState({ ptRegEmail: e.target.value }),
            ptRegWhats: this.state.ptRegWhats || '', onPtRegWhats: (e) => this.setState({ ptRegWhats: e.target.value }),
            ptRegSpouse: this.state.ptRegSpouse || '', onPtRegSpouse: (e) => this.setState({ ptRegSpouse: e.target.value }),
            ptRegBiz: this.state.ptRegBiz || '', onPtRegBiz: (e) => this.setState({ ptRegBiz: e.target.value }),
            ptRegCargo: this.state.ptRegCargo || '', onPtRegCargo: (e) => this.setState({ ptRegCargo: e.target.value }),
            ptRegNWOpts: (() => { const cur = this.state.ptRegNW || 'Prefer not to say'; return ['< $5M','$5–20M','$20–50M','$50M+','Prefer not to say'].map(x => ({ label: x, onClick: () => this.setState({ ptRegNW: x }), style: F0 + 'font-weight:' + (cur === x ? 500 : 400) + ';font-size:11px;color:' + (cur === x ? '#0D0D0D' : '#5D5D5D') + ';background:' + (cur === x ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (cur === x ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' })); })(),
            isPtCollat: scr === 'ptcollat',
            ptProjects: [
              { name:'Rivage', loc:'Bal Harbour — oceanfront', from:'from $8.5M', del:'Delivery Q4 2026', st:'Selling', stC:'#0D0D0D', upd:'updated Jul 08' },
              { name:'St Regis Sunny Isles · Tower 2', loc:'Sunny Isles Beach', from:'from $4.9M', del:'Delivery 2027', st:'Price release Aug 1', stC:'#B45309', upd:'updated Jul 09' },
              { name:'Bentley Residences', loc:'Sunny Isles Beach', from:'from $5.6M', del:'Delivery 2028', st:'Selling', stC:'#0D0D0D', upd:'updated Jul 02' },
              { name:'The Perigon', loc:'Miami Beach — oceanfront', from:'from $4.2M', del:'Delivery 2027', st:'Last 20%', stC:'#D0342C', upd:'updated Jun 30' },
              { name:'Villa Miami', loc:'Edgewater — waterfront', from:'from $5.0M', del:'Delivery 2027', st:'Selling', stC:'#0D0D0D', upd:'updated Jul 05' },
              { name:'Estates at Acqualina', loc:'Sunny Isles Beach', from:'from $6.8M', del:'Move-in ready', st:'Developer units', stC:'#10A37F', upd:'updated Jul 07' }
            ].map(pj => ({ ...pj, kits: ['Brochure','Fact sheet','Floor plans','Price list'].map(k => ({ label: k, onClick: () => { this.pushAudit('Collaterals · downloaded — ' + pj.name + ' · ' + k + ' · A. Bittencourt'); this.ciToast(k + ' — ' + pj.name + ' · downloading'); } })) })),
            hasPipePending: scr === 'pipeline',
            pipeRefRows: [ { id:'rosen', name:'D. Rosen', by:'A. Bittencourt', reg:'Jul 07', want:'Sunny Isles pre-construction · $4–6M · cash', decided: !!ptDec.rosen, notDecided: !ptDec.rosen,
              decLabel: ptDec.rosen === 'accepted' ? 'Accepted ✓ · protection to Jul 07, 2027 · partner auto-updates ON' : 'Declined — partner notified with reason (§9)',
              decColor: ptDec.rosen === 'accepted' ? '#10A37F' : '#D0342C',
              onAccept: () => decideReg('rosen', 'accepted', 'D. Rosen'), onDecline: () => decideReg('rosen', 'declined', 'D. Rosen') } ],
            ctHasRef: scr === 'contact' && !!ctRefCur,
            ctRefBy: ctRefCur ? ctRefCur.by : '', ctRefReg: ctRefCur ? ctRefCur.reg : '', ctRefEnds: ctRefCur ? ctRefCur.ends : '', ctRefLeft: ctRefCur ? ctRefCur.left : '', ctRefPw: ctRefCur ? ctRefCur.pw : '0%',
            ctNoRef: scr === 'contact' && !ctRefCur,
            ctRefPickOpen: !!this.state.ctRefPickOpen,
            ctRefPickClosed: !this.state.ctRefPickOpen,
            ctRefPickToggle: () => this.setState(s => ({ ctRefPickOpen: !s.ctRefPickOpen })),
            ctRefManage: () => this.setState({ screen:'settings', setSec:'16', ctRefPickOpen:false }),
            ctRefPartners: (() => {
              const fromTeam = (this.state.tmMembers || []).filter(m => m.role === 'Referral Partner' && m.status === 'Active').map(m => ({ name: m.name, lic:'license on file' }));
              const base = [{ name:'A. Bittencourt', lic:'CRECI-SP 45.221-F' }];
              const all = base.concat(fromTeam.filter(m => m.name !== 'A. Bittencourt'));
              return all.map(p => ({ ...p, onPick: () => { this.setState(s => ({ ctRefAssign: { ...(s.ctRefAssign || {}), [ctId2]: { by: p.name, reg:'Jul 10, 2026', ends:'Jul 10, 2027', left:'365 days left', pw:'0%' } }, ctRefPickOpen: false })); this.pushAudit('Referral origin assigned — ' + p.name + ' · agreement 25% of Gross Commission · 12-month validity starts today (§4.1) · auto-updates ON'); this.ciToast('Assigned — ' + p.name + ' · validity to Jul 10, 2027'); } }));
            })(),
            ctRefAutoLabel: autoOn ? 'Auto-updates · ON' : 'Auto-updates · OFF',
            ctRefAutoColor: autoOn ? '#10A37F' : '#8F8F8F',
            ...(() => {
              const dlRefMap = { 'Rivage PH-A · Marcelo C.': ['Jun 21, 2026','Jun 21, 2027','346 days left','5%'], 'Continuum 2904 · Alvarez': ['Feb 02, 2026','Feb 02, 2027','207 days left','43%'], 'Golden Beach Villa': ['May 30, 2026','May 30, 2027','324 days left','11%'] };
              const d2 = dlRefMap[curDealKey] || ['Jul 10, 2026','Jul 10, 2027','365 days left','1%'];
              return { dlRefReg: d2[0], dlRefEnds: d2[1], dlRefLeft: d2[2], dlRefPw: d2[3] };
            })(),
            dlRefChip: scr === 'deal' && /bittencourt/i.test((dealSpec && dealSpec.src) || ''),
            dlRefAutoLabel: ((this.state.ctRefAuto || {})['deal|' + curDealKey] !== false) ? 'Partner auto-updates · ON' : 'Partner auto-updates · OFF',
            dlRefAutoColor: ((this.state.ctRefAuto || {})['deal|' + curDealKey] !== false) ? '#10A37F' : '#8F8F8F',
            dlRefAutoToggle: () => { const k2 = 'deal|' + curDealKey; const on3 = (this.state.ctRefAuto || {})[k2] !== false; this.setState(s => ({ ctRefAuto: { ...(s.ctRefAuto || {}), [k2]: !on3 ? true : false } })); this.pushAudit('Partner auto-updates ' + (on3 ? 'paused' : 'resumed') + ' — ' + dealSpec.title + ' · milestones e-mailed to A. Bittencourt'); this.ciToast(on3 ? 'Auto-updates paused' : 'ON — every milestone e-mails the partner'); },
            ctRefAutoToggle: () => { const on2 = (this.state.ctRefAuto || {})[ctId2] !== false; this.setState(s => ({ ctRefAuto: { ...(s.ctRefAuto || {}), [ctId2]: !on2 ? true : false } })); this.pushAudit('Partner auto-updates ' + (on2 ? 'paused' : 'resumed') + ' — every milestone & interaction e-mailed to A. Bittencourt'); this.ciToast(on2 ? 'Auto-updates paused' : 'Auto-updates ON — milestones e-mail the partner'); }
          };
        })(),
        isPtDash: scr === 'ptdash',
        feeBars: [ { label:'Projected', v:'$281.3K', w:'100%', c:'#B45309' }, { label:'Payable', v:'$54.0K', w:'19%', c:'#0D0D0D' }, { label:'Paid', v:'$48.0K', w:'17%', c:'#10A37F' } ],
        outcomeBars: [ { label:'Active files', n:'2', w:'100%' }, { label:'In closing', n:'1', w:'50%' }, { label:'Paid', n:'1', w:'50%' }, { label:'Pending ack', n:'1', w:'50%' }, { label:'Declined — duplicate', n:'1', w:'50%' } ],
        convLine: 'Conversion 80% · median referral-to-close 94 days · 0 disputes',
        valRows: [
          { name:'Marcelo Carvalho', deal:'Rivage · PH-A', reg:'Jun 21, 2026', ends:'Jun 21, 2027', left:'346 days left', pw:'5%', st:'Active', c:'#0D0D0D' },
          { name:'Bianca Ferraz', deal:'Golden Beach Villa', reg:'May 30, 2026', ends:'May 30, 2027', left:'324 days left', pw:'11%', st:'Active', c:'#0D0D0D' },
          { name:'Miguel Alvarez', deal:'Continuum 2904', reg:'Feb 02, 2026', ends:'Feb 02, 2027', left:'207 days left', pw:'43%', st:'Contract signed — fee locked (§4.3)', c:'#10A37F' },
          { name:'D. Rosen', deal:'awaiting first file', reg:'Jul 07, 2026', ends:'Jul 07, 2027', left:'362 days left', pw:'1%', st:'Acknowledgment window', c:'#B45309' },
          { name:'R. Almeida', deal:'Setai 1201', reg:'Sep 2025', ends:'closed Nov 2025', left:'—', pw:'100%', st:'Closed within validity ✓', c:'#10A37F' }
        ],
        agrOpen: !!this.state.ptAgrOpen,
        openAgr: () => this.setState({ ptAgrOpen: true }),
        closeAgr: () => this.setState({ ptAgrOpen: false }),
        agrMeta: [ 'Effective · Mar 23, 2026', 'Referring — A. Bittencourt · Brazil (CRECI)', 'Receiving — Wictor Fernando Arraes, PA · SL3232361 · Xcellence Realty', 'Split · 25% of Gross Commission', 'Lead validity · 12 months from registration', 'Florida Statutes Ch. 475 · FREC', 'Licensed agents only — DBPR · CRECI', 'Wire costs — borne by partner', 'Venue — Miami-Dade · prevailing party recovers fees', 'Modeled on Florida Realtors RA-4' ],
        agrSections: [
          { h:'1 · Definitions', b:'Referred Client — formally registered and not previously in the brokerage’s book. Qualified Lead — full name, e-mail + phone, genuine interest, budget range, timeline, property profile. Gross Commission — the commission actually received by the receiving brokerage on the transaction, before deductions. Licensed Referring Agent — a real estate broker or agent holding an active license with their jurisdiction’s authority (DBPR in Florida; CRECI in Brazil). Secondary Referral — a third party introduced by the Referred Client during the client’s validity period.' },
          { h:'2 · Scope & exclusions', b:'Covers Florida transactions: pre-construction and new development, resale, long-term rental, short-term/vacation rental. Excluded: mortgage, title, insurance and settlement services (RESPA — no fee is paid on these), lease renewals beyond the first term, and any transaction closing after the validity window (except §4 grace). Earlier introductions only by mutual written agreement.' },
          { h:'3 · Lead registration', b:'Register through the portal before, or simultaneously with, any introduction. Required: full legal name, e-mail, WhatsApp, nationality and residence, transaction type, property profile, budget range in USD, timeline, purpose. Acknowledgment within 2 business days; decline only within 5 business days (already an active client, incomplete after a 3-day cure, or the client declined contact). No timely rejection — deemed accepted. Your registration timestamp governs priority in any dispute.' },
          { h:'4 · Lead validity — 12 months', b:'Each accepted lead is protected for 12 months from the registration date. Fees are due on transactions that go under contract and close within the period — plus a 60-day closing grace when the contract was signed before expiry. Extensions: written request at least 15 days before expiry, up to +6 months per extension, by mutual written agreement. Quarterly status updates on request; the portal shows the live validity clock for every lead.' },
          { h:'5 · Secondary referrals — friends & family', b:'Introductions made by your client during their validity period count as your leads: register them within 10 business days of learning of the introduction, same 25% split, their own independent 12-month clock. Introductions after the original lead expires do not qualify.' },
          { h:'6 · Referral fee — 25% of Gross Commission', b:'The standard fee is 25% of the Gross Commission actually received by the receiving brokerage — the Florida Realtors RA-4 “% of full commission” option. Co-broke transactions: the base is only the share allocated to the receiving brokerage. Pre-construction: paid pro-rata as each developer installment is received; if a deal cancels mid-schedule you keep installments already paid and have no claim to future ones. No commission received — no fee due (including default, non-payment by developer, or commission dispute with a third party). A different fee for a specific lead is valid only as a written addendum signed before registration.' },
          { h:'7 · Payment mechanics — wire costs borne by partner', b:'Fee due at closing; paid within 15 business days of the brokerage actually receiving the commission, in USD. International wire to your designated account: all transfer, currency-conversion, intermediary and receiving-bank costs are deducted from the referral fee. Banking details are provided in writing and changes require 5 business days’ notice. No payment is released while required tax documentation (§16) is missing — the fee is held, not forfeited. A written closing statement is issued within 5 business days of each closing.' },
          { h:'8 · Licensing requirement — DBPR / FREC', b:'Referral fees are payable only to a Licensed Referring Agent — an actively licensed real estate broker or agent — in accordance with Florida Statutes Ch. 475, DBPR and FREC rules (F.S. 475.25(1)(h) prohibits paying unlicensed persons). The partner warrants the license is active at registration and at closing, and provides proof (CRECI registration or DBPR license number) before first payment. If the license lapses mid-transaction, payment is suspended until cured; if it cannot be cured by closing, no fee is due. Payments to Brazilian brokers are made broker-to-broker in compliance with both jurisdictions.' },
          { h:'9 · Duplicates & conflicts', b:'First valid registration timestamp wins — across all partners. Leads already active with the brokerage (contact within the prior 12 months, existing contract, or an open file) are declined with notice inside 5 business days — never silently. If two partners register the same lead, the earlier timestamp controls and the later registrant is notified. The portal accept/decline record is the operative evidence.' },
          { h:'10 · Non-circumvention', b:'The brokerage will not bypass the partner to avoid the fee — any transaction with a validly registered lead inside the window pays, even if the client returns through another door. The partner will not shop a registered lead to competing brokerages during the validity period, and will not interfere in negotiations. The client always remains free to choose: if the client independently engages another brokerage with no involvement of the receiving brokerage, no fee is due.' },
          { h:'11 · Confidentiality & data protection', b:'Client data is used only to serve the referral, is held confidentially by both parties, and is processed consistent with applicable data-protection law — including LGPD for Brazil-sourced leads and Florida law. No marketing use of the client’s data without written consent. Each party remains responsible for its own compliance.' },
          { h:'12 · Marketing & conduct rules', b:'The partner may not: advertise the brokerage’s listings or use its marks without prior written approval; publish pricing, availability or projected returns; make promises on behalf of the brokerage; or perform licensed Florida real estate activity (showing property, negotiating terms, drafting offers). A violation that causes a regulatory or legal problem voids the fee for that transaction and may terminate the agreement for cause.' },
          { h:'13 · Compliance — AML / OFAC', b:'Both parties comply with anti-money-laundering rules and OFAC sanctions screening. The brokerage may decline or unwind any referral where source-of-funds, sanctions or KYC concerns cannot be resolved — with notice to the partner; no fee is due on a declined or unwound transaction. No cash payments, ever.' },
          { h:'14 · Disputes — escalation ladder', b:'Step 1: direct good-faith discussion within 15 days of written notice. Step 2: mediation in Miami-Dade County, Florida. Step 3: exclusive venue in the state courts of Miami-Dade County under Florida law; the prevailing party recovers reasonable attorneys’ fees and costs (mirroring Florida Realtors RA-4). The English version of this agreement controls; a Portuguese courtesy translation is provided.' },
          { h:'15 · Term & termination', b:'Runs until terminated by either party with 30 days’ written notice. Termination is not retroactive: leads validly registered before the notice keep their full validity window, and fees already earned (including future pre-construction installments on closed contracts) survive termination.' },
          { h:'16 · Tax, invoicing & general', b:'Each party bears its own taxes. International partners provide a W-8BEN (entities: W-8BEN-E) before first payout; US persons a W-9. An invoice or receipt accompanies each payment on request. The parties are independent contractors — no agency, employment or partnership. Amendments only in writing signed by both parties; the portal record (timestamps, milestones, statements, accept/decline log) is the operative log of the relationship.' }
        ],
        agrSent: !!this.state.ptAgrSent,
        agrSentLabel: this.state.ptAgrSent ? 'E-mailed to all parties ✓ · Jul 10' : 'E-mail agreement — all parties',
        ptAgrEmail: () => { if (this.state.ptAgrSent) { this.ciToast('Already sent — check your inbox'); return; } this.setState({ ptAgrSent: true }); this.pushAudit('Partner portal · agreement e-mailed — A. Bittencourt, Wictor Arraes, A/CO records · signed copy · PDF'); this.ciToast('Sent — you, Wictor and A/CO records · PDF'); },
        ptRegNat: this.state.ptRegNat || '', onPtRegNat: (e) => this.setState({ ptRegNat: e.target.value }),
        ptRegBudget: this.state.ptRegBudget || '', onPtRegBudget: (e) => this.setState({ ptRegBudget: e.target.value }),
        ptRegTime: this.state.ptRegTime || '', onPtRegTime: (e) => this.setState({ ptRegTime: e.target.value }),
        ptRegTypeOpts: (() => { const cur = this.state.ptRegType || 'Purchase'; return ['Purchase','Investment','Rental'].map(x => ({ label:x, onClick: () => this.setState({ ptRegType: x }), style: F0 + 'font-weight:' + (cur === x ? 500 : 400) + ';font-size:11px;color:' + (cur === x ? '#0D0D0D' : '#5D5D5D') + ';background:' + (cur === x ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (cur === x ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' })); })(),
        ptRegPurposeOpts: (() => { const cur = this.state.ptRegPurpose || 'Investment'; return ['Personal use','Investment','Rental income','Vacation home'].map(x => ({ label:x, onClick: () => this.setState({ ptRegPurpose: x }), style: F0 + 'font-weight:' + (cur === x ? 500 : 400) + ';font-size:11px;color:' + (cur === x ? '#0D0D0D' : '#5D5D5D') + ';background:' + (cur === x ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (cur === x ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' })); })(),
        ptKpis: [
          { label:'Referred', value:'4', note:'lifetime · 3 active files' },
          { label:'Referred volume', value:'$44.7M', note:'in motion now' },
          { label:'Your share — in motion', value:'$335K', note:'25% of Gross Commission · projected + payable' },
          { label:'Paid to date', value:'$48K', note:'last: Dec 2025 · Setai 1201' }
        ],
        ptCols: (() => { const L2 = this.state.ptLang || 'EN'; const CT = { EN:['In progress','Closing','Paid'], PT:['Em andamento','Fechamento','Pago'], ES:['En curso','Cierre','Pagado'] }[L2]; return [ { title: CT[0], count:'2', cards: cards.filter(c => c.col === 0) }, { title: CT[1], count:'1', cards: cards.filter(c => c.col === 1) }, { title: CT[2], count:'1', cards: cards.filter(c => c.col === 2) } ]; })(),
        ptCmtVal: this.state.ptCmtText || '',
        onPtCmt: (e) => this.setState({ ptCmtText: e.target.value }),
        onPtCmtKey: (e) => { if (e.key === 'Enter') sendCmt(); },
        ptCmtSend: sendCmt,
        ptRows: [
          { deal:'Rivage · PH-A', base:'$555K', share:'$138.8K', stText:'Projected', stColor:'#B45309', when:'Sep 2026' },
          { deal:'Golden Beach Villa', base:'$570K', share:'$142.5K', stText:'Projected', stColor:'#B45309', when:'Q4 2026' },
          { deal:'Continuum 2904', base:'$216K', share:'$54.0K', stText:'Payable at closing', stColor:'#0D0D0D', when:'Jul 18, 2026' },
          { deal:'Setai 1201', base:'$192K', share:'$48.0K', stText:'Paid ✓', stColor:'#10A37F', when:'Dec 12, 2025' }
        ],
        ptTotalLine: 'Lifetime $383.3K · $48.0K paid · $335.3K in motion',
        ptStatement: () => { this.pushAudit('Partner portal · statement exported — PDF · A. Bittencourt'); this.ciToast('Statement ready — PDF'); },
        ptRegName: this.state.ptRegName || '', onPtRegName: (e) => this.setState({ ptRegName: e.target.value }),
        ptRegContact: this.state.ptRegContact || '', onPtRegContact: (e) => this.setState({ ptRegContact: e.target.value }),
        ptRegInterest: this.state.ptRegInterest || '', onPtRegInterest: (e) => this.setState({ ptRegInterest: e.target.value }),
        ptRegCtx: this.state.ptRegCtx || '', onPtRegCtx: (e) => this.setState({ ptRegCtx: e.target.value }),
        ptAckToggle: () => this.setState(s => ({ ptRegAck: !s.ptRegAck })),
        ptAckMark: ack ? '✓' : '',
        ptAckBox: 'width:16px;height:16px;flex:none;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;color:#FFFFFF;border:1px solid ' + (ack ? '#0D0D0D' : '#B4B4B4') + ';background:' + (ack ? '#0D0D0D' : 'transparent') + ';transition:all 150ms;',
        ptRegister: doRegister,
        ptRegRows: regs
      };
    })();
        return {
      ...loginTools,
      ...onbTools,
      ...shellTools,
      ...docTools,
      ...partnerTools,
      ...intelSecTools,
      ...mktTools,
      ...featTools,
      navItems, navMoreItems, navMoreOpen,
      toggleNavMore: ()=>this.setState(s=>({ navMoreOpen: !s.navMoreOpen })),
      navMoreChevron: navMoreOpen ? '⌃' : '⌄',
      navMoreStyle: 'display:flex;align-items:center;justify-content:space-between;border-radius:11px;padding:8px 12px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:400;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8F8F8F;cursor:pointer;transition:all 150ms;',
      hasNavMoreBadge: totalUnread > 0 && !navMoreOpen, navMoreBadge: String(totalUnread),
      pageTitle: titleMap[scr] || 'A/CO',
      pageTitleClick: ()=>{ const back = { contact:'contacts', deal:'pipeline', dealpage:'pipeline', tc:'pipeline' }[scr]; if (back) this.nav(back); },
      pageTitleCursor: ({ contact:1, deal:1, dealpage:1, tc:1 }[scr] ? 'pointer' : 'default'),
      pageTitleHint: ({ contact:'Back to Contacts', deal:'Back to Opportunities', dealpage:'Back to Opportunities', tc:'Back to Opportunities' }[scr] || ''),
      pageTitleArrow: ({ contact:1, deal:1, dealpage:1, tc:1 }[scr] ? '‹ ' : ''),
      goIntel: ()=>this.nav('intel'),
      homeReminders: [
        { dot:'#D0342C', text:'Marcelo Carvalho · touch overdue — day 4 of 3, draft ready', action:'Open queue', onClick: ()=>this.setState({screen:'contacts', contactView:'queue'}) },
        { dot:'#D0342C', text:'Sterling · HOA package due Jul 11 — inside T-3 window', action:'Open transaction', onClick: ()=>this.nav('tc') },
        { dot:'#0D0D0D', text:'3 decisions waiting — Rivage split is time-sensitive', action:'Decide', onClick: ()=>this.nav('intel') }
      ],
      // Off-market registration form
      omFormOpen: !!this.state.omFormOpen,
      openOmForm: () => this.openOmForm(),
      closeOmForm: () => this.setState({ omFormOpen:false }),
      submitOmForm: () => this.submitOmForm(),
      omSet: ['name','area','type','bd','ba','sf','ask','src','owner','notes'].reduce((acc,k) => { acc[k] = (e) => { if (!this._omDraft) this._omDraft = {}; this._omDraft[k] = e.target.value; }; return acc; }, {}),
      omStatusOpts: [['Quiet','#8F8F8F','Owner circle only — no outreach'],['Preview','#B45309','Handpicked buyers, 1:1'],['Circulating','#10A37F','Broker whisper network']].map(([label,dot,desc]) => ({
        label, dot, desc,
        onClick: () => this.setState({ omStatus: label }),
        style: 'display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:7px 13px;font-size:11.5px;letter-spacing:0.02em;cursor:pointer;transition:all 150ms;' + ((this.state.omStatus||'Quiet')===label ? 'background:#E9E8E4;color:#0D0D0D;border:1px solid #0D0D0D;' : 'background:rgba(255,255,255,0.55);color:#5D5D5D;border:1px solid #E3E3E3;')
      })),
      omPhotos: (this.state.omPhotos||[]).map(p => ({ ...p, onRemove: () => this.setState(s => ({ omPhotos:(s.omPhotos||[]).filter(x => x.id!==p.id) })) })),
      omDocs: (this.state.omDocs||[]).map(dd => ({ ...dd, onRemove: () => this.setState(s => ({ omDocs:(s.omDocs||[]).filter(x => x.id!==dd.id) })) })),
      omPhotoCount: String((this.state.omPhotos||[]).length),
      omDocCount: String((this.state.omDocs||[]).length),
      onOmPhotos: (e) => { const fs = Array.from(e.target.files||[]); if (!fs.length) return; const add = fs.map((f,i) => ({ id:'p'+Date.now()+'-'+i, name:f.name, url:URL.createObjectURL(f) })); this.setState(s => ({ omPhotos:[...(s.omPhotos||[]), ...add] })); e.target.value=''; },
      onOmDocs: (e) => { const fs = Array.from(e.target.files||[]); if (!fs.length) return; const add = fs.map((f,i) => ({ id:'d'+Date.now()+'-'+i, name:f.name, ext:(f.name.split('.').pop()||'DOC').toUpperCase().slice(0,4), size: f.size>1048576 ? (f.size/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(f.size/1024))+' KB' })); this.setState(s => ({ omDocs:[...(s.omDocs||[]), ...add] })); e.target.value=''; },
      omSamplePhotos: () => this.setState(s => ({ omPhotos:[...(s.omPhotos||[]), { id:'sp1'+Date.now(), name:'living-double-height.jpg', url:'' }, { id:'sp2'+Date.now(), name:'terrace-sunset.jpg', url:'' }, { id:'sp3'+Date.now(), name:'primary-suite.jpg', url:'' }] })),
      omSampleDocs: () => this.setState(s => ({ omDocs:[...(s.omDocs||[]), { id:'sd1'+Date.now(), name:'Floor plan — PH-A.pdf', ext:'PDF', size:'2.4 MB' }, { id:'sd2'+Date.now(), name:'Owner authorization — quiet listing.pdf', ext:'PDF', size:'310 KB' }] })),
      omToggleRows: [['match','Sweep buyer book on save','Agent matches this listing against every active buyer brief'],['dossier','Generate watermarked dossier','Private PDF from photos + docs, per-recipient watermark'],['watch','Watch for public comps','Alert if a comparable unit hits the MLS']].map(([k,label,sub]) => {
        const on = !!((this.state.omOpts || { match:true, dossier:true })[k]);
        return { label, sub,
          onClick: () => this.setState(s => ({ omOpts: { ...(s.omOpts||{}), [k]: !on } })),
          trackStyle: 'display:inline-flex;flex:none;width:32px;height:18px;border-radius:999px;padding:2px;transition:background 150ms;box-sizing:border-box;' + (on ? 'background:#0D0D0D;justify-content:flex-end;' : 'background:#D9D9D9;justify-content:flex-start;')
        };
      }),
      omErr: this.state.omErr || '',
      hasOmErr: !!this.state.omErr,
      // Contract intake
      ciOpen: !!this.state.ciOpen,
      ...(() => {
        const kind = this.state.ciKind || 'psa';
        const V = {
          psa: { title:'Extraction · Purchase & Sale Agreement', btn:'Create transaction + action plan',
            fields:[['Buyer','Marcelo Carvalho','#0D0D0D'],['Property','Rivage PH-A','#0D0D0D'],['Price · terms','$18.5M · Cash','#0D0D0D'],['Effective','Jul 06 2026','#0D0D0D'],['Deposit','$1.85M · Jul 09','#0D0D0D'],['Inspection ends','Jul 16 · 10d (§7)','#D0342C'],['Closing','Sep 12 2026 (§4)','#0D0D0D'],['Escrow · attorney','Coastal Title · M. Delgado','#0D0D0D']],
            riskTitle:'2 points of attention', risk:'· Inspection window shortened: 10 days (standard 14) — schedule immediately.\n· HOA requires 21-day approval and closing is in 68 — package must go out by Jul 08.',
            filedTo:'Drive / Transactions / 2026 / Carvalho — Rivage PH-A / 01 Contract / 2026-07-06 · PSA · executed.pdf — pasta criada agora + atalho na pasta do contato',
            creates:'Transaction in Pipeline · In Contract · Purchase·Cash playbook with 9 milestones dated from the contract · 3 immediate tasks · T-3 reminders · transaction group proposed.' },
          pof: { title:'Extraction · Proof of Funds — bank letter', btn:'File + update KYC',
            fields:[['Client','Marcelo Carvalho','#0D0D0D'],['Institution','J.P. Morgan Private Bank','#0D0D0D'],['Liquid verified','$22.4M','#0D0D0D'],['Issued','Jul 01 2026','#0D0D0D'],['Valid until','Sep 28 2026 · 90d','#D0342C'],['Coverage','121% of stated budget','#0D0D0D']],
            riskTitle:'1 point of attention', risk:'· 90-day validity — may expire before a September closing. Refresh scheduled for Sep 21.',
            filedTo:'Drive / Contacts / Marcelo Carvalho / 02 Financial / 2026-07-01 · Proof of funds · JPM.pdf — acesso restrito',
            creates:'Marcelo\u2019s KYC updated · refresh reminder Sep 21 · hygiene check: buyer verified for offers up to $22.4M.' },
          passport: { title:'Extraction · ID — Passport', btn:'File to private vault',
            fields:[['Name','Marcelo A. Carvalho','#0D0D0D'],['Nationality','Brazil','#0D0D0D'],['Document','FD 293••••','#0D0D0D'],['Issued','Mar 2017','#0D0D0D'],['Expiry','Mar 2027','#0D0D0D'],['MRZ integrity','Pass','#0D0D0D']],
            riskTitle:'', risk:'',
            filedTo:'Drive / Contacts / Marcelo Carvalho / 01 Identity · KYC / 2026-07-06 · Passport.jpg — restricted permission · principal only',
            creates:'KYC complete · revalidation reminder before closing docs · never shared without your approval.' },
          listing: { title:'Extraction · Exclusive Listing Agreement', btn:'Create listing + action plan',
            fields:[['Seller','M. Klein','#0D0D0D'],['Property','Estates at Acqualina PH','#0D0D0D'],['Ask','$19.9M','#0D0D0D'],['Commission','5% · 2.5 / 2.5 co-broke','#0D0D0D'],['Term','6 months · exclusive','#0D0D0D'],['Signed','Jul 06 2026','#0D0D0D']],
            riskTitle:'2 points of attention', risk:'· Photos must go out by Jul 11 for MLS live on Jul 13 (playbook target).\n· Ask 8% above the last comp — 30-day price checkpoint already scheduled.',
            filedTo:'Drive / Transactions / 2026 / Klein — Estates PH · Listing / 01 Contract / 2026-07-06 · Listing agreement.pdf — pasta criada + atalho no contato Klein',
            creates:'Listing in Pipeline · Listing playbook with 6 dated actions · buyer-match sweep across your book — 4 candidates found · weekly seller report activated.' }
        }[kind];
        return { ciTitle:V.title, ciBtn:V.btn, ciCreatesText:V.creates, ciRiskTitle:V.riskTitle, hasCiRisk: !!V.risk, ciFiledTo:V.filedTo,
          ciRiskLines: V.risk ? V.risk.split('\n') : [],
          ciFieldRows: V.fields.map(([k,v,c]) => ({ k, v, vColor:c })) };
      })(),
      ciStage: this.state.ciStage || 'drop',
      ciIsDrop: (this.state.ciStage||'drop')==='drop',
      ciIsReading: this.state.ciStage==='reading',
      ciIsDone: this.state.ciStage==='done',
      ciFile: this.state.ciFile || '',
      openCi: ()=>this.openCi(),
      closeCi: ()=>this.setState({ciOpen:false}),
      onCiFile: (e)=>this.onCiFile(e),
      ciUseSample: ()=>this.ciUseSample('psa','PSA — Carvalho × Rivage PH-A · executed.pdf'),
      ciSamples: [
        { label:'PSA · Carvalho', onClick:()=>this.ciUseSample('psa','PSA — Carvalho × Rivage PH-A · executed.pdf') },
        { label:'Proof of funds', onClick:()=>this.ciUseSample('pof','JPM — proof of funds · Carvalho.pdf') },
        { label:'Passport', onClick:()=>this.ciUseSample('passport','Passport — Carvalho.jpg') },
        { label:'Listing agreement', onClick:()=>this.ciUseSample('listing','Exclusive listing — Klein × Estates PH.pdf') }
      ],
      ciCreate: ()=>this.ciCreate(),
      // Ask bar
      askCtx: (()=>{ const idName = { marcelo:'Marcelo', keller:'Zurich FO', sterling:'Sterling', bittencourt:'Bittencourt', nakamura:'Nakamura', ravel:'Ravel', alvarez:'Alvarez', zanotti:'Zanotti' }; if (scr==='contact') return idName[this.state.contactId||'marcelo']||''; if (scr==='deal') return dealSpec.title; if (scr==='tc') return 'Acqualina 4802'; return ''; })(),
      hasAskCtx: scr==='contact'||scr==='deal'||scr==='tc',
      askText: this.state.askText || '',
      listening: !!this.state.listening,
      onAskInput: (e)=>this.setState({askText:e.target.value}),
      onAskKey: (e)=>{ if (e.key==='Enter' && (this.state.askText||'').trim()) this.askSubmit(this.state.askText.trim()); },
      onMic: ()=>this.toggleVoice(),
      micStyle: `width:34px;height:34px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 150ms;border:0.5px solid ${this.state.listening?'#D0342C':'#0D0D0D'};background:${this.state.listening?'#D0342C':'#0D0D0D'};color:#FFFFFF;font-size:13px;`,
      micStyleSm: `width:30px;height:30px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 150ms;border:0.5px solid ${this.state.listening?'#D0342C':'#0D0D0D'};background:${this.state.listening?'#D0342C':'#0D0D0D'};color:#FFFFFF;font-size:12px;`,
      micTitle: this.state.listening ? 'Listening… click to stop' : 'Speak · V',
      askPlaceholder: this.state.listening ? 'Listening… speak your command' : 'Ask, command or dictate — "log a call with Marcelo, it advanced"',
      askThread: (this.state.askThread || []).map(t => this._decorateAsk(t)),
      hasAskThread: !!(this.state.askThread && this.state.askThread.length),
      showDockAsk: scr !== 'command' && scr !== 'partner' && scr !== 'partnernew' && scr !== 'ptrecord' && scr !== 'ptdash' && scr !== 'ptcollat' && !(scr === 'deal' && dealView === 'agent') && !(scr === 'contact' && cTabN === 'agent'),
      lastAsk: (this.state.askThread && this.state.askThread[0]) ? this._decorateAsk(this.state.askThread[0]) : null,
      hasLastAsk: !!(this.state.askThread && this.state.askThread.length && !this.state.askDockDismissed),
      dismissLastAsk: ()=>this.setState({askDockDismissed:true}),
      clearAskThread: ()=>this.setState({askThread:[]}),
      askChips: [
        { label:'Approve the day', onClick:()=>this.askSubmit('Approve the day') },
        { label:'Touch queue', onClick:()=>{ this.setState({screen:'contacts', contactView:'queue'}); } },
        { label:'What closes this month?', onClick:()=>this.askSubmit('what closes this month?') },
        { label:'Who is overdue?', onClick:()=>this.askSubmit('who is overdue?') }
      ],
      ...cmdVals, ...qcVals,
      isCommand: scr==='command', isPipeline: scr==='pipeline', isDeal: scr==='deal', isTc: scr==='tc', isIntel: scr==='intel',
      isNetwork: scr==='network', netKpis, vendorHead, vendorRows, recipHead, recipRows, netCadence,
      goQueue, contactReports, contactReportMeta, ctTagsOpen: !!this.state.ctTagsOpen, toggleCtTags: ()=>this.setState(s=>({ctTagsOpen:!s.ctTagsOpen})), openCtTags: ()=>this.setState({ctTagsOpen:true}), ctTagsLabel: (ctTagSel!=='all' ? ('Tags · ' + ctTagSel) : 'Tags'), ctTagsArrow: this.state.ctTagsOpen ? '⌃' : '⌄', isBoardTab: true, isPlaysTab: pipeTab==='plays',
      pbTabs, pbRows, pbAddStep, pbSelName,
      pbPrefsOpen, togglePbPrefs, pbPrefsBtnStyle, pbAddType, renamePb, pbPrefSelects, pbChaseVal, onPbChase, pbDeleteType, pbDelStyle,
      sellerListing, sellerVisits, sellerReports, sellerInbound,
      txRows, closedKpis, closedHead, closedRows,
      isPlaceholder: !realScreens.includes(scr),
      isSettings: scr==='settings', goSettings: ()=>this.nav('settings'),
      settingsNavStyle: `padding:8px 12px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${scr==='settings'?500:400};font-size:13px;letter-spacing:0.01em;color:${scr==='settings'?'#0D0D0D':'#5D5D5D'};cursor:pointer;transition:all 150ms;background:${scr==='settings'?'#FFFFFF':'transparent'};border:0.5px solid ${scr==='settings'?'#E3E3E3':'transparent'};`,
      setProfile, setCadence, setAutonomy, setEcon, setIntegrations, connectors, setNotifs, setScoring, setVoice, setPrivacy, setRhythm, setStages, setMls, setDisplay,
      setPlaybooks: Object.entries(gcPlaybooks).map(([status, p]) => ({ status, name: p.name, cadence: p.cadence, steps: p.steps })),
      pipeTabsEdit, addPipe, renamePipe, pipeSelName, stageRows, addStage,
      ...(() => {
        const seeded = [
          { id:'w', name:'Wictor Arraes', email:'w@arraes.com', role:'Principal', status:'Active', last:'now', off:true, you:true },
          { id:'b', name:'Beatriz Lima', email:'beatriz@arraes.com', role:'Sales Agent', status:'Active', last:'2h ago', off:false },
          { id:'c', name:'Carla Mendes', email:'carla@arraes.com', role:'Admin', status:'Active', last:'today 08:10', off:false },
          { id:'t', name:'Ana Paula Reis', email:'tc@arraes.com', role:'Transaction Coordinator', status:'Pending', last:'invite sent Jul 06', off:false },
          { id:'p', name:'A. Bittencourt', email:'a.bittencourt@partners.arraes.com', role:'Referral Partner', comm:'25%', status:'Active', last:'Jul 08', off:false }
        ];
        const members = this.state.tmMembers || seeded;
        const matrix = {
          'Principal': { sees:['Everything — full system','Agent approvals & autonomy','All financials & forecasts','Off-market inventory','KYC & sensitive fields'], held:['—'] },
          'Sales Agent': { sees:['Own contacts & own pipeline','Inbox — own threads only','Activities & tasks — own','Reports — own production'], held:['Other agents\u2019 pipelines','Agent approvals — routed to Principal','Off-market — per-member grant only','KYC & sensitive contact fields'] },
          'Admin': { sees:['All contacts & calendars — operational','Activities, tasks & coordination','Inbox triage — assign threads','Documents — non-financial'], held:['Agent approvals','GCI & forecast detail','Off-market inventory','KYC & sensitive fields'] },
          'Transaction Coordinator': { sees:['In Contract transactions only','Milestones, deadlines & documents','Vendor coordination'], held:['Prospecting & warm pipeline','Marketing hub','Forecasts & GCI beyond the file','Off-market & KYC'] },
          'Marketing': { sees:['Marketing hub — campaigns & content','Audience segments — anonymized','Content calendar & brand assets'], held:['Pipeline & contact detail','Publishing — Principal approves','Off-market — never'] },
          'Referral Partner': { sees:['Referred leads & deals — theirs only','Stage progress & milestone timeline','Communication highlights — every touch logged','Referral commission track — projected → payable → paid'], held:['All other pipeline & contacts','Full message content & internal notes','Client financials & KYC','Marketing, reports & settings'] }
        };
        const selRole = this.state.tmRole || 'Sales Agent';
        const pill = (on) => F0 + 'font-weight:' + (on?500:400) + ';font-size:11.5px;color:' + (on?'#0D0D0D':'#5D5D5D') + ';background:' + (on?'rgba(255,255,255,0.62)':'transparent') + ';border:1px solid ' + (on?'#D9D9D9':'#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;';
        const saveM = (list, msg) => { this.setState({ tmMembers: list }); if (msg) { this.pushAudit(msg); this.ciToast(msg.split(' — ')[0]); } };
        return {
          tmRows: members.map(m => { const sus = m.status === 'Suspended', pen = m.status === 'Pending';
            return { name: m.name, email: m.email, role: m.role, roleLabel: m.role + (m.comm ? ' · ' + m.comm : ''), last: m.last, youBadge: !!m.you,
              stTxt: m.status, stColor: sus ? '#D0342C' : pen ? '#B45309' : '#10A37F',
              rowOp: sus ? '0.55' : '1',
              offLabel: m.role === 'Principal' ? 'always' : (m.off ? 'granted ✓' : 'no access'),
              offStyle: F0 + 'font-size:10.5px;letter-spacing:0.04em;border-radius:999px;padding:3px 10px;border:1px solid ' + (m.off?'#B7E0D2':'#E3E3E3') + ';color:' + (m.off?'#10A37F':'#8F8F8F') + ';cursor:' + (m.role==='Principal'?'default':'pointer') + ';user-select:none;background:rgba(255,255,255,0.5);',
              onOff: () => { if (m.role === 'Principal') return; saveM(members.map(x => x.id===m.id ? { ...x, off: !x.off } : x), 'Team · off-market access ' + (m.off?'revoked':'granted') + ' — ' + m.name + ' · logged'); },
              actLabel: pen ? 'Revoke invite' : (sus ? 'Restore' : 'Suspend'),
              actStyle: F0 + 'font-size:10px;letter-spacing:0.05em;text-transform:uppercase;border:1px solid #E3E3E3;border-radius:999px;padding:5px 12px;color:' + (pen||sus ? '#5D5D5D' : '#D0342C') + ';cursor:pointer;background:transparent;transition:all 150ms;',
              onAct: () => { if (m.role === 'Principal') { this.ciToast('The Principal cannot be suspended'); return; }
                if (pen) { saveM(members.filter(x => x.id !== m.id), 'Team · invite revoked — ' + m.email); }
                else { saveM(members.map(x => x.id===m.id ? { ...x, status: sus ? 'Active' : 'Suspended', last: sus ? 'restored now' : m.last } : x), 'Team · access ' + (sus?'restored':'suspended') + ' — ' + m.name + ' · immediate'); } },
              onView: () => { this.setState({ viewAs: { name: m.name, role: m.role }, screen: m.role === 'Referral Partner' ? 'ptdash' : 'command' }); this.pushAudit('View as · ' + m.name + ' — ' + m.role + ' · role-scoped preview'); this.ciToast('Viewing as ' + m.name.split(' ')[0] + ' — exit from the top banner'); },
              hideAct: m.role === 'Principal', showAct: m.role !== 'Principal' };
          }),
          tmRoleOptions: ['Sales Agent','Admin','Transaction Coordinator','Marketing','Referral Partner'].map(r => ({ label: r, onClick: () => this.setState({ tmRole: r }), style: pill(selRole === r) })),
          tmPreviewRole: selRole,
          tmPreviewSees: matrix[selRole].sees, tmPreviewHeld: matrix[selRole].held,
          tmInviteVal: this.state.tmInvite || '',
          onTmInvite: (e) => this.setState({ tmInvite: e.target.value }),
          tmSendInvite: () => { const em = (this.state.tmInvite||'').trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.ciToast('Enter a valid e-mail'); return; }
            if (selRole === 'Referral Partner') { this.setState({ tmInvOpen: true, tmInvTab: 'inv' }); return; }
            const nm = em.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            saveM([...members, { id:'m'+Date.now(), name: nm, email: em, role: selRole, status:'Pending', last:'invite sent now', off:false }], 'Team · invite sent — ' + em + ' as ' + selRole + ' · role locked at invite');
            this.setState({ tmInvite:'' }); },
          tmCommShow: selRole === 'Referral Partner',
          tmCommStdStyle: pill((this.state.tmComm || '25%') === '25%'),
          tmCommStdPick: () => this.setState({ tmComm: '25%' }),
          tmCommCustomVal: (() => { const c = this.state.tmComm || '25%'; return c === '25%' ? '' : c.replace('%',''); })(),
          onTmCommCustom: (e) => { const v = String(e.target.value).replace(/[^0-9.]/g, '').slice(0, 4); this.setState({ tmComm: v ? (Math.min(100, parseFloat(v) || 0) + '%') : '25%' }); },
          tmCommCustomStyle: (() => { const custom = (this.state.tmComm || '25%') !== '25%'; return F0 + 'width:86px;box-sizing:border-box;text-align:center;font-weight:' + (custom ? 500 : 400) + ';font-size:11.5px;color:' + (custom ? '#0D0D0D' : '#5D5D5D') + ';background:' + (custom ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (custom ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:6px 10px;outline:none;transition:all 150ms;'; })(),
          tmInvOpen: !!this.state.tmInvOpen,
          tmInvClose: () => this.setState({ tmInvOpen: false }),
          tmInvComm: this.state.tmComm || '25%',
          tmInvTabs: (() => { const cur = this.state.tmInvTab || 'inv'; return [['inv','Invite e-mail'],['upd','Milestone update e-mail']].map(([id2, label]) => ({ label, onClick: () => this.setState({ tmInvTab: id2 }), style: F0 + 'cursor:pointer;user-select:none;font-weight:' + (cur === id2 ? 600 : 400) + ';font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:' + (cur === id2 ? '#0D0D0D' : '#8F8F8F') + ';padding-bottom:7px;border-bottom:1px solid ' + (cur === id2 ? '#0D0D0D' : 'transparent') + ';transition:color 150ms;' })); })(),
          tmInvIsInv: (this.state.tmInvTab || 'inv') === 'inv',
          tmInvIsUpd: (this.state.tmInvTab || 'inv') === 'upd',
          tmInvSend: () => { const em = (this.state.tmInvite||'').trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.ciToast('Enter a valid e-mail'); return; }
            const comm = this.state.tmComm || '25%';
            const nm = em.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            saveM([...members, { id:'m'+Date.now(), name: nm, email: em, role:'Referral Partner', comm, status:'Pending', last:'invite sent now', off:false }], 'Team · partnership invite sent — ' + em + ' · ' + comm + ' of Gross Commission · agreement pre-filled · signs via DocuSign');
            this.ciToast('Invite sent — ' + em + ' · ' + comm + ' · agreement attached');
            this.setState({ tmInvite:'', tmInvOpen:false }); },
          tm2faAll: !!this.state.tm2faAll,
          tm2faLabel: this.state.tm2faAll ? 'Required for everyone' : 'Principal & Admin only',
          tm2faStyle: pill(!!this.state.tm2faAll),
          tm2faToggle: () => { const on = !this.state.tm2faAll; this.setState({ tm2faAll: on }); this.pushAudit('Team · 2FA policy — ' + (on ? 'required for all roles' : 'required for Principal & Admin only')); },
          tmAudit: [
            { t:'Today 09:41', who:'Beatriz Lima', what:'Tried to open Golden Beach Compound (off-market) — blocked · no grant' },
            { t:'Today 08:12', who:'Carla Mendes', what:'Reassigned 3 inbox threads · allowed — operational scope' },
            { t:'Jul 07 18:03', who:'Beatriz Lima', what:'Approved WhatsApp draft — routed to you · approvals are Principal-only' },
            { t:'Jul 06 11:30', who:'You', what:'Invite sent — tc@arraes.com as Transaction Coordinator' }
          ]
        };
      })(),
      ...(() => {
        const sigProv = this.state.sigProv || 'DocuSign';
        return { sigProviders: ['DocuSign','Dropbox Sign'].map(p => { const on = sigProv === p; return { label: p,
          onClick: () => { if (p === 'Dropbox Sign' && !(this.state.conn && this.state.conn.dropbox === true)) { this.ciToast('Connect Dropbox Sign first — Settings · Integrations'); return; } this.setState({ sigProv: p }); this.pushAudit('Integrations · primary e-sign provider — ' + p + ' · envelopes route there from now on'); this.ciToast('Primary e-sign — ' + p); },
          style: F0 + 'font-weight:' + (on ? 500 : 400) + ';font-size:11.5px;color:' + (on ? '#0D0D0D' : '#5D5D5D') + ';background:' + (on ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (on ? '#D9D9D9' : '#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;' }; }),
        sigProvNote: sigProv === 'DocuSign' ? 'counterparty-trusted · ID verification available' : 'lower cost per envelope · same webhook return' };
      })(),
      ...(() => {
        const statusOv = this.state.rpStatusOv || {};
        const P = [
          { id:'bitten', name:'A. Bittencourt', firm:'Bittencourt Realty · São Paulo', lic:'CRECI-SP 45.221-F', comm:'25%', base:'Active', agr:'Signed', agrMeta:'DocuSign · Mar 23, 2026', leads:'4', active:'2', fees:'$383.3K', paid:'$48.0K', motion:'$335.3K',
            leadRows:[['Marcelo Carvalho','Rivage · PH-A','346 days left','#10A37F','Active'],['Bianca Ferraz','Golden Beach Villa','324 days left','#10A37F','Active'],['Miguel Alvarez','Continuum 2904','fee locked · §4.3','#0D0D0D','Contract'],['R. Almeida','Setai 1201','closed within validity','#8F8F8F','Paid']],
            audit:[['Jul 08','Milestone — offer strategy approved · Marcelo Carvalho'],['Jul 02','Contract signed — Miguel Alvarez · fee locked'],['Jun 21','Lead registered — Marcelo Carvalho · protection to Jun 2027']] },
          { id:'rains', name:'Sofia Rains', firm:'Rains & Co · Miami', lic:'DBPR SL3299001', comm:'30%', base:'Active', agr:'Signed', agrMeta:'DocuSign · Jan 12, 2026', leads:'2', active:'1', fees:'$96.0K', paid:'$96.0K', motion:'—',
            leadRows:[['K. Petrov','Faena Penthouse','210 days left','#10A37F','Active'],['J. Whitfield','Acqualina 4805','closed within validity','#8F8F8F','Paid']],
            audit:[['Jul 06','Accepted — K. Petrov · 12-month protection started'],['Dec 12','Fee paid — J. Whitfield · $96.0K wired']] },
          { id:'lux', name:'Paulo Mendes', firm:'LuxBroker · São Paulo', lic:'CRECI-SP 98.765-F', comm:'25%', base:'Pending', agr:'Out for signature', agrMeta:'DocuSign · sent Jul 09', leads:'0', active:'0', fees:'—', paid:'—', motion:'—',
            leadRows:[], audit:[['Jul 09','Invite sent — agreement out for signature · 25%']] },
          { id:'atl', name:'Tiago Sousa', firm:'Atlantic Partners · Lisbon', lic:'AMI 12345', comm:'20%', base:'Suspended', agr:'Signed', agrMeta:'DocuSign · Apr 02, 2026', leads:'1', active:'0', fees:'—', paid:'—', motion:'—',
            leadRows:[['H. Costa','Brickell resale','validity expired','#D0342C','Expired']],
            audit:[['Jun 30','Suspended — license lapse (§8) · payouts on hold'],['Apr 02','Agreement signed — 20% of Gross Commission']] }
        ];
        const openId = this.state.rpOpen || null;
        const stColor = (s) => s === 'Active' ? '#10A37F' : s === 'Pending' ? '#B45309' : '#D0342C';
        const rpDrag = !!this.state.rpDrag;
        const rows = P.map(p => {
          const status = statusOv[p.id] || p.base;
          const open = openId === p.id;
          const agKey = 'partner|' + p.id;
          const up = (this.state.docStore || {})[agKey] || [];
          const agDocs = [];
          if (p.agr === 'Signed') agDocs.push({ name:'Referral Agreement — executed.pdf', meta:'PDF · ' + p.agrMeta, badge:'PDF', canRemove:false, cur:'default', onOpen:()=>this.ciToast('Executed copy — filed via DocuSign · opens in the live app'), onRemove:()=>{} });
          up.forEach(d => agDocs.push({ name:d.name, meta:[d.type,d.size,d.date,d.who].filter(Boolean).join(' · '), badge:d.type||'FILE', canRemove:true, cur: d.url ? 'pointer':'default',
            onOpen:()=>{ if (d.url) { const w = window.open('', '_blank'); if (w) { w.document.title = d.name; w.document.body.style.margin='0'; const fr=w.document.createElement('iframe'); fr.src=d.url; fr.style.cssText='border:0;position:fixed;inset:0;width:100%;height:100%'; w.document.body.appendChild(fr); } } else { this.ciToast('Stored — full preview in the live app'); } },
            onRemove:(e)=>{ if (e && e.stopPropagation) e.stopPropagation(); this._removeDoc(agKey, d.id); } }));
          const susLabel = status === 'Suspended' ? 'Restore access' : status === 'Pending' ? 'Resend invite' : 'Suspend';
          return { name:p.name, firm:p.firm, lic:p.lic, comm:p.comm, leads:p.leads, active:p.active, fees:p.fees, paid:p.paid, motion:p.motion,
            statusTxt:status, statusColor: stColor(status), rowOp: status === 'Suspended' ? '0.6' : '1',
            agrTxt:p.agr, agrColor: p.agr === 'Signed' ? '#10A37F' : '#B45309', agrMeta:p.agrMeta,
            open, chev: 'display:inline-block;width:12px;flex:none;text-align:center;font-size:14px;line-height:1;color:#8F8F8F;transform:rotate(' + (open ? 90 : 0) + 'deg);transition:transform 150ms;',
            onToggle: () => this.setState(s => ({ rpOpen: s.rpOpen === p.id ? null : p.id, rpDrag:false })),
            agDocs, agHasDocs: agDocs.length > 0,
            agDropStyle: 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px dashed ' + (rpDrag && open ? '#0D0D0D' : '#C9C9C9') + ';border-radius:12px;background:rgba(255,255,255,' + (rpDrag && open ? '0.72' : '0.4') + ');padding:24px 20px;cursor:pointer;text-align:center;transition:all 150ms;',
            agDragOver:(e)=>{ if (e && e.preventDefault) e.preventDefault(); if (!this.state.rpDrag) this.setState({ rpDrag:true }); },
            agLeave:(e)=>{ if (e && e.preventDefault) e.preventDefault(); if (this.state.rpDrag) this.setState({ rpDrag:false }); },
            agDrop:(e)=>{ if (e && e.preventDefault) e.preventDefault(); this.setState({ rpDrag:false }); this._ingestDocs(agKey, e.dataTransfer && e.dataTransfer.files); },
            agPick:(e)=>{ this._ingestDocs(agKey, e.target.files); try { e.target.value=''; } catch(x){} },
            leadList: p.leadRows.map(r => ({ name:r[0], deal:r[1], clock:r[2], clockColor:r[3], st:r[4] })),
            leadEmpty: p.leadRows.length === 0,
            auditList: p.audit.map(a => ({ t:a[0], txt:a[1] })),
            onStatus: () => { const cur = statusOv[p.id] || p.base; const next = cur === 'Suspended' ? 'Active' : cur === 'Pending' ? 'Pending' : 'Suspended'; if (cur === 'Pending') { this.pushAudit('Partner · invite resent — ' + p.name + ' · agreement out for signature'); this.ciToast('Invite resent — ' + p.name.split(' ')[0]); return; } this.setState(s => ({ rpStatusOv: { ...(s.rpStatusOv||{}), [p.id]: next } })); this.pushAudit('Partner · access ' + (next === 'Suspended' ? 'suspended' : 'restored') + ' — ' + p.name + (next === 'Suspended' ? ' · payouts on hold (§8)' : ' · payouts resume')); this.ciToast(p.name.split(' ')[0] + ' — ' + (next === 'Suspended' ? 'suspended' : 'restored')); },
            statusActionLabel: susLabel,
            statusActionColor: status === 'Suspended' || status === 'Pending' ? '#5D5D5D' : '#D0342C' };
        });
        const ledgerAll = [
          { t:'Jul 09 · 14:20', partner:'A. Bittencourt', lead:'D. Rosen', ev:'Referral registered — pending acknowledgment', c:'#B45309' },
          { t:'Jul 08 · 09:12', partner:'A. Bittencourt', lead:'Marcelo Carvalho', ev:'Milestone — offer strategy approved · fee projected $138.8K', c:'#0D0D0D' },
          { t:'Jul 06 · 16:40', partner:'Sofia Rains', lead:'K. Petrov', ev:'Accepted — 12-month protection started', c:'#10A37F' },
          { t:'Jul 02 · 11:05', partner:'A. Bittencourt', lead:'Miguel Alvarez', ev:'Contract signed — referral fee locked (§4.3)', c:'#0D0D0D' },
          { t:'Jun 30 · 17:02', partner:'Tiago Sousa', lead:'H. Costa', ev:'Validity expired — no closing in window (§4.2)', c:'#D0342C' },
          { t:'Apr 12 · 10:30', partner:'A. Bittencourt', lead:'L. Prado', ev:'Declined — already active in the book (§9)', c:'#D0342C' },
          { t:'Dec 12 · 09:00', partner:'Sofia Rains', lead:'J. Whitfield', ev:'Fee paid — $96.0K wired (costs deducted §7)', c:'#10A37F' }
        ];
        const rpFilter = this.state.rpFilter || 'All partners';
        const names = ['All partners'].concat(P.map(p => p.name));
        return {
          rpKpis: [
            { label:'Active partners', value: String(P.filter(p => (statusOv[p.id]||p.base) === 'Active').length), sub: P.length + ' total · 1 suspended' },
            { label:'Leads referred', value:'7', sub:'lifetime · 4 active' },
            { label:'Fees paid', value:'$144K', sub:'to partners · lifetime' },
            { label:'In motion', value:'$335K', sub:'projected + payable' }
          ],
          rpRows: rows,
          rpFilterOpts: names.map(n => ({ label:n, onClick:()=>this.setState({ rpFilter:n }), style: F0 + 'font-weight:' + (rpFilter === n ? 600 : 400) + ';font-size:11px;color:' + (rpFilter === n ? '#0D0D0D' : '#8F8F8F') + ';background:' + (rpFilter === n ? 'rgba(255,255,255,0.72)' : 'transparent') + ';border:1px solid ' + (rpFilter === n ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:6px 12px;cursor:pointer;user-select:none;white-space:nowrap;transition:all 150ms;' })),
          rpLedger: ledgerAll.filter(e => rpFilter === 'All partners' || e.partner === rpFilter).map(e => ({ t:e.t, partner:e.partner, lead:e.lead, ev:e.ev, dot:e.c })),
          rpLedgerCount: String(ledgerAll.filter(e => rpFilter === 'All partners' || e.partner === rpFilter).length) + ' events'
        };
      })(),
      ...(() => {
        const cst = this.state.ctCustomTypes || [];
        return {
          setTypeBase: ['Buyer','Seller','Tenant','Landlord','Investor','Developer'].map(t9 => ({ label: t9 })),
          setTypeCustom: cst.map(t9 => ({ label: t9, onRemove: () => { this.setState(s9 => ({ ctCustomTypes: (s9.ctCustomTypes || []).filter(x9 => x9 !== t9) })); this.pushAudit('Settings · contact type removed — ' + t9); this.ciToast('Type removed — ' + t9); } })),
          setHasCustom: cst.length > 0,
          setNewTypeVal: this.state.setNewType ?? '',
          onSetNewType: (e) => this.setState({ setNewType: e.target.value }),
          setAddType: () => { const v9 = String(this.state.setNewType || '').trim(); if (!v9) { this.ciToast('Type a name first'); return; } this.setState(s9 => ({ ctCustomTypes: [ ...(s9.ctCustomTypes || []).filter(x9 => x9 !== v9), v9 ], setNewType: '' })); this.pushAudit('Settings · contact type created — ' + v9 + ' · available on every contact'); this.ciToast('Type added — ' + v9); }
        };
      })(),
      setNav: (() => { const sel = this.state.setSec || '01';
        return [['01','Profile'],['16','Team & Access'],['03','Agent Autonomy'],['02','Cadence Rules'],['18','Contact Types'],['14','Nurturing Playbooks'],['15','Deal Playbooks'],['11','Pipeline & Stages'],['04','Economics'],['17','Referral Partners'],['12','MLS & Matching'],['08','Voice & Templates'],['06','Notifications & Rhythm'],['10','Day Rhythm'],['07','Scoring & Forecast'],['05','Integrations'],['13','Display & Locale'],['09','Data & Privacy']].map(([id,label], i) => { const on = sel === id; const num = ('0' + (i + 1)).slice(-2); return { num, label,
          onClick: () => this.setState({ setSec: id }),
          rowStyle: 'display:flex;align-items:baseline;gap:10px;padding:8px 10px;margin:0 -10px;border-bottom:1px solid #E3E3E3;cursor:pointer;user-select:none;transition:background 150ms;background:' + (on ? 'rgba(255,255,255,0.62)' : 'transparent') + ';',
          numStyle: "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:11px;letter-spacing:0.1em;width:20px;flex:none;font-weight:" + (on ? 500 : 200) + ';color:' + (on ? '#0D0D0D' : '#8F8F8F') + ';',
          labStyle: "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:" + (on ? 600 : 400) + ';color:' + (on ? '#0D0D0D' : '#303030') + ';' }; }); })(),
      setSecFlags: (() => { const sel = this.state.setSec || '01'; const o = {}; ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18'].forEach(n => { o['s' + n] = (n === sel); }); return o; })(),
      kpis, callRows, riskRows, moneyHead, moneyRows, proposals, allDecided, approveAll, approveAllLabel, showApproveAll,
      toggleTravelMode: ()=>{ const on=!this.state.travelMode; this.setState({ travelMode:on }); this.pushAudit('Travel mode ' + (on?'ON — agent assumed cadences, chases and coordination · daily 5-min digest armed':'OFF — return report delivered · queue restored')); },
      travelModeLabel: this.state.travelMode ? 'ON' : 'OFF',
      travelModeStyle: `flex:none;cursor:pointer;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${this.state.travelMode?600:400};font-size:11px;letter-spacing:0.08em;padding:6px 16px;border:0.5px solid ${this.state.travelMode?'#C9C7C1':'#E3E3E3'};background:${this.state.travelMode?'#E9E8E4':'transparent'};color:${this.state.travelMode?'#0D0D0D':'#8F8F8F'};transition:all 150ms;`,
      toggleCarMode: ()=>{ const on=!this.state.carMode; this.setState({ carMode:on }); this.pushAudit('Car mode ' + (on?'ON — voice briefing + memo logging active':'OFF')); },
      carModeLabel: this.state.carMode ? 'ON' : 'OFF',
      carModeStyle: `flex:none;cursor:pointer;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${this.state.carMode?600:400};font-size:11px;letter-spacing:0.08em;padding:6px 16px;border:0.5px solid ${this.state.carMode?'#C9C7C1':'#E3E3E3'};background:${this.state.carMode?'#E9E8E4':'transparent'};color:${this.state.carMode?'#0D0D0D':'#8F8F8F'};transition:all 150ms;`,
      healthScore, healthFactors, moneyStrip, fBars, selMonth, selDeals, selMonthGci, touchToday, riskRadar, riskEmpty: riskRadar.length === 0, riskExposureLine: riskRadar.length ? riskExposure + ' GCI exposed' : 'all clear', agentLedger,
      topBarStyle, topTitleColor, topDividerStyle, heroSub, wGciStr: TOT.wgciStr, netForecast, netCommTotal: '$2.77M', scStats, scRows,
      whatIfLabel, whatIfStyle, toggleWhatIf,
      columns: sortedColumns, collPipes, pipeSections, showClosedSec,
      oppQuery: this.state.oppQuery || '', onOppQuery: (e)=>this.setState({ oppQuery: e.target.value }),
      oppHead, dealRows, closedSegs, closedSecMeta, lostRows, isClosedWon: closedSeg==='won', isClosedLost: closedSeg==='lost', oppReports, oppReportMeta, spbShow, spbClose, spbView,
      peekOpen, peek, closePeek, txHead,
      cPeekOpen, cPeek, closeCPeek,
      isDealPage, dpv,
      toggleSort: ()=>this.setState(s=>({sortOpen:!s.sortOpen})), sortOpen: !!this.state.sortOpen,
      sortLabel, sortArrow, sortOptions, viewToggle,
      isBoard: view==='board', isList: view==='list', isWeek: view==='week', weekCols,
      allDeals, pipeHead: ['Pipeline','Opportunity','Stage','Budget','Prob','Next Action','Due'],
      goDealRecord: goDeal,
      prob, weightedStr, setProb: (e)=>{ const v = Math.max(0, Math.min(100, parseInt(e.target.value,10)||0)); this.setState(s=>({ probByDeal: { ...(s.probByDeal||{}), [curDealKey]: v } })); },
      applyProb: ()=>this.setState(s=>({ probByDeal: { ...(s.probByDeal||{}), [curDealKey]: dealSpec.probSug } })),
      activity, drafts,
      goPipeline: ()=>this.nav('pipeline'),
      ...(() => {
        const S = dealSpec; const sentD = !!this.state.dlSent; const shiftsD = this.state.dlShifts || {};
        const futD = S.plan.map((f0, i) => {
          const f = { d:f0[0], what:f0[1], why:f0[2], st:f0[3], c:f0[4] };
          const k = 'dl|' + curDealKey + '|' + i; const dLbl = shiftsD[k] || f.d;
          const shift = (days) => { const mm = /([A-Za-z]{3}) (\d+)/.exec(dLbl); if (!mm) return; const lbl = mm[1] + ' ' + (parseInt(mm[2],10) + days); this.setState(s=>({ dlShifts: { ...(s.dlShifts||{}), [k]: lbl } })); this.ciToast('Moved to ' + lbl + ' — plan updated'); };
          return { ...f, d: dLbl, hov: this.state.dlHov === i, onEnter: ()=>this.setState({ dlHov: i }), onLeave: ()=>this.setState({ dlHov: null }), onP1: (e)=>{ e.stopPropagation(); shift(1); }, onP7: (e)=>{ e.stopPropagation(); shift(7); } };
        });
        const selMap = this.state.mlsSel || {};
        const mlsRows = S.mls.map((m0, i) => { const on = !!selMap[i];
          return { addr: m0[0], price: m0[1], match: m0[2],
            onToggle: ()=>this.setState(s=>({ mlsSel: { ...(s.mlsSel||{}), [i]: !on } })),
            checkStyle: 'width:15px;height:15px;flex:none;border:1px solid ' + (on ? '#0D0D0D' : '#C9C9C9') + ';background:' + (on ? '#0D0D0D' : 'transparent') + ';' };
        });
        const selN = Object.keys(selMap).filter(k2 => selMap[k2]).length;
        const langNote = S.lang === 'PT' ? 'client is PT — everything goes out in Portuguese' : S.lang === 'ES' ? 'client is ES — everything goes out in Spanish' : 'client is EN — everything goes out in English';
        const chev = (o) => 'display:inline-block;width:12px;flex:none;text-align:center;font-size:15px;line-height:1;color:#8F8F8F;transform:rotate(' + (o ? 90 : 0) + 'deg);transition:transform 150ms;';
        const tourSent = !!this.state.dlTourSent;
        const wNum = S.budgetNum * dlProbVal / 100;
        return {
          dlTitle: S.title, dlParty: S.party,
          ...(() => { const mv = parseFloat((((S.tiles || []).find(t => /momentum/i.test(t.label || '')) || (S.tiles || [])[0] || {}).value)) || 0; const hl = mv >= 75 ? 'HOT' : (mv >= 45 ? 'WARM' : 'NURTURING'); return { dlHeatLabel: hl, dlHeatDot: hl === 'HOT' ? '#D0342C' : (hl === 'WARM' ? '#B45309' : '#10A37F') }; })(),
          dlDivision: S.div, dlSource: S.src, dlBudget: S.budget, dlGci: S.gci,
          dlNarrative: S.narrative, compAName: S.comp.a, compBName: S.comp.b, compCount: S.comp.count,
          dlTrend: S.trend, dlProbText: S.probText.replace('{p}', String(dlProbVal)), dlProbBtnLabel: 'Apply · ' + S.probSug + '%',
          dlDraftsLabel: 'Message Drafts · ' + S.lang, dlHygiene: S.hygiene,
          dlDriveFolder: S.title, dlDriveCount: (S.drive.length + 1) + ' files',
          dlDriveFiles: S.drive.map(f => ({ name: f[0], meta: f[1], dot: f[2] ? '#0D0D0D' : '#8F8F8F' })),
          dlApproveLabel: 'Approve & send · ' + S.now.ch, dlSentLine: 'Sent ✓ · ' + S.now.ch + ' · logged — the agent watches for the reply',
          dlChip2: S.chip2,
          prob: dlProbVal,
          weightedStr: String(S.budget).includes('/mo') ? ('$' + wNum.toFixed(1) + 'K') : ('$' + (wNum >= 1 ? wNum.toFixed(1) + 'M' : Math.round(wNum * 1000) + 'K')),
          dlLabel: S.now.label, dlHead: S.now.head, dlDraft: S.now.draft,
          dlSentF: sentD, dlOpenF: !sentD, dlCardDyn: sentD ? 'max-height:0;opacity:0;margin-top:0;' : '', dlUndo: ()=>this.undoLast(),
          dlApprove: ()=>{ this.setState({ dlSent: true }); this.pushAudit('Deal timeline · approved & sent — ' + S.title + ' · ' + S.now.ch + ' · logged'); this.ciToast('Sent — ' + S.now.ch + ' · logged'); },
          dlSkip: ()=>{ this.setState({ dlSent: true }); this.pushAudit('Deal timeline · action skipped — ' + S.title + ', agent re-proposes'); this.ciToast('Skipped — agent will re-propose'); },
          dlFuture: futD,
          ...(() => {
            const qd = (this.state.dlQDone || {})[curDealKey] || {};
            const mark = (k) => this.setState(s2 => { const all = { ...(s2.dlQDone || {}) }; all[curDealKey] = { ...(all[curDealKey] || {}), [k]: true }; return { dlQDone: all }; });
            const selN2 = Object.keys(selMap).filter(k2 => selMap[k2]).length;
            const mlsN = selN2 > 0 ? selN2 : S.mls.length;
            const qDrafts = drafts.map((d2, i2) => ({ kind: d2.kind, text: d2.text, onApprove: d2.onApprove, approved: d2.approved, skipped: !!qd['draft' + i2], onSkip: () => { mark('draft' + i2); this.ciToast('Skipped — agent re-proposes'); } })).filter(d2 => !d2.approved && !d2.skipped && d2.text !== S.now.draft);
            const qMlsShow = S.mls.length > 0 && !qd.mls;
            const qTourShow = !qd.tour && !this.state.dlTourSent;
            const qDocsShow = docNeedsCount > 0 && !docSent && !qd.docs;
            const qAllClear = sentD && !qMlsShow && !qTourShow && !qDocsShow && qDrafts.length === 0;
            const qDone = (sentD ? 1 : 0) + ['mls','tour','docs'].filter(k2 => qd[k2]).length + drafts.filter(d2 => d2.approved).length + (this.state.dlTourSent ? 1 : 0);
            const ownerColor = (o) => /you|wictor|arraes/i.test(o) ? '#D0342C' : (/agent|a\/co|tc/i.test(o) ? '#8F8F8F' : '#B45309');
            const planCrit = criticalPath.map(c2 => ({ d: c2.when, what: c2.text, why: 'critical path — gates the next stage', st: c2.whenColor === '#0D0D0D' ? 'Due' : 'Planned', c: c2.whenColor === '#0D0D0D' ? '#D0342C' : '#8F8F8F', owner: c2.owner, oc: ownerColor(c2.owner), urgent: c2.whenColor === '#0D0D0D', hov: false, onEnter: () => {}, onLeave: () => {}, onP1: () => {}, onP7: () => {} }));
            const normT = (t2) => String(t2 || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 32);
            const critKeys = planCrit.map(c2 => normT(c2.what));
            const planAll = [ ...planCrit, ...futD.filter(f2 => critKeys.indexOf(normT(f2.what)) < 0).map(f2 => ({ ...f2, owner: 'agent', oc: '#8F8F8F', urgent: false })) ];
            const pf = this.state.dlPlanF || 'all';
            const dlPlanRows = planAll.filter(r2 => pf === 'all' ? true : pf === 'you' ? /you|wictor|arraes/i.test(r2.owner) : pf === 'client' ? (r2.oc === '#B45309') : (r2.oc === '#8F8F8F')).map(r2 => ({ ...r2, hasNudge: !!r2.urgent, nudge: () => { this.pushAudit('Plan · nudge drafted — ' + r2.what + ' · ' + S.title); this.ciToast('Nudge drafted — in the queue'); } }));
            const mkF = (id2, lbl) => ({ label: lbl, onClick: () => this.setState({ dlPlanF: id2 }), style: 'border:1px solid ' + (pf === id2 ? '#0D0D0D' : '#E3E3E3') + ';border-radius:999px;padding:4px 11px;font-family:system-ui,-apple-system,sans-serif;font-weight:' + (pf === id2 ? 500 : 400) + ';font-size:10px;color:' + (pf === id2 ? '#0D0D0D' : '#8F8F8F') + ';background:' + (pf === id2 ? 'rgba(255,255,255,0.75)' : 'transparent') + ';cursor:pointer;user-select:none;transition:all 150ms;' });
            return {
              qMlsShow, qTourShow, qDocsShow, qAllClear,
              qMlsCount: String(mlsN),
              qMlsReviewLabel: this.state.dlMlsOpen ? 'Hide' : 'Review',
              qTourReviewLabel: this.state.dlTourOpen ? 'Hide' : 'Review',
              qMlsApprove: () => { mark('mls'); this.pushAudit('MLS Match · approved & sent — ' + mlsN + ' listings · ' + S.title + ' · in client language'); this.ciToast('Sent — ' + mlsN + ' matches · logged'); },
              qMlsSkip: () => { mark('mls'); this.ciToast('Skipped — agent re-proposes tomorrow'); },
              qTourApprove: () => { mark('tour'); this.pushAudit('Tour · confirmed — agent notifies all parties · ' + S.title); this.ciToast('Confirmed — agent notifies everyone'); },
              qTourSkip: () => { mark('tour'); this.ciToast('Skipped — agent re-proposes'); },
              qDocsCount: String(docNeedsCount),
              qDocsReview: () => this.setState({ dealView: 'documents' }),
              qDocsOpen: !!this.state.dlDocsQOpen,
              qDocsToggle: () => this.setState(s2 => ({ dlDocsQOpen: !s2.dlDocsQOpen })),
              qDocsRevLabel: this.state.dlDocsQOpen ? 'Hide' : ('Review · ' + docNeedsCount),
              docNeedFields: docFields.filter(f3 => f3.needs),
              qDocsSkip: () => { mark('docs'); this.ciToast('Snoozed — back tomorrow morning'); },
              qRedShow: !qd.red,
              qRedOpen: !!this.state.dlRedQOpen,
              qRedToggle: () => this.setState(s2 => ({ dlRedQOpen: !s2.dlRedQOpen })),
              qRedRevLabel: this.state.dlRedQOpen ? 'Hide' : 'Review clauses',
              qRedSkip: () => { mark('red'); this.ciToast('Parked — the counter waits in the Data Room'); },
              qDrafts, qHasDrafts: qDrafts.length > 0,
              qDoneLine: qDone > 0 ? (qDone + ' done today — trail in Memory') : 'agent watches replies, deadlines and documents',
              qNextMilestone: S.plan.length ? (S.plan[0][0] + ' · ' + S.plan[0][1]) : '—',
              dlPlanRows, dlPlanFilters: [mkF('all','All'), mkF('you','You'), mkF('client','Client'), mkF('agent','Agent')],
              fNarrOpen: !!this.state.dlFileN, fNarrToggle: () => this.setState(s2 => ({ dlFileN: !s2.dlFileN })), fNarrChev: this.state.dlFileN ? '⌄' : '›',
              fCommOpen: !!this.state.dlFileC, fCommToggle: () => this.setState(s2 => ({ dlFileC: !s2.dlFileC })), fCommChev: this.state.dlFileC ? '⌄' : '›'
            };
          })(),
          dlMlsOpen: !!this.state.dlMlsOpen, dlMlsToggle: ()=>this.setState(s=>({ dlMlsOpen: !s.dlMlsOpen })),
          dlMlsChipT: S.mlsChip + (this.state.dlMlsOpen ? ' — hide ⌃' : ' — expand ›'),
          dlTourGo: ()=>{ this.pushAudit((S.track === 'buy' ? 'Tour planning · ' : 'Playbook · ') + S.title + ' — drafted · agent coordinates next steps'); this.ciToast('Drafted — agent coordinates'); },
          dlRelated: S.rel.map((r, ri) => { const openP = this.state.dlRelSel === ri; const isPrin = ri === 0;
            return { name: r[0], role: r[1], open: openP,
              onOpen: (e)=>{ e.stopPropagation(); this.setState(s2 => ({ dlRelSel: s2.dlRelSel === ri ? null : ri })); },
              phone: isPrin ? '+1 305 ··· · on file' : 'on file', mail: 'on file',
              lang: isPrin ? S.lang + ' — auto-detected' : 'EN',
              lastT: isPrin ? S.mem[0][0] + ' · ' + S.mem[0][1].toLowerCase() : 'via working file',
              hasRec: !!r[2], noRec: !r[2],
              goRec: (e)=>{ e.stopPropagation(); this.setState({ dlRelSel: null }); if (r[2]) this.openContact(r[2]); },
              addRec: (e)=>{ e.stopPropagation(); this.setState({ dlRelSel: null }); this.pushAudit('Contacts · record created — ' + r[0] + ' · from deal ' + S.title + ' · agent enriches'); this.ciToast('Added to Contacts — agent enriches'); } };
          }),
          dlRelAnyOpen: this.state.dlRelSel != null,
          dlRelRowOpen: !!this.state.dlRelRow,
          dlRelRowToggle: () => this.setState(s2 => ({ dlRelRow: !s2.dlRelRow })),
          dlRelCount: String(S.rel.length),
          dlRelChevron: this.state.dlRelRow ? '⌃' : '⌄',
          dlNarrVal: ((this.state.dlNarrOv || {})[curDealKey]) ?? S.narrative,
          onDlNarr: (e) => { const v = e.target.value; this.setState(s2 => ({ dlNarrOv: { ...(s2.dlNarrOv || {}), [curDealKey]: v } })); },
          ...(() => {
            const defParties = S.rel.map(r3 => ({ name: r3[0], role: r3[1] }));
            const pAll = (this.state.dlParties || {})[curDealKey] || defParties;
            const setParties = (list) => this.setState(s2 => ({ dlParties: { ...(s2.dlParties || {}), [curDealKey]: list } }));
            const roleOpts = ['Buyer','Seller','Tenant','Landlord','Co-agent','Attorney','Title','Mortgage broker','Inspector','Transaction coordinator','Referral partner','Building mgmt','Other'];
            const roleList = (cur2) => (roleOpts.indexOf(cur2) < 0 && cur2 ? [cur2, ...roleOpts] : roleOpts);
            return {
              dlParties: pAll.map((p3, i3) => {
                const isPrin3 = i3 === 0;
                const open3 = this.state.dlPartySel === i3;
                return {
                  name: p3.name, role: p3.role, open: open3, chev: open3 ? '⌃' : '⌄',
                  roleOptions: roleList(p3.role).map(ro => ({ label: ro, value: ro })),
                  onRole: (e) => { const nv = e.target.value; setParties(pAll.map((x, xi) => xi === i3 ? { ...x, role: nv } : x)); this.pushAudit('Data room · role updated — ' + p3.name + ' → ' + nv + ' · ' + S.title); },
                  onOpen: () => this.setState(s2 => ({ dlPartySel: s2.dlPartySel === i3 ? null : i3 })),
                  phone: isPrin3 ? '+1 305 ··· · on file' : 'on file',
                  mail: 'on file',
                  lang: isPrin3 ? (S.lang + ' — auto-detected') : 'EN',
                  lastT: isPrin3 && S.mem && S.mem[0] ? (S.mem[0][0] + ' · ' + S.mem[0][1].toLowerCase()) : 'via working file',
                  onWa: () => { this.pushAudit('Parties · WhatsApp drafted — ' + p3.name + ' · ' + S.title + ' · in their language'); this.ciToast('Draft ready — WhatsApp · in the Now queue'); },
                  onMail: () => { this.pushAudit('Parties · e-mail drafted — ' + p3.name + ' · ' + S.title); this.ciToast('Draft ready — e-mail · in the Now queue'); },
                  onRemove: () => { setParties(pAll.filter((x, xi) => xi !== i3)); this.pushAudit('Data room · party removed — ' + p3.name + ' · ' + S.title); this.ciToast('Removed — ' + p3.name + ' · logged'); }
                };
              }),
              dlPartyCount: String(pAll.length),
              dlAddOpen: !!this.state.dlPartyAddOpen,
              dlAddClosed: !this.state.dlPartyAddOpen,
              dlAddToggle: () => this.setState(s2 => ({ dlPartyAddOpen: !s2.dlPartyAddOpen })),
              dlNewPartyName: this.state.dlNewPName ?? '',
              onDlNewPartyName: (e) => this.setState({ dlNewPName: e.target.value }),
              dlNewPartyRoleVal: this.state.dlNewPRole || 'Buyer',
              dlNewPartyRoles: roleOpts.map(ro => ({ label: ro, value: ro })),
              onDlNewPartyRole: (e) => this.setState({ dlNewPRole: e.target.value }),
              dlAddParty: () => { const nm = String(this.state.dlNewPName || '').trim(); if (!nm) { this.ciToast('Type a name to add'); return; } setParties([ ...pAll, { name: nm, role: this.state.dlNewPRole || 'Buyer' } ]); this.setState({ dlNewPName: '', dlPartyAddOpen: false }); this.pushAudit('Data room · party added — ' + nm + ' · ' + (this.state.dlNewPRole || 'Buyer') + ' · ' + S.title); this.ciToast('Added — agent enriches from Contacts'); }
            };
          })(),
          dlRelClose: ()=>this.setState({ dlRelSel: null }),
          dlPast: S.mem.map(m => ({ date: m[0], type: m[1], body: m[2] })),
          mlsMatches: mlsRows, mlsLangNote: langNote, mlsSelCount: String(selN),
          mlsSuggest: ()=>{ if (!selN) { this.ciToast('Select at least one match'); return; } this.pushAudit('MLS match · ' + selN + ' suggestion(s) approved — ' + S.title + ' · sent in ' + S.lang + ' · logged'); this.ciToast('Sent — ' + selN + ' suggestion(s) · logged'); this.setState({ mlsSel: {} }); },
          mlsShowing: ()=>{ if (!selN) { this.ciToast('Select at least one match'); return; } this.pushAudit('Tour draft · ' + selN + ' stop(s) — ' + S.title + ' · agent coordinates access'); this.ciToast('Tour drafted — ' + selN + ' stop(s)'); },
          mlsAckMsg: 'nothing goes out without your approval',
          dlMlsChev: chev(!!this.state.dlMlsOpen), dlMlsClosedF: !this.state.dlMlsOpen,
          dlMlsSummary: S.mlsChip + (S.mls[0] ? ' · top fit ' + S.mls[0][2] : ''),
          dlTourTitle: S.track === 'buy' ? 'Tour planning' : S.track === 'list' ? 'Launch checklist' : 'Application package',
          dlTourOpen: !!this.state.dlTourOpen, dlTourClosedF: !this.state.dlTourOpen,
          dlTourToggle: ()=>this.setState(s=>({ dlTourOpen: !s.dlTourOpen })),
          dlTourChev: chev(!!this.state.dlTourOpen),
          dlTourSummary: (S.track === 'buy' ? 'draft itinerary — 3 stops proposed' : S.track === 'list' ? '3 steps staged to launch' : '3 items staged') + ' · agent coordinates',
          dlTourStops: S.track === 'buy'
            ? [ { t:'Sat 11:00', addr:S.title, note:'the primary — client walkthrough' }, ...S.mls.slice(0,2).map((m,i)=>({ t: i===0 ? 'Sat 12:30' : 'Sat 14:00', addr:m[0], note: i===0 ? 'comparison stop · ' + m[2] + ' fit' : 'backup — only if time allows' })) ]
            : S.track === 'list'
            ? [ { t:'Step 1', addr:'Photography + floor plan scan', note:'booked before MLS live' }, { t:'Step 2', addr:'MLS + syndication live', note:'launch narrative staged' }, { t:'Step 3', addr:'Broker open · week one', note:'invites from your book' } ]
            : [ { t:'Item 1', addr:'Application + credit package', note:'pre-staged' }, { t:'Item 2', addr:'Landlord terms alignment', note:'agent negotiates' }, { t:'Item 3', addr:'Lease draft for review', note:'attorney template' } ],
          dlTourBtnLabel: tourSent ? 'Sent ✓ · agent coordinating' : (S.track === 'buy' ? 'Approve itinerary — send to client' : 'Approve plan — agent executes'),
          dlTourBtnStyle: tourSent ? 'background:transparent;border:1px solid #E3E3E3;border-radius:999px;padding:8px 15px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:400;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:#10A37F;cursor:default;' : 'background:#E9E8E4;border:1px solid #E0DFDA;border-radius:999px;padding:8px 15px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:500;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:#0D0D0D;cursor:pointer;transition:opacity 150ms;',
          dlTourApprove: ()=>{ if (this.state.dlTourSent) return; this.setState({ dlTourSent: true }); this.pushAudit((S.track === 'buy' ? 'Tour planning · itinerary approved — ' : 'Plan approved — ') + S.title + ' · sent in ' + S.lang + ' · agent coordinates access'); this.ciToast(S.track === 'buy' ? 'Itinerary sent — agent coordinates access' : 'Plan approved — agent executes'); },
          dlTourNote: S.track === 'buy' ? 'agent coordinates access and confirms with the listing side' : 'every step logged · reversible until executed',
          dlCommOpen: !!this.state.dlCommOpen, dlCommClosedF: !this.state.dlCommOpen,
          dlCommToggle: ()=>this.setState(s => ({ dlCommOpen: !s.dlCommOpen })),
          dlCommChev: chev(!!this.state.dlCommOpen),
          ...(() => {
            const s0 = String(S.gci); const n0 = parseFloat(s0.replace(/[^0-9.]/g, '')) || 0;
            const gciK = s0.indexOf('M') >= 0 ? n0 * 1000 : n0;
            const refPct = /referral/i.test(S.src) ? 25 : 0;
            const refK = gciK * refPct / 100; const netK = gciK - refK;
            const fmtK = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(2) + 'M' : '$' + Math.round(k) + 'K';
            const preCon = /St Regis|Rivage/.test(S.key);
            const refName = refPct ? (S.src.split('·')[1] || 'referring party').trim() : '';
            return {
              dlCommSummary: fmtK(netK) + ' net · ' + (preCon ? '3 disbursements · milestone-tied' : 'due at closing · ' + S.docs.close),
              dlCommRows: [
                { label: 'GCI · your side', v: fmtK(gciK), sub: S.budget + ' × fee', vc: '#0D0D0D', w: '400' },
                { label: refPct ? 'Referral out · ' + refPct + '%' : 'Referral out', v: refPct ? '− ' + fmtK(refK) : '—', sub: refPct ? refName + ' · paid at disbursement' : 'no referral on this deal', vc: refPct ? '#D0342C' : '#8F8F8F', w: '400' },
                { label: 'Team agent split', v: '—', sub: 'you own this deal · 100% house', vc: '#8F8F8F', w: '400' },
                { label: 'Net to A/CO', v: fmtK(netK), sub: preCon ? 'paid in phases below' : 'single disbursement', vc: '#0D0D0D', w: '600' }
              ],
              dlCommDisb: preCon ? [
                { d: 'At contract', trig: 'deposit 1 cleared · 20% of price', pct: '50%', amt: fmtK(netK * 0.5), c: '#0D0D0D', st: 'Scheduled' },
                { d: 'Construction top-off', trig: 'milestone certified · deposit 2 (20%)', pct: '25%', amt: fmtK(netK * 0.25), c: '#B45309', st: 'Projected' },
                { d: 'Closing · delivery', trig: 'CO issued · final 10% wired', pct: '25%', amt: fmtK(netK * 0.25), c: '#8F8F8F', st: 'Projected' }
              ] : [
                { d: 'At closing — ' + S.docs.close, trig: 'disbursed from escrow · broker demand filed', pct: '100%', amt: fmtK(netK), c: '#0D0D0D', st: 'Scheduled' }
              ],
              dlCommNote: preCon ? 'Pre-construction — the agent tracks each milestone, files the commission demand per phase, and re-forecasts dates with the construction schedule.' : 'The agent files the broker demand with title and chases the disbursement on closing day.'
            };
          })()
        };
      })(),
      summaryFields, quickActions, dealTabs, actFilters, associations: associations.filter(g3 => !/contact|document/i.test(g3.title || '')),
      dealViewTabs, isDealDash: dealView==='dashboard', isDealDocs: dealView==='documents', isDealAgent: dealView==='agent', isDealFin: dealView==='financial',
      finKpis, finFlow, finSched, finRefOn, finRefFee: finFmt(finRefK), finPreCon: finPre,
      finSrcLine: finOv.touched ? 'Terms — manual override by you · agent extraction kept on file' : 'Terms — agent-extracted from the Purchase Agreement · approved Jul 03 · every value editable',
      finSrcDot: finOv.touched ? '#B45309' : '#10A37F',
      finEditOpen: !!this.state.finEditOpen, finEditClosed: !this.state.finEditOpen,
      finEditToggle: () => this.setState(s => ({ finEditOpen: !s.finEditOpen })),
      finEditLabel: this.state.finEditOpen ? 'Done' : 'Edit terms',
      finRefPctVal: String(finRefPctV), finHousePctVal: String(finHousePctV),
      onFinRefPct: setFinPct('ref'), onFinHousePct: setFinPct('house'),
      finTermsReset: () => { this.setState(s => ({ finOverrides: { ...(s.finOverrides || {}), [curDealKey]: null }, finEditOpen: false })); this.pushAudit('Financial · terms reset to agent extraction — ' + dealSpec.title); this.ciToast('Reset — extracted terms restored'); },
      dlChatRows: [ { isA: true, isU: false, txt: dlChatSeed }, ...dlChatHist.map(m => ({ isA: m.who === 'a', isU: m.who !== 'a', txt: m.txt })) ],
      dlChatTyping: !!this.state.dlChatTyping,
      dlChatInput2: this.state.dlChatInput || '',
      onDlChatInput: (e) => this.setState({ dlChatInput: e.target.value }),
      onDlChatKeyD: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dlChatSend(); } },
      dlChatGo: () => dlChatSend(),
      dlChatChips: ['Stress-test this deal','Offer strategy','Compare the finalists','Path to close','What would you do today?'].map(c => ({ label: c, onClick: () => dlChatSend(c) })),
      docFields, docChecklist, docEnvelope, hasEnvelope, complianceRail, docSendLabel, docSendStyle, sendDoc, docSent,
      dsEnvId, dsPillTxt, dsPillStyle, dsStatusLine, dsPoll, dsRemind, dsVoid, dsDone, dsActive: docSent && !dsDone,
      ...(() => {
        const hasRedline = /counter/i.test(dealSpec.next + ' ' + dealSpec.narrative) || curDealKey.indexOf('Rivage') === 0;
        const mk = (clause, yours, counter, tag) => ({ clause, yours, counter, tag, tagColor: tag === 'NEW' ? '#B45309' : '#D0342C',
          onAccept: ()=>{ this.pushAudit('Redline · accepted — ' + clause + ' · ' + dealSpec.title); this.ciToast('Accepted — ' + clause); },
          onPush: ()=>{ this.pushAudit('Redline · push-back drafted — ' + clause + ' · ' + dealSpec.title + ' · awaiting your approval'); this.ciToast('Push-back drafted — in Needs Your Decision'); } });
        return { hasRedline, redMeta: 'Counter received · diffed against your draft in 40s',
          redRows: [
            mk('Purchase price', dealSpec.docs.price, 'raised · counter at +1.7%', 'CHANGED'),
            mk('Escrow deposit', '10% · deal norm', '15% requested at signing', 'CHANGED'),
            mk('Inspection period', '15 days · AS-IS', '10 days proposed', 'CHANGED'),
            mk('Closing date', dealSpec.docs.close, 'pushed 14 days', 'CHANGED'),
            mk('Rider B · arbitration', 'not present', 'added by counterparty', 'NEW')
          ] };
      })(),
      vmOpen: !!this.state.vmOpen, vmNotDone: !this.state.vmDone, vmDone: !!this.state.vmDone,
      closeVm: ()=>this.setState({ vmOpen:false, vmDone:false }),
      vmText: this.state.vmText ?? 'Acabei de sair do tour. Cliente adorou o terraço oeste; a preocupação segue sendo o prazo de obra. Mandar o cronograma até sexta e confirmar a segunda visita sábado 11h. Perguntar sobre a vaga extra de garagem.',
      onVmText: (e)=>this.setState({ vmText: e.target.value }),
      vmGo: ()=>this.setState({ vmDone:true }),
      vmResLog: 'Showing · Advanced — strong response; construction-timeline concern logged to the record',
      vmTasks: ['Send construction schedule — due Friday', 'Confirm second visit — Saturday 11:00'],
      vmDraft: (dealSpec.drafts[0] || ['',''])[1],
      vmCommit: ()=>{ this.pushAudit('Voice memo · structured — 1 log + 2 tasks + 1 draft queued — ' + dealSpec.title); this.ciToast('Logged — 1 activity, 2 tasks, draft queued'); this.setState({ vmOpen:false, vmDone:false, vmText:null }); },
      drOpen: !!this.state.drOpen, openDr: ()=>this.setState({ drOpen:true }), closeDr: ()=>this.setState({ drOpen:false, drEmailOpen:false, drEmailSent:false }),
      drTitle: dealSpec.title, drParty: dealSpec.party,
      drMem: dealSpec.mem.map(m => ({ date:m[0], type:m[1], body:m[2] })),
      drDocs: dealSpec.drive.map(f2 => ({ name:f2[0] })),
      drNext: dealSpec.plan.slice(0,2).map(p => ({ d:p[0], what:p[1] })),
      drCopy: ()=>{ try { navigator.clipboard.writeText('https://rooms.arraes.co/' + curDealKey.toLowerCase().replace(/[^a-z0-9]+/g,'-')); } catch(e) {} this.pushAudit('Deal room · link issued — ' + dealSpec.title + ' · read-only · expires in 14 days'); this.ciToast('Link copied — read-only · expires 14 days'); },
      ...(() => {
        const lang2 = dealSpec.lang || 'EN';
        const first2 = (dealSpec.partyName || 'Client').split(' ')[0];
        const emailGuess = (dealSpec.partyName || 'client').toLowerCase().replace(/[^a-z ]/g, '').trim().split(/ +/).join('.') + '@gmail.com';
        const drLink = 'https://rooms.arraes.co/' + curDealKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const L = lang2 === 'PT'
          ? { sub: 'Seu deal room — ' + dealSpec.title, body: first2 + ' — preparei uma página privada com o andamento do seu negócio: linha do tempo, documentos e próximos passos, sempre atualizados.', cta: 'Abrir seu deal room', foot: 'Somente leitura · o link expira em 14 dias.' }
          : lang2 === 'ES'
          ? { sub: 'Su deal room — ' + dealSpec.title, body: first2 + ' — preparé una página privada con el avance de su operación: cronología, documentos y próximos pasos, siempre actualizados.', cta: 'Abrir su deal room', foot: 'Solo lectura · el enlace expira en 14 días.' }
          : { sub: 'Your deal room — ' + dealSpec.title, body: first2 + ' — I have set up a private page with the progress of your deal: timeline, documents and next steps, always current.', cta: 'Open your deal room', foot: 'Read-only · the link expires in 14 days.' };
        return {
          drEmailOpen: !!this.state.drEmailOpen,
          openDrEmail: () => this.setState({ drEmailOpen: true, drEmailTo: null }),
          closeDrEmail: () => this.setState({ drEmailOpen: false }),
          drEmailTo: this.state.drEmailTo ?? emailGuess,
          onDrEmailTo: (e) => this.setState({ drEmailTo: e.target.value }),
          drEmailLang: 'Auto · ' + lang2,
          drEmailSub: L.sub, drEmailBody: L.body, drEmailCta: L.cta, drEmailFoot: L.foot, drEmailLink: drLink,
          drEmailSend: () => { const em = String(this.state.drEmailTo ?? emailGuess).trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.ciToast('Enter a valid e-mail'); return; } this.setState({ drEmailOpen: false }); this.pushAudit('Deal room · e-mailed — ' + em + ' · ' + dealSpec.title + ' · read-only link · expires 14 days · sent in ' + lang2); this.ciToast('Sent — ' + em + ' · logged'); }
        };
      })(),
      ...(() => {
        const drLink = 'rooms.arraes.co/' + curDealKey.toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const fn2 = FIRST(dealSpec.partyName);
        const L = dealSpec.lang;
        const subj = L === 'PT' ? 'Sua página privada — ' + dealSpec.title : L === 'ES' ? 'Su página privada — ' + dealSpec.title : 'Your private deal room — ' + dealSpec.title;
        const body = L === 'PT'
          ? fn2 + ' — preparei uma página privada com o andamento do nosso processo: linha do tempo, documentos e próximos passos, sempre atualizados. O acesso é somente-leitura e expira em 14 dias: ' + drLink + '. Qualquer dúvida, estou à disposição.'
          : L === 'ES'
          ? fn2 + ' — preparé una página privada con el avance de nuestro proceso: cronología, documentos y próximos pasos, siempre actualizados. El acceso es de solo lectura y expira en 14 días: ' + drLink + '. Cualquier duda, quedo a su disposición.'
          : fn2 + ' — I set up a private page with where we stand: timeline, documents and next steps, always current. Access is read-only and expires in 14 days: ' + drLink + '. Any questions, I am one message away.';
        return {
          drEmailOpen: !!this.state.drEmailOpen,
          drIsEmail: this.state.drVia !== 'wa', drIsWa: this.state.drVia === 'wa',
          drSubjLabel: this.state.drVia === 'wa' ? 'Via' : 'Subject',
          drEmailToggle: () => this.setState(s => ({ drEmailOpen: (s.drVia || 'email') === 'email' ? !s.drEmailOpen : true, drVia: 'email', drEmailSent: (s.drVia || 'email') === 'email' ? s.drEmailSent : false })),
          drWaToggle: () => this.setState(s => ({ drEmailOpen: s.drVia === 'wa' ? !s.drEmailOpen : true, drVia: 'wa', drEmailSent: s.drVia === 'wa' ? s.drEmailSent : false })),
          drEmailSent: !!this.state.drEmailSent, drEmailNotSent: !this.state.drEmailSent,
          drTo: dealSpec.partyName + (this.state.drVia === 'wa' ? ' — WhatsApp on file' : ' — e-mail on file'),
          drLangTag: 'Auto · ' + L,
          drSubject: subj, drBody: body,
          drSendMeta: this.state.drVia === 'wa' ? 'goes out from your WhatsApp · logged · read receipts tracked' : 'goes out from your address · logged · opens tracked',
          drSentMsg: this.state.drVia === 'wa' ? 'Sent ✓ · logged — the agent tracks read receipts and follows up if unread in 48h.' : 'Sent ✓ · logged — the agent tracks opens and follows up if unopened in 48h.',
          drSendEmail: () => { const wa = this.state.drVia === 'wa'; this.setState({ drEmailSent: true }); this.pushAudit('Deal room · sent by ' + (wa ? 'WhatsApp' : 'e-mail') + ' — ' + dealSpec.partyName + ' · ' + dealSpec.title + ' · in ' + L + (wa ? ' · read receipts tracked' : ' · opens tracked')); this.ciToast(wa ? 'Sent — WhatsApp · read receipts tracked' : 'Sent — e-mail · opens tracked'); }
        };
      })(),
      stageSteps, intelTiles, criticalPath, compRows, momentumFactors,
      advanceStage, advLabel, advBtnStyle,
      ...(() => {
        const cur = pathToClose[effStageIdx] || pathToClose[pathToClose.length - 1] || { label:'—' };
        const mom = (intelTiles || []).find(t => /momentum/i.test(t.label || '')) || (intelTiles || [])[0] || { value:'—', note:'' };
        const gatesBase = criticalPath.slice(0, 2).map(c => ({ mark:'○', markStyle:'font-size:12px;color:#B45309;flex:none;', text:c.text, owner:c.owner, oc:(/you/i.test(c.owner) ? '#D0342C' : '#B45309') }));
        const gates = docNeedsCount > 0 && !docSent ? [...gatesBase, { mark:'○', markStyle:'font-size:12px;color:#8F8F8F;flex:none;', text:'Deal Overview — ' + docNeedsCount + ' fields still open', owner:'you', oc:'#D0342C' }] : gatesBase;
        return {
          dlStageName: String(cur.label || '—').replace('✓ ',''),
          dlStageCells: pathToClose.map(p => ({ style: 'flex:1;height:3px;border-radius:2px;background:' + (p.st === 'future' ? '#DCDCD8' : '#0D0D0D') + ';' })),
          dlStageSub: (effStageIdx + 1) + ' of ' + pathToClose.length + (nextStageName ? ' · next: ' + nextStageName : ' · final stage'),
          dlMomVal: String(mom.value || '—'),
          dlMomSub: mom.note || dealSpec.trend || '',
          dlMomHov: !!this.state.dlMomHov,
          dlMomEnter: () => this.setState({ dlMomHov: true }),
          dlMomLeave: () => this.setState({ dlMomHov: false }),
          advGatesOpen: !!this.state.advGatesOpen,
          advGatesToggle: () => this.setState(s => ({ advGatesOpen: !s.advGatesOpen })),
          advGatesClose: () => this.setState({ advGatesOpen: false }),
          advGatesTitle: nextStageName ? ('Advance to ' + nextStageName + ' — ' + gates.length + ' gate' + (gates.length === 1 ? '' : 's') + ' open') : 'Final stage reached',
          advGates: gates,
          advHasGates: gates.length > 0 && !!nextStageName,
          advNudge: () => { this.setState({ advGatesOpen: false }); this.pushAudit('Stage gates · nudges drafted — ' + dealSpec.title + ' · agent chases what is missing'); this.ciToast('Nudges drafted — agent chases the gates'); },
          advAnyway: () => { this.setState({ advGatesOpen: false }); advanceStage(); }
        };
      })(),
      ...(() => {
        const cmap = this.state.dlSecC || {};
        const mkSec = (k) => ({ open: !cmap[k], toggle: () => this.setState(s2 => ({ dlSecC: { ...(s2.dlSecC || {}), [k]: !((s2.dlSecC || {})[k]) } })), chev: cmap[k] ? '›' : '⌄' });
        const dataKeys = ['parties','review','check','fin'];
        const anyOpen2 = dataKeys.some(k => !cmap[k]);
        return { secParties: mkSec('parties'), secReview: mkSec('review'), secCheck: mkSec('check'), secDealFile: mkSec('dfile'), secDrive: mkSec('drive'), secFin: mkSec('fin'), secPlan: mkSec('plan'), secMem: mkSec('mem'), secCtNow: mkSec('ctnow'), secCtPlan: mkSec('ctplan'), secCtMem: mkSec('ctmem'),
          secPfMand: mkSec('pfmand'), secPfClass: mkSec('pfclass'), secPfId: mkSec('pfid'), secPfPref: mkSec('pfpref'), secCtRef: mkSec('ctref'),
          ...(() => { const ck = ['ctnow','ctplan','ctmem']; const anyC = ck.some(k => !cmap[k]); return { ctAllLabel: anyC ? 'Collapse all' : 'Expand all', ctAllToggle: () => this.setState(s2 => { const m2 = { ...(s2.dlSecC || {}) }; const w = ck.some(k => !m2[k]); ck.forEach(k => { m2[k] = w; }); return { dlSecC: m2 }; }) }; })(),
          ...(() => { const pk = ['pfmand','pfclass','pfid','pfpref']; const anyO = pk.some(k => !cmap[k]); return { pfAllLabel: anyO ? 'Collapse all' : 'Expand all', pfAllToggle: () => this.setState(s2 => { const m2 = { ...(s2.dlSecC || {}) }; const w = pk.some(k => !m2[k]); pk.forEach(k => { m2[k] = w; }); return { dlSecC: m2 }; }) }; })(),
          secAllLabel: anyOpen2 ? 'Collapse all' : 'Expand all',
          secAllToggle: () => this.setState(s2 => { const m2 = { ...(s2.dlSecC || {}) }; const willCollapse = dataKeys.some(k => !m2[k]); dataKeys.forEach(k => { m2[k] = willCollapse; }); return { dlSecC: m2 }; }) };
      })(),
      dealActionOptions, dealActionsOpen: !!this.state.dealActionsOpen, toggleDealActions: ()=>this.setState(s=>({dealActionsOpen:!s.dealActionsOpen})),
      isOverview: dealTab==='overview', isActivities: dealTab==='activities',
      filteredActivity: filterType ? activity.filter(a => a.type === filterType) : activity,
      tcHead, milestones, intel, deltas,
      isReports: scr==='reports', periods, repPeriods, repExport, reportKpis, funnel, production, divisionGci, sources, forecast,
      repNav: (() => { const sel = this.state.repSec || '01';
        return [['01','Overview'],['02','Pipeline & Forecast'],['04','Sources & Market'],['05','Activity'],['08','Marketing'],['07','Income'],['06','Custom Report']].map(([key,label], i) => { const on = sel === key; const num = String(i + 1).padStart(2, '0'); return { num, label,
          onClick: () => this.setState({ repSec: key }),
          rowStyle: 'display:flex;align-items:baseline;gap:10px;padding:8px 10px;margin:0 -10px;border-bottom:1px solid #E3E3E3;cursor:pointer;user-select:none;transition:background 150ms;background:' + (on ? 'rgba(255,255,255,0.62)' : 'transparent') + ';',
          numStyle: F0 + 'font-size:11px;letter-spacing:0.1em;width:20px;flex:none;font-weight:' + (on ? 500 : 200) + ';color:' + (on ? '#0D0D0D' : '#8F8F8F') + ';',
          labStyle: F0 + 'font-size:13px;font-weight:' + (on ? 600 : 400) + ';color:' + (on ? '#0D0D0D' : '#303030') + ';' }; }); })(),
      repSecFlags: (() => { const sel = this.state.repSec || '01'; const o = {}; ['01','02','04','05','06','07','08'].forEach(n => { o['s' + n] = (n === sel); }); o.sv = (sel === 'sv'); return o; })(),
      repMktKpis: [
        { label:'Conversations started', value:'47', sub:'this quarter · WhatsApp-led' },
        { label:'Tours from campaigns', value:'12', sub:'4 became active deals' },
        { label:'Pipeline influenced', value:'$34.2M', sub:'6 deals touched by marketing' },
        { label:'GCI attributed', value:'$410K', sub:'weighted to closings' }
      ],
      repMktChannels: [
        { ch:'WhatsApp · broadcast + 1:1', metric:'1,240 sent · 18% reply', w:'72%', lead:'34 conversations' },
        { ch:'Instagram', metric:'42.5K reach 30d · 1.2K saves', w:'100%', lead:'9 DMs → leads' },
        { ch:'LinkedIn', metric:'18.3K impressions', w:'44%', lead:'6 inbound' },
        { ch:'Email', metric:'41% open · 22% click', w:'30%', lead:'3 tours booked' }
      ],
      repMktAttr: [
        { campaign:'Rivage — off-market preview', chan:'IG + WhatsApp', influenced:'$18.5M', gci:'$138.8K' },
        { campaign:'June market report', chan:'WhatsApp broadcast', influenced:'$12.1M', gci:'$180K' },
        { campaign:'Bal Harbour corridor nurture', chan:'Email + IG', influenced:'$3.6M', gci:'$54K' }
      ],
      repMktContent: [
        { title:'Calm-voice walkthrough · Rivage PH', reach:'8.9K reach', saves:'420 saves' },
        { title:'Market data reel · corridor inventory −18%', reach:'6.2K reach', saves:'310 saves' },
        { title:'Broker open recap · Surfside oceanfront', reach:'3.1K reach', saves:'90 saves' }
      ],
      repMktFollow: (() => { const hs = [['Feb',3.1],['Mar',3.4],['Apr',3.9],['May',4.6],['Jun',5.2],['Jul',5.8]]; const mx = 5.8; return hs.map(h => ({ m: h[0], amt: h[1] + 'K', w: Math.round(h[1] / mx * 100) + '%' })); })(),
      ...(() => {
        const rows = [
          { key:'Continuum 2904 · Alvarez', deal:'Continuum 2904 — Alvarez', when:'Jul 18, 2026', gci:'$216K', ref:'−$54.0K', net:'$129.6K', st:'Payable · closing', c:'#0D0D0D' },
          { key:'Sterling · Acqualina 4802', deal:'Sterling — Acqualina 4802', when:'Aug 2026', gci:'$342K', ref:'—', net:'$273.6K', st:'In escrow', c:'#0D0D0D' },
          { key:'St Regis SI · Tower 2 PH · Sasson', deal:'St Regis T2 PH — Deposit 1 · 20%', when:'Jul 24, 2026', gci:'$174K', ref:'—', net:'$139.2K', st:'Armed · pro-rata §6.5', c:'#0D0D0D' },
          { key:'Rivage PH-A · Marcelo C.', deal:'Rivage · PH-A', when:'Sep 2026', gci:'$555K', ref:'−$138.8K', net:'$333.0K', st:'Projected', c:'#B45309' },
          { key:'Golden Beach Villa', deal:'Golden Beach Villa', when:'Q4 2026', gci:'$570K', ref:'−$142.5K', net:'$342.0K', st:'Projected', c:'#B45309' },
          { key:'Faena Penthouse', deal:'Faena Penthouse', when:'Oct 2026', gci:'$1.02M', ref:'—', net:'$816.0K', st:'Projected', c:'#B45309' }
        ];
        return {
          incKpis: [
            { label:'Net income · YTD', value:'$975K', sub:'collected 2026 · 5 events' },
            { label:'Payable · next 30 days', value:'$542K', sub:'3 events — Continuum · Sterling · St Regis D1' },
            { label:'Projected · in motion', value:'$2.03M', sub:'net of splits & referrals · 6 files' },
            { label:'Referral fees out', value:'$335K', sub:'committed · $54K releases next 30 days' }
          ],
          incRecv: rows.map(r => ({ ...r, refColor: r.ref === '—' ? '#B8B8B8' : '#B45309', onOpen: () => openDeal({ name: r.key }) })),
          incTotalLine: '6 open receivables · $2.88M gross · $2.03M net · $335K referral committed',
          incHist: (() => { const hs = [['Feb', 118], ['Mar', 204], ['Apr', 96], ['May', 310], ['Jun', 101], ['Jul', 146]]; const mx = 310; return hs.map(h => ({ m: h[0], amt: '$' + h[1] + 'K', w: Math.round(h[1] / mx * 100) + '%' })); })(),
          incPaid: [
            { deal:'Bal Harbour 1801 — lease', when:'Jul 08, 2026', gci:'$21K', net:'$16.8K' },
            { deal:'Portofino 2302 — Zanotti', when:'Jun 30, 2026', gci:'$126K', net:'$100.8K' },
            { deal:'Continuum South 1802', when:'May 12, 2026', gci:'$187K', net:'$149.6K' },
            { deal:'Aventura PH — resale', when:'Mar 21, 2026', gci:'$255K', net:'$204.0K' },
            { deal:'Setai 1201 — referral-sourced', when:'Dec 12, 2025', gci:'$192K', net:'$115.2K' }
          ]
        };
      })(),
      ...(() => {
        const P = this.state.crPipe || 'all'; const HH = this.state.crHeat || 'all'; const GG = this.state.crGroup || 'pipe';
        const AV = (this.state.crSaved || []).find(x => x.id === this.state.crActiveId) || null;
        const M = this.state.crMetrics || { count:true, vol:true, gci:true, wgci:true };
        const parseM = (s) => { s = String(s); if (s.includes('/mo')) return 0; const n = parseFloat(s.replace(/[^0-9.]/g,'')) || 0; return s.includes('K') ? n / 1000 : n; };
        const rows0 = Object.values(dealDb).filter(S => (P === 'all' || S.track === P) && (HH === 'all' || S.heat === HH));
        const dimOf = (S) => GG === 'pipe' ? ({ buy:'Purchases', list:'Listings', lease:'Rentals' })[S.track]
          : GG === 'source' ? String(S.src).split('·')[0].trim()
          : GG === 'lang' ? ({ PT:'Português', ES:'Español', EN:'English' })[S.lang] || S.lang
          : GG === 'heat' ? S.heat
          : TRACKS[S.track][Math.min(S.stageIdx, TRACKS[S.track].length - 1)];
        const groups = {}; rows0.forEach(S => { const k = dimOf(S); (groups[k] = groups[k] || []).push(S); });
        const fmtM = (n) => n >= 1 ? '$' + n.toFixed(1) + 'M' : '$' + Math.round(n * 1000) + 'K';
        const crAgg = Object.entries(groups).map(([k, list2]) => {
          const vol = list2.reduce((n, S) => n + parseM(S.budget), 0);
          const gci = list2.reduce((n, S) => n + parseM(S.gci), 0);
          const wg = list2.reduce((n, S) => n + parseM(S.gci) * S.prob / 100, 0);
          return { k, count: String(list2.length), vol, volStr: fmtM(vol), gciStr: fmtM(gci), wgciStr: fmtM(wg) };
        }).sort((a, b) => b.vol - a.vol);
        const totV = crAgg.reduce((n, r) => n + r.vol, 0);
        const pill2 = (on) => F0 + 'font-weight:' + (on ? 500 : 400) + ';font-size:11.5px;color:' + (on ? '#0D0D0D' : '#5D5D5D') + ';background:' + (on ? 'rgba(255,255,255,0.62)' : 'transparent') + ';border:1px solid ' + (on ? '#D9D9D9' : '#E3E3E3') + ';border-radius:999px;padding:6px 13px;cursor:pointer;user-select:none;transition:all 150ms;white-space:nowrap;';
        return {
          crPipes: [['all','All pipelines'],['buy','Purchases'],['list','Listings'],['lease','Rentals']].map(([v, l]) => ({ l, onClick: () => this.setState({ crPipe: v }), style: pill2(P === v) })),
          crHeats: [['all','Any status'],['HOT','HOT only'],['WARM','WARM only']].map(([v, l]) => ({ l, onClick: () => this.setState({ crHeat: v }), style: pill2(HH === v) })),
          crGroups: [['pipe','Pipeline'],['source','Source'],['lang','Language'],['heat','Heat'],['stage','Stage']].map(([v, l]) => ({ l, onClick: () => this.setState({ crGroup: v }), style: pill2(GG === v) })),
          crMetricChips: [['count','Deals'],['vol','Volume'],['gci','GCI'],['wgci','Weighted GCI']].map(([v, l]) => ({ l, onClick: () => this.setState(s => ({ crMetrics: { ...(s.crMetrics || M), [v]: !M[v] } })), style: pill2(!!M[v]) })),
          crShowCount: !!M.count, crShowVol: !!M.vol, crShowGci: !!M.gci, crShowWgci: !!M.wgci,
          crRows: crAgg.map(r => ({ ...r, barW: totV ? Math.round(r.vol / totV * 100) + '%' : '0%' })),
          crEmpty: crAgg.length === 0,
          svTitle: AV ? AV.name : 'Saved view',
          svEdit: () => this.setState({ repSec: '06' }),
          svRemove: () => { if (!AV) return; const av = AV; this.setState(s => ({ crSaved: (s.crSaved || []).filter(x => x.id !== av.id), repSec: '06', crActiveId: null })); this.pushAudit('Custom report · saved view removed — ' + av.name); this.ciToast('Removed — ' + av.name); },
          crSummary: rows0.length + ' deals · ' + fmtM(totV) + ' volume — grouped by ' + ({ pipe:'pipeline', source:'source', lang:'language', heat:'heat', stage:'stage' })[GG],
          crSave: () => {
            const nm = ({ all:'All pipelines', buy:'Purchases', list:'Listings', lease:'Rentals' })[P] + (HH === 'all' ? '' : ' · ' + HH) + ' by ' + ({ pipe:'pipeline', source:'source', lang:'language', heat:'heat', stage:'stage' })[GG];
            if ((this.state.crSaved || []).some(v => v.name === nm)) { this.ciToast('Already saved — see Saved views'); return; }
            const vid = Date.now(); this.setState(s => ({ crSaved: [ ...(s.crSaved || []), { id: vid, name: nm, P, HH, GG, M } ], crActiveId: vid, repSec: 'sv' }));
            this.pushAudit('Custom report · view saved — ' + nm + ' · pinned under Report categories');
            this.ciToast('Saved — ' + nm);
          },
          crHasSaved: (this.state.crSaved || []).length > 0,
          crSavedRows: (this.state.crSaved || []).map(v => { const on = this.state.repSec === 'sv' && this.state.crActiveId === v.id;
            return { name: v.name,
              rowStyle: 'display:flex;align-items:center;gap:8px;padding:8px 10px;margin:0 -10px;border-bottom:1px solid #E3E3E3;cursor:pointer;user-select:none;transition:background 150ms;background:' + (on ? 'rgba(255,255,255,0.62)' : 'transparent') + ';',
              nameStyle: F0 + 'flex:1;min-width:0;font-size:12px;font-weight:' + (on ? 600 : 400) + ';color:' + (on ? '#0D0D0D' : '#303030') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
              onLoad: () => this.setState({ crPipe: v.P, crHeat: v.HH, crGroup: v.GG, crMetrics: v.M, repSec: 'sv', crActiveId: v.id }),
              onRemove: (e) => { e.stopPropagation(); this.setState(s => ({ crSaved: (s.crSaved || []).filter(x => x.id !== v.id), ...(s.crActiveId === v.id ? { repSec: '06', crActiveId: null } : {}) })); this.ciToast('Removed — ' + v.name); } }; }),
          crExport: () => { this.pushAudit('Custom report · exported — PDF'); this.ciToast('Exported — PDF ready'); }
        };
      })(),
      actvMetrics, actvScopeNote, actvTotalLabel: actvCur.total, actvNote: actvCur.note,
      velocity, priceBands, geography, lossReasons, assetMix, topDeals,
      isContacts: scr==='contacts', isContact: scr==='contact', isNext: scr==='next',
      ...(()=>{
        const defs = [
          { id:'marcelo', name:'Marcelo Carvalho', value:'$412K wGCI', lang:'PT', subject:'2nd visit + developer schedule', plan:'Confirm Saturday 11am · attach construction timeline', draft:'Marcelo — consegui o cronograma de obra do PH-A. Sábado 11h para a segunda visita? Levo o schedule de depósitos também.' },
          { id:'bittencourt', name:'Ana Bittencourt', value:'referral engine', lang:'PT', subject:'referral ask · 94 days since close', plan:'Give first, then ask · one named introduction', draft:'Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?' },
          { id:'keller', name:'Anton Keller · Zurich FO', value:'$504K wGCI', lang:'EN', subject:'principal call before Wednesday', plan:'15-min call · align Golden Beach counter window', draft:'Anton — the Golden Beach window is moving. 15 minutes tomorrow to align the counter before Wednesday?' },
          { id:'sterling', name:'Robert Sterling', value:'$530K wGCI', lang:'EN', subject:'inspection ends today', plan:'Same-day summary · HOA package next', draft:'Robert — inspection wraps today. Summary tonight, and we file the HOA package right after. Nothing needed from you yet.' },
          { id:'nakamura', name:'Yuki Nakamura', value:'$400K wGCI', lang:'EN', subject:'closing Jul 30 · walk-through', plan:'Confirm walk-through Jul 28 · verify wire by phone', draft:'Yuki — walk-through July 28, 10am works? Wire instructions confirmed by the title company by phone — never trust the emailed version.' },
          { id:'duarte', name:'Duarte Family Office', value:'$15M mandate', lang:'PT', subject:'Doral teaser · 48h follow-up', plan:'Offer site visit this week', draft:'Fernando — o teaser de Doral: vale 20 minutos? Consigo organizar a visita ao site ainda esta semana.' },
          { id:'fontes', name:'Isabela Fontes', value:'new · inbound', lang:'PT', subject:'welcome + qualify', plan:'Warm welcome · discovery slot', draft:'Isabela — bem-vinda! Aqui é o Wictor. Me conta o que você procura em Miami — café ou uma call rápida esta semana?' },
          { id:'zanotti', name:'Paolo Zanotti', value:'closed 2025', lang:'EN', subject:'purchase anniversary', plan:'Anniversary note · quiet cross-sell radar', draft:'Paolo — one year at Portofino this week. How is the residence treating you? A few quiet things nearby worth seeing on your next visit.' }
        ];
        const sent = this.state.ttSent || {};
        const sel = this.state.ttSel || {};
        const drafts = this.state.ttDrafts || {};
        const open = this.state.ttSecOpen !== false;
        const remaining = defs.filter(d => !sent[d.id]);
        const selIds = defs.filter(d => sel[d.id] && !sent[d.id]).map(d => d.id);
        const sendIds = (ids, how) => { if (!ids.length) return; const map = { ...sent }; ids.forEach(i => map[i] = true); this.setState({ ttSent: map, ttSel: {} }); this.pushAudit('WhatsApp · ' + ids.length + ' message(s) approved ' + how + ' — agent sending 1:1 in sequence, each in the contact\u2019s language · all logged'); this.ciToast(ids.length === 1 ? 'Sent — WhatsApp 1:1 · logged' : ids.length + ' approved — agent is sending 1:1 · logged'); };
        return {
          ttSec: { open, closed: !open,
            toggle: ()=>this.setState({ ttSecOpen: !open }),
            chevStyle: 'font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:300;font-size:15px;color:#8F8F8F;flex:none;display:inline-block;transition:transform 150ms;transform:rotate(' + (open ? 90 : 0) + 'deg);',
            badge: remaining.length + ' to send', summary: remaining.length + ' drafts staged — approve and the agent sends' },
          ttRows: defs.map(d => { const isSent = !!sent[d.id]; const isSel = !!sel[d.id];
            return { name: d.name, value: d.value, lang: d.lang, subject: '— ' + d.subject, plan: d.plan,
              draftVal: drafts[d.id] ?? d.draft,
              onDraft: (e)=>{ const v = e.target.value; this.setState(s=>({ ttDrafts: { ...(s.ttDrafts||{}), [d.id]: v } })); },
              onSel: ()=>{ if (isSent) return; this.setState(s=>({ ttSel: { ...(s.ttSel||{}), [d.id]: !isSel } })); },
              onApprove: ()=>{ if (!isSent) sendIds([d.id], 'individually'); },
              checkMark: isSel ? '✓' : '',
              checkStyle: 'width:16px;height:16px;flex:none;margin-top:2px;border:1px solid ' + (isSel ? '#0D0D0D' : '#C9C9C9') + ';border-radius:5px;background:' + (isSel ? '#0D0D0D' : 'transparent') + ';color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;cursor:' + (isSent ? 'default' : 'pointer') + ';transition:all 150ms;',
              status: isSent ? 'Sent ✓' : 'Draft ready', stColor: isSent ? '#10A37F' : '#8F8F8F',
              rowOpacity: isSent ? '0.55' : '1',
              btnLabel: isSent ? 'Sent ✓' : 'Approve & send',
              btnStyle: 'flex:none;border-radius:999px;padding:8px 14px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:500;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;transition:opacity 150ms;' + (isSent ? 'background:transparent;border:1px solid #E3E3E3;color:#8F8F8F;cursor:default;' : 'background:#E9E8E4;border:1px solid #E0DFDA;color:#0D0D0D;cursor:pointer;') };
          }),
          ttMeta: remaining.length + ' to touch today · ' + (defs.length - remaining.length) + ' sent — agent interpreted each subject, planned and drafted',
          ttSelCount: String(selIds.length), hasTtSel: selIds.length > 0,
          hasTtRemaining: remaining.length > 0,
          ttApproveSel: ()=>sendIds(selIds, 'in bulk'),
          ttApproveAll: ()=>sendIds(remaining.map(d=>d.id), 'in bulk — all remaining')
        };
      })(),
      ...(()=>{
        const defs = [
          { id:'l1', src:'Call · Marcelo — Jul 05', text:'Budget ceiling confirmed at $18.5M, cash. Update the deal record?', save:'Update deal', audit:'Learned → filed · Rivage PH-A ceiling $18.5M cash (source: call Jul 05)' },
          { id:'l2', src:'WhatsApp · Keller — Jul 04', text:'Mentions selling the Zurich apartment in Q1 27 — capital incoming. Create an opportunity signal?', save:'Create signal', audit:'Learned → signal created · Keller liquidity event Q1 27 — agent watches' },
          { id:'l3', src:'Email · Bittencourt — Jul 03', text:'“Meu sócio Rafael procura casa em Key Biscayne.” Create the lead with an intro draft?', save:'Create lead', audit:'Learned → lead created · Rafael (via Bittencourt) — Key Biscayne · intro draft staged' },
          { id:'l4', src:'Showing feedback — Jul 02', text:'Marcelo prefers high floors and west light. Save to preferences?', save:'Save to profile', audit:'Learned → preference saved · Marcelo — high floors · west light (source logged)' } ];
        const doneMap = this.state.intelLearn || {};
        const rows = defs.filter(d => !doneMap[d.id]).map(d => ({ src: d.src, text: d.text, saveLabel: d.save,
          onSave: ()=>{ this.setState(s=>({ intelLearn: { ...(s.intelLearn||{}), [d.id]: true } })); this.pushAudit(d.audit); this.ciToast('Filed — source logged'); },
          onDismiss: ()=>this.setState(s=>({ intelLearn: { ...(s.intelLearn||{}), [d.id]: true } })) }));
        return { lnRows: rows, lnCount: String(rows.length), lnEmpty: rows.length === 0, hasLn: rows.length > 0 };
      })(),
      naSec: (()=>{ const open = this.state.naSecOpen !== false; return {
        open, closed: !open,
        toggle: ()=>this.setState({ naSecOpen: !open }),
        chevStyle: 'font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:300;font-size:15px;color:#8F8F8F;flex:none;display:inline-block;transition:transform 150ms;transform:rotate(' + (open ? 90 : 0) + 'deg);',
        badge: String((((naSummary||[])[0])||{}).value || ''), hasBadge: !!(((naSummary||[])[0])||{}).value,
        summary: 'tasks + agent proposals — drafts staged, agent chases the rest' }; })(),
      naFilters, naGroups, naSummary, naAllClear: naGroups.length === 0, ...naQuickVals, naProposals, hasNaProposals, naProposalCount, naSequences, hasNaSequences,
      naAudit: this.state.naAudit || [], hasNaAudit: !!(this.state.naAudit && this.state.naAudit.length),
      isActivitiesPage: scr==='activities' || scr==='inbox', gactFilters, actFeed: gactDates, actBand,
      rangeLabel, rangeOptions, rangeOpen: !!this.state.gactRangeOpen, toggleRange: ()=>this.setState(s=>({gactRangeOpen:!s.gactRangeOpen})),
      actModes, isInbox: scr==='inbox', isActivityMode: scr==='activities',
      agDays: [
        { label:'Today · Mon Jul 06', rows:[
          { time:'09:30', what:'Inspection window opens — Sterling · Acqualina 4802', who:'vendor on site · TC tracking', st:'Tracked', stC:'#B45309', dot:'#B45309' },
          { time:'11:00', what:'Call · Anton Keller — Golden Beach counter', who:'15 min · agenda drafted by the agent', st:'Confirmed', stC:'#10A37F', dot:'#0D0D0D' },
          { time:'15:00', what:'Listing consult — Fisher Island Villa', who:'seller lead · valuation pack ready', st:'Confirmed', stC:'#10A37F', dot:'#0D0D0D' },
          { time:'18:30', what:'Preview · Rivage PH-A — buyer via attorney', who:'NDA on file · watermarked dossier', st:'Quiet', stC:'#8F8F8F', dot:'#8F8F8F' } ] },
        { label:'Tomorrow · Tue Jul 07', rows:[
          { time:'10:00', what:'Tour · Faena Residence 9B — rental', who:'tenant · access confirmed with building', st:'Confirmed', stC:'#10A37F', dot:'#0D0D0D' },
          { time:'14:00', what:'Deadline · inspection period ends — Sterling', who:'summary auto-drafts on close', st:'Deadline', stC:'#D0342C', dot:'#D0342C' } ] },
        { label:'This week', rows:[
          { time:'Jul 09', what:'2nd visit · Marcelo — Rivage PH-A', who:'Sat 11:00 proposed · awaiting confirm', st:'Pending', stC:'#B45309', dot:'#B45309' },
          { time:'Jul 11', what:'HOA package due — Sterling', who:'T-3 chase armed', st:'Deadline', stC:'#D0342C', dot:'#D0342C' },
          { time:'Jul 15', what:'Phase II environmental — Zurich FO · 1031', who:'day 38 of 45 · vendor confirmed', st:'Tracked', stC:'#B45309', dot:'#B45309' } ] }
      ].map(d => ({ ...d, count: String(d.rows.length) })),
      agAddOpen: !!this.state.agAddOpen,
      toggleAgAdd: ()=>this.setState(s=>({ agAddOpen: !s.agAddOpen })),
      agNewVal: this.state.agNewVal || '',
      onAgNew: (e)=>this.setState({ agNewVal: e.target.value }),
      addAgTask: ()=>{ const v = (this.state.agNewVal||'').trim(); if (!v) return; const item = { id: 'agn' + Date.now(), t: v, due: '—', who: 'You · quick add' }; this.setState(s=>({ agNew: [item, ...(s.agNew||[])], agNewVal: '' })); this.pushAudit('Task created · \u201C' + v + '\u201D — agent will slot, schedule and chase it'); this.ciToast('Task added — the agent will chase it'); },
      onAgNewKey: (e)=>{ if (e.key !== 'Enter') return; const v = (this.state.agNewVal||'').trim(); if (!v) return; const item = { id: 'agn' + Date.now(), t: v, due: '—', who: 'You · quick add' }; this.setState(s=>({ agNew: [item, ...(s.agNew||[])], agNewVal: '' })); this.pushAudit('Task created · \u201C' + v + '\u201D — agent will slot, schedule and chase it'); this.ciToast('Task added — the agent will chase it'); },
      agTasks: (()=>{ const flat = []; Object.entries(contactTasks).forEach(([cid, list]) => list.forEach((x, i) => flat.push({ id: cid + '-t' + i, t: x.t, due: x.due, who: ((contacts.find(c => c.id === cid) || {}).name) || cid }))); const all = [ ...((this.state.agNew)||[]), ...flat ]; const hov = this.state.agHover; return all.map(x => {
        const done = !!((this.state.doneAct||{})[x.id]);
        const cmtOpen = !!((this.state.agCmtOpen||{})[x.id]);
        const comments = ((this.state.agCmts||{})[x.id]) || [];
        const dueLbl = ((this.state.agDue||{})[x.id]) || x.due;
        const shift = (days) => { const mm = /([A-Za-z]{3}) (\d+)/.exec(dueLbl); const mon = mm ? mm[1] : 'Jul'; const nd = (mm ? parseInt(mm[2],10) : 8) + days; const lbl = mon + ' ' + nd; this.setState(s=>({ agDue: { ...(s.agDue||{}), [x.id]: lbl } })); this.pushAudit('Task rescheduled · \u201C' + x.t + '\u201D → ' + lbl + ' — agent re-slots the chase'); this.ciToast('Rescheduled to ' + lbl + ' — agent updated the chase'); };
        return { ...x, done, due: dueLbl,
          onToggle: ()=>this.toggleActDone(x.id),
          checkBg: done ? '#0D0D0D' : 'transparent', color: done ? '#8F8F8F' : '#0D0D0D', deco: done ? 'line-through' : 'none',
          onEnter: ()=>this.setState({ agHover: x.id }), onLeave: ()=>this.setState({ agHover: null }),
          showBar: hov === x.id || cmtOpen,
          doneLabel: done ? 'Reopen' : '✓completed',
          onDone: ()=>{ this.toggleActDone(x.id); this.ciToast(done ? 'Reopened — back on the list' : 'Completed — logged to the audit'); },
          onRe1: ()=>shift(1), onRe3: ()=>shift(3), onReW: ()=>shift(7),
          onCmt: ()=>this.setState(s=>({ agCmtOpen: { ...(s.agCmtOpen||{}), [x.id]: !cmtOpen } })),
          cmtOpen, comments,
          cmtVal: ((this.state.agCmtVal||{})[x.id]) || '',
          onCmtVal: (e)=>{ const v = e.target.value; this.setState(s=>({ agCmtVal: { ...(s.agCmtVal||{}), [x.id]: v } })); },
          onCmtKey: (e)=>{ if (e.key !== 'Enter') return; const v = (((this.state.agCmtVal||{})[x.id]) || '').trim(); if (!v) return; this.setState(s=>({ agCmts: { ...(s.agCmts||{}), [x.id]: [ ...(((s.agCmts||{})[x.id]) || []), v ] }, agCmtVal: { ...(s.agCmtVal||{}), [x.id]: '' } })); this.pushAudit('Comment on task · \u201C' + x.t + '\u201D — ' + v); this.ciToast('Comment saved — agent reads it for context'); }
        }; }); })(),
      threads, activeThread, channelFilters,
      threadSearch: this.state.threadSearch || '', setThreadSearch:(e)=>this.setState({threadSearch:e.target.value}),
      chatInput: this.state.chatInput || '', setChatInput:(e)=>this.setState({chatInput:e.target.value}),
      onChatKey:(e)=>{ if(e.key==='Enter'){ e.preventDefault(); this.sendMsg(); } }, sendMsg:()=>this.sendMsg(),
      quickReplies, qrLangLabel, threadsEmpty: threads.length === 0, clearThreadFilters: ()=>this.setState({ inboxChannel:'all', threadSearch:'' }),
      logOpen: !!this.state.logOpen, toggleLog: ()=>this.setState(s=>({logOpen:!s.logOpen})),
      logTypeOptions, logName: this.state.logName || '', logBody: this.state.logBody || '',
      setLogName: (e)=>this.setState({logName:e.target.value}), setLogBody: (e)=>this.setState({logBody:e.target.value}),
      submitLog: ()=>this.submitLog(),
      contactSegments, contactList, contactCount: contactList.length, contactHead,
      ctGridStyle, ctColMenuOpen, toggleColMenu, ctColMenuItems, ctColMenuEmpty, ...gcVals,
      contactViews, isQueueView, isDirView, queueRows, queueOpenCount, queueDoneCount, queueAllDone, goActivities: ()=>this.nav('activities'),
      queueGroups, qBudgetLine, qDefendedLine,
      ct, contactTabs, contactTabsA: contactTabs.slice(0,2), contactTabsB: contactTabs.slice(2), cStats, cFields, contactDash,
      briefOpen, toggleBrief, briefFor, briefSections, briefObjective,
      prefBeds: px.beds, prefBaths: px.baths, prefSqft: px.sqft, prefNotes: px.notes,
      ctTasks, ctTasksOpen: String(ctTasksOpen), ctNoTasks: ctTasks.length === 0, openQcTask: ()=>this.setState({qcOpen:true, qcType:'task'}),
      ctCal, hasCtCal: ctCal.length > 0, ctCalCount: String(ctCal.length), ctEmails, hasCtEmails: ctEmails.length > 0, ctEmailCount: String(ctEmails.length),
      openQcLog: ()=>this.setState({qcOpen:true, qcType:'log'}), openQcAppt: ()=>this.setState({qcOpen:true, qcType:'appt'}), openQcDeal: ()=>this.setState({qcOpen:true, qcType:'deal'}),
      logTouchOptions, logTouchOpen: !!this.state.logTouchOpen, toggleLogTouch: ()=>this.setState(s=>({logTouchOpen:!s.logTouchOpen})),
      cOverview: false, cContact: ctFile || cTabN==='contact', cProperty: cTabN==='property', cActivities: ctFile || cTabN==='activities', cShowings: cTabN==='showings', cDeals: ctFile || cTabN==='deals',
      ...(()=>{
        const ACC = { Call:'#303030', WhatsApp:'#D0342C', Message:'#D0342C', Email:'#10A37F', Showing:'#B45309', Note:'#5D5D5D', Task:'#0D0D0D' };
        const CATS = [['all','All',null],['Call','Calls',['Call']],['WhatsApp','Messages',['WhatsApp','Message']],['Email','Emails',['Email']],['Showing','Showings',['Showing']],['Note','Notes',['Note']]];
        const flt = this.state.ctActFilter || 'all';
        const srt = this.state.ctActSort || 'newest';
        const touches = (ct.touches || []).map((t,i)=>({ ...t, _i:i, accent: ACC[t.type] || '#0D0D0D' }));
        const inCat = (t, types)=> !types || types.includes(t.type);
        let list = touches.filter(t=>inCat(t, (CATS.find(c=>c[0]===flt)||[])[2]));
        const parseD = (d)=>{ const dt = Date.parse(d); return isNaN(dt) ? 0 : dt; };
        if (srt==='newest') list = list.slice().sort((a,b)=> (parseD(b.date)-parseD(a.date)) || (b._i-a._i));
        else if (srt==='oldest') list = list.slice().sort((a,b)=> (parseD(a.date)-parseD(b.date)) || (a._i-b._i));
        else if (srt==='type') list = list.slice().sort((a,b)=> (a.type||'').localeCompare(b.type||''));
        const rowBase = "display:flex;align-items:center;justify-content:space-between;padding:9px 16px;cursor:pointer;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12.5px;color:#0D0D0D;";
        const ctActFilterRows = CATS.map(([id,label,types])=>{ const on = flt===id; const cnt = types? touches.filter(t=>inCat(t,types)).length : touches.length;
          return { label, count:String(cnt), mark: on?'\u2713':'', onClick:()=>this.setState({ctActFilter:id, ctActMenuOpen:false}),
            style: rowBase + 'font-weight:'+(on?600:400)+';' }; });
        const SORTS = [['newest','Newest first'],['oldest','Oldest first'],['type','By type']];
        const ctActSortRows = SORTS.map(([id,label])=>{ const on = srt===id;
          return { label, mark: on?'\u2713':'', onClick:()=>this.setState({ctActSort:id, ctActMenuOpen:false}),
            style: rowBase + 'font-weight:'+(on?600:400)+';' }; });
        const _flabel = (CATS.find(c=>c[0]===flt)||['','All'])[1];
        return { ctActFilterRows, ctActSortRows, ctActFiltered:list, ctActEmpty:list.length===0,
          ctActResultLabel: list.length + (flt==='all'?' activities':' \u00b7 '+_flabel.toLowerCase()),
          ctActActive: (flt!=='all' || srt!=='newest'),
          ctActFilterLabel: (_flabel||'').toLowerCase().replace(/s$/,''),
          ctActMenuOpen: !!this.state.ctActMenuOpen, toggleCtActMenu: ()=>this.setState(s=>({ctActMenuOpen:!s.ctActMenuOpen})),
          ctNewEmail: ()=>this.setState({ screen:'activities', logOpen:true, logType:'Email', logName:ct.name, logBody:'', logTouchOpen:false }),
          ctNewWhatsApp: ()=>this.setState({ screen:'activities', logOpen:true, logType:'WhatsApp', logName:ct.name, logBody:'', logTouchOpen:false }) };
      })(),
      ctDealCards: (ct.deals||[]).map(d => {
        const facts = [
          d.side && { l:'Side', v:d.side },
          d.prob && { l:'Probability', v:d.prob },
          d.wgci && { l:'Weighted GCI', v:d.wgci },
          d.close && { l:'Close', v:d.close },
          d.financing && { l:'Financing', v:d.financing },
          d.source && { l:'Source', v:d.source },
        ].filter(Boolean);
        return { ...d, facts, hasFacts: facts.length>0,
          hasSpecs: !!d.specs, specsLine: [d.specs, d.ppsf].filter(Boolean).join('  ·  '),
          hasNext: !!d.next, onClick: ()=>this.nav('deal') };
      }),
      ctPersonalOpen: true,
      ctPersonalChevron: this.state.ctPersonalOpen ? '▴' : '▾',
      toggleCtPersonal: ()=>this.setState(s=>({ ctPersonalOpen: !s.ctPersonalOpen })),
      ctEnrichReady: enSt==='ready', ctEnrichRows: enrichRows,
      startEnrich: ()=>{ if (enSt==='running' || enSt==='ready') return; this.setState({ ctEnrich:'running' }); clearTimeout(this._enT); this._enT = setTimeout(()=>this.setState({ ctEnrich:'ready' }), 1400); },
      applyEnrich: ()=>{ this.setState({ ctEnrich:'applied' }); this.pushAudit('Contact · ' + enName + ' enriched from public sources — company, title, work phone, LinkedIn + 1 profile note · sources logged'); this.ciToast('Enriched — 5 fields updated · sources logged'); },
      dismissEnrich: ()=>this.setState({ ctEnrich:'idle' }),
      enrichBtnLabel: enSt==='running' ? 'Scanning LinkedIn + public sources…' : enSt==='ready' ? 'Review 5 findings ↓' : enSt==='applied' ? 'Enriched ✓' : '✦ Enrich · agent',
      enrichBtnStyle: 'border-radius:999px;padding:7px 15px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;font-weight:400;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;transition:all 150ms;white-space:nowrap;' + (enSt==='idle' ? 'background:#E9E8E4;border:1px solid #E0DFDA;color:#0D0D0D;' : enSt==='ready' ? 'background:transparent;border:1px solid #0D0D0D;color:#0D0D0D;' : 'background:transparent;border:1px solid #E3E3E3;color:#8F8F8F;cursor:default;'),
      enCompany: enApplied ? enrichData.company : '', enTitle: enApplied ? enrichData.title : '', enWorkPhone: enApplied ? enrichData.workPhone : '', enLinkedin: enApplied ? enrichData.linkedin : '', enIndustry: enApplied ? enrichData.industry : '',
      ...ctWorkVals,
      propFields, nameMenuOpen: !!this.state.nameMenuOpen, toggleNameMenu: ()=>this.setState(s=>({nameMenuOpen:!s.nameMenuOpen})),
      nameMenuQuery: this.state.nameMenuQuery || '',
      setNameMenuQuery: (e)=>this.setState({nameMenuQuery: e.target.value}),
      ...(()=>{ const q=(this.state.nameMenuQuery||'').trim().toLowerCase();
        const filtered = q ? contacts.filter(c=>(c.name+' '+(c.relationship||'')+' '+(c.location||'')).toLowerCase().includes(q)) : contacts;
        return {
          nameMenuEmpty: filtered.length===0,
          nameMenuList: filtered.map(c=>({ name:c.name, relationship:c.relationship, dot:c.dot, isActive:c.id===ct.id,
            onClick:()=>this.openContact(c.id),
            rowStyle:`display:flex;align-items:center;gap:11px;padding:10px 16px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.05);background:${c.id===ct.id?'#ECECEC':'transparent'};transition:background 150ms;` })),
        }; })(),
      amenityChips: (()=>{ const AMEN=['Pool','Private Gym','Elevator','24/7 Security','Waterfront','Sea / Water View','Home Office','Wine Cellar','Staff Quarters','Smart Home','Private Garden','Rooftop Terrace','Concierge','EV Charging','Guest Suite','Home Theater','Beach Access','Helipad']; const sel=this.state.propAmenities||{}; return AMEN.map(a=>{ const on=!!sel[a]; return { label:a, active:on, chipStyle:'cursor:pointer;user-select:none;padding:8px 15px;font-family:system-ui,sans-serif;font-weight:400;font-size:13px;letter-spacing:0.04em;border:0.5px solid '+(on?'#0D0D0D':'#8F8F8F')+';background:'+(on?'#0D0D0D':'transparent')+';color:'+(on?'#FFFFFF':'#5D5D5D')+';transition:all 0.15s;', onClick:()=>this.setState(s=>{ const m={...(s.propAmenities||{})}; m[a]=!m[a]; return {propAmenities:m}; }) }; }); })(),
      runMlsMatch: ()=>{ this.setState({contactTab:'mlsmatch', nameMenuOpen:false, scOpen:false}); this.pushAudit('MLS Match · sweep re-run against updated criteria — results refreshed'); },
      cMlsMatch: cTabN==='mlsmatch',
      ...(()=>{
        const sel = this.state.mlsSel || {};
        const auto = !!(this.state.mlsAutoSend || {})[ct.id];
        const langMap = { marcelo:'PT', duarte:'PT', bittencourt:'PT', fontes:'PT', keller:'EN', sterling:'EN', nakamura:'EN', zanotti:'EN' };
        const langField = String((this.state.ctFieldVals||{})[ct.id + '|langs'] || '');
        const langHit = langField.match(/PT|EN|ES|FR|DE|IT|JP/i);
        const ctLang = (langHit ? langHit[0].toUpperCase() : '') || langMap[ct.id] || 'EN';
        const DEF = [
          { id:'m1', addr:'8842 Ocean Drive · Golden Beach', price:'$24.5M', specs:'6 bd · 8 ba · 11,200 sqft · Waterfront', tagline:'Turn-key contemporary · 118 ft of frontage · deep-water dock', match:'96%', isNew:true, grad:'linear-gradient(135deg,#2E3A34,#5C6B60)' },
          { id:'m2', addr:'12 Indian Creek Island Rd', price:'$41.0M', specs:'7 bd · 9 ba · 15,400 sqft · Waterfront estate', tagline:'Gated island · private beach · full staff quarters', match:'92%', isNew:true, grad:'linear-gradient(135deg,#3A342E,#6B6055)' },
          { id:'m3', addr:'305 Ocean Blvd · Golden Beach', price:'$18.9M', specs:'5 bd · 6 ba · 8,600 sqft · Contemporary', tagline:'Turn-key · rooftop pool · smart-home throughout', match:'88%', isNew:false, grad:'linear-gradient(135deg,#2E333A,#556070)' },
          { id:'m4', addr:'720 Aqua Ave · Miami Beach', price:'$16.2M', specs:'5 bd · 7 ba · 7,900 sqft · New construction', tagline:'Sea view · elevator · wine cellar · private garden', match:'84%', isNew:false, grad:'linear-gradient(135deg,#332E3A,#605570)' },
        ];
        const items = DEF.map(m => {
          const on = !!sel[m.id];
          return { ...m,
            onToggle: ()=>this.setState(s=>{ const x={...(s.mlsSel||{})}; x[m.id]=!x[m.id]; return { mlsSel:x }; }),
            rowStyle:`cursor:pointer;display:flex;align-items:center;gap:20px;padding:16px;border:0.5px solid ${on?'#0D0D0D':'#E3E3E3'};background:${on?'#FCFCFC':'transparent'};transition:border-color 150ms;`,
            checkStyle:`width:20px;height:20px;flex:none;border:1px solid ${on?'#0D0D0D':'#8F8F8F'};background:${on?'#E9E8E4':'transparent'};color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:11px;`,
            checkMark: on ? '✓' : '',
            imgStyle:`flex:none;width:120px;height:80px;background:${m.grad};`,
            newBadgeStyle: m.isNew ? `margin-top:8px;display:inline-block;background:#E9E8E4;color:#0D0D0D;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:400;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;padding:2px 6px;` : 'display:none;' };
        });
        const selCount = items.filter(i=>sel[i.id]).length;
        if (scr !== 'contact') return {};
        return {
          mlsMatches: items,
          mlsLang: ctLang,
          mlsLangNote: 'agent drafts in ' + ctLang + ' — identified from the profile',
          mlsNewCount: DEF.filter(m=>m.isNew).length,
          mlsSelCount: selCount,
          mlsAutoOn: auto,
          toggleMlsAuto: ()=>{ this.pushAudit('MLS Match · delivery mode for ' + ct.name + ' set to ' + (auto ? 'Needs Decision' : 'Auto-send') + (auto ? '' : ' — authorized by principal, logged')); this.setState(s=>({ mlsAutoSend: { ...(s.mlsAutoSend||{}), [ct.id]: !auto } })); },
          mlsModeNeedsStyle: `cursor:pointer;padding:7px 13px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${auto?400:600};font-size:10px;letter-spacing:0.05em;text-transform:uppercase;border:0.5px solid ${auto?'#E3E3E3':'#0D0D0D'};background:${auto?'transparent':'#ECECEC'};color:${auto?'#8F8F8F':'#0D0D0D'};transition:all 150ms;white-space:nowrap;`,
          mlsModeAutoStyle: `cursor:pointer;padding:7px 13px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:${auto?600:400};font-size:10px;letter-spacing:0.05em;text-transform:uppercase;border:0.5px solid ${auto?'#0D0D0D':'#E3E3E3'};background:${auto?'#ECECEC':'transparent'};color:${auto?'#0D0D0D':'#8F8F8F'};transition:all 150ms;white-space:nowrap;`,
          mlsModeNote: auto ? 'Auto-send authorized for this lead — curated suggestions go out without approval · 10s undo · every send logged' : 'Default — every suggestion waits in Needs Your Decision',
          mlsAckMsg: this.state.mlsAck || '',
          mlsSuggest: ()=>{ if(selCount) this.pushAudit('MLS Match · ' + (auto ? 'suggestion AUTO-SENT to ' : 'curated suggestion drafted for ') + ct.name + ' — ' + selCount + ' listing(s) · drafted in ' + ctLang + ' (profile language)' + (auto ? ' · touch logged · cadence reset' : ', queued for approval')); this.setState(s=>({ mlsAck: selCount ? (auto ? `Sent via WhatsApp — auto-send is authorized for this lead. ${selCount} listing${selCount>1?'s':''} + private preview page delivered; touch logged, cadence clock reset, matches marked “suggested”. Undo · 10s.` : `Curated draft prepared (${selCount} listing${selCount>1?'s':''}) — message in your voice + private preview page on arraescollection.com. Queued in Needs Your Decision; on approval it sends via WhatsApp, logs the touch and resets the cadence clock.`) : 'Select one or more listings first.' })); },
          mlsShowing: ()=>{ if(!selCount){ this.setState({ mlsAck:'Select one or more listings first.' }); return; } this.pushAudit('MLS Match · tour drafted for ' + ct.name + ' — ' + selCount + ' stop(s), access requests queued'); this.setState({ contactTab:'showings', qcToast:'Tour drafted · ' + selCount + ' stop(s) — opening Tour Planner' }); clearTimeout(this._qcT); this._qcT = setTimeout(()=>this.setState({qcToast:null}), 2800); },
        };
      })(),
      ctShowings, ctShowingsCount: ctShowings.length, ctNoShowings: ctShowings.length === 0,
      ctShowCoord, hasCtShowCoord: ctShowCoord.length > 0, ...tourVals,
      goContacts: ()=>this.nav('contacts')
    };
  }
}
