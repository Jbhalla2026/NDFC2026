  /* ═══════════════════════════════════════════
     FIREBASE — live jackpot sync for all visitors
  ═══════════════════════════════════════════ */
  const firebaseConfig = {
    apiKey           : "AIzaSyBKQwswP5EyGCPj0XNJIU9NCgVfAYyOqlQ",
    authDomain       : "ndfc-barca-5050.firebaseapp.com",
    databaseURL      : "https://ndfc-barca-5050-default-rtdb.firebaseio.com",
    projectId        : "ndfc-barca-5050",
    storageBucket    : "ndfc-barca-5050.firebasestorage.app",
    messagingSenderId: "52807188546",
    appId            : "1:52807188546:web:381733d2e5f5866139addb"
  };
  firebase.initializeApp(firebaseConfig);
  const db             = firebase.database();
  const tickRef        = db.ref('tickets');
  const historyRef     = db.ref('salesHistory');
  const nextTicketRef  = db.ref('nextTicketNumber'); // tracks next available ticket number

  /* ═══════════════════════════════════════════
     CONFIG — update these values before going live
  ═══════════════════════════════════════════ */
  const ADMIN_PW        = 'ndfc2025';
  const ETRANSFER_EMAIL = 'jay' + '\u0040' + 'jayshiv.ca';
  const SHARE_URL       = 'https://ndfc-2027.vercel.app/';
  const SHARE_MSG       = 'Support the NDFC Barca U14 team on their trip to Italy!\nBuy a 50/50 raffle ticket — the winner takes half the pot. Tickets from just $10.\nDraw closes Aug 31, 2027.\n\n' + SHARE_URL;
  const TOTAL_TIKS      = 5000;

  const EJS_PUBLIC_KEY  = '7koDYtcFhB_xaIWZY';
  const EJS_SERVICE_ID  = 'service_1dyt9bj';
  const EJS_TEMPLATE_ID = 'template_xt2yapb';
  /* ═══════════════════════════════════════════ */

  let unlocked = false;
  let selectedTix = 0, selectedPrice = 0;

  const fmt  = n => '$' + Math.round(n).toLocaleString();
  const fmtN = n => Math.round(n).toLocaleString();

  /* ── Firebase: listen for live updates and push to all visitors ── */
  let isAdminUpdating = false; // guard so listener doesn't fight admin inputs

  function applyTicketData(data) {
    const s1  = data.s1  || 0;
    const s5  = data.s5  || 0;
    const s15 = data.s15 || 0;
    const s40 = data.s40 || 0;
    // Sync local cur object so recordSale() always increments from correct totals
    cur.s1 = s1; cur.s5 = s5; cur.s15 = s15; cur.s40 = s40;
    // Sync pack button counters
    const c1 = document.getElementById('cnt1');   if (c1)  c1.textContent  = s1;
    const c5 = document.getElementById('cnt5');   if (c5)  c5.textContent  = s5;
    const c15= document.getElementById('cnt15');  if (c15) c15.textContent = s15;
    const c40= document.getElementById('cnt40');  if (c40) c40.textContent = s40;
    const tix = Math.min(s1 + s5*5 + s15*15 + s40*40, TOTAL_TIKS);
    const rev = s1*10 + s5*25 + s15*50 + s40*100;
    const pct = tix / TOTAL_TIKS * 100;
    document.getElementById('jackpotAmt').textContent = fmt(rev);
    document.getElementById('winnerAmt').textContent  = fmt(rev / 2);
    document.getElementById('orgAmt').textContent     = fmt(rev / 2);
    document.getElementById('tixLeft').textContent    = fmtN(Math.max(0, TOTAL_TIKS - tix));
    document.getElementById('soldCount').textContent  = fmtN(tix);
    document.getElementById('progBar').style.width    = Math.min(100, pct) + '%';
    document.getElementById('pctSold').textContent    = pct.toFixed(1) + '%';
    document.getElementById('revToDate').textContent  = fmt(rev);
    document.getElementById('drawTotalSold').value    = tix;
    const poolDisplay = document.getElementById('drawPoolDisplay');
    const poolMax     = document.getElementById('drawPoolMax');
    if (poolDisplay) poolDisplay.textContent = fmtN(tix);
  }

  // Subscribe — fires instantly on page load AND every time admin updates
  tickRef.on('value', snap => {
    if (snap.exists()) applyTicketData(snap.val());
  });

  // Subscribe to sales history — rebuilds table on every device instantly
  historyRef.on('value', snap => {
    const tbody = document.getElementById('salesHistoryBody');
    tbody.innerHTML = '';
    const entries = [];
    if (snap.exists()) {
      snap.forEach(child => {
        entries.push(child.val());
        return false;
      });
      entries.reverse().forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="muted">${e.time}</td>
          <td style="color:var(--text)">${e.buyer || '—'}</td>
          <td class="num">${e.pkg || '—'}</td>
          <td class="num">${e.tickets ? '#' + e.tickets : '—'}</td>
          <td class="num">${fmtN(e.tix)}</td>
          <td class="num">${fmt(e.rev)}</td>`;
        tbody.appendChild(tr);
      });
    }
    document.getElementById('salesHistory').classList.toggle('show', entries.length > 0);
  });

  /* ── Package selection ── */
  function selectPkg(el, tix, price) {
    document.querySelectorAll('.pkg-opt').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    selectedTix   = tix;
    selectedPrice = price;

    const label = tix === 1 ? '1 ticket' : tix + ' tickets';
    document.getElementById('etAmountDisplay').textContent = '$' + price;
    document.getElementById('etMemo').textContent = 'NDFC 5050 - ' + label + ' - Your Name';
    document.getElementById('etEmail').textContent = ETRANSFER_EMAIL;
    document.getElementById('osPkg').textContent   = tix === 1 ? 'Single ticket' : tix + '-pack';
    document.getElementById('osTix').textContent   = tix + (tix === 1 ? ' ticket' : ' tickets');
    document.getElementById('osTotal').textContent = '$' + price;
    document.getElementById('fPkg').value  = tix === 1 ? 'Single ticket ($10)' : tix + '-pack ($' + price + ')';
    document.getElementById('fTix').value  = tix;
    document.getElementById('fAmt').value  = '$' + price;

    document.getElementById('etransferBox').classList.add('show');
    document.getElementById('buyerForm').classList.add('show');
    setTimeout(() => document.getElementById('etransferBox').scrollIntoView({behavior:'smooth', block:'nearest'}), 80);
  }

  /* ── Copy helpers ── */
  function copyField(id, btn) {
    copyText(document.getElementById(id).textContent.trim(), btn);
  }
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).catch(() => {});
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }

  /* ── Form submission ── */
  async function handleSubmit(e) {
    e.preventDefault();
    const btn  = document.getElementById('submitBtn');
    const form = document.getElementById('ticketForm');
    btn.disabled    = true;
    btn.textContent = 'Submitting...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.style.display = 'none';
        document.getElementById('successCard').classList.add('show');
      } else {
        throw new Error('server error');
      }
    } catch {
      btn.disabled    = false;
      btn.textContent = 'Submit my ticket registration';
      alert('Submission error. Please email us directly at ' + ETRANSFER_EMAIL + ' with your name, package, and e-transfer confirmation number.');
    }
  }

  /* ── Pack sale buttons — tap to record a sale instantly ── */
  const salesLog = [];

  // Current running totals (loaded from Firebase on login)
  let cur = { s1: 0, s5: 0, s15: 0, s40: 0 };

  function recordSale(tixPerPack, pricePerPack) {
    // Work out which field to increment
    const key = tixPerPack === 1 ? 's1' : tixPerPack === 5 ? 's5' : tixPerPack === 15 ? 's15' : 's40';
    cur[key]++;

    const tix = Math.min(cur.s1 + cur.s5*5 + cur.s15*15 + cur.s40*40, TOTAL_TIKS);
    const rev = cur.s1*10 + cur.s5*25 + cur.s15*50 + cur.s40*100;
    const timeStr = new Date().toLocaleTimeString();

    // Flash the button
    const btnId = tixPerPack === 1 ? 0 : tixPerPack === 5 ? 1 : tixPerPack === 15 ? 2 : 3;
    const btns = document.querySelectorAll('.pack-btn');
    if (btns[btnId]) { btns[btnId].classList.remove('flash'); void btns[btnId].offsetWidth; btns[btnId].classList.add('flash'); }

    // Update sold counters on buttons
    document.getElementById('cnt1').textContent  = cur.s1;
    document.getElementById('cnt5').textContent  = cur.s5;
    document.getElementById('cnt15').textContent = cur.s15;
    document.getElementById('cnt40').textContent = cur.s40;

    document.getElementById('adminLog').textContent = timeStr + ' \u2014 Saving\u2026';

    // Write to Firebase
    const saveTickets = tickRef.set({ s1: cur.s1, s5: cur.s5, s15: cur.s15, s40: cur.s40, updatedAt: new Date().toISOString() });
    const saveHistory = historyRef.push({ time: timeStr, s1: cur.s1, s5: cur.s5, s15: cur.s15, s40: cur.s40, tix, rev });

    Promise.all([saveTickets, saveHistory])
      .then(() => {
        document.getElementById('adminLog').textContent = timeStr + ' \u2014 \u2705 ' + tixPerPack + '-ticket pack ($' + pricePerPack + ') recorded. Total ' + fmtN(tix) + ' tickets \u00b7 Pool ' + fmt(rev) + '.';
      })
      .catch(err => {
        document.getElementById('adminLog').textContent = '\u274c Save failed: ' + err.message;
        cur[key]--; // roll back on failure
        document.getElementById('cnt' + (tixPerPack === 1 ? '1' : tixPerPack === 5 ? '5' : tixPerPack === 15 ? '15' : '40')).textContent = cur[key];
      });
  }

  function renderSalesHistory() {
    // No-op — handled by Firebase listener
  }
  function clearSalesHistory() {
    historyRef.remove().catch(err => alert('Could not clear history: ' + err.message));
  }

  function updateTickets() { /* replaced by recordSale() */ }

  function renderSalesHistory() { /* handled by Firebase listener */ }
  function clearSalesHistory() {
    historyRef.remove().catch(err => alert('Could not clear history: ' + err.message));
  }

  function confirmFullReset() {
    if (!confirm('FULL RESET — this will clear all ticket counts, the jackpot, and the entire sales history back to zero.\n\nThis cannot be undone. Are you sure?')) return;
    if (!confirm('Are you absolutely sure? All data will be permanently deleted from Firebase.')) return;

    isAdminUpdating = true;
    document.getElementById('adminLog').textContent = 'Resetting everything\u2027';

    Promise.all([
      tickRef.set({ s1: 0, s5: 0, s15: 0, s40: 0, updatedAt: new Date().toISOString() }),
      historyRef.remove(),
      nextTicketRef.set(1)
    ])
    .then(() => {
      cur = { s1: 0, s5: 0, s15: 0, s40: 0 };
      ['cnt1','cnt5','cnt15','cnt40'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '0'; });
      resetDraw();
      document.getElementById('adminLog').textContent = new Date().toLocaleTimeString() + ' \u2014 \u2705 Full reset complete. All tickets and history cleared.';
    })
    .catch(err => {
      document.getElementById('adminLog').textContent = '\u274c Reset failed: ' + err.message;
    })
    .finally(() => {
      setTimeout(() => { isAdminUpdating = false; }, 1000);
    });
  }

  /* ── Admin gate ── */
  function toggleAdminGate() {
    if (unlocked) {
      const p    = document.getElementById('adminPanel');
      const open = p.classList.toggle('open');
      document.getElementById('adminToggle').classList.toggle('open', open);
      document.getElementById('adminDot').style.background = open ? '#E05050' : 'var(--muted2)';
      document.getElementById('lockGate').classList.remove('show');
    } else {
      const g       = document.getElementById('lockGate');
      const showing = g.classList.toggle('show');
      document.getElementById('adminToggle').classList.toggle('open', showing);
      document.getElementById('adminDot').style.background = showing ? 'var(--gold)' : 'var(--muted2)';
      if (showing) setTimeout(() => document.getElementById('pwInput').focus(), 50);
    }
  }
  function checkPw() {
    if (document.getElementById('pwInput').value === ADMIN_PW) {
      unlocked = true;
      document.getElementById('lockGate').classList.remove('show');
      document.getElementById('adminPanel').classList.add('open');
      document.getElementById('adminToggle').classList.add('open');
      document.getElementById('adminDot').style.background = '#E05050';
      document.getElementById('pwInput').value = '';
      document.getElementById('pwErr').textContent = '';
    } else {
      document.getElementById('pwErr').textContent = 'Incorrect password. Please try again.';
      document.getElementById('pwInput').value = '';
      document.getElementById('pwInput').focus();
    }
  }
  function logout() {
    unlocked = false;
    document.getElementById('adminPanel').classList.remove('open');
    document.getElementById('adminToggle').classList.remove('open');
    document.getElementById('adminDot').style.background = 'var(--muted2)';
  }

  /* ── Share ── */
  function copyLink() {
    navigator.clipboard.writeText(SHARE_URL).catch(() => {});
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy link', 2200);
  }
  function shareMsg(type) {
    if (type === 'sms')
      window.open('sms:?body=' + encodeURIComponent(SHARE_MSG));
    else if (type === 'email')
      window.open('mailto:?subject=Support+NDFC+Barca+U14+Italy+2027+%E2%80%94+50%2F50+Draw&body=' + encodeURIComponent(SHARE_MSG));
    else {
      navigator.clipboard.writeText(SHARE_MSG).catch(() => {});
      alert('Message copied to clipboard!');
    }
  }

  /* ══════════════════════════════════════════
     TICKET CONFIRMATION EMAILER
  ══════════════════════════════════════════ */

  // Init EmailJS once the page loads
  window.addEventListener('load', () => {
    if (typeof emailjs !== 'undefined') emailjs.init(EJS_PUBLIC_KEY);
  });

  // Load next ticket number from Firebase and keep it in sync
  nextTicketRef.on('value', snap => {
    const next      = snap.exists() ? snap.val() : 1;
    const issued    = next - 1;
    const el = document.getElementById('eStartNum');
    if (el) {
      el.value = next;
      if (unlocked && document.getElementById('eBuyerFirst')) buildPreview();
    }
    // Update draw pool display
    const pd = document.getElementById('drawPoolDisplay');
    const pm = document.getElementById('drawPoolMax');
    if (pd) pd.textContent = issued > 0 ? issued.toLocaleString() : '0';
    if (pm) pm.textContent = issued > 0 ? padNum(issued) : '0000';
  });

  function padNum(n) { return String(n).padStart(4, '0'); }

  function getTicketNumbers() {
    const pkgVal = document.getElementById('ePkg').value.split('|');
    const count  = parseInt(pkgVal[0]) || 1;
    const start  = parseInt(document.getElementById('eStartNum').value) || 1;
    const nums   = [];
    for (let i = 0; i < count; i++) nums.push(padNum(start + i));
    return nums;
  }

  function syncPkgFields() {
    const pkgVal  = document.getElementById('ePkg').value.split('|');
    const price   = pkgVal[1];
    const amtEl   = document.getElementById('eAmtPaid');
    if (!amtEl.dataset.edited) amtEl.value = '$' + price;
    buildPreview();
  }

  // Track if user manually edited amount
  document.addEventListener('DOMContentLoaded', () => {
    const amtEl = document.getElementById('eAmtPaid');
    if (amtEl) {
      amtEl.addEventListener('focus', () => amtEl.dataset.edited = 'true');
      syncPkgFields();
    }
  });

  function buildPreview() {
    const first   = (document.getElementById('eBuyerFirst').value || '').trim();
    const last    = (document.getElementById('eBuyerLast').value  || '').trim();
    const email   = (document.getElementById('eBuyerEmail').value || '').trim();
    const pkgSel  = document.getElementById('ePkg');
    const pkgText = pkgSel.options[pkgSel.selectedIndex].text;
    const amt     = (document.getElementById('eAmtPaid').value    || '').trim();
    const nums    = getTicketNumbers();
    const start   = parseInt(document.getElementById('eStartNum').value) || 1;
    const nextNum = start + nums.length;
    const ready   = !!(first && last && email && nums.length > 0);
    const overLimit = (nextNum - 1) > TOTAL_TIKS;

    // Render ticket number chips
    document.getElementById('tixNumDisplay').innerHTML = nums.map(n => `<span class="tix-num">#${n}</span>`).join('');
    document.getElementById('tixNextHint').innerHTML = overLimit
      ? `<span style="color:var(--red-lt)">&#9888; Warning: ticket #${padNum(nextNum-1)} exceeds the 5,000 limit!</span>`
      : `Next available number after this send: <strong>#${padNum(nextNum)}</strong> (${nextNum})`;
    document.getElementById('sendEmailBtn').disabled = !ready || overLimit;

    if (!first) { document.getElementById('emailPreview').classList.remove('show'); return; }

    const fullName    = first + ' ' + last;
    const ticketList  = nums.length === 1
      ? `Your ticket number: #${nums[0]}`
      : `Your ticket numbers:\n${nums.map(n => `  #${n}`).join('\n')}`;

    const body = `Hi ${first},

Great news — your payment has been verified and your official ticket numbers for the NDFC Barca U14 Italy 2027 · 50/50 Jackpot Draw are confirmed!

${ticketList}

Order details:
  Name:       ${fullName}
  Package:    ${pkgText}
  Amount paid: ${amt || 'see e-transfer'}
  Draw date:  August 31, 2027

The draw will take place on August 31, 2027. The winning ticket will be drawn live and the winner will receive 50% of the total jackpot. We will contact you directly if your number is drawn.

Thank you so much for your support — every ticket brings our players one step closer to Italy!

Go NDFC Barca! ⚽

– NDFC Barca U14 Fundraising Team
${ETRANSFER_EMAIL}`;

    document.getElementById('emailBody').textContent = body;
    document.getElementById('emailPreview').classList.add('show');
  }

  async function sendTicketEmail() {
    const first  = document.getElementById('eBuyerFirst').value.trim();
    const last   = document.getElementById('eBuyerLast').value.trim();
    const email  = document.getElementById('eBuyerEmail').value.trim();
    const body   = document.getElementById('emailBody').textContent;
    const logEl  = document.getElementById('emailerLog');
    const btn    = document.getElementById('sendEmailBtn');

    if (!first || !last || !email) { alert('Please fill in name and email.'); return; }
    if (EJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
      logEl.className = 'emailer-log show err';
      logEl.textContent = 'EmailJS not configured yet. Update EJS_PUBLIC_KEY, EJS_SERVICE_ID, and EJS_TEMPLATE_ID in the CONFIG section of the HTML file.';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Sending...';
    logEl.className = 'emailer-log show';
    logEl.textContent = 'Sending email...';

    try {
      await emailjs.send(EJS_SERVICE_ID, EJS_TEMPLATE_ID, {
        to_email : email,
        to_name  : first + ' ' + last,
        subject  : 'Your NDFC 50/50 ticket numbers are confirmed!',
        message  : body
      });

      // Work out which pack was sold and increment cur
      const pkgVal   = document.getElementById('ePkg').value.split('|');
      const tixCount = parseInt(pkgVal[0]);
      const pkgPrice = parseInt(pkgVal[1]);
      const key      = tixCount === 1 ? 's1' : tixCount === 5 ? 's5' : tixCount === 15 ? 's15' : 's40';
      cur[key]++;

      const tix     = Math.min(cur.s1 + cur.s5*5 + cur.s15*15 + cur.s40*40, TOTAL_TIKS);
      const rev     = cur.s1*10 + cur.s5*25 + cur.s15*50 + cur.s40*100;
      const timeStr = new Date().toLocaleTimeString();

      // Update pack button counters
      const cntEl = document.getElementById('cnt' + (tixCount === 1 ? '1' : tixCount === 5 ? '5' : tixCount === 15 ? '15' : '40'));
      if (cntEl) cntEl.textContent = cur[key];

      // Calculate next ticket number
      const nums    = getTicketNumbers();
      const nextNum = parseInt(document.getElementById('eStartNum').value) + nums.length;

      // Save everything to Firebase in one go
      await Promise.all([
        nextTicketRef.set(nextNum),
        tickRef.set({ s1: cur.s1, s5: cur.s5, s15: cur.s15, s40: cur.s40, updatedAt: new Date().toISOString() }),
        historyRef.push({ time: timeStr, buyer: first + ' ' + last, pkg: tixCount + '-ticket ($' + pkgPrice + ')', tickets: nums[0] + '-' + nums[nums.length-1], s1: cur.s1, s5: cur.s5, s15: cur.s15, s40: cur.s40, tix, rev })
      ]);

      logEl.className = 'emailer-log show ok';
      logEl.textContent = `\u2705 Sent to ${email} \u2014 tickets #${nums[0]} to #${nums[nums.length-1]} \u00b7 Jackpot updated to ${fmt(rev)}.`;

      // Clear buyer fields
      ['eBuyerFirst','eBuyerLast','eBuyerEmail'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('eAmtPaid').dataset.edited = '';
      syncPkgFields();
      document.getElementById('emailPreview').classList.remove('show');
      btn.textContent = 'Send ticket confirmation email';
    } catch(err) {
      logEl.className = 'emailer-log show err';
      logEl.textContent = 'Send failed: ' + (err.text || err.message || JSON.stringify(err)) + '. Check your EmailJS config.';
      btn.disabled    = false;
      btn.textContent = 'Send ticket confirmation email';
    }
      document.getElementById('emailPreview').classList.remove('show');
      btn.textContent = 'Send ticket confirmation email';
    } catch(err) {
      logEl.className = 'emailer-log show err';
      logEl.textContent = 'Send failed: ' + (err.text || err.message || JSON.stringify(err)) + '. Check your EmailJS config.';
      btn.disabled    = false;
      btn.textContent = 'Send ticket confirmation email';
    }
  }

  /* ══════════════════════════════════════════
     DRAW WINNER
  ══════════════════════════════════════════ */
  let drawComplete = false;

  function runDraw() {
    // Fetch directly from Firebase — uses nextTicketNumber so it only picks from issued tickets
    nextTicketRef.once('value').then(snap => {
      const nextNum   = snap.exists() ? snap.val() : 1;
      const totalSold = nextNum - 1; // highest issued ticket number

      if (totalSold < 1) {
        alert('No tickets have been issued yet. Send at least one ticket confirmation before running the draw.');
        return;
      }
      if (drawComplete) { if (!confirm('A winner has already been drawn. Draw again?')) return; }

      const btn      = document.getElementById('drawBtn');
      const resultEl = document.getElementById('drawResult');
      const numEl    = document.getElementById('drawWinningNum');
      const nameEl   = document.getElementById('drawWinnerName');
      const noteEl   = document.getElementById('drawWinnerNote');
      const confetti = document.getElementById('drawConfetti');
      const labelEl  = document.getElementById('drawEventLabel');

      const eventNote = document.getElementById('drawEventNote').value.trim() || 'NDFC Barca U14 \u00b7 Italy 2027 \u00b7 50/50 Draw';
      labelEl.textContent = eventNote;

      btn.disabled = true;
      drawComplete = false;
      confetti.classList.remove('show');
      nameEl.textContent = '';
      noteEl.textContent = '';
      numEl.classList.add('spinning');
      resultEl.classList.add('show');

      // Update the pool display with latest count
      const pd = document.getElementById('drawPoolDisplay');
      const pm = document.getElementById('drawPoolMax');
      if (pd) pd.textContent = totalSold.toLocaleString();
      if (pm) pm.textContent = padNum(totalSold);

      const SPIN_DURATION = 3500;
      const SPIN_FAST     = 55;
      const SPIN_SLOW     = 300;
      const winner    = Math.floor(Math.random() * totalSold) + 1;
      const winnerStr = padNum(winner);
      const startTime = Date.now();

      function tick() {
        const elapsed  = Date.now() - startTime;
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        const interval = SPIN_FAST + (SPIN_SLOW - SPIN_FAST) * (progress * progress);
        if (progress < 1) {
          numEl.textContent = padNum(Math.floor(Math.random() * totalSold) + 1);
          setTimeout(tick, interval);
        } else {
          numEl.classList.remove('spinning');
          numEl.textContent = '#' + winnerStr;
          drawComplete      = true;
          btn.disabled      = false;
          const ts          = new Date().toLocaleString();
          nameEl.textContent = 'Winning ticket: #' + winnerStr;
          noteEl.textContent = 'Drawn from ' + totalSold.toLocaleString() + ' issued tickets \u00b7 ' + ts;
          confetti.classList.add('show');
        }
      }
      setTimeout(tick, 50);
    }).catch(err => {
      alert('Could not read ticket data from Firebase: ' + err.message);
      document.getElementById('drawBtn').disabled = false;
    });
  }

  function resetDraw() {
    drawComplete = false;
    document.getElementById('drawResult').classList.remove('show');
    document.getElementById('drawWinningNum').textContent = '----';
    document.getElementById('drawWinningNum').classList.remove('spinning');
    document.getElementById('drawConfetti').classList.remove('show');
    document.getElementById('drawWinnerName').textContent = '';
    document.getElementById('drawWinnerNote').textContent = '';
    document.getElementById('drawBtn').disabled = false;
  }

  /* Build email addresses dynamically so Cloudflare cannot detect or mangle them */
  (function() {
    const contact = 'ndfcbarca' + '\u0040' + 'gmail.com';
    const cl = document.getElementById('contactLink');
    if (cl) { cl.href = 'mailto:' + contact; cl.textContent = contact; }
    const et = document.getElementById('etEmail');
    if (et && !et.textContent.trim()) et.textContent = ETRANSFER_EMAIL;
  })();

