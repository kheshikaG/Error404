let state = {
  user: null,
  groups: [],
  currentGroup: null,
  suggestion: null
};

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function money(cents) {
  return `Rs ${(cents / 100).toFixed(2)}`;
}

function showMessage(text, error = false) {
  $("authMessage").textContent = text;
  $("authMessage").style.color = error ? "#c03939" : "#148459";
}

function setLoggedIn(user) {
  state.user = user;
  $("authCard").hidden = true;
  $("app").hidden = false;
  $("userArea").innerHTML = `
    <span>${escapeHtml(user.name)}</span>
    <button id="logoutBtn" class="secondary">Logout</button>
  `;
  $("logoutBtn").onclick = async () => {
    await api("/api/auth/logout", { method: "POST" });
    location.reload();
  };
  loadGroups();
  loadBankConnections();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

$("showLogin").onclick = () => {
  $("loginForm").hidden = false;
  $("registerForm").hidden = true;
  $("showLogin").classList.add("active");
  $("showRegister").classList.remove("active");
};

$("showRegister").onclick = () => {
  $("loginForm").hidden = true;
  $("registerForm").hidden = false;
  $("showRegister").classList.add("active");
  $("showLogin").classList.remove("active");
};

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("loginEmail").value,
        password: $("loginPassword").value
      })
    });
    setLoggedIn(data.user);
  } catch (e) { showMessage(e.message, true); }
};

$("registerForm").onsubmit = async e => {
  e.preventDefault();
  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: $("regName").value,
        email: $("regEmail").value,
        password: $("regPassword").value
      })
    });
    setLoggedIn(data.user);
  } catch (e) { showMessage(e.message, true); }
};

async function loadGroups() {
  const data = await api("/api/groups");
  state.groups = data.groups;
  $("groups").innerHTML = data.groups.length
    ? data.groups.map(g => `<div class="groupItem" data-id="${g.id}">${escapeHtml(g.name)}</div>`).join("")
    : "<p>No groups yet.</p>";
  document.querySelectorAll(".groupItem").forEach(el => {
    el.onclick = () => loadGroup(Number(el.dataset.id));
  });
}

$("groupForm").onsubmit = async e => {
  e.preventDefault();
  try {
    await api("/api/groups", { method: "POST", body: JSON.stringify({ name: $("groupName").value }) });
    $("groupName").value = "";
    await loadGroups();
  } catch (e) { alert(e.message); }
};

async function loadGroup(id) {
  const data = await api(`/api/groups/${id}`);
  state.currentGroup = data;
  $("emptyState").hidden = true;
  $("groupView").hidden = false;
  $("groupTitle").textContent = data.group.name;
  $("groupMeta").textContent = `${data.members.length} member(s)`;

  $("expensePayer").innerHTML = data.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");
  $("cashReceiver").innerHTML = data.members
    .filter(m => m.id !== state.user.id)
    .map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");
  $("participants").innerHTML = data.members.map(m => `
    <label style="display:block">
      <input type="checkbox" class="participant" value="${m.id}" ${m.id === state.user.id ? "checked" : ""}>
      ${escapeHtml(m.name)}
    </label>
  `).join("");

  renderExpenses(data);
  renderCash(data);
  await loadBalances();
  await loadAudit();
}

$("refreshGroup").onclick = () => state.currentGroup && loadGroup(state.currentGroup.group.id);

$("expenseForm").onsubmit = async e => {
  e.preventDefault();
  const participantIds = [...document.querySelectorAll(".participant:checked")].map(x => Number(x.value));
  try {
    await api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        groupId: state.currentGroup.group.id,
        description: $("expenseDescription").value,
        amount: $("expenseAmount").value,
        payerId: Number($("expensePayer").value),
        category: $("expenseCategory").value,
        participantIds
      })
    });
    e.target.reset();
    await loadGroup(state.currentGroup.group.id);
  } catch (e) { alert(e.message); }
};

function renderExpenses(data) {
  $("expenses").innerHTML = data.expenses.length ? data.expenses.map(e => {
    const shares = data.shares.filter(s => s.expense_id === e.id);
    return `<div class="expense">
      <strong>${escapeHtml(e.description)}</strong> — ${money(e.amount_cents)}
      <div>Paid by: ${escapeHtml(e.payer_name)} · ${escapeHtml(e.category)}</div>
      <small>Split: ${shares.map(s => `${escapeHtml(s.name)} ${money(s.share_cents)}`).join(", ")}</small>
    </div>`;
  }).join("") : "<p>No expenses yet.</p>";
}

async function loadBalances() {
  const data = await api(`/api/balances/${state.currentGroup.group.id}`);
  $("balances").innerHTML = data.balances.map(b => {
    const cls = b.cents >= 0 ? "positive" : "negative";
    const label = b.cents > 0 ? "gets back" : b.cents < 0 ? "owes" : "settled";
    return `<div class="balance ${cls}">
      <strong>${escapeHtml(b.name)}</strong><br>
      ${label === "settled" ? "Settled" : `${label}: ${money(Math.abs(b.cents))}`}
    </div>`;
  }).join("");
}

$("cashForm").onsubmit = async e => {
  e.preventDefault();
  try {
    await api("/api/cash-payments", {
      method: "POST",
      body: JSON.stringify({
        groupId: state.currentGroup.group.id,
        payerId: state.user.id,
        receiverId: Number($("cashReceiver").value),
        amount: $("cashAmount").value,
        note: $("cashNote").value
      })
    });
    e.target.reset();
    await loadGroup(state.currentGroup.group.id);
  } catch (e) { alert(e.message); }
};

function renderCash(data) {
  $("cashPayments").innerHTML = data.cashPayments.length ? data.cashPayments.map(p => {
    const canRespond = p.receiver_id === state.user.id && p.status === "pending";
    return `<div class="cash">
      <strong>${escapeHtml(p.payer_name)}</strong> → <strong>${escapeHtml(p.receiver_name)}</strong>
      : ${money(p.amount_cents)}
      <div class="status ${p.status}">${p.status.toUpperCase()}</div>
      ${p.note ? `<small>${escapeHtml(p.note)}</small>` : ""}
      ${canRespond ? `
        <div>
          <button onclick="respondCash(${p.id},'confirmed')">I received it</button>
          <button class="secondary" onclick="respondCash(${p.id},'rejected')">I did not receive it</button>
        </div>` : ""}
    </div>`;
  }).join("") : "<p>No cash payments yet.</p>";
}

window.respondCash = async (id, response) => {
  try {
    await api(`/api/cash-payments/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ response })
    });
    await loadGroup(state.currentGroup.group.id);
  } catch (e) { alert(e.message); }
};

$("aiParse").onclick = async () => {
  try {
    const data = await api("/api/ai/parse-expense", {
      method: "POST",
      body: JSON.stringify({
        text: $("aiText").value,
        members: state.currentGroup.members
      })
    });
    state.suggestion = data.suggestion;
    $("aiResult").textContent = JSON.stringify(data, null, 2);
    $("useAISuggestion").hidden = !data.suggestion.amount;
  } catch (e) { alert(e.message); }
};

$("useAISuggestion").onclick = () => {
  const s = state.suggestion;
  if (!s) return;
  $("expenseDescription").value = s.description;
  $("expenseAmount").value = s.amount || "";
  document.querySelectorAll(".participant").forEach(cb => {
    cb.checked = s.participantIds.includes(Number(cb.value));
  });
  $("expensesTab").hidden = false;
  $("aiTab").hidden = true;
};

async function loadAudit() {
  const data = await api(`/api/audit/${state.currentGroup.group.id}`);
  $("audit").innerHTML = data.audit.length ? data.audit.map(a => `
    <div class="auditItem">
      <strong>${escapeHtml(a.action)}</strong>
      · ${escapeHtml(a.entity_type)}
      · ${escapeHtml(a.actor_name || "System")}
      <br><small>${escapeHtml(a.created_at)}</small>
    </div>
  `).join("") : "<p>No activity yet.</p>";
}

document.querySelectorAll(".tabs button[data-tab]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabPanel").forEach(p => p.hidden = true);
    document.querySelectorAll(".tabs button[data-tab]").forEach(b => b.classList.remove("active"));
    $(btn.dataset.tab).hidden = false;
    btn.classList.add("active");
  };
});

$("connectBank").onclick = async () => {
  try {
    const data = await api("/api/bank/mock-connect", { method: "POST", body: "{}" });
    alert(`${data.message}\nPermission: ${data.permission}`);
    loadBankConnections();
  } catch (e) { alert(e.message); }
};

async function loadBankConnections() {
  if (!state.user) return;
  const data = await api("/api/bank/connections");
  $("bankConnections").innerHTML = data.connections.length
    ? data.connections.map(c => `
      <div class="audit
