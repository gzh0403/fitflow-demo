/* FitFlow P2 可交互原型 — 三端页面与流程 */
(function () {
  var Rules = window.FitFlowRules;
  var Store = window.FitFlowStore;
  var state = Store.load(new Date());
  var uiTab = {};

  function now() { return new Date(); }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function save() { Store.save(state); }
  function find(list, id) { return Rules.find(list, id); }
  function course(id) { return find(state.courses, id) || { name: "课程", type: "", durationMin: 60, category: "" }; }
  function coach(id) { return find(state.coaches, id) || { name: "教练" }; }
  function room(id) { return find(state.rooms, id) || { name: "教室", capacity: 0 }; }
  function member(id) { return find(state.members, id) || { name: "会员", phoneMasked: "" }; }
  function session(id) { return find(state.sessions, id); }
  function staff(id) { return find(state.staff, id); }

  function go(hash) {
    if (hash.charAt(0) !== "#") hash = "#" + hash;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function toast(msg) {
    var wrap = $("toast-wrap");
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }

  function closeModal() {
    $("modal-root").innerHTML = "";
  }

  function modal(opt) {
    $("modal-root").innerHTML =
      '<div class="modal-back" data-act="close-modal"><div class="modal" data-stop="1">' +
      "<h3>" + esc(opt.title) + "</h3>" +
      '<div class="small">' + (opt.body || "") + "</div>" +
      '<div class="actions">' +
      '<button class="btn btn-ghost" type="button" data-act="close-modal">取消</button>' +
      '<button class="btn ' + (opt.danger ? "btn-danger" : "btn-primary") + '" type="button" id="modal-ok">' +
      esc(opt.okText || "确定") + "</button></div></div></div>";
    $("modal-ok").addEventListener("click", function () {
      closeModal();
      if (opt.onok) opt.onok();
    });
  }

  function parseRoute() {
    var raw = (location.hash || "#/c/home").replace(/^#/, "");
    var parts = raw.split("?");
    var segs = parts[0].split("/").filter(Boolean);
    var query = {};
    if (parts[1]) {
      parts[1].split("&").forEach(function (kv) {
        var p = kv.split("=");
        query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
    }
    return { role: segs[0] || "c", page: segs[1] || "home", id: segs[2] || "", query: query, raw: raw };
  }

  function roleOf(code) {
    return { c: "customer", s: "staff", b: "boss" }[code] || "customer";
  }
  function codeOf(role) {
    return { customer: "c", staff: "s", boss: "b" }[role] || "c";
  }

  var CAT = { reformer: "改革器", yoga: "瑜伽", pilates: "普拉提", private: "私教" };
  function restrictLabel(pkg) {
    if (pkg.restrict === "group") return "仅限团课";
    if (pkg.restrict === "private") return "仅限私教";
    if (pkg.restrict === "category") {
      return "仅限" + (pkg.categories || []).map(function (c) { return CAT[c] || c; }).join("、") + "类课程";
    }
    return "不限课类";
  }

  function statusChip(st) {
    var map = {
      "待确认": "chip-warn",
      "已确认": "chip-sage",
      "已到店": "chip-pine",
      "服务中": "chip-pine",
      "已完成": "chip-line",
      "已取消": "chip-line",
      "已拒绝": "chip-danger",
      "缺席": "chip-danger",
      "候补中": "chip-info",
      "候补失效": "chip-line"
    };
    return '<span class="chip ' + (map[st] || "") + '">' + esc(st) + "</span>";
  }

  function arrivedCount(state, sessionId) {
    var n = 0;
    for (var i = 0; i < state.bookings.length; i++) {
      var b = state.bookings[i];
      if (b.sessionId === sessionId && (b.status === "已到店" || b.status === "服务中" || b.status === "已完成")) n++;
    }
    return n;
  }

  function capMeta(state, s) {
    var cap = Rules.sessionCapacity(state, s);
    var used = Rules.occupiedCount(state, s.id);
    var left = Math.max(0, cap - used);
    var ended = Rules.sessionEnd(s).getTime() <= now().getTime();
    var arrived = arrivedCount(state, s.id);
    if (s.canceled) return { cap: cap, used: used, left: left, label: "已停课", chip: "chip-line", cls: "", bar: 0 };
    if (ended) return {
      cap: cap, used: arrived, left: 0,
      label: "已结束 · 到课 " + arrived + "/" + cap,
      chip: "chip-line",
      cls: "",
      bar: cap ? Math.min(100, arrived / cap * 100) : 0
    };
    return {
      cap: cap, used: used, left: left,
      label: left === 0 ? "满员 " + used + "/" + cap : "余 " + left + " · " + used + "/" + cap,
      chip: left === 0 ? "chip-clay" : "chip-sage",
      cls: left === 0 ? "is-full" : left <= 2 ? "is-tight" : "",
      bar: cap ? Math.min(100, used / cap * 100) : 0
    };
  }

  function capHtml(state, s) {
    var m = capMeta(state, s);
    return '<div class="capacity"><span class="chip ' + m.chip + '">' + m.label +
      '</span><div class="capacity-bar ' + m.cls + '"><i style="width:' + m.bar + '%"></i></div></div>';
  }

  function shortCap(state, s) {
    if (s.canceled) return "已停课";
    var m = capMeta(state, s);
    if (Rules.sessionEnd(s).getTime() <= now().getTime()) return "到课 " + m.used;
    return m.left ? "余 " + m.left : "满员";
  }

  function classRow(s, href) {
    var c = course(s.courseId);
    return '<a class="class-item" href="' + esc(href) + '">' +
      '<div class="time">' + esc(s.start) + "<span>" + esc(s.end) + "</span></div>" +
      "<div><div class=\"name\">" + esc(c.name) + "</div>" +
      '<div class="meta">' + esc(coach(s.coachId).name) + " · " + esc(room(s.roomId).name) +
      (s.type === "private" ? " · 私教" : "") + "</div></div>" +
      capHtml(state, s) + "</a>";
  }

  function icon(name) {
    var p = {
      home: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
      cal: "M7 3v2M17 3v2M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
      user: "M12 12a4 4 0 1 0-0.01-8A4 4 0 0 0 12 12zm-7 9c0-3.3 3.1-6 7-6s7 2.7 7 6",
      card: "M4 7h16v11H4zM4 11h16",
      dash: "M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z",
      set: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8 4h-2.1a6 6 0 0 0-.4-1.1l1.5-1.5-2.2-2.2-1.5 1.5A6 6 0 0 0 13 7.1V5h-2v2.1c-.4.1-.8.3-1.1.4L8.4 6l-2.2 2.2 1.5 1.5c-.2.4-.3.7-.4 1.1H5v2h2.1c.1.4.3.8.4 1.1L6 16.6 8.2 18.8l1.5-1.5c.4.2.7.3 1.1.4V20h2v-2.1c.4-.1.8-.3 1.1-.4l1.5 1.5 2.2-2.2-1.5-1.5c.2-.4.3-.7.4-1.1H20z"
    }[name] || "M4 12h16";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="' + p + '"/></svg>';
  }

  function renderBar() {
    var role = state.ui.role;
    var staffSel = "";
    if (role === "staff") {
      staffSel = '<span class="demo-label">演示身份</span><select class="staff-select" data-act="switch-staff-select">' +
        state.staff.filter(function (s) { return s.kind !== "owner" && s.enabled; }).map(function (s) {
          return '<option value="' + s.id + '"' + (state.ui.staffId === s.id ? " selected" : "") + ">" +
            esc(s.name) + " · " + esc(s.title) + "</option>";
        }).join("") + "</select>";
    }
    $("demo-bar").innerHTML =
      '<div class="brand"><span class="brand-name">FitFlow</span><span class="brand-tag">工作名</span></div>' +
      '<div class="notice"><span>演示样品 · 虚拟数据 · 非真实经营数据 · 角色切换仅供演示</span>' +
      '<span class="visual-pending">试用视觉 / 色值未锁定，待创始人确认</span></div>' +
      '<span class="demo-label">角色</span>' +
      '<div class="role-switch">' +
      ["customer|顾客", "staff|店员", "boss|老板"].map(function (x) {
        var p = x.split("|");
        return '<button type="button" data-act="switch-role" data-role="' + p[0] + '" class="' + (role === p[0] ? "is-on" : "") + '">' + p[1] + "</button>";
      }).join("") + "</div>" + staffSel +
      '<button class="bar-btn" type="button" data-act="reset">一键重置演示数据</button>';
  }

  function navItems(role) {
    if (role === "customer") return [
      ["#/c/home", "首页", "home"],
      ["#/c/schedule", "课表", "cal"],
      ["#/c/membership", "会员", "card"],
      ["#/c/me", "我的", "user"]
    ];
    if (role === "staff") return [
      ["#/s/today", "今日课次", "cal"],
      ["#/s/members", "会员", "user"],
      ["#/s/schedule", "我的排班", "card"],
      ["#/s/me", "我的", "home"]
    ];
    return [
      ["#/b/dashboard", "看板", "dash"],
      ["#/b/schedule", "课表", "cal"],
      ["#/b/ops", "经营", "card"],
      ["#/b/rules", "设置", "set"]
    ];
  }

  function bottomNav(role, route) {
    var items = navItems(role);
    return '<nav class="bottom-nav">' + items.map(function (it) {
      var on = ("#/" + route.raw).indexOf(it[0]) === 0 ||
        (it[0] === "#/c/home" && (route.page === "home" || route.page === "store")) ||
        (it[0] === "#/c/schedule" && (route.page === "schedule" || route.page === "class" || route.page === "private" || route.page === "coach")) ||
        (it[0] === "#/c/membership" && (route.page === "membership" || route.page === "package" || route.page === "buy")) ||
        (it[0] === "#/c/me" && (route.page === "me" || route.page === "bookings" || route.page === "booking" || route.page === "records" || route.page === "checkin")) ||
        (it[0] === "#/s/today" && (route.page === "today" || route.page === "session" || route.page === "pending")) ||
        (it[0] === "#/s/members" && (route.page === "members" || route.page === "member" || route.page === "book" || route.page === "leaves")) ||
        (it[0] === "#/b/dashboard" && route.page === "dashboard") ||
        (it[0] === "#/b/schedule" && (route.page === "schedule" || route.page === "courses" || route.page === "course" || route.page === "rooms" || route.page === "coaches" || route.page === "coach")) ||
        (it[0] === "#/b/ops" && (route.page === "ops" || route.page === "members" || route.page === "member" || route.page === "packages" || route.page === "records")) ||
        (it[0] === "#/b/rules" && (route.page === "rules" || route.page === "store" || route.page === "staff"));
      return '<a href="' + it[0] + '" class="' + (on ? "is-on" : "") + '">' + icon(it[2]) + "<span>" + it[1] + "</span></a>";
    }).join("") + "</nav>";
  }

  function sideNav(role, route) {
    var groups;
    if (role === "staff") {
      groups = [
        ["今日", [["#/s/today", "今日课次"], ["#/s/pending", "待确认私教"]]],
        ["会员", [["#/s/members", "查询会员"], ["#/s/book", "代顾客预约"], ["#/s/leaves", "手工请假记录"]]],
        ["自己", [["#/s/schedule", "我的排班"], ["#/s/me", "店员中心"]]]
      ];
    } else {
      groups = [
        ["概览", [["#/b/dashboard", "经营看板"]]],
        ["课表", [["#/b/schedule", "周课表与排期"], ["#/b/courses", "课程管理"], ["#/b/rooms", "教室管理"], ["#/b/coaches", "教练与排班"]]],
        ["经营", [["#/b/members", "会员档案"], ["#/b/packages", "课包与卡项"], ["#/b/records", "消课与消费记录"], ["#/s/today", "今日课次"], ["#/s/pending", "待确认私教"], ["#/s/leaves", "手工请假记录"]]],
        ["设置", [["#/b/rules", "营业规则"], ["#/b/store", "门店资料"], ["#/b/staff", "身份权限"]]]
      ];
    }
    var links = groups.map(function (g) {
      return '<div class="section-label" style="color:rgba(246,241,232,.45);margin:18px 12px 6px">' + g[0] + "</div>" +
        g[1].map(function (it) {
          var on = ("#" + (location.hash || "")).replace(/^##/, "#") === it[0] || ("#/" + route.raw).indexOf(it[0]) === 0;
          if (it[0] === "#/b/ops") on = false;
          return '<a href="' + it[0] + '" class="' + (on ? "is-on" : "") + '">' + it[1] + "</a>";
        }).join("");
    }).join("");
    return '<aside class="sidebar"><div class="store-mini"><div class="en">FITFLOW DEMO</div><h2>' +
      esc(state.settings.store.name) + "</h2></div><nav>" + links +
      '</nav><div class="side-foot">演示管理端。宽屏下以侧栏工作；手机宽度使用底部导航。统计数字均由演示操作汇总。</div></aside>';
  }

  function pageWrap(html, route) {
    var role = state.ui.role;
    var innerClass = "main-inner" + (role === "customer" ? " customer-wide" : "");
    var side = (role === "staff" || role === "boss") ? sideNav(role, route) : "";
    return side + '<main class="main"><div class="' + innerClass + '">' + html + "</div></main>" + bottomNav(role, route);
  }

  function denied(need) {
    return '<div class="denied card"><h1>当前角色没有这项权限</h1><p class="muted">演示里没有把按钮藏起来代替权限。请先在顶部把角色切换到「' + esc(need) + '」。这是演示切换，正式产品不会出现这条工具栏。</p></div>';
  }

  /* ---------------- customer views ---------------- */
  function customerHome() {
    var today = Rules.dateStr(now());
    var list = state.sessions.filter(function (s) {
      return s.date === today && s.type === "group" && !s.canceled;
    }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var upcoming = list.filter(function (s) { return Rules.sessionEnd(s).getTime() > now().getTime(); });
    var show = (upcoming.length ? upcoming : list);
    var packs = Rules.memberPackagesView(state, state.ui.customerId, now());
    var packHtml = packs.map(function (v) {
      return '<div class="card"><div class="row-between"><strong>' + esc(v.pkg.name) + "</strong>" +
        (v.expired ? '<span class="chip chip-danger">已过期</span>' : '<span class="chip chip-sage">有效</span>') +
        "</div><div class=\"pkg-nums\"><div><span class=\"n\">" + v.stats.available + '</span><span class="l">可约</span></div>' +
        "<div><span class=\"n\">" + v.stats.held + '</span><span class="l">预占</span></div>' +
        "<div><span class=\"n\">" + v.stats.deducted + '</span><span class="l">已核销</span></div></div>' +
        '<div class="small muted mt-8">' + esc(restrictLabel(v.pkg)) + " · " + (v.expired ? "已于 " : "有效期至 ") + esc(v.pkg.expireAt) + "</div></div>";
    }).join("");
    return '<div class="customer-home"><div><div class="hero">' +
      '<div class="eyebrow">FITFLOW · 演示门店</div>' +
      "<h1>" + esc(state.settings.store.name) + "</h1>" +
      "<p>" + esc(state.settings.store.slogan) + "</p>" +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary" href="#/c/schedule">查看周课表</a>' +
      '<a class="btn" href="#/c/private" style="background:rgba(255,255,255,.12);color:#f6f1e8">预约私教</a></div></div>' +
      '<div class="banner banner-sand">' + esc(state.settings.store.announcement) + "</div>" +
      '<div class="section-label">今日课次</div>' +
      (show.length ? '<div class="card">' + show.map(function (s) { return classRow(s, "#/c/class/" + s.id); }).join("") + "</div>"
        : '<div class="empty"><h3>今天没有尚未开始的团课</h3><p>可以打开周课表，查看后面几天的安排。</p><a class="btn btn-primary" href="#/c/schedule">去课表</a></div>') +
      '</div><div><div class="section-label" style="margin-top:0">我的课包</div>' + packHtml +
      '<a class="btn btn-ghost btn-block mt-16" href="#/c/store">门店介绍</a>' +
      '<a class="btn btn-ghost btn-block mt-8" href="#/c/bookings">我的预约</a></div></div>';
  }

  function customerStore() {
    var st = state.settings.store;
    return '<div class="page-title"><div><div class="sub">门店</div><h1>门店介绍</h1></div></div>' +
      '<div class="card"><h3>' + esc(st.name) + "</h3><p>" + esc(st.about) + "</p>" +
      '<dl class="kv"><dt>地址</dt><dd>' + esc(st.address) + "</dd><dt>电话</dt><dd>" + esc(st.phone) +
      "</dd><dt>营业时间</dt><dd>" + esc(st.hours) + "</dd></dl></div>" +
      '<div class="section-label">教室</div>' +
      state.rooms.map(function (r) {
        return '<div class="card"><div class="row-between"><strong>' + esc(r.name) + "</strong><span class=\"chip\">容纳 " + r.capacity + " 人</span></div>" +
          '<p class="small muted mb-0">' + esc(r.note) + (r.enabled ? "" : "（已停用）") + "</p></div>";
      }).join("");
  }

  function dayList(from, days) {
    var list = [];
    var start = Rules.atLocal(Rules.dateStr(from), "00:00");
    for (var i = 0; i < days; i++) {
      var d = Rules.addDays(start, i);
      list.push({ date: Rules.dateStr(d), week: Rules.WEEKDAYS[Rules.weekday(d)], day: d.getDate(), today: Rules.dateStr(d) === Rules.dateStr(from) });
    }
    return list;
  }

  function customerSchedule(route) {
    var date = route.query.date || Rules.dateStr(now());
    var days = dayList(now(), 14);
    var strip = '<div class="day-strip">' + days.map(function (d) {
      return '<button type="button" class="day-chip ' + (d.date === date ? "is-on" : "") + (d.today ? " is-today" : "") +
        '" data-act="go" data-href="#/c/schedule?date=' + d.date + '"><span class="wk">' + d.week + (d.today ? " · 今" : "") +
        '</span><span class="num">' + d.day + "</span></button>";
    }).join("") + "</div>";
    var list = state.sessions.filter(function (s) { return s.date === date && s.type === "group"; })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var weekStart = Rules.addDays(Rules.atLocal(Rules.dateStr(now()), "00:00"), -(Rules.weekday(now()) - 1));
    var grid = '<div class="week-grid mt-16">';
    for (var i = 0; i < 7; i++) {
      var d = Rules.addDays(weekStart, i);
      var ds = Rules.dateStr(d);
      var items = state.sessions.filter(function (s) { return s.date === ds && s.type === "group"; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      grid += '<div class="day-col ' + (ds === Rules.dateStr(now()) ? "is-today" : "") + '"><h4>' +
        Rules.WEEKDAYS[Rules.weekday(d)] + " " + (d.getMonth() + 1) + "/" + d.getDate() + "</h4>" +
        items.map(function (s) {
          return '<a class="week-card" href="#/c/class/' + s.id + '"><div class="t">' + esc(s.start) + " " + esc(course(s.courseId).name) +
            "</div><div class=\"faint\">" + esc(coach(s.coachId).name) + " · " + shortCap(state, s) + "</div></a>";
        }).join("") + "</div>";
    }
    grid += "</div>";
    return '<div class="page-title"><div><div class="sub">按星期循环，预约落在具体日期场次</div><h1>周课表</h1></div>' +
      '<a class="btn btn-ghost btn-sm" href="#/c/private">预约私教</a></div>' + strip +
      '<div class="card">' + (list.length ? list.map(function (s) { return classRow(s, "#/c/class/" + s.id); }).join("") :
        '<div class="empty"><h3>这一天没有团课</h3><p>可以换一天查看，或预约私教时段。</p></div>') + "</div>" +
      '<p class="small muted">宽屏可直接看本周七天课表。课表按星期重复生成，不是把单人椅位改个名字。</p>' + grid;
  }

  function customerClass(id) {
    var s = session(id);
    if (!s) return '<div class="empty"><h3>找不到该课次</h3></div>';
    var c = course(s.courseId);
    var mine = state.bookings.filter(function (b) { return b.sessionId === s.id && b.memberId === state.ui.customerId; })[0];
    var packs = Rules.usablePackages(state, state.ui.customerId, c, now());
    var left = Rules.remainingSpots(state, s);
    var cap = Rules.sessionCapacity(state, s);
    var used = Rules.occupiedCount(state, s.id);
    var wait = Rules.waitlistOf(state, s.id);
    var pkgOpts = packs.map(function (p) {
      return '<option value="' + p.pkg.id + '">' + esc(p.pkg.name) + "（可约 " + p.stats.available + " 次）</option>";
    }).join("");
    var expiredPkgs = Rules.memberPackagesView(state, state.ui.customerId, now()).filter(function (v) { return !v.usable; });
    var action = "";
    if (s.canceled) action = '<div class="banner banner-warn">该课次已停课，不能预约。</div>';
    else if (mine && (Rules.occupiesSlot(mine))) {
      action = '<div class="banner banner-sage">你已预约本课，状态：' + esc(mine.status) + '。预约成功已预占 1 次。</div>' +
        '<a class="btn btn-pine btn-block" href="#/c/booking/' + mine.id + '">查看我的预约</a>';
    } else if (mine && mine.status === "候补中") {
      action = '<div class="banner banner-info">你已在候补名单中。候补暂不预占课次；有人取消后按加入顺序转正并预占 1 次。候补不是每家店最小可销售产品的必交项，此处仅作演示。</div>' +
        '<button class="btn btn-ghost btn-block" data-act="cancel-booking" data-id="' + mine.id + '">取消候补</button>';
    } else if (Rules.sessionEnd(s).getTime() <= now().getTime()) {
      action = '<div class="banner banner-sand">该课次已结束。</div>';
    } else if (left < 1) {
      action = '<div class="banner banner-warn">已满员（' + used + "/" + cap + "），不能再占用名额。" +
        (wait.length ? "当前候补 " + wait.length + " 人。" : "") +
        " 候补为演示能力，不是每家店最小可销售产品的必交项。</div>" +
        (packs.length
          ? '<label class="field"><span>用于转正时预占的课包</span><select class="input" id="pkg-select">' + pkgOpts + "</select></label>" +
            '<button class="btn btn-primary btn-block" data-act="waitlist" data-session="' + s.id + '">加入候补</button>'
          : '<div class="banner banner-danger">没有适用于本课程且仍有余次的有效课包，无法候补。</div>');
    } else if (!packs.length) {
      action = '<div class="banner banner-danger">没有适用于本课程且仍有余次的有效课包。过期课包或类型不符的课包不可约。</div>' +
        (expiredPkgs.length ? '<p class="small muted">你有课包但不可用于本节：' + expiredPkgs.map(function (v) {
          return esc(v.pkg.name) + (v.expired ? "（已过期）" : "（" + restrictLabel(v.pkg) + " / 可约 " + v.stats.available + "）");
        }).join("；") + "</p>" : "") +
        '<a class="btn btn-ghost btn-block" href="#/c/buy">查看演示购卡说明</a>';
    } else {
      action = '<label class="field"><span>使用课包（约成预占 1 次）</span><select class="input" id="pkg-select">' + pkgOpts + "</select></label>" +
        '<button class="btn btn-primary btn-block" data-act="book-group" data-session="' + s.id + '">预约本节团课</button>' +
        '<p class="demo-note">团课默认自动确认，约成后直接进入「已确认」，不必再等店员确认。</p>';
    }
    return '<div class="page-title"><div><div class="sub">' + esc(Rules.formatDateWeek(s.date)) + "</div><h1>" + esc(c.name) + "</h1></div>" +
      '<a class="btn btn-ghost btn-sm" href="#/c/schedule?date=' + s.date + '">返回课表</a></div>' +
      '<div class="card"><dl class="kv">' +
      "<dt>时间</dt><dd>" + esc(s.start) + "–" + esc(s.end) + "（" + c.durationMin + " 分钟）</dd>" +
      "<dt>教练</dt><dd><a href=\"#/c/coach/" + s.coachId + "\">" + esc(coach(s.coachId).name) + "</a></dd>" +
      "<dt>教室</dt><dd>" + esc(room(s.roomId).name) + " · 教室容纳 " + room(s.roomId).capacity + " 人</dd>" +
      "<dt>名额</dt><dd>本节容量取课程上限（" + c.maxPeople + "）与教室容纳的较小值，共 " + cap + " 人；已约 " + used + "，剩余 " + left + "。</dd>" +
      "<dt>取消</dt><dd>开课前 " + state.settings.cancelWindowHours + " 小时可免费取消：退回预占次数并释放名额。窗口外顾客不可自行取消，由门店处理时默认不退次。</dd>" +
      "</dl><p class=\"small muted\">" + esc(c.intro) + "</p></div>" +
      '<div class="card mt-16">' + action + "</div>";
  }

  function coachesPage(forPrivate) {
    return state.coaches.filter(function (c) { return c.enabled; }).map(function (c) {
      return '<a class="card" href="#/c/coach/' + c.id + '" style="display:block">' +
        "<h3>" + esc(c.name) + '</h3><div class="small muted">' + esc(c.title) + " · " + esc((c.specialties || []).join(" / ")) +
        "</div><p class=\"small mb-0\">" + esc(c.bio) + "</p></a>";
    }).join("");
  }

  function customerPrivate() {
    return '<div class="page-title"><div><div class="sub">先选教练，再选日期与时段</div><h1>私教预约</h1></div></div>' +
      '<div class="banner banner-sand">私教为一人一时段。同一教练同一时间不能既上团课又接私教，也不能重叠两节私教。当前门店私教确认方式：' +
      (state.settings.privateConfirmMode === "manual" ? "手动确认（约成后进入待确认）" : "自动确认（约成后直接已确认）") + "。</div>" +
      coachesPage(true);
  }

  function customerCoach(id, route) {
    var t = coach(id);
    if (!t.id) return '<div class="empty"><h3>找不到该教练</h3></div>';
    var date = route.query.date || Rules.dateStr(Rules.addDays(now(), 1));
    var courseId = route.query.course || "p1";
    var c = course(courseId);
    var slots = Rules.privateAvailability(state, id, date, c, now());
    var days = dayList(now(), 10);
    var packs = Rules.usablePackages(state, state.ui.customerId, c, now());
    var privates = state.courses.filter(function (x) { return x.type === "private" && x.enabled; });
    var slotHtml = slots.length ? '<div class="slot-grid">' + slots.map(function (sl) {
      if (!sl.available) return '<div class="slot is-off">' + esc(sl.start) + "<br><span class=\"faint\">" + esc(sl.reason || "不可约") + "</span></div>";
      return '<button type="button" class="slot" data-act="pick-slot" data-coach="' + id + '" data-date="' + date +
        '" data-start="' + sl.start + '" data-end="' + sl.end + '" data-room="' + sl.roomId + '" data-course="' + courseId + '">' +
        esc(sl.start) + "–" + esc(sl.end) + "<br><span class=\"faint\">" + esc(room(sl.roomId).name) + "</span></button>";
    }).join("") + "</div>" : '<div class="empty"><h3>这一天没有可约窗口</h3><p>请换一天，或查看其他教练。</p></div>';
    var packHtml = packs.length
      ? '<p class="small muted mt-16">约成将预占所选课包 1 次。当前可用：' + packs.map(function (p) { return esc(p.pkg.name) + "（可约 " + p.stats.available + "）"; }).join("、") + "</p>"
      : '<div class="banner banner-danger mt-16">没有适用于私教且仍有余次的有效课包，无法预约。</div>';
    return '<div class="page-title"><div><div class="sub">' + esc(t.title) + "</div><h1>" + esc(t.name) + "</h1></div>" +
      '<a class="btn btn-ghost btn-sm" href="#/c/private">全部教练</a></div>' +
      '<div class="card"><p>' + esc(t.bio) + "</p><p class=\"small muted\">擅长：" + esc((t.specialties || []).join("、")) + "</p></div>" +
      '<div class="section-label">预约时段</div><div class="card">' +
      '<label class="field"><span>课程</span><select class="input" id="pv-course" data-coach="' + id + '" data-date="' + date + '">' +
      privates.map(function (x) { return '<option value="' + x.id + '"' + (x.id === courseId ? " selected" : "") + ">" + esc(x.name) + " · " + x.durationMin + " 分钟</option>"; }).join("") +
      "</select></label>" +
      '<div class="day-strip">' + days.map(function (d) {
        return '<button type="button" class="day-chip ' + (d.date === date ? "is-on" : "") + '" data-act="go" data-href="#/c/coach/' + id + "?course=" + courseId + "&date=" + d.date + '">' +
          '<span class="wk">' + d.week + '</span><span class="num">' + d.day + "</span></button>";
      }).join("") + "</div>" + slotHtml + packHtml + "</div>";
  }

  function customerBookings(route) {
    var tab = route.query.tab || "upcoming";
    var mid = state.ui.customerId;
    var rows = state.bookings.filter(function (b) { return b.memberId === mid; }).map(function (b) {
      return { b: b, s: session(b.sessionId) };
    }).filter(function (x) { return x.s; }).sort(function (a, b) {
      return Rules.sessionStart(b.s) - Rules.sessionStart(a.s);
    });
    function inTab(x) {
      if (tab === "wait") return x.b.status === "候补中";
      if (tab === "history") return ["已完成", "已取消", "已拒绝", "缺席", "候补失效"].indexOf(x.b.status) !== -1;
      return ["待确认", "已确认", "已到店", "服务中"].indexOf(x.b.status) !== -1;
    }
    var list = rows.filter(inTab);
    return '<div class="page-title"><div><div class="sub">三端共用同一套预约数据</div><h1>我的预约</h1></div></div>' +
      '<div class="tabs">' +
      [["upcoming", "待上课"], ["wait", "候补"], ["history", "历史"]].map(function (t) {
        return '<button type="button" class="' + (tab === t[0] ? "is-on" : "") + '" data-act="go" data-href="#/c/bookings?tab=' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>" +
      (list.length ? '<div class="card">' + list.map(function (x) {
        return '<a class="list-row" href="#/c/booking/' + x.b.id + '"><div><div class="name"><strong>' +
          esc(course(x.b.courseId).name) + "</strong> " + statusChip(x.b.status) + "</div>" +
          '<div class="small muted">' + esc(Rules.formatDateWeek(x.s.date)) + " " + esc(x.s.start) + "–" + esc(x.s.end) +
          " · " + esc(coach(x.s.coachId).name) +
          (x.s.demoFlag === "outOfWindow" ? " · 窗口外取消示范" : "") +
          "</div></div><span class=\"faint\">查看</span></a>";
      }).join("") + "</div>" : '<div class="empty"><h3>这一栏还没有预约</h3><p>可以从课表或私教入口预约。</p></div>');
  }

  function customerBooking(id) {
    var b = find(state.bookings, id);
    if (!b || b.memberId !== state.ui.customerId) return '<div class="empty"><h3>找不到该预约</h3></div>';
    var s = session(b.sessionId);
    var inWin = s && Rules.inCancelWindow(state, s, now());
    var hours = s ? Rules.hoursUntilStart(s, now()) : 0;
    var actions = "";
    if (b.status === "候补中") {
      actions = '<button class="btn btn-ghost btn-block" data-act="cancel-booking" data-id="' + b.id + '">取消候补</button>';
    } else if (b.status === "已确认" || b.status === "待确认") {
      if (inWin) {
        actions = '<button class="btn btn-danger btn-block" data-act="cancel-booking" data-id="' + b.id + '">窗口内取消（退回次数并释放名额）</button>' +
          '<p class="demo-note">距开课约 ' + hours.toFixed(1) + " 小时，满足开课前 " + state.settings.cancelWindowHours + " 小时的免费取消条件。</p>";
      } else {
        actions = '<div class="banner banner-warn">已过取消窗口（开课前 ' + state.settings.cancelWindowHours +
          " 小时）。顾客不能自行取消。窗口外由门店取消或记缺席时，默认不退回已预占次数，但会释放名额。</div>";
      }
      if (b.status === "已确认" && s && s.date === Rules.dateStr(now())) {
        actions += '<a class="btn btn-pine btn-block mt-8" href="#/c/checkin/' + b.id + '">出示签到码</a>';
      }
    }
    var pkg = find(state.packages, b.packageId);
    var st = pkg ? Rules.packageStats(state, pkg.id) : null;
    return '<div class="page-title"><div><div class="sub">预约详情</div><h1>' + esc(course(b.courseId).name) + "</h1></div>" +
      '<a class="btn btn-ghost btn-sm" href="#/c/bookings">返回</a></div>' +
      (s.demoFlag === "outOfWindow" ? '<div class="banner banner-sand">这是一节一次性示范课，用于体验窗口外无法自行取消。当打开当天没有自然的窗口外课次时，种子会补上这一节。</div>' : "") +
      '<div class="card"><div class="row-between">' + statusChip(b.status) +
      (b.type === "private" ? '<span class="chip">私教</span>' : '<span class="chip">团课</span>') + "</div>" +
      '<dl class="kv mt-16"><dt>时间</dt><dd>' + esc(Rules.formatDateWeek(s.date)) + " " + esc(s.start) + "–" + esc(s.end) + "</dd>" +
      "<dt>教练 / 教室</dt><dd>" + esc(coach(s.coachId).name) + " · " + esc(room(s.roomId).name) + "</dd>" +
      "<dt>课包</dt><dd>" + (pkg ? esc(pkg.name) + "（可约 " + st.available + " / 预占 " + st.held + " / 已核销 " + st.deducted + "）" : "—") + "</dd>" +
      (b.cancelReason ? "<dt>说明</dt><dd>" + esc(b.cancelReason) + "</dd>" : "") +
      "</dl></div><div class=\"card mt-16\">" + (actions || '<p class="muted small mb-0">当前状态无需操作。</p>') + "</div>";
  }

  function customerCheckin(id) {
    var b = find(state.bookings, id);
    if (!b) return '<div class="empty"><h3>找不到该预约</h3></div>';
    return '<div class="page-title"><div><div class="sub">到店后请前台或教练核销</div><h1>出示签到码</h1></div></div>' +
      '<div class="card sign-code"><div class="small muted">演示签到码</div><div class="digits">' + Rules.checkInCode(b) + "</div>" +
      "<p class=\"small muted\">" + esc(course(b.courseId).name) + "<br>" + esc(member(b.memberId).name) + "</p>" +
      '<div class="banner banner-sand">顾客不能自行改核销结果。请将此码出示给店员，由店员在课次名单中签到。签到后预占次数转为已核销。</div></div>';
  }

  function customerMembership() {
    var packs = Rules.memberPackagesView(state, state.ui.customerId, now());
    return '<div class="page-title"><div><div class="sub">余次、有效期与课类限制</div><h1>会员与课包</h1></div>' +
      '<a class="btn btn-sm btn-ghost" href="#/c/buy">演示购卡</a></div>' +
      packs.map(function (v) {
        return '<a class="card" href="#/c/package/' + v.pkg.id + '" style="display:block"><div class="row-between"><strong>' +
          esc(v.pkg.name) + "</strong>" + (v.expired ? '<span class="chip chip-danger">已过期</span>' : '<span class="chip chip-sage">有效</span>') +
          "</div><div class=\"pkg-nums\"><div><span class=\"n\">" + v.stats.available + '</span><span class="l">可约</span></div>' +
          "<div><span class=\"n\">" + v.stats.held + '</span><span class="l">预占</span></div>' +
          "<div><span class=\"n\">" + v.stats.deducted + '</span><span class="l">已核销</span></div>' +
          "<div><span class=\"n\">" + v.stats.total + '</span><span class="l">总计</span></div></div>' +
          '<div class="small muted mt-8">' + esc(restrictLabel(v.pkg)) + " · 有效期至 " + esc(v.pkg.expireAt) + "</div></a>";
      }).join("") +
      '<p class="small muted">可约次数 = 总计 − 预占 − 已核销。预约成功预占 1 次；窗口内取消退回；签到后预占转为已核销。不会出现负余额，也不会对同一预约重复扣次。</p>';
  }

  function customerPackage(id) {
    var pkg = find(state.packages, id);
    if (!pkg || pkg.memberId !== state.ui.customerId) return '<div class="empty"><h3>找不到该课包</h3></div>';
    var st = Rules.packageStats(state, pkg.id);
    var entries = state.ledger.filter(function (e) { return e.packageId === id; }).slice().reverse();
    var actName = { issue: "发放", hold: "预占", release: "退回", deduct: "核销", forfeit: "不退次核销" };
    return '<div class="page-title"><div><div class="sub">' + esc(restrictLabel(pkg)) + "</div><h1>" + esc(pkg.name) + "</h1></div></div>" +
      '<div class="card"><div class="pkg-nums"><div><span class="n">' + st.available + '</span><span class="l">可约</span></div>' +
      "<div><span class=\"n\">" + st.held + '</span><span class="l">预占</span></div>' +
      "<div><span class=\"n\">" + st.deducted + '</span><span class="l">已核销</span></div></div>' +
      '<p class="small muted">有效期至 ' + esc(pkg.expireAt) + (Rules.isPackageExpired(pkg, now()) ? "（已过期，不可再约）" : "") + "</p></div>" +
      '<div class="section-label">次数流水</div><div class="card">' +
      (entries.length ? entries.map(function (e) {
        return '<div class="list-row"><div><strong>' + esc(actName[e.action] || e.action) + "</strong><div class=\"small muted\">" +
          esc(e.note) + "<br>" + new Date(e.at).toLocaleString("zh-CN", { hour12: false }) + "</div></div><div>" + (e.action === "issue" || e.action === "release" ? "+" : "−") + e.qty + "</div></div>";
      }).join("") : "<p class=\"muted\">暂无流水</p>") + "</div>";
  }

  function customerRecords() {
    var mid = state.ui.customerId;
    var rows = state.bookings.filter(function (b) { return b.memberId === mid && (b.status === "已完成" || b.status === "缺席" || b.deducted); })
      .map(function (b) { return { b: b, s: session(b.sessionId) }; })
      .filter(function (x) { return x.s; })
      .sort(function (a, b) { return Rules.sessionStart(b.s) - Rules.sessionStart(a.s); });
    return '<div class="page-title"><div><div class="sub">上课与扣次历史</div><h1>消费与上课记录</h1></div></div>' +
      (rows.length ? '<div class="card">' + rows.map(function (x) {
        return '<div class="list-row"><div><strong>' + esc(course(x.b.courseId).name) + "</strong> " + statusChip(x.b.status) +
          '<div class="small muted">' + esc(Rules.formatDateWeek(x.s.date)) + " " + esc(x.s.start) + (x.b.deducted ? " · 已扣 1 次" : "") + "</div></div></div>";
      }).join("") + "</div>" : '<div class="empty"><h3>还没有上课记录</h3></div>');
  }

  function customerMe() {
    var m = member(state.ui.customerId);
    return '<div class="page-title"><div><div class="sub">当前演示顾客</div><h1>' + esc(m.name) + "</h1></div></div>" +
      '<div class="card"><dl class="kv"><dt>手机</dt><dd>' + esc(m.phoneMasked) + "（虚构）</dd><dt>入会</dt><dd>" + esc(m.joinedAt) + "</dd></dl>" +
      '<p class="small muted">' + esc(m.note) + "</p></div>" +
      '<div class="card"><a class="list-row" href="#/c/bookings"><span>我的预约</span><span class="faint">查看</span></a>' +
      '<a class="list-row" href="#/c/membership"><span>课包余次</span><span class="faint">查看</span></a>' +
      '<a class="list-row" href="#/c/records"><span>上课记录</span><span class="faint">查看</span></a>' +
      '<a class="list-row" href="#/c/store"><span>门店介绍</span><span class="faint">查看</span></a></div>' +
      '<div class="banner banner-sand">分享与提醒在本样品中仅为示意，不会向真实用户发送消息，也不把转发当作解锁条件。</div>';
  }

  function customerBuy() {
    return '<div class="page-title"><div><div class="sub">先约后付 · 未接真实支付</div><h1>演示购卡</h1></div></div>' +
      '<div class="banner banner-warn">本样品不接入银行卡、微信或第三方支付，也不产生真实收款。以下仅演示到店结算后的课包入账。</div>' +
      '<div class="card"><label class="field"><span>选择要办理的课包</span><select class="input" id="buy-type">' +
      '<option value="group">团课畅练 10 次（仅限团课，90 天）</option>' +
      '<option value="private">私教精练 4 次（仅限私教，60 天）</option>' +
      '<option value="reformer">改革器专项 8 次（仅限改革器类，90 天）</option>' +
      '</select></label><p class="small muted">结算方式：到店支付 / 前台结算（示意）。确认后会把演示课包发放到当前顾客名下，便于继续体验预约和余次变化。</p>' +
      '<button class="btn btn-primary btn-block" data-act="demo-buy">确认到店结算并入账（演示）</button></div>';
  }

  /* store in a registry so the rest of the file can grow */
  window.FitFlowUI = {
    state: function () { return state; },
    setState: function (s) { state = s; },
    now: now, esc: esc, save: save, go: go, toast: toast, modal: modal, closeModal: closeModal,
    parseRoute: parseRoute, roleOf: roleOf, codeOf: codeOf, renderBar: renderBar, pageWrap: pageWrap, denied: denied,
    course: course, coach: coach, room: room, member: member, session: session, staff: staff, find: find,
    statusChip: statusChip, capHtml: capHtml, classRow: classRow, restrictLabel: restrictLabel, dayList: dayList,
    CAT: CAT,
    views: {
      customerHome: customerHome, customerStore: customerStore, customerSchedule: customerSchedule,
      customerClass: customerClass, customerPrivate: customerPrivate, customerCoach: customerCoach,
      customerBookings: customerBookings, customerBooking: customerBooking, customerCheckin: customerCheckin,
      customerMembership: customerMembership, customerPackage: customerPackage, customerRecords: customerRecords,
      customerMe: customerMe, customerBuy: customerBuy
    }
  };
})();
