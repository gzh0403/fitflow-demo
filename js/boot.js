/* FitFlow P2 — 路由、权限与操作 */
(function () {
  var Rules = window.FitFlowRules;
  var Store = window.FitFlowStore;
  var UI = window.FitFlowUI;
  var V = UI.views;

  function state() { return UI.state(); }
  function now() { return UI.now(); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function selectedPkg() { return val("pkg-select"); }

  function persist() {
    UI.save();
    render();
  }

  function resultToast(r, okMsg) {
    if (!r || !r.ok) { UI.toast((r && r.error) || "操作未完成"); return false; }
    var extra = "";
    if (r.promoted && r.promoted.length) extra += " 已将 " + r.promoted.length + " 位候补转正并预占次数。";
    if (r.skipped && r.skipped.length) extra += " 有 " + r.skipped.length + " 位候补因课包不可用被跳过。";
    if (r.waitlist) extra = " " + (r.note || "已加入候补。");
    if (r.refunded) extra += " 已退回预占 1 次并释放名额。";
    if (r.refunded === false && !r.waitlist && !r.waitlistCancelled) extra += " 名额已释放，次数不退回。";
    UI.toast((okMsg || "已完成") + extra);
    return true;
  }

  function requireMember(id, err) {
    if (!id) { UI.toast(err || "请先选择会员"); return false; }
    return true;
  }

  function render() {
    Rules.ensureSessions(state(), now(), 10, 21);
    var route = UI.parseRoute();
    var want = UI.roleOf(route.role);
    var have = state().ui.role;
    var html;
    var allowed = true;
    if (route.role === "c" && have !== "customer") { html = UI.denied("顾客"); allowed = false; }
    else if (route.role === "s" && have !== "staff" && have !== "boss") { html = UI.denied("店员或老板"); allowed = false; }
    else if (route.role === "b" && have !== "boss") { html = UI.denied("老板"); allowed = false; }

    if (allowed) {
      if (route.role === "c") {
        if (route.page === "home") html = V.customerHome();
        else if (route.page === "store") html = V.customerStore();
        else if (route.page === "schedule") html = V.customerSchedule(route);
        else if (route.page === "class") html = V.customerClass(route.id);
        else if (route.page === "private") html = V.customerPrivate();
        else if (route.page === "coach") html = V.customerCoach(route.id, route);
        else if (route.page === "bookings") html = V.customerBookings(route);
        else if (route.page === "booking") html = V.customerBooking(route.id);
        else if (route.page === "checkin") html = V.customerCheckin(route.id);
        else if (route.page === "membership") html = V.customerMembership();
        else if (route.page === "package") html = V.customerPackage(route.id);
        else if (route.page === "records") html = V.customerRecords();
        else if (route.page === "me") html = V.customerMe();
        else if (route.page === "buy") html = V.customerBuy();
        else html = V.customerHome();
      } else if (route.role === "s") {
        if (route.page === "today") html = V.staffToday();
        else if (route.page === "session") html = V.staffSession(route.id);
        else if (route.page === "members") html = V.staffMembers(route);
        else if (route.page === "member") html = V.memberDetail(route.id, false);
        else if (route.page === "book") html = V.staffBook(route);
        else if (route.page === "schedule") html = V.staffSchedule();
        else if (route.page === "me") html = V.staffMe();
        else if (route.page === "pending") html = V.staffPending();
        else if (route.page === "leaves") html = V.staffLeaves(route);
        else html = V.staffToday();
      } else {
        if (route.page === "dashboard") html = V.bossDash();
        else if (route.page === "courses") html = V.bossCourses();
        else if (route.page === "course") html = V.bossCourse(route.id);
        else if (route.page === "schedule") html = V.bossSchedule(route);
        else if (route.page === "rooms") html = V.bossRooms();
        else if (route.page === "coaches" || route.page === "coach") html = V.bossCoaches();
        else if (route.page === "members") html = V.staffMembers(route);
        else if (route.page === "member") html = V.memberDetail(route.id, true);
        else if (route.page === "packages") html = V.bossPackages(route);
        else if (route.page === "records") html = V.bossRecords();
        else if (route.page === "rules") html = V.bossRules();
        else if (route.page === "store") html = V.bossStore();
        else if (route.page === "staff") html = V.bossStaff();
        else if (route.page === "ops") html = V.bossOps();
        else html = V.bossDash();
      }
    }

    var app = document.getElementById("app");
    app.className = "app-shell role-" + have;
    UI.renderBar();
    app.innerHTML = UI.pageWrap(html, route);
    bindAfterRender();
  }

  function bindAfterRender() {
    var pv = document.getElementById("pv-course");
    if (pv) {
      pv.addEventListener("change", function () {
        var coachId = pv.getAttribute("data-coach");
        var date = pv.getAttribute("data-date");
        UI.go("#/c/coach/" + coachId + "?course=" + pv.value + "&date=" + date);
      });
    }
    var pc = document.getElementById("proxy-coach");
    var pcc = document.getElementById("proxy-pcourse");
    function syncProxy() {
      if (!pc) return;
      var route = UI.parseRoute();
      var mid = (document.getElementById("proxy-member") || {}).value || route.query.member || "";
      var date = route.query.date || Rules.dateStr(Rules.addDays(now(), 1));
      UI.go("#/s/book?type=private&member=" + mid + "&coach=" + pc.value + "&course=" + (pcc ? pcc.value : "p1") + "&date=" + date);
    }
    if (pc) pc.addEventListener("change", syncProxy);
    if (pcc) pcc.addEventListener("change", syncProxy);
  }

  function formData(form) {
    var fd = new FormData(form);
    var o = {};
    fd.forEach(function (v, k) { o[k] = v; });
    form.querySelectorAll('input[type="checkbox"]').forEach(function (el) { o[el.name] = el.checked; });
    return o;
  }

  function onClick(ev) {
    var t = ev.target.closest("[data-act]");
    if (!t) return;
    if (t.closest && ev.target.closest(".modal") && t.getAttribute("data-act") !== "close-modal" && ev.currentTarget.id === "app") {
      /* ignore */
    }
    var act = t.getAttribute("data-act");
    if (t.tagName === "A") return;
    ev.preventDefault();
    handle(act, t);
  }

  function handle(act, el) {
    var st = state();
    var id = el.getAttribute("data-id");
    if (act === "close-modal") { UI.closeModal(); return; }
    if (act === "go") { UI.go(el.getAttribute("data-href")); return; }
    if (act === "switch-role") {
      st.ui.role = el.getAttribute("data-role");
      UI.save();
      UI.go(st.ui.role === "customer" ? "#/c/home" : st.ui.role === "staff" ? "#/s/today" : "#/b/dashboard");
      return;
    }
    if (act === "switch-staff") {
      st.ui.staffId = el.getAttribute("data-id");
      persist();
      return;
    }
    if (act === "reset") {
      UI.modal({
        title: "重置演示数据？",
        body: "<p>将恢复为虚拟工作室的初始课表、预约和课包，当前在本机做的演示操作会被清除。</p>",
        okText: "确认重置",
        danger: true,
        onok: function () {
          UI.setState(Store.reset(now()));
          UI.toast("演示数据已重置");
          UI.go(state().ui.role === "staff" ? "#/s/today" : state().ui.role === "boss" ? "#/b/dashboard" : "#/c/home");
        }
      });
      return;
    }
    if (act === "book-group") {
      var r = Rules.bookGroup(st, {
        sessionId: el.getAttribute("data-session"),
        memberId: st.ui.customerId,
        packageId: selectedPkg(),
        now: now(),
        bookedBy: "self"
      });
      if (resultToast(r, "预约成功，已预占 1 次，团课已自动确认。")) {
        UI.save();
        UI.go("#/c/booking/" + r.booking.id);
      }
      return;
    }
    if (act === "waitlist") {
      var r2 = Rules.joinWaitlist(st, {
        sessionId: el.getAttribute("data-session"),
        memberId: st.ui.customerId,
        packageId: selectedPkg(),
        now: now(),
        bookedBy: "self"
      });
      if (resultToast(r2, "已加入候补。")) persist();
      return;
    }
    if (act === "cancel-booking") {
      var booking = Rules.find(st.bookings, id);
      UI.modal({
        title: booking && booking.status === "候补中" ? "取消候补？" : "确认取消预约？",
        body: "<p>若在取消窗口内，将退回预占次数并释放名额。若该课次有候补，将按加入顺序尝试转正。</p>",
        okText: "确认取消",
        danger: true,
        onok: function () {
          var r = Rules.cancelBooking(st, { bookingId: id, now: now(), actor: "customer" });
          if (resultToast(r, booking && booking.status === "候补中" ? "已取消候补。" : "已取消预约。")) persist();
        }
      });
      return;
    }
    if (act === "staff-cancel") {
      var r3 = Rules.cancelBooking(st, { bookingId: id, now: now(), actor: "staff", reason: "门店窗口内取消，退回次数" });
      if (resultToast(r3, "已取消并退回次数。")) persist();
      return;
    }
    if (act === "staff-cancel-out") {
      UI.modal({
        title: "窗口外取消？",
        body: "<p>将释放名额，但不退回已预占次数（预占转为已核销）。若有候补，将按顺序转正。</p>",
        okText: "确认不退次取消",
        danger: true,
        onok: function () {
          var r = Rules.cancelBooking(st, { bookingId: id, now: now(), actor: "staff", forceForfeit: true, reason: "窗口外取消，不退次" });
          if (resultToast(r, "已窗口外取消。")) persist();
        }
      });
      return;
    }
    if (act === "pick-slot") {
      var packs = Rules.usablePackages(st, st.ui.customerId, Rules.find(st.courses, el.getAttribute("data-course")), now());
      if (!packs.length) { UI.toast("没有适用于私教且仍有余次的有效课包。"); return; }
      var rr = Rules.bookPrivate(st, {
        memberId: st.ui.customerId,
        courseId: el.getAttribute("data-course"),
        coachId: el.getAttribute("data-coach"),
        date: el.getAttribute("data-date"),
        start: el.getAttribute("data-start"),
        end: el.getAttribute("data-end"),
        roomId: el.getAttribute("data-room"),
        packageId: packs[0].pkg.id,
        now: now(),
        bookedBy: "self"
      });
      if (resultToast(rr, rr.autoConfirmed ? "私教预约成功，已自动确认并预占 1 次。" : "私教预约已提交，当前为手动确认，状态为待确认，已预占 1 次。")) {
        UI.save();
        UI.go("#/c/booking/" + rr.booking.id);
      }
      return;
    }
    if (act === "confirm-private") {
      if (resultToast(Rules.confirmPrivate(st, { bookingId: id, now: now() }), "已确认该私教预约。")) persist();
      return;
    }
    if (act === "reject-private") {
      if (resultToast(Rules.rejectPrivate(st, { bookingId: id, now: now() }), "已拒绝，次数已退回，时段已释放。")) persist();
      return;
    }
    if (act === "checkin") {
      if (resultToast(Rules.checkIn(st, { bookingId: id, now: now() }), "已签到，预占已转为已核销。")) persist();
      return;
    }
    if (act === "batch-checkin") {
      var sid = el.getAttribute("data-session");
      var n = 0, err = 0;
      st.bookings.filter(function (b) { return b.sessionId === sid && b.status === "已确认"; }).forEach(function (b) {
        var r = Rules.checkIn(st, { bookingId: b.id, now: now() });
        if (r.ok) n++; else err++;
      });
      UI.toast("已为 " + n + " 人签到核销。" + (err ? " " + err + " 条未成功。" : ""));
      persist();
      return;
    }
    if (act === "start-service") {
      if (resultToast(Rules.startService(st, { bookingId: id, now: now() }), "已开始上课。")) persist();
      return;
    }
    if (act === "complete") {
      if (resultToast(Rules.completeService(st, { bookingId: id, now: now() }), "课程已完成。")) persist();
      return;
    }
    if (act === "noshow") {
      UI.modal({
        title: "记为缺席？",
        body: "<p>将释放名额，不退回已预占次数。</p>",
        okText: "确认缺席",
        danger: true,
        onok: function () {
          if (resultToast(Rules.markNoShow(st, { bookingId: id, now: now() }), "已记缺席。")) persist();
        }
      });
      return;
    }
    if (act === "demo-buy") {
      var typ = val("buy-type") || "group";
      var spec = {
        group: { name: "团课畅练 10 次", restrict: "group", total: 10, days: 90 },
        private: { name: "私教精练 4 次", restrict: "private", total: 4, days: 60 },
        reformer: { name: "改革器专项 8 次", restrict: "category", categories: ["reformer"], total: 8, days: 90 }
      }[typ];
      var issued = Rules.issuePackage(st, {
        memberId: st.ui.customerId,
        name: spec.name,
        restrict: spec.restrict,
        categories: spec.categories || [],
        total: spec.total,
        expireAt: Rules.dateStr(Rules.addDays(now(), spec.days)),
        now: now(),
        note: "到店结算演示入账，未发生真实收款"
      });
      if (resultToast(issued, "演示课包已入账，未发生真实收款。")) {
        UI.save();
        UI.go("#/c/membership");
      }
      return;
    }
    if (act === "add-leave") {
      var mid = val("leave-member");
      if (!requireMember(mid, "请选择会员")) return;
      var rec = Rules.addLeave(st, {
        memberId: mid,
        date: val("leave-date"),
        reason: val("leave-reason"),
        makeupNote: val("leave-makeup"),
        createdBy: (Rules.find(st.staff, st.ui.staffId) || { name: "店员" }).name,
        now: now()
      });
      if (resultToast(rec, "已登记请假。系统没有自动改课表或补名额。")) persist();
      return;
    }
    if (act === "proxy-group") {
      var mid2 = val("proxy-member") || UI.parseRoute().query.member;
      if (!requireMember(mid2, "请先选择要代约的会员")) return;
      var sess = Rules.find(st.sessions, el.getAttribute("data-session"));
      var packs = sess ? Rules.usablePackages(st, mid2, Rules.find(st.courses, sess.courseId), now()) : [];
      if (!packs.length) { UI.toast("该会员没有适用于本节的有效课包余次。"); return; }
      var rg = Rules.bookGroup(st, {
        sessionId: sess.id, memberId: mid2, packageId: packs[0].pkg.id, now: now(),
        bookedBy: "staff", bookedByStaffId: st.ui.staffId
      });
      if (!rg.ok && rg.full) {
        var wl = Rules.joinWaitlist(st, {
          sessionId: sess.id, memberId: mid2, packageId: packs[0].pkg.id, now: now(),
          bookedBy: "staff", bookedByStaffId: st.ui.staffId
        });
        if (resultToast(wl, "本节已满，已帮该会员加入候补。")) persist();
        return;
      }
      if (resultToast(rg, "代约成功，已预占该会员课包 1 次。")) persist();
      return;
    }
    if (act === "proxy-private") {
      var mid3 = val("proxy-member") || UI.parseRoute().query.member;
      if (!requireMember(mid3, "请先选择要代约的会员")) return;
      var courseId = el.getAttribute("data-course");
      var packs2 = Rules.usablePackages(st, mid3, Rules.find(st.courses, courseId), now());
      if (!packs2.length) { UI.toast("该会员没有适用于私教的有效课包余次。"); return; }
      var rp = Rules.bookPrivate(st, {
        memberId: mid3, courseId: courseId, coachId: el.getAttribute("data-coach"),
        date: el.getAttribute("data-date"), start: el.getAttribute("data-start"),
        end: el.getAttribute("data-end"), roomId: el.getAttribute("data-room"),
        packageId: packs2[0].pkg.id, now: now(), bookedBy: "staff", bookedByStaffId: st.ui.staffId
      });
      if (resultToast(rp, rp.autoConfirmed ? "代约私教成功，已自动确认。" : "代约私教已提交，待门店确认。")) persist();
      return;
    }
    if (act === "sync-proxy-private") {
      var route = UI.parseRoute();
      var mid4 = val("proxy-member") || route.query.member || "";
      var cid = val("proxy-coach") || route.query.coach || "";
      var cc = val("proxy-pcourse") || route.query.course || "p1";
      UI.go("#/s/book?type=private&member=" + mid4 + "&coach=" + cid + "&course=" + cc + "&date=" + el.getAttribute("data-date"));
      return;
    }
    if (act === "stop-session") {
      UI.modal({
        title: "确认临时停课？",
        body: "<p>将取消该日期的这一节课，并为尚未到店的预约退回预占次数、释放名额。已签到的记录不会改动。不会自动另排补课。</p>",
        okText: "确认停课",
        danger: true,
        onok: function () {
          if (resultToast(Rules.cancelSession(st, { sessionId: id, now: now(), reason: "临时停课" }), "已停课并处理相关预约。")) persist();
        }
      });
      return;
    }
  }

  function onSubmit(ev) {
    var form = ev.target.closest("form[data-act]");
    if (!form) return;
    ev.preventDefault();
    var act = form.getAttribute("data-act");
    var st = state();
    var data = formData(form);
    if (act === "search-member") {
      var prefix = UI.parseRoute().role === "b" ? "#/b/members" : "#/s/members";
      UI.go(prefix + "?q=" + encodeURIComponent(data.q || ""));
      return;
    }
    if (act === "save-course") {
      var id = form.getAttribute("data-id");
      var row = {
        id: id === "new" ? Rules.uid("cs") : id,
        name: data.name,
        type: data.type,
        category: data.category,
        durationMin: parseInt(data.durationMin, 10) || 60,
        maxPeople: parseInt(data.maxPeople, 10) || 1,
        intro: data.intro || "",
        enabled: !!data.enabled
      };
      if (id === "new") st.courses.push(row);
      else {
        var cur = Rules.find(st.courses, id);
        if (cur) { row.id = cur.id; st.courses.splice(st.courses.indexOf(cur), 1, row); }
      }
      UI.toast("课程已保存。");
      UI.save();
      UI.go("#/b/courses");
      return;
    }
    if (act === "add-weekly") {
      var c = Rules.find(st.courses, data.courseId);
      var end = Rules.defaultEnd(data.start, c ? c.durationMin : 60);
      var added = Rules.addWeeklyGroup(st, {
        weekday: parseInt(data.weekday, 10),
        start: data.start,
        end: end,
        courseId: data.courseId,
        coachId: data.coachId,
        roomId: data.roomId,
        enabled: true
      });
      if (!added.ok) { UI.toast(added.error); return; }
      Rules.ensureSessions(st, now(), 10, 21);
      UI.toast("已加入周循环，并生成近几周课次。");
      persist();
      return;
    }
    if (act === "add-once") {
      var c2 = Rules.find(st.courses, data.courseId);
      var end2 = Rules.defaultEnd(data.start, c2 ? c2.durationMin : 60);
      var roomObj = Rules.find(st.rooms, data.roomId);
      var sess = {
        id: Rules.uid("ss"),
        date: data.date,
        start: data.start,
        end: end2,
        courseId: data.courseId,
        coachId: data.coachId,
        roomId: data.roomId,
        type: "group",
        capacity: Math.min(c2 ? c2.maxPeople : 0, roomObj ? roomObj.capacity : 0),
        source: "once",
        templateId: null,
        canceled: false,
        cancelNote: ""
      };
      var conflicts = Rules.sessionConflicts(st, sess);
      if (conflicts.length) { UI.toast(conflicts[0]); return; }
      st.sessions.push(sess);
      UI.toast("已新增指定日期的一节团课。");
      persist();
      return;
    }
    if (act === "save-room") {
      var room = Rules.find(st.rooms, form.getAttribute("data-id"));
      if (room) {
        room.name = data.name;
        room.capacity = parseInt(data.capacity, 10) || room.capacity;
        room.note = data.note || "";
        room.enabled = !!data.enabled;
      }
      UI.toast("教室已保存。容量变化会影响尚未约满的课次名额。");
      persist();
      return;
    }
    if (act === "add-private-window") {
      st.weeklyPrivate.push({
        id: Rules.uid("wp"),
        coachId: form.getAttribute("data-coach"),
        weekday: parseInt(data.weekday, 10),
        start: data.start,
        end: data.end,
        roomId: data.roomId,
        enabled: true
      });
      UI.toast("已增加私教可约窗口。");
      persist();
      return;
    }
    if (act === "issue-package") {
      var issued = Rules.issuePackage(st, {
        memberId: data.memberId,
        name: data.name,
        restrict: data.restrict,
        categories: data.restrict === "category" ? ["reformer"] : [],
        total: parseInt(data.total, 10) || 1,
        expireAt: data.expireAt,
        now: now()
      });
      if (resultToast(issued, "演示课包已发放。")) persist();
      return;
    }
    if (act === "save-rules") {
      st.settings.cancelWindowHours = Math.max(0, parseInt(data.cancelWindowHours, 10) || 0);
      st.settings.privateConfirmMode = data.privateConfirmMode === "manual" ? "manual" : "auto";
      UI.toast("营业规则已保存。新的私教预约将按新的确认方式执行。");
      persist();
      return;
    }
    if (act === "save-store") {
      st.settings.store.name = data.name;
      st.settings.store.slogan = data.slogan;
      st.settings.store.address = data.address;
      st.settings.store.phone = data.phone;
      st.settings.store.hours = data.hours;
      st.settings.store.announcement = data.announcement;
      st.settings.store.about = data.about;
      UI.toast("门店资料已保存。");
      persist();
      return;
    }
    if (act === "add-staff") {
      st.staff.push({
        id: Rules.uid("st"),
        name: data.name,
        title: data.kind === "coach" ? "教练" : "前台",
        kind: data.kind,
        coachId: null,
        enabled: true
      });
      UI.toast("已添加演示店员。");
      persist();
      return;
    }
  }

  document.getElementById("demo-bar").addEventListener("change", function (ev) {
    var t = ev.target;
    if (t && t.getAttribute("data-act") === "switch-staff-select") {
      state().ui.staffId = t.value;
      persist();
    }
  });
  document.getElementById("demo-bar").addEventListener("click", onClick);
  document.getElementById("app").addEventListener("click", onClick);
  document.getElementById("app").addEventListener("submit", onSubmit);
  document.getElementById("modal-root").addEventListener("click", function (ev) {
    if (ev.target.getAttribute("data-act") === "close-modal") UI.closeModal();
  });
  window.addEventListener("hashchange", render);

  if (!location.hash) location.hash = "#/c/home";
  render();
})();
