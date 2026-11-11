/* FitFlow P2 — 店员端、老板端页面与交互 */
(function () {
  var Rules = window.FitFlowRules;
  var Store = window.FitFlowStore;
  var UI = window.FitFlowUI;
  function state() { return UI.state(); }
  function now() { return UI.now(); }
  var esc = UI.esc, save = UI.save, go = UI.go, toast = UI.toast, modal = UI.modal;
  var course = UI.course, coach = UI.coach, room = UI.room, member = UI.member, session = UI.session, staff = UI.staff, find = UI.find;
  var statusChip = UI.statusChip, capHtml = UI.capHtml, classRow = UI.classRow, restrictLabel = UI.restrictLabel, dayList = UI.dayList;

  function currentStaff() {
    return staff(state().ui.staffId) || state().staff[0];
  }

  function capLine(s) {
    if (s.canceled) return "已停课";
    if (Rules.sessionEnd(s).getTime() <= now().getTime()) {
      var arrived = state().bookings.filter(function (b) {
        return b.sessionId === s.id && (b.status === "已到店" || b.status === "服务中" || b.status === "已完成");
      }).length;
      return "到课 " + arrived;
    }
    var left = Rules.remainingSpots(state(), s);
    return left ? "余 " + left : "满员";
  }

  function sessionsOn(date, coachId) {
    return state().sessions.filter(function (s) {
      if (s.date !== date) return false;
      if (coachId && s.coachId !== coachId) return false;
      return true;
    }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  }

  function pendingPrivates() {
    return state().bookings.filter(function (b) { return b.status === "待确认" && b.type === "private"; })
      .map(function (b) { return { b: b, s: session(b.sessionId) }; })
      .filter(function (x) { return x.s; })
      .sort(function (a, b) { return Rules.sessionStart(a.s) - Rules.sessionStart(b.s); });
  }

  function staffToday() {
    var date = Rules.dateStr(now());
    var me = currentStaff();
    var list = sessionsOn(date, me && me.kind === "coach" ? me.coachId : null);
    var pending = pendingPrivates();
    var cards = list.map(function (s) {
      var booked = state().bookings.filter(function (b) { return b.sessionId === s.id && (Rules.occupiesSlot(b) || b.status === "已完成" || b.status === "缺席"); });
      var wait = Rules.waitlistOf(state(), s.id);
      var todo = booked.filter(function (b) { return b.status === "已确认"; }).length;
      var tags = "";
      if (s.canceled) tags += '<span class="chip chip-line">已停课</span> ';
      if (s.type === "private") tags += '<span class="chip">私教</span> ';
      if (todo) tags += '<span class="chip chip-warn">待签到 ' + todo + "</span> ";
      if (Rules.remainingSpots(state(), s) === 0 && !s.canceled) tags += '<span class="chip chip-clay">满员</span> ';
      if (wait.length) tags += '<span class="chip chip-info">候补 ' + wait.length + "</span> ";
      return '<a class="card session-card" href="#/s/session/' + s.id + '"><div class="head"><strong>' +
        esc(s.start) + "–" + esc(s.end) + " " + esc(course(s.courseId).name) + "</strong>" + capHtml(state(), s) + "</div>" +
        '<div class="small muted mt-8">' + esc(coach(s.coachId).name) + " · " + esc(room(s.roomId).name) +
        " · " + (Rules.sessionEnd(s).getTime() <= now().getTime() ? "名单 " + booked.length + " 人" : "已约 " + booked.length) + "</div><div class=\"mt-8\">" + tags + "</div></a>";
    }).join("");
    return '<div class="page-title"><div><div class="sub">今日 · ' + esc(me ? me.name + "（" + me.title + "）" : "") +
      '</div><h1>今日课次</h1></div><a class="btn btn-sm btn-ghost" href="#/s/pending">待确认 ' + pending.length + "</a></div>" +
      (pending.length ? '<div class="banner banner-warn">有 ' + pending.length + ' 节私教待确认。手动确认模式下新的私教预约会进入待确认。</div>' : "") +
      (cards || '<div class="empty"><h3>今天没有课次</h3><p>若你是教练，可在顶部切换演示身份查看自己的排班。前台默认看到全店今日课次。</p></div>');
  }

  function staffSession(id) {
    var s = session(id);
    if (!s) return '<div class="empty"><h3>找不到该课次</h3></div>';
    var rows = state().bookings.filter(function (b) { return b.sessionId === s.id && !b.waitlist && ["候补失效"].indexOf(b.status) === -1; });
    var wait = Rules.waitlistOf(state(), s.id);
    var canCheck = rows.filter(function (b) { return b.status === "已确认"; });
    function row(b) {
      var actions = "";
      if (b.status === "已确认") {
        actions = '<button class="btn btn-sm btn-sage" data-act="checkin" data-id="' + b.id + '">签到</button> ' +
          '<button class="btn btn-sm btn-danger" data-act="noshow" data-id="' + b.id + '">记缺席</button>';
      } else if (b.status === "待确认") {
        actions = '<button class="btn btn-sm btn-sage" data-act="confirm-private" data-id="' + b.id + '">确认</button> ' +
          '<button class="btn btn-sm btn-danger" data-act="reject-private" data-id="' + b.id + '">拒绝</button>';
      } else if (b.status === "已到店") {
        actions = '<button class="btn btn-sm btn-pine" data-act="start-service" data-id="' + b.id + '">开始上课</button> ' +
          '<button class="btn btn-sm btn-primary" data-act="complete" data-id="' + b.id + '">完成</button>';
      } else if (b.status === "服务中") {
        actions = '<button class="btn btn-sm btn-primary" data-act="complete" data-id="' + b.id + '">完成课程</button>';
      }
      if ((b.status === "已确认" || b.status === "待确认") && Rules.inCancelWindow(state(), s, now())) {
        actions += ' <button class="btn btn-sm btn-ghost" data-act="staff-cancel" data-id="' + b.id + '">取消并退次</button>';
      } else if (b.status === "已确认" || b.status === "待确认") {
        actions += ' <button class="btn btn-sm btn-ghost" data-act="staff-cancel-out" data-id="' + b.id + '">窗口外取消（不退次）</button>';
      }
      return '<div class="list-row"><div><strong>' + esc(member(b.memberId).name) + "</strong> " + statusChip(b.status) +
        '<div class="small muted">' + esc(member(b.memberId).phoneMasked) + (b.bookedBy === "staff" ? " · 代约" : "") +
        (b.deducted ? " · 已扣次" : "") + "</div><div class=\"mt-8\">" + actions + "</div></div></div>";
    }
    return '<div class="page-title"><div><div class="sub">' + esc(Rules.formatDateWeek(s.date)) + " " + esc(s.start) + "–" + esc(s.end) +
      "</div><h1>" + esc(course(s.courseId).name) + "</h1></div><a class=\"btn btn-sm btn-ghost\" href=\"#/s/today\">返回今日</a></div>" +
      '<div class="card"><div class="row-between">' + capHtml(state(), s) + "<span class=\"small muted\">" +
      esc(coach(s.coachId).name) + " · " + esc(room(s.roomId).name) + "</span></div>" +
      (s.canceled ? '<div class="banner banner-warn mt-8">本课次已停课。</div>' : "") +
      (canCheck.length ? '<div class="mt-16"><button class="btn btn-sage" data-act="batch-checkin" data-session="' + s.id + '">为本节待签到学员批量签到</button></div>' : "") +
      '<div class="mt-16"><a class="btn btn-ghost" href="#/s/book?session=' + s.id + '">代顾客预约本节</a></div></div>' +
      '<div class="section-label">名单</div><div class="card">' + (rows.length ? rows.map(row).join("") : '<p class="muted">还没有预约。</p>') + "</div>" +
      (wait.length ? '<div class="section-label">候补（演示项，非每家店必交）</div><div class="card">' + wait.map(function (b, i) {
        return '<div class="list-row"><div><strong>' + (i + 1) + ". " + esc(member(b.memberId).name) + "</strong> " + statusChip(b.status) +
          '<div class="small muted">按加入顺序转正。候补期间不预占次数。</div></div></div>';
      }).join("") + "</div>" : "");
  }

  function staffMembers(route) {
    var q = (route.query.q || "").trim();
    var list = state().members.filter(function (m) {
      if (!q) return true;
      return m.name.indexOf(q) !== -1 || m.phoneMasked.indexOf(q) !== -1;
    });
    return '<div class="page-title"><div><div class="sub">按姓名或手机号查询</div><h1>会员</h1></div>' +
      '<a class="btn btn-sm btn-primary" href="#/s/book">代预约</a></div>' +
      '<form data-act="search-member" class="card"><label class="field mb-0"><span>查询</span>' +
      '<input class="input" name="q" value="' + esc(q) + '" placeholder="例如：林予安，或 1201"></label>' +
      '<button class="btn btn-pine mt-16" type="submit">查询</button></form>' +
      (list.length ? '<div class="card mt-16">' + list.map(function (m) {
        var packs = Rules.memberPackagesView(state(), m.id, now());
        var avail = packs.filter(function (v) { return v.usable; }).map(function (v) { return v.pkg.name + " 可约 " + v.stats.available; }).join("；") || "暂无可用课包";
        return '<a class="list-row" href="#/s/member/' + m.id + '"><div><strong>' + esc(m.name) + "</strong>" +
          '<div class="small muted">' + esc(m.phoneMasked) + " · " + esc(avail) + "</div></div><span class=\"faint\">档案</span></a>";
      }).join("") + "</div>" : '<div class="empty"><h3>没有找到符合的会员</h3></div>');
  }

  function memberDetail(id, fromBoss) {
    var m = member(id);
    if (!m.id) return '<div class="empty"><h3>找不到该会员</h3></div>';
    var packs = Rules.memberPackagesView(state(), m.id, now());
    var books = state().bookings.filter(function (b) { return b.memberId === m.id; })
      .map(function (b) { return { b: b, s: session(b.sessionId) }; })
      .filter(function (x) { return x.s; })
      .sort(function (a, b) { return Rules.sessionStart(b.s) - Rules.sessionStart(a.s); })
      .slice(0, 12);
    var leaves = state().leaves.filter(function (l) { return l.memberId === m.id; });
    var prefix = fromBoss ? "#/b" : "#/s";
    return '<div class="page-title"><div><div class="sub">' + esc(m.phoneMasked) + "</div><h1>" + esc(m.name) + "</h1></div>" +
      '<a class="btn btn-sm btn-primary" href="#/s/book?member=' + m.id + '">代预约</a></div>' +
      '<div class="card"><p class="small muted">' + esc(m.note) + "</p></div>" +
      '<div class="section-label">课包</div>' + packs.map(function (v) {
        return '<div class="card"><div class="row-between"><strong>' + esc(v.pkg.name) + "</strong>" +
          (v.expired ? '<span class="chip chip-danger">已过期</span>' : statusAvail(v)) + "</div>" +
          '<div class="small muted">' + esc(restrictLabel(v.pkg)) + " · 可约 " + v.stats.available + " / 预占 " + v.stats.held + " / 已核销 " + v.stats.deducted +
          " · 至 " + esc(v.pkg.expireAt) + "</div></div>";
      }).join("") +
      (fromBoss ? '<div class="mt-16"><a class="btn btn-ghost" href="#/b/packages?member=' + m.id + '">为该会员发放演示课包</a></div>' : "") +
      '<div class="section-label">预约记录</div><div class="card">' + (books.length ? books.map(function (x) {
        return '<div class="list-row"><div><strong>' + esc(course(x.b.courseId).name) + "</strong> " + statusChip(x.b.status) +
          '<div class="small muted">' + esc(Rules.formatDateWeek(x.s.date)) + " " + esc(x.s.start) + "</div></div></div>";
      }).join("") : "<p class=\"muted\">暂无预约</p>") + "</div>" +
      '<div class="section-label">手工请假 / 补课记录</div><div class="card">' +
      (leaves.length ? leaves.map(function (l) {
        return '<div class="list-row"><div>' + esc(l.date) + " · " + esc(l.reason) +
          '<div class="small muted">补课安排：' + esc(l.makeupNote || "尚未备注") + " · 由 " + esc(l.createdBy) + " 登记</div></div></div>";
      }).join("") : '<p class="muted">暂无记录。请假补课首版由门店手工处理，不会自动改课表或自动给名额。</p>') +
      '<a class="btn btn-ghost mt-8" href="#/s/leaves?member=' + m.id + '">登记请假</a></div>';
  }

  function statusAvail(v) {
    if (v.usable) return '<span class="chip chip-sage">可约 ' + v.stats.available + "</span>";
    return '<span class="chip chip-line">不可约</span>';
  }

  function staffBook(route) {
    var mid = route.query.member || "";
    var sid = route.query.session || "";
    var typ = route.query.type || (sid && session(sid) && session(sid).type === "private" ? "private" : "group");
    var date = route.query.date || (sid && session(sid) ? session(sid).date : Rules.dateStr(Rules.addDays(now(), 1)));
    var memberOpts = '<option value="">请选择会员</option>' + state().members.map(function (m) {
      return '<option value="' + m.id + '"' + (m.id === mid ? " selected" : "") + ">" + esc(m.name) + " · " + esc(m.phoneMasked) + "</option>";
    }).join("");
    var body = '<label class="field"><span>代哪位顾客预约</span><select class="input" id="proxy-member">' + memberOpts + "</select></label>";
    if (typ === "group") {
      var days = dayList(now(), 10);
      var list = state().sessions.filter(function (s) { return s.date === date && s.type === "group" && !s.canceled; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      body += '<div class="day-strip">' + days.map(function (d) {
        return '<button type="button" class="day-chip ' + (d.date === date ? "is-on" : "") +
          '" data-act="go" data-href="#/s/book?type=group&member=' + mid + "&date=" + d.date + '"><span class="wk">' + d.week +
          '</span><span class="num">' + d.day + "</span></button>";
      }).join("") + "</div>";
      body += list.length ? list.map(function (s) {
        var sel = sid === s.id ? " is-on" : "";
        return '<button type="button" class="btn btn-ghost btn-block mt-8' + sel + '" data-act="go" data-href="#/s/book?type=group&member=' + mid + "&date=" + date + "&session=" + s.id + '">' +
          esc(s.start) + " " + esc(course(s.courseId).name) + " · 余 " + Rules.remainingSpots(state(), s) + "</button>";
      }).join("") : '<div class="empty"><h3>这一天没有可代约的团课</h3></div>';
      if (sid && session(sid)) {
        body += '<div class="mt-16"><button class="btn btn-primary btn-block" data-act="proxy-group" data-session="' + sid + '">确认代约本节团课</button>' +
          '<p class="demo-note">将按该会员适用课包预占 1 次。团课自动确认。</p></div>';
      }
    } else {
      var coaches = state().coaches.filter(function (c) { return c.enabled; });
      var cid = route.query.coach || (coaches[0] && coaches[0].id);
      var courseId = route.query.course || "p1";
      body += '<label class="field"><span>教练</span><select class="input" id="proxy-coach">' +
        coaches.map(function (c) { return '<option value="' + c.id + '"' + (c.id === cid ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") +
        '</select></label><label class="field"><span>课程</span><select class="input" id="proxy-pcourse">' +
        state().courses.filter(function (c) { return c.type === "private"; }).map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === courseId ? " selected" : "") + ">" + esc(c.name) + "</option>";
        }).join("") + "</select></label>";
      var days = dayList(now(), 10);
      body += '<div class="day-strip">' + days.map(function (d) {
        return '<button type="button" class="day-chip ' + (d.date === date ? "is-on" : "") +
          '" data-act="sync-proxy-private" data-date="' + d.date + '"><span class="wk">' + d.week + '</span><span class="num">' + d.day + "</span></button>";
      }).join("") + "</div>";
      var cobj = course(courseId);
      var slots = cid ? Rules.privateAvailability(state(), cid, date, cobj, now()) : [];
      body += '<div class="slot-grid">' + slots.map(function (sl) {
        if (!sl.available) return '<div class="slot is-off">' + esc(sl.start) + "<br>" + esc(sl.reason || "") + "</div>";
        return '<button type="button" class="slot" data-act="proxy-private" data-coach="' + cid + '" data-date="' + date +
          '" data-start="' + sl.start + '" data-end="' + sl.end + '" data-room="' + sl.roomId + '" data-course="' + courseId + '">' +
          esc(sl.start) + "–" + esc(sl.end) + "</button>";
      }).join("") + "</div><p class=\"demo-note\">点选时段即代为预约。确认方式以营业规则为准。</p>";
    }
    return '<div class="page-title"><div><div class="sub">店员或老板可代客预约</div><h1>代顾客预约</h1></div></div>' +
      '<div class="tabs"><button class="' + (typ === "group" ? "is-on" : "") + '" data-act="go" data-href="#/s/book?type=group&member=' + mid + '">团课</button>' +
      '<button class="' + (typ === "private" ? "is-on" : "") + '" data-act="go" data-href="#/s/book?type=private&member=' + mid + '">私教</button></div>' +
      '<div class="card">' + body + "</div>";
  }

  function staffSchedule() {
    var me = currentStaff();
    var days = dayList(now(), 7);
    if (!me || me.kind === "front") {
      return '<div class="page-title"><div><div class="sub">前台</div><h1>我的排班</h1></div></div>' +
        '<div class="banner banner-sand">当前演示身份是前台，没有教学排班。今日协助课次请看「今日课次」。可在顶部把演示身份切换为教练，查看教练视角的排班。</div>' +
        '<a class="btn btn-pine" href="#/s/today">查看今日课次</a>';
    }
    var html = '<div class="page-title"><div><div class="sub">' + esc(me.name) + " 的课次</div><h1>我的排班</h1></div></div>";
    days.forEach(function (d) {
      var list = sessionsOn(d.date, me.coachId).filter(function (s) { return !s.canceled; });
      html += '<div class="section-label">' + d.week + (d.today ? " · 今天" : "") + " " + d.date.slice(5) + "</div>";
      html += list.length ? '<div class="card">' + list.map(function (s) {
        return '<a class="class-item" href="#/s/session/' + s.id + '"><div class="time">' + esc(s.start) + "<span>" + esc(s.end) + "</span></div><div><div class=\"name\">" +
          esc(course(s.courseId).name) + "</div><div class=\"meta\">" + esc(room(s.roomId).name) + (s.type === "private" ? " · 私教" : " · 团课") +
          "</div></div>" + capHtml(state(), s) + "</a>";
      }).join("") + "</div>" : '<div class="empty" style="padding:20px"><h3>无排班</h3></div>';
    });
    return html;
  }

  function staffMe() {
    var me = currentStaff();
    return '<div class="page-title"><div><div class="sub">店员中心</div><h1>' + esc(me ? me.name : "") + "</h1></div></div>" +
      '<div class="card"><dl class="kv"><dt>身份</dt><dd>' + esc(me ? me.title : "") + '</dd><dt>权限</dt><dd>可看今日课次、代约、签到核销、处理待确认私教、登记手工请假。不能改全店课表、教室、卡项规则或查看经营看板。这些操作请切换到老板角色。</dd></dl></div>' +
      '<div class="card"><a class="list-row" href="#/s/today"><span>今日课次</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/s/pending"><span>待确认私教</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/s/leaves"><span>手工请假记录</span><span class="faint">打开</span></a></div>' +
      '<p class="demo-note">顶部角色与身份切换仅供演示，正式产品不会保留。</p>';
  }

  function staffPending() {
    var list = pendingPrivates();
    return '<div class="page-title"><div><div class="sub">同一条状态机上的确认步骤</div><h1>待确认私教</h1></div></div>' +
      '<div class="banner banner-sand">当前私教确认方式为「' + (state().settings.privateConfirmMode === "manual" ? "手动确认" : "自动确认") +
      '」。可在老板端营业规则中切换。切到手动后，新的私教预约会进入待确认；自动确认则约成后直接已确认。</div>' +
      (list.length ? list.map(function (x) {
        return '<div class="card"><div class="row-between"><strong>' + esc(member(x.b.memberId).name) + "</strong>" + statusChip(x.b.status) + "</div>" +
          '<p class="small muted">' + esc(Rules.formatDateWeek(x.s.date)) + " " + esc(x.s.start) + "–" + esc(x.s.end) + " · " +
          esc(course(x.b.courseId).name) + " · " + esc(coach(x.s.coachId).name) + "</p>" +
          '<button class="btn btn-sm btn-sage" data-act="confirm-private" data-id="' + x.b.id + '">确认</button> ' +
          '<button class="btn btn-sm btn-danger" data-act="reject-private" data-id="' + x.b.id + '">拒绝并退回次数</button></div>';
      }).join("") : '<div class="empty"><h3>现在没有待确认的私教</h3><p>把确认方式改为手动后，再新预约一节私教，即可在这里处理。</p></div>');
  }

  function staffLeaves(route) {
    var mid = route.query.member || "";
    var list = state().leaves.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    return '<div class="page-title"><div><div class="sub">不自动改课表，也不自动给名额</div><h1>手工请假记录</h1></div></div>' +
      '<div class="banner banner-sand">请假补课首版由门店手工处理。这里只登记原因和补课安排备注，不会自动重新排课。</div>' +
      '<div class="card"><label class="field"><span>会员</span><select class="input" id="leave-member"><option value="">请选择</option>' +
      state().members.map(function (m) { return '<option value="' + m.id + '"' + (m.id === mid ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>请假日期</span><input class="input" id="leave-date" type="date" value="' + Rules.dateStr(now()) + '"></label>' +
      '<label class="field"><span>原因</span><input class="input" id="leave-reason" placeholder="例如：出差、身体不适"></label>' +
      '<label class="field"><span>补课安排备注</span><textarea class="input" id="leave-makeup" placeholder="例如：改约到下周四同一节，由前台确认名额后再约"></textarea></label>' +
      '<button class="btn btn-primary" data-act="add-leave">登记</button></div>' +
      '<div class="section-label">已登记</div><div class="card">' +
      (list.length ? list.map(function (l) {
        return '<div class="list-row"><div><strong>' + esc(member(l.memberId).name) + "</strong> · " + esc(l.date) +
          '<div class="small muted">' + esc(l.reason) + "<br>补课：" + esc(l.makeupNote || "未备注") + " · " + esc(l.createdBy) + "</div></div></div>";
      }).join("") : "<p class=\"muted\">还没有记录</p>") + "</div>";
  }

  /* -------- boss -------- */
  function bossDash() {
    var d = Rules.dashboard(state(), now());
    return '<div class="page-title"><div><div class="sub">数字全部由演示数据汇总，会随操作变化</div><h1>经营看板</h1></div></div>' +
      '<div class="stat-grid">' +
      [["今日有效约课", d.booked], ["今日到课", d.arrived], ["今日消课扣次", d.deducted], ["今日缺席", d.noshow]].map(function (x) {
        return '<div class="stat"><div class="n">' + x[1] + '</div><div class="l">' + x[0] + "</div></div>";
      }).join("") + "</div>" +
      '<div class="stat-grid mt-16">' +
      [["今日课次", d.todaySessions], ["待确认私教", d.pending], ["本周约课", d.weekBooked], ["本周到课", d.weekArrived]].map(function (x) {
        return '<div class="stat"><div class="n">' + x[1] + '</div><div class="l">' + x[0] + "</div></div>";
      }).join("") + "</div>" +
      '<div class="grid-2 mt-16"><div class="card"><h3>近两周热门课程</h3>' +
      (d.popular.length ? d.popular.slice(0, 5).map(function (p) {
        return '<div class="list-row"><span>' + esc(p.name) + '</span><strong>' + p.count + "</strong></div>";
      }).join("") : "<p class=\"muted\">暂无数据</p>") +
      '</div><div class="card"><h3>即将到期或已过期仍有余次的课包</h3>' +
      (d.expiring.length ? d.expiring.slice(0, 6).map(function (x) {
        return '<div class="list-row"><div>' + esc(x.member ? x.member.name : "") + " · " + esc(x.package.name) +
          '<div class="small muted">' + (x.expired ? "已过期 " : "到期 ") + esc(x.expireAt) + " · 可约 " + x.stats.available + "</div></div></div>";
      }).join("") : "<p class=\"muted\">近 21 天内没有即将到期的有效余次。</p>") +
      "</div></div><p class=\"demo-note mt-16\">今日候补 " + d.waitlistToday + " 人（候补为演示项）。</p>";
  }

  function bossCourses() {
    return '<div class="page-title"><div><div class="sub">团课与私教</div><h1>课程管理</h1></div>' +
      '<a class="btn btn-sm btn-primary" href="#/b/course/new">新增课程</a></div>' +
      state().courses.map(function (c) {
        return '<a class="card" href="#/b/course/' + c.id + '" style="display:block"><div class="row-between"><strong>' + esc(c.name) + "</strong>" +
          '<span class="chip">' + (c.type === "private" ? "私教" : "团课") + " · 上限 " + c.maxPeople + "</span></div>" +
          '<p class="small muted mb-0">' + esc(c.intro) + (c.enabled ? "" : "（已停用）") + "</p></a>";
      }).join("");
  }

  function bossCourse(id) {
    var c = id === "new" ? { id: "", name: "", type: "group", category: "pilates", durationMin: 60, maxPeople: 8, intro: "", enabled: true } : course(id);
    if (id !== "new" && !c.id) return '<div class="empty"><h3>找不到该课程</h3></div>';
    return '<div class="page-title"><div><h1>' + (id === "new" ? "新增课程" : "编辑课程") + '</h1></div></div><form class="card" data-act="save-course" data-id="' + esc(id) + '">' +
      '<label class="field"><span>名称</span><input class="input" name="name" value="' + esc(c.name) + '" required></label>' +
      '<label class="field"><span>类型</span><select class="input" name="type"><option value="group"' + (c.type === "group" ? " selected" : "") +
      ">团课</option><option value=\"private\"" + (c.type === "private" ? " selected" : "") + ">私教</option></select></label>" +
      '<label class="field"><span>课类（用于课包限制）</span><select class="input" name="category">' +
      [["reformer", "改革器"], ["yoga", "瑜伽"], ["pilates", "普拉提"], ["private", "私教"]].map(function (x) {
        return '<option value="' + x[0] + '"' + (c.category === x[0] ? " selected" : "") + ">" + x[1] + "</option>";
      }).join("") + "</select></label>" +
      '<label class="field"><span>时长（分钟）</span><input class="input" name="durationMin" type="number" min="15" value="' + c.durationMin + '"></label>' +
      '<label class="field"><span>课程人数上限</span><input class="input" name="maxPeople" type="number" min="1" value="' + c.maxPeople + '"><span class="demo-note">团课实际名额取此上限与教室容纳的较小值。</span></label>' +
      '<label class="field"><span>简介</span><textarea class="input" name="intro">' + esc(c.intro) + "</textarea></label>" +
      '<label class="switch"><input type="checkbox" name="enabled"' + (c.enabled ? " checked" : "") + "> 启用</label>" +
      '<div class="mt-16"><button class="btn btn-primary" type="submit">保存</button></div></form>';
  }

  function bossSchedule(route) {
    var weekOffset = parseInt(route.query.w || "0", 10) || 0;
    var today = Rules.atLocal(Rules.dateStr(now()), "00:00");
    var weekStart = Rules.addDays(Rules.addDays(today, -(Rules.weekday(now()) - 1)), weekOffset * 7);
    var grid = '<div class="week-grid">';
    for (var i = 0; i < 7; i++) {
      var d = Rules.addDays(weekStart, i);
      var ds = Rules.dateStr(d);
      var items = state().sessions.filter(function (s) { return s.date === ds && s.type === "group"; })
        .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      grid += '<div class="day-col ' + (ds === Rules.dateStr(now()) ? "is-today" : "") + '"><h4>' + Rules.WEEKDAYS[Rules.weekday(d)] + " " +
        (d.getMonth() + 1) + "/" + d.getDate() + "</h4>" + items.map(function (s) {
          return '<div class="week-card"><div class="t">' + esc(s.start) + " " + esc(course(s.courseId).name) + "</div>" +
            '<div class="faint">' + esc(coach(s.coachId).name) + " · " + capLine(s) + "</div>" +
            ((s.canceled || Rules.sessionEnd(s).getTime() <= now().getTime()) ? "" : '<button class="btn btn-sm btn-ghost mt-8" data-act="stop-session" data-id="' + s.id + '">临时停课</button>') +
            "</div>";
        }).join("") + "</div>";
    }
    grid += "</div>";
    var tpls = state().weeklyGroup.filter(function (t) { return t.enabled; }).slice().sort(function (a, b) {
      return a.weekday === b.weekday ? (a.start < b.start ? -1 : 1) : a.weekday - b.weekday;
    });
    return '<div class="page-title"><div><div class="sub">周循环排课，生成具体日期场次</div><h1>周课表与排期</h1></div>' +
      '<div><button class="btn btn-sm btn-ghost" data-act="go" data-href="#/b/schedule?w=' + (weekOffset - 1) + '">上一周</button> ' +
      '<button class="btn btn-sm btn-ghost" data-act="go" data-href="#/b/schedule?w=' + (weekOffset + 1) + '">下一周</button></div></div>' +
      grid + '<div class="section-label">按星期重复的模板</div><div class="card table-wrap"><table class="data"><thead><tr><th>星期</th><th>时间</th><th>课程</th><th>教练</th><th>教室</th></tr></thead><tbody>' +
      tpls.map(function (t) {
        return "<tr><td>" + Rules.WEEKDAYS[t.weekday] + "</td><td>" + esc(t.start) + "–" + esc(t.end) + "</td><td>" +
          esc(course(t.courseId).name) + "</td><td>" + esc(coach(t.coachId).name) + "</td><td>" + esc(room(t.roomId).name) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<div class="section-label">新增一节周循环团课</div><form class="card" data-act="add-weekly">' +
      '<label class="field"><span>星期</span><select class="input" name="weekday">' +
      [1,2,3,4,5,6,7].map(function (w) { return '<option value="' + w + '">' + Rules.WEEKDAYS[w] + "</option>"; }).join("") +
      '</select></label><label class="field"><span>开始</span><input class="input" name="start" type="time" value="18:00" required></label>' +
      '<label class="field"><span>课程</span><select class="input" name="courseId">' +
      state().courses.filter(function (c) { return c.type === "group"; }).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>教练</span><select class="input" name="coachId">' +
      state().coaches.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>教室</span><select class="input" name="roomId">' +
      state().rooms.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "（容纳 " + r.capacity + "）</option>"; }).join("") +
      "</select></label><button class=\"btn btn-primary\" type=\"submit\">加入周循环并生成课次</button>" +
      '<p class="demo-note">会校验同一教练、同一教室在该星期同时段是否冲突。结束时间按课程时长计算。</p></form>' +
      '<div class="section-label">新增一次指定日期的团课</div><form class="card" data-act="add-once">' +
      '<label class="field"><span>日期</span><input class="input" name="date" type="date" value="' + Rules.dateStr(Rules.addDays(now(), 1)) + '" required></label>' +
      '<label class="field"><span>开始</span><input class="input" name="start" type="time" value="16:00" required></label>' +
      '<label class="field"><span>课程</span><select class="input" name="courseId">' +
      state().courses.filter(function (c) { return c.type === "group"; }).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>教练</span><select class="input" name="coachId">' +
      state().coaches.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>教室</span><select class="input" name="roomId">' +
      state().rooms.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") +
      "</select></label><button class=\"btn btn-pine\" type=\"submit\">新增一次课</button></form>";
  }

  function bossRooms() {
    return '<div class="page-title"><div><h1>教室管理</h1></div></div>' +
      state().rooms.map(function (r) {
        return '<form class="card" data-act="save-room" data-id="' + r.id + '"><div class="row-between"><strong>' + esc(r.name) +
          "</strong><span class=\"chip\">容纳 " + r.capacity + " 人</span></div>" +
          '<label class="field mt-16"><span>名称</span><input class="input" name="name" value="' + esc(r.name) + '"></label>' +
          '<label class="field"><span>容纳人数</span><input class="input" name="capacity" type="number" min="1" value="' + r.capacity + '"></label>' +
          '<label class="field"><span>说明</span><input class="input" name="note" value="' + esc(r.note || "") + '"></label>' +
          '<label class="switch"><input type="checkbox" name="enabled"' + (r.enabled ? " checked" : "") + "> 启用</label>" +
          '<div class="mt-16"><button class="btn btn-primary" type="submit">保存</button></div></form>';
      }).join("") +
      '<p class="small muted">团课名额取课程上限与教室容纳的较小值。同一教室同一时段只能有一节有效课。私教室按一人一时段使用。</p>';
  }

  function bossCoaches() {
    return '<div class="page-title"><div><h1>教练与排班</h1></div></div>' +
      state().coaches.map(function (c) {
        var wins = state().weeklyPrivate.filter(function (w) { return w.coachId === c.id && w.enabled; });
        return '<div class="card"><div class="row-between"><h3>' + esc(c.name) + "</h3><span class=\"chip\">" + esc(c.title) + "</span></div>" +
          "<p class=\"small\">" + esc(c.bio) + "</p>" +
          '<div class="small muted">私教可约窗口：' + (wins.length ? wins.map(function (w) {
            return Rules.WEEKDAYS[w.weekday] + " " + w.start + "–" + w.end + " @" + room(w.roomId).name;
          }).join("；") : "未开放") + "</div>" +
          '<form class="mt-16" data-act="add-private-window" data-coach="' + c.id + '">' +
          '<div class="grid-2"><label class="field"><span>星期</span><select class="input" name="weekday">' +
          [1,2,3,4,5,6,7].map(function (w) { return '<option value="' + w + '">' + Rules.WEEKDAYS[w] + "</option>"; }).join("") +
          '</select></label><label class="field"><span>教室</span><select class="input" name="roomId">' +
          state().rooms.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") +
          '</select></label><label class="field"><span>开始</span><input class="input" name="start" type="time" value="14:00"></label>' +
          '<label class="field"><span>结束</span><input class="input" name="end" type="time" value="18:00"></label></div>' +
          '<button class="btn btn-sm btn-ghost" type="submit">增加私教可约窗口</button></form></div>';
      }).join("");
  }

  function bossPackages(route) {
    var mid = route.query.member || "";
    var list = state().packages.slice().reverse();
    return '<div class="page-title"><div><h1>课包与卡项</h1></div></div>' +
      '<form class="card" data-act="issue-package"><h3>发放演示课包</h3>' +
      '<label class="field"><span>会员</span><select class="input" name="memberId">' +
      state().members.map(function (m) { return '<option value="' + m.id + '"' + (m.id === mid ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join("") +
      '</select></label><label class="field"><span>名称</span><input class="input" name="name" value="演示课包 8 次"></label>' +
      '<label class="field"><span>次数</span><input class="input" name="total" type="number" min="1" value="8"></label>' +
      '<label class="field"><span>限制</span><select class="input" name="restrict">' +
      '<option value="group">仅限团课</option><option value="private">仅限私教</option><option value="category">仅限改革器类</option></select></label>' +
      '<label class="field"><span>有效期至</span><input class="input" name="expireAt" type="date" value="' + Rules.dateStr(Rules.addDays(now(), 90)) + '"></label>' +
      '<button class="btn btn-primary" type="submit">发放（演示，非真实售卖）</button></form>' +
      '<div class="section-label">全部课包</div><div class="card table-wrap"><table class="data"><thead><tr><th>会员</th><th>课包</th><th>可约 / 预占 / 核销</th><th>限制</th><th>有效期</th></tr></thead><tbody>' +
      list.map(function (p) {
        var st = Rules.packageStats(state(), p.id);
        return "<tr><td>" + esc(member(p.memberId).name) + "</td><td>" + esc(p.name) + "</td><td>" +
          st.available + " / " + st.held + " / " + st.deducted + "</td><td>" + esc(restrictLabel(p)) + "</td><td>" +
          esc(p.expireAt) + (Rules.isPackageExpired(p, now()) ? "（过期）" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function bossRecords() {
    var entries = state().ledger.slice().sort(function (a, b) { return b.at - a.at; }).slice(0, 80);
    var actName = { issue: "发放", hold: "预占", release: "退回", deduct: "核销", forfeit: "不退次核销" };
    return '<div class="page-title"><div><h1>消课与消费记录</h1></div></div>' +
      '<div class="card table-wrap"><table class="data"><thead><tr><th>时间</th><th>会员</th><th>动作</th><th>说明</th></tr></thead><tbody>' +
      entries.map(function (e) {
        return "<tr><td>" + new Date(e.at).toLocaleString("zh-CN", { hour12: false }) + "</td><td>" + esc(member(e.memberId).name) +
          "</td><td>" + esc(actName[e.action] || e.action) + " " + e.qty + "</td><td>" + esc(e.note) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function bossRules() {
    var s = state().settings;
    return '<div class="page-title"><div><h1>营业规则</h1></div></div>' +
      '<div class="banner banner-sand">试用视觉 / 色值未锁定，待创始人确认。当前试用深松绿、暖砂色、赤陶色、鼠尾草绿，不是已批准的品牌规范。</div>' +
      '<form class="card" data-act="save-rules">' +
      '<label class="field"><span>免费取消窗口（开课前 N 小时）</span>' +
      '<input class="input" name="cancelWindowHours" type="number" min="0" max="48" value="' + s.cancelWindowHours + '">' +
      '<span class="demo-note">窗口内取消：退回预占次数并释放名额。窗口外：顾客不可自行取消；店员/老板取消或记缺席时，默认不退次，仍释放名额。</span></label>' +
      '<label class="field"><span>私教确认方式</span><select class="input" name="privateConfirmMode">' +
      '<option value="auto"' + (s.privateConfirmMode === "auto" ? " selected" : "") + ">自动确认（约成后直接已确认）</option>" +
      '<option value="manual"' + (s.privateConfirmMode === "manual" ? " selected" : "") + ">手动确认（约成后进入待确认）</option></select>" +
      '<span class="demo-note">这是同一条状态机上的确认方式配置，不是第二套状态机。团课始终自动确认。</span></label>' +
      '<button class="btn btn-primary" type="submit">保存规则</button></form>';
  }

  function bossStore() {
    var st = state().settings.store;
    return '<div class="page-title"><div><h1>门店资料</h1></div></div>' +
      '<form class="card" data-act="save-store">' +
      '<label class="field"><span>门店名称</span><input class="input" name="name" value="' + esc(st.name) + '"></label>' +
      '<label class="field"><span>一句话</span><input class="input" name="slogan" value="' + esc(st.slogan) + '"></label>' +
      '<label class="field"><span>地址</span><input class="input" name="address" value="' + esc(st.address) + '"></label>' +
      '<label class="field"><span>电话</span><input class="input" name="phone" value="' + esc(st.phone) + '"></label>' +
      '<label class="field"><span>营业时间</span><input class="input" name="hours" value="' + esc(st.hours) + '"></label>' +
      '<label class="field"><span>公告</span><textarea class="input" name="announcement">' + esc(st.announcement) + "</textarea></label>" +
      '<label class="field"><span>介绍</span><textarea class="input" name="about">' + esc(st.about) + "</textarea></label>" +
      '<button class="btn btn-primary" type="submit">保存</button></form>';
  }

  function bossStaff() {
    return '<div class="page-title"><div><h1>身份权限</h1></div></div>' +
      '<div class="banner banner-sand">权限由业务规则控制。顾客只能操作自己的预约和课包；店员可代约、签到、查会员，但不能改课表与经营规则；老板拥有店员全部操作，并额外拥有配置与看板权限。</div>' +
      '<div class="card">' + state().staff.map(function (s) {
        return '<div class="list-row"><div><strong>' + esc(s.name) + "</strong><div class=\"small muted\">" + esc(s.title) + " · " +
          (s.kind === "owner" ? "老板" : s.kind === "coach" ? "教练" : "前台") + (s.enabled ? "" : " · 已停用") +
          "</div></div></div>";
      }).join("") + "</div>" +
      '<form class="card mt-16" data-act="add-staff"><h3>添加店员（演示）</h3>' +
      '<label class="field"><span>姓名</span><input class="input" name="name" required></label>' +
      '<label class="field"><span>身份</span><select class="input" name="kind"><option value="front">前台</option><option value="coach">教练</option></select></label>' +
      '<button class="btn btn-primary" type="submit">添加</button></form>';
  }

  function bossOps() {
    return '<div class="page-title"><div><h1>经营</h1></div></div><div class="card">' +
      '<a class="list-row" href="#/b/members"><span>会员档案</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/b/packages"><span>课包与卡项</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/b/records"><span>消课与消费记录</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/s/today"><span>今日课次与签到</span><span class="faint">打开</span></a>' +
      '<a class="list-row" href="#/s/leaves"><span>手工请假记录</span><span class="faint">打开</span></a></div>';
  }

  UI.views.staffToday = staffToday;
  UI.views.staffSession = staffSession;
  UI.views.staffMembers = staffMembers;
  UI.views.memberDetail = memberDetail;
  UI.views.staffBook = staffBook;
  UI.views.staffSchedule = staffSchedule;
  UI.views.staffMe = staffMe;
  UI.views.staffPending = staffPending;
  UI.views.staffLeaves = staffLeaves;
  UI.views.bossDash = bossDash;
  UI.views.bossCourses = bossCourses;
  UI.views.bossCourse = bossCourse;
  UI.views.bossSchedule = bossSchedule;
  UI.views.bossRooms = bossRooms;
  UI.views.bossCoaches = bossCoaches;
  UI.views.bossPackages = bossPackages;
  UI.views.bossRecords = bossRecords;
  UI.views.bossRules = bossRules;
  UI.views.bossStore = bossStore;
  UI.views.bossStaff = bossStaff;
  UI.views.bossOps = bossOps;
})();
