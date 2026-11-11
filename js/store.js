/* FitFlow P2 — 本地演示数据与存储。全部人物、电话、门店均为虚构。 */
(function (root) {
  var Rules = root.FitFlowRules;
  var KEY = "fitflow-demo-state-v1";
  var Store = {};

  function baseCatalog() {
    return {
      meta: { version: 1, label: "FitFlow 演示样品" },
      ui: { role: "customer", customerId: "m1", staffId: "s1" },
      settings: {
        cancelWindowHours: 4,
        privateConfirmMode: "auto",
        store: {
          name: "青石普拉提",
          slogan: "把身体安放回安静的节奏里",
          address: "演示地址：湖西路 88 号 · 青石里 3 层（虚构，非真实门店）",
          phone: "010-5555-0100（演示号码，请勿拨打）",
          hours: "07:30–21:00",
          announcement: "本周黄昏增加一节流动瑜伽。团课预约成功即预占 1 次；请在开课 4 小时前取消，以便退回次数并释放名额。本样品未接入真实支付。",
          about: "青石普拉提是 FitFlow 演示用的虚构精品工作室，提供改革器团课、流动瑜伽与一对一私教。所有会员、教练、课次与课包均为虚拟数据，仅供体验产品流程。"
        }
      },
      rooms: [
        { id: "r1", name: "改革器教室", capacity: 8, enabled: true, note: "配备改革器，适合小班普拉提。" },
        { id: "r2", name: "瑜伽大厅", capacity: 12, enabled: true, note: "木地板大厅，适合流动瑜伽。" },
        { id: "r3", name: "私教室", capacity: 1, enabled: true, note: "一对一私教专用，同时只接待一位顾客。" }
      ],
      coaches: [
        { id: "t1", name: "顾清越", title: "改革器与普拉提教练", specialties: ["改革器", "核心塑形"], bio: "演示简介：长期教授改革器基础与核心塑形，强调动作质量与呼吸。", enabled: true },
        { id: "t2", name: "沈予白", title: "瑜伽教练", specialties: ["流动瑜伽", "呼吸"], bio: "演示简介：课程节奏平稳，适合希望把身体慢慢打开的学员。", enabled: true },
        { id: "t3", name: "裴衡", title: "私教教练", specialties: ["体态评估", "一对一普拉提"], bio: "演示简介：以一对一私教为主，兼顾体态评估与针对性练习。", enabled: true }
      ],
      courses: [
        { id: "g1", name: "改革器基础", type: "group", category: "reformer", durationMin: 60, maxPeople: 8, intro: "小班改革器入门课，关注核心稳定与动作轨迹。", enabled: true },
        { id: "g2", name: "流动瑜伽", type: "group", category: "yoga", durationMin: 60, maxPeople: 12, intro: "以呼吸带动的流畅序列，适合日常放松与活动度练习。", enabled: true },
        { id: "g3", name: "核心塑形", type: "group", category: "pilates", durationMin: 50, maxPeople: 8, intro: "垫上与小器械结合的核心训练，节奏比基础课稍紧。", enabled: true },
        { id: "p1", name: "一对一私教普拉提", type: "private", category: "private", durationMin: 60, maxPeople: 1, intro: "根据个人情况安排的一对一普拉提课。", enabled: true },
        { id: "p2", name: "体态评估私教", type: "private", category: "private", durationMin: 60, maxPeople: 1, intro: "以评估和方案讲解为主的一对一时段。", enabled: true }
      ],
      weeklyGroup: [
        { id: "wg1", weekday: 1, start: "07:30", end: "08:30", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg2", weekday: 1, start: "10:00", end: "11:00", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg3", weekday: 1, start: "19:00", end: "20:00", courseId: "g3", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg4", weekday: 2, start: "10:00", end: "11:00", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg5", weekday: 2, start: "19:30", end: "20:30", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg6", weekday: 3, start: "07:30", end: "08:30", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg7", weekday: 3, start: "10:00", end: "11:00", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg8", weekday: 3, start: "19:00", end: "19:50", courseId: "g3", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg9", weekday: 4, start: "10:00", end: "11:00", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg10", weekday: 4, start: "19:30", end: "20:30", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg11", weekday: 5, start: "07:30", end: "08:30", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg12", weekday: 5, start: "12:00", end: "13:00", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg13", weekday: 5, start: "19:00", end: "19:50", courseId: "g3", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg14", weekday: 6, start: "09:30", end: "10:30", courseId: "g1", coachId: "t1", roomId: "r1", enabled: true },
        { id: "wg15", weekday: 6, start: "10:45", end: "11:45", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true },
        { id: "wg16", weekday: 7, start: "10:00", end: "11:00", courseId: "g2", coachId: "t2", roomId: "r2", enabled: true }
      ],
      weeklyPrivate: [
        { id: "wp1", coachId: "t3", weekday: 1, start: "09:00", end: "12:00", roomId: "r3", enabled: true },
        { id: "wp2", coachId: "t3", weekday: 1, start: "14:00", end: "20:00", roomId: "r3", enabled: true },
        { id: "wp3", coachId: "t3", weekday: 2, start: "09:00", end: "12:00", roomId: "r3", enabled: true },
        { id: "wp4", coachId: "t3", weekday: 2, start: "14:00", end: "20:00", roomId: "r3", enabled: true },
        { id: "wp5", coachId: "t3", weekday: 3, start: "09:00", end: "12:00", roomId: "r3", enabled: true },
        { id: "wp6", coachId: "t3", weekday: 3, start: "14:00", end: "20:00", roomId: "r3", enabled: true },
        { id: "wp7", coachId: "t3", weekday: 4, start: "09:00", end: "12:00", roomId: "r3", enabled: true },
        { id: "wp8", coachId: "t3", weekday: 4, start: "14:00", end: "20:00", roomId: "r3", enabled: true },
        { id: "wp9", coachId: "t3", weekday: 5, start: "09:00", end: "12:00", roomId: "r3", enabled: true },
        { id: "wp10", coachId: "t3", weekday: 5, start: "14:00", end: "20:00", roomId: "r3", enabled: true },
        { id: "wp11", coachId: "t3", weekday: 6, start: "09:00", end: "13:00", roomId: "r3", enabled: true },
        { id: "wp12", coachId: "t1", weekday: 2, start: "14:00", end: "18:00", roomId: "r3", enabled: true },
        { id: "wp13", coachId: "t1", weekday: 4, start: "14:00", end: "18:00", roomId: "r3", enabled: true },
        { id: "wp14", coachId: "t2", weekday: 3, start: "15:00", end: "17:00", roomId: "r3", enabled: true },
        { id: "wp15", coachId: "t2", weekday: 5, start: "15:00", end: "17:00", roomId: "r3", enabled: true }
      ],
      sessions: [],
      members: [
        { id: "m1", name: "林予安", phoneMasked: "138****1201", note: "当前演示顾客。团课与私教课包均有余额。", joinedAt: "2026-07-02" },
        { id: "m2", name: "周栖迟", phoneMasked: "139****6630", note: "持有改革器专项课包。", joinedAt: "2026-06-18" },
        { id: "m3", name: "陈晚棠", phoneMasked: "136****8842", note: "团课常客。", joinedAt: "2026-03-09" },
        { id: "m4", name: "许清和", phoneMasked: "150****2018", note: "晚间课较多。", joinedAt: "2026-05-21" },
        { id: "m5", name: "苏暮白", phoneMasked: "186****7741", note: "偶尔上流动瑜伽。", joinedAt: "2026-08-14" },
        { id: "m6", name: "韩听潮", phoneMasked: "131****5509", note: "私教为主。", joinedAt: "2026-04-11" },
        { id: "m7", name: "叶浣溪", phoneMasked: "187****3360", note: "有一张已过期的夏季团课卡，用于演示不可约。", joinedAt: "2026-02-01" }
      ],
      staff: [
        { id: "s1", name: "何暖", title: "前台", kind: "front", coachId: null, enabled: true },
        { id: "s2", name: "顾清越", title: "教练", kind: "coach", coachId: "t1", enabled: true },
        { id: "s3", name: "沈予白", title: "教练", kind: "coach", coachId: "t2", enabled: true },
        { id: "s4", name: "裴衡", title: "教练", kind: "coach", coachId: "t3", enabled: true },
        { id: "s0", name: "南嚮", title: "馆主", kind: "owner", coachId: null, enabled: true }
      ],
      packages: [],
      ledger: [],
      bookings: [],
      leaves: []
    };
  }

  function issueDirect(state, opt) {
    var pkg = {
      id: opt.id,
      memberId: opt.memberId,
      name: opt.name,
      restrict: opt.restrict,
      categories: opt.categories || [],
      total: opt.total,
      expireAt: opt.expireAt,
      issuedAt: opt.issuedAt,
      voided: !!opt.voided,
      note: opt.note || ""
    };
    state.packages.push(pkg);
    state.ledger.push({
      id: "ld_issue_" + pkg.id,
      packageId: pkg.id,
      memberId: pkg.memberId,
      bookingId: null,
      action: "issue",
      qty: pkg.total,
      at: Rules.atLocal(opt.issuedAt, "10:00").getTime(),
      note: "发放课包「" + pkg.name + "」共 " + pkg.total + " 次"
    });
    return pkg;
  }

  function addDaysStr(now, n) {
    return Rules.dateStr(Rules.addDays(now, n));
  }

  function findSession(state, date, start, courseId) {
    for (var i = 0; i < state.sessions.length; i++) {
      var s = state.sessions[i];
      if (s.date === date && s.start === start && s.courseId === courseId && !s.canceled) return s;
    }
    return null;
  }

  function mustBook(state, opt) {
    var r = Rules.bookGroup(state, opt);
    if (!r.ok) throw new Error("种子预约失败（团课）：" + r.error + " @ " + JSON.stringify({ sessionId: opt.sessionId, memberId: opt.memberId }));
    return r.booking;
  }

  function seedHistory(state, now) {
    var today = Rules.dateStr(now);

    issueDirect(state, { id: "pk1", memberId: "m1", name: "团课畅练 16 次", restrict: "group", total: 16, expireAt: addDaysStr(now, 90), issuedAt: addDaysStr(now, -70), note: "仅限团课" });
    issueDirect(state, { id: "pk2", memberId: "m1", name: "私教精练 8 次", restrict: "private", total: 8, expireAt: addDaysStr(now, 60), issuedAt: addDaysStr(now, -40), note: "仅限私教" });
    issueDirect(state, { id: "pk3", memberId: "m2", name: "改革器专项 12 次", restrict: "category", categories: ["reformer"], total: 12, expireAt: addDaysStr(now, 80), issuedAt: addDaysStr(now, -50), note: "仅限改革器类课程" });
    issueDirect(state, { id: "pk4", memberId: "m3", name: "团课畅练 20 次", restrict: "group", total: 20, expireAt: addDaysStr(now, 100), issuedAt: addDaysStr(now, -60) });
    issueDirect(state, { id: "pk5", memberId: "m4", name: "团课畅练 10 次", restrict: "group", total: 10, expireAt: addDaysStr(now, 45), issuedAt: addDaysStr(now, -20) });
    issueDirect(state, { id: "pk6", memberId: "m5", name: "流动瑜伽 8 次", restrict: "category", categories: ["yoga"], total: 8, expireAt: addDaysStr(now, 55), issuedAt: addDaysStr(now, -15), note: "仅限瑜伽类课程" });
    issueDirect(state, { id: "pk7", memberId: "m6", name: "私教精练 10 次", restrict: "private", total: 10, expireAt: addDaysStr(now, 70), issuedAt: addDaysStr(now, -30) });
    issueDirect(state, { id: "pk8", memberId: "m7", name: "夏季团课卡 10 次", restrict: "group", total: 10, expireAt: addDaysStr(now, -18), issuedAt: addDaysStr(now, -80), note: "已过期，不可再约" });
    issueDirect(state, { id: "pk9", memberId: "m3", name: "私教体验 4 次", restrict: "private", total: 4, expireAt: addDaysStr(now, 20), issuedAt: addDaysStr(now, -10) });

    function pastBookAndFinish(memberId, date, start, courseId, packageId) {
      var s = findSession(state, date, start, courseId);
      if (!s) return null;
      var whenBook = Rules.atLocal(date, "00:00");
      whenBook = Rules.addDays(whenBook, -2);
      var b = mustBook(state, { sessionId: s.id, memberId: memberId, packageId: packageId, now: whenBook, bookedBy: "self" });
      var ci = Rules.checkIn(state, { bookingId: b.id, now: Rules.atLocal(date, start) });
      if (!ci.ok) throw new Error("种子签到失败：" + ci.error);
      var done = Rules.completeService(state, { bookingId: b.id, now: Rules.atLocal(date, s.end) });
      if (!done.ok) throw new Error("种子完成失败：" + done.error);
      return b;
    }

    function bookAt(memberId, date, start, courseId, packageId, when) {
      var s = findSession(state, date, start, courseId);
      if (!s) return null;
      return mustBook(state, { sessionId: s.id, memberId: memberId, packageId: packageId, now: when || Rules.addDays(Rules.atLocal(date, "10:00"), -3), bookedBy: "self" });
    }

    var lastWeekDates = [];
    for (var i = 1; i <= 8; i++) lastWeekDates.push(addDaysStr(now, -i));

    lastWeekDates.forEach(function (d) {
      var morningYoga = findSession(state, d, "07:30", "g2") || findSession(state, d, "10:00", "g2") || findSession(state, d, "09:30", "g1") || findSession(state, d, "10:45", "g2");
      var reformer = findSession(state, d, "10:00", "g1") || findSession(state, d, "12:00", "g1") || findSession(state, d, "09:30", "g1");
      if (reformer && Rules.sessionEnd(reformer).getTime() < now.getTime()) {
        /* 林予安只保留少量历史消课，避免演示一开始就没有可约余次 */
        var m1Past = state.bookings.filter(function (b) { return b.memberId === "m1" && b.type === "group" && b.status === "已完成"; }).length;
        if (m1Past < 3) {
          try { pastBookAndFinish("m1", d, reformer.start, reformer.courseId, "pk1"); } catch (e) {}
        }
        try { pastBookAndFinish("m2", d, reformer.start, reformer.courseId, "pk3"); } catch (e) {}
        try { pastBookAndFinish("m3", d, reformer.start, reformer.courseId, "pk4"); } catch (e) {}
      }
      if (morningYoga && morningYoga.courseId === "g2" && Rules.sessionEnd(morningYoga).getTime() < now.getTime()) {
        try { pastBookAndFinish("m5", d, morningYoga.start, "g2", "pk6"); } catch (e) {}
        try { pastBookAndFinish("m4", d, morningYoga.start, "g2", "pk5"); } catch (e) {}
      }
    });

    var membersGroup = [
      { id: "m1", pk: "pk1" },
      { id: "m2", pk: "pk3" },
      { id: "m3", pk: "pk4" },
      { id: "m4", pk: "pk5" },
      { id: "m5", pk: "pk6" }
    ];

    function fillClass(date, start, courseId, fillWith, waitWith) {
      var s = findSession(state, date, start, courseId);
      if (!s) return null;
      var cap = Rules.sessionCapacity(state, s);
      var when = Rules.addDays(Rules.atLocal(date, "09:00"), -5);
      for (var i = 0; i < fillWith.length && Rules.occupiedCount(state, s.id) < cap; i++) {
        var m = fillWith[i];
        var pkgOk = Rules.usablePackages(state, m.id, Rules.find(state.courses, courseId), when).some(function (p) { return p.pkg.id === m.pk; });
        if (!pkgOk) continue;
        try {
          mustBook(state, { sessionId: s.id, memberId: m.id, packageId: m.pk, now: new Date(when.getTime() + i * 1000), bookedBy: "self" });
        } catch (e) {}
      }
      if (waitWith) {
        waitWith.forEach(function (m, idx) {
          Rules.joinWaitlist(state, { sessionId: s.id, memberId: m.id, packageId: m.pk, now: new Date(when.getTime() + 80000 + idx * 1000), allowWaitlist: true, bookedBy: "self" });
        });
      }
      return s;
    }

    function nextDateWith(start, courseId, minHoursAhead, maxDaysAhead) {
      for (var d = 0; d <= (maxDaysAhead || 14); d++) {
        var date = addDaysStr(now, d);
        var s = findSession(state, date, start, courseId);
        if (!s) continue;
        var hrs = (Rules.sessionStart(s).getTime() - now.getTime()) / 3600000;
        if (hrs > (minHoursAhead || 0)) return s;
      }
      return null;
    }

    var soon = null;
    var later = null;
    var allUpcoming = state.sessions
      .filter(function (s) { return s.type === "group" && !s.canceled && Rules.sessionStart(s).getTime() > now.getTime(); })
      .sort(function (a, b) { return Rules.sessionStart(a) - Rules.sessionStart(b); });

    for (var u = 0; u < allUpcoming.length; u++) {
      var hours = (Rules.sessionStart(allUpcoming[u]).getTime() - now.getTime()) / 3600000;
      if (!soon && hours > 0.2 && hours < 4) soon = allUpcoming[u];
      if (!later && hours >= 5) later = allUpcoming[u];
      if (soon && later) break;
    }
    if (!later && allUpcoming.length) later = allUpcoming[allUpcoming.length - 1];

    if (later && later.courseId === "g1") {
      bookAt("m1", later.date, later.start, later.courseId, "pk1", Rules.addDays(now, -1));
    } else if (later) {
      var pack = later.courseId === "g2" ? "pk1" : "pk1";
      if (later.courseId === "g2" || later.courseId === "g3" || later.courseId === "g1") {
        try { bookAt("m1", later.date, later.start, later.courseId, "pk1", Rules.addDays(now, -1)); } catch (e) {}
      }
    }

    if (soon && (!later || soon.id !== later.id)) {
      var usableSoon = Rules.usablePackages(state, "m1", Rules.find(state.courses, soon.courseId), now);
      if (usableSoon.length && soon.courseId !== "g2" || usableSoon.length) {
        try {
          if (soon.courseId === "g1" || soon.courseId === "g2" || soon.courseId === "g3") {
            bookAt("m1", soon.date, soon.start, soon.courseId, "pk1", Rules.addDays(now, -1));
          }
        } catch (e) {}
      }
    }

    var popular = nextDateWith("19:30", "g2", 4, 10) || nextDateWith("19:00", "g3", 4, 10) || nextDateWith("10:00", "g1", 4, 10);
    if (popular) {
      var fillers = [
        { id: "m2", pk: popular.courseId === "g1" ? "pk3" : (popular.courseId === "g2" ? "pk6" : "pk4") },
        { id: "m3", pk: "pk4" },
        { id: "m4", pk: "pk5" },
        { id: "m5", pk: popular.courseId === "g2" ? "pk6" : "pk5" }
      ];
      if (popular.courseId === "g1") {
        fillers = [{ id: "m2", pk: "pk3" }, { id: "m3", pk: "pk4" }, { id: "m4", pk: "pk5" }];
      }
      var already = {};
      state.bookings.forEach(function (b) { if (b.sessionId === popular.id) already[b.memberId] = true; });
      var cap = Rules.sessionCapacity(state, popular);
      var extras = ["m2", "m3", "m4", "m5", "m1"];
      var pkOf = { m1: "pk1", m2: popular.courseId === "g1" ? "pk3" : (popular.courseId === "g2" ? "pk6" : "pk4"), m3: "pk4", m4: "pk5", m5: popular.courseId === "g2" ? "pk6" : "pk5" };
      if (popular.courseId === "g2") pkOf.m2 = "pk6";
      if (popular.courseId !== "g1" && popular.courseId !== "g2") pkOf.m2 = "pk4";
      var when = Rules.addDays(now, -2);
      for (var x = 0; x < extras.length && Rules.occupiedCount(state, popular.id) < cap; x++) {
        var mid = extras[x];
        if (already[mid]) continue;
        if (popular.courseId === "g1" && mid === "m5") continue;
        if (popular.courseId === "g2" && mid === "m2" && pkOf.m2 !== "pk6") continue;
        try {
          mustBook(state, { sessionId: popular.id, memberId: mid, packageId: pkOf[mid], now: new Date(when.getTime() + x * 2000), bookedBy: "self" });
          already[mid] = true;
        } catch (e) {}
      }
      var need = cap - Rules.occupiedCount(state, popular.id);
      if (need > 0) {
        /* 再尝试把余下空位留给演示满员：用已有会员循环不可，改为把该课尽量排满后若仍有空再算。 */
      }
    }

    /* 专门造一节满员课：找容量较小、且林予安未预约的改革器课 */
    var fullTarget = null;
    for (var k = 0; k < allUpcoming.length; k++) {
      var cand = allUpcoming[k];
      if (cand.courseId !== "g1") continue;
      var hrs2 = (Rules.sessionStart(cand).getTime() - now.getTime()) / 3600000;
      if (hrs2 < 5) continue;
      var takenByM1 = state.bookings.some(function (b) { return b.sessionId === cand.id && b.memberId === "m1" && (Rules.occupiesSlot(b) || b.status === "候补中"); });
      if (takenByM1) continue;
      fullTarget = cand;
      break;
    }
    if (fullTarget) {
      var fillIds = ["m2", "m3", "m4"];
      var pkMap = { m2: "pk3", m3: "pk4", m4: "pk5" };
      var whenF = Rules.addDays(now, -3);
      fillIds.forEach(function (mid, idx) {
        if (Rules.remainingSpots(state, fullTarget) < 1) return;
        if (state.bookings.some(function (b) { return b.sessionId === fullTarget.id && b.memberId === mid && Rules.occupiesSlot(b); })) return;
        try { mustBook(state, { sessionId: fullTarget.id, memberId: mid, packageId: pkMap[mid], now: new Date(whenF.getTime() + idx * 1000) }); } catch (e) {}
      });
      /* 改革器教室容量 8，3 人不够满。复制不到更多会员时，用店员代约方式无法创造虚构会员。添加临时演示会员填满。 */
    }

    ensureFullClass(state, now);
    seedPrivate(state, now, later);
    seedTodayOps(state, now);
    ensureOutOfWindowDemo(state, now);

    Rules.addLeave(state, {
      memberId: "m4",
      date: addDaysStr(now, -3),
      reason: "出差，无法上改革器基础。",
      makeupNote: "馆主已口头答应改约到下周同一星期的课次，由前台手工安排，系统不自动补课。",
      createdBy: "何暖",
      now: Rules.addDays(now, -3)
    });
  }


  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatHm(d) {
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function snapToQuarter(d) {
    var x = new Date(d.getTime());
    x.setSeconds(0, 0);
    var up = Math.ceil(x.getMinutes() / 15) * 15;
    if (up === 60) {
      x.setHours(x.getHours() + 1);
      x.setMinutes(0);
    } else {
      x.setMinutes(up);
    }
    return x;
  }

  /* 找不到自然的窗口外示范课时，补一节 1–2 小时后的一次性团课，避免非傍晚重置后走查对不上。 */
  function ensureOutOfWindowDemo(state, now) {
    var windowHours = state.settings.cancelWindowHours || 4;
    function findExisting() {
      for (var i = 0; i < state.bookings.length; i++) {
        var b = state.bookings[i];
        if (b.memberId !== "m1" || b.status !== "已确认" || b.type !== "group") continue;
        var s = Rules.find(state.sessions, b.sessionId);
        if (!s || s.canceled) continue;
        if (Rules.sessionStart(s).getTime() > now.getTime() && !Rules.inCancelWindow(state, s, now)) return b;
      }
      return null;
    }
    var existing = findExisting();
    if (existing) {
      state.meta.outOfWindowDemoSessionId = existing.sessionId;
      return existing;
    }

    var combos = [
      { courseId: "g3", coachId: "t1", roomId: "r1" },
      { courseId: "g2", coachId: "t2", roomId: "r2" },
      { courseId: "g1", coachId: "t1", roomId: "r1" },
      { courseId: "g3", coachId: "t2", roomId: "r2" },
      { courseId: "g2", coachId: "t2", roomId: "r1" },
      { courseId: "g1", coachId: "t3", roomId: "r1" },
      { courseId: "g3", coachId: "t3", roomId: "r2" },
      { courseId: "g2", coachId: "t1", roomId: "r2" }
    ];
    var offsets = [90, 75, 105, 60, 120, 80, 100, 70, 110];
    var created = null;
    var tried = {};
    for (var o = 0; o < offsets.length && !created; o++) {
      var startDate = snapToQuarter(new Date(now.getTime() + offsets[o] * 60000));
      var hoursAhead = (startDate.getTime() - now.getTime()) / 3600000;
      if (hoursAhead <= 0.2 || hoursAhead >= windowHours) continue;
      for (var c = 0; c < combos.length && !created; c++) {
        var combo = combos[c];
        var course = Rules.find(state.courses, combo.courseId);
        var room = Rules.find(state.rooms, combo.roomId);
        if (!course || !room) continue;
        var endDate = new Date(startDate.getTime() + (course.durationMin || 60) * 60000);
        if (Rules.dateStr(endDate) !== Rules.dateStr(startDate)) continue;
        var sess = {
          id: "ss_demo_outofwnd_" + Rules.dateStr(startDate).replace(/-/g, "") + "_" + formatHm(startDate).replace(":", ""),
          date: Rules.dateStr(startDate),
          start: formatHm(startDate),
          end: formatHm(endDate),
          courseId: combo.courseId,
          coachId: combo.coachId,
          roomId: combo.roomId,
          type: "group",
          capacity: Math.min(course.maxPeople, room.capacity),
          source: "once",
          templateId: null,
          canceled: false,
          cancelNote: "",
          demoFlag: "outOfWindow",
          note: "窗口外取消示范课（一次性，用于走查）"
        };
        if (tried[sess.id + combo.courseId + combo.coachId + combo.roomId]) continue;
        tried[sess.id + combo.courseId + combo.coachId + combo.roomId] = true;
        if (findSession(state, sess.date, sess.start, sess.courseId)) continue;
        if (Rules.sessionConflicts(state, sess).length) continue;
        state.sessions.push(sess);
        try {
          mustBook(state, { sessionId: sess.id, memberId: "m1", packageId: "pk1", now: Rules.addDays(now, -1), bookedBy: "self" });
          created = sess;
        } catch (e) {
          state.sessions = state.sessions.filter(function (x) { return x.id !== sess.id; });
        }
      }
    }
    if (created) state.meta.outOfWindowDemoSessionId = created.id;
    return created;
  }

  function ensureExtraMembers(state) {
    var extras = [
      { id: "m8", name: "方浅予", phoneMasked: "158****4412", note: "演示填充名额用会员。", joinedAt: "2026-09-01" },
      { id: "m9", name: "阮青迟", phoneMasked: "159****8803", note: "演示填充名额用会员。", joinedAt: "2026-09-08" },
      { id: "m10", name: "江漱石", phoneMasked: "137****2294", note: "演示填充名额用会员。", joinedAt: "2026-09-16" },
      { id: "m11", name: "陆晚风", phoneMasked: "151****6675", note: "演示填充名额用会员。", joinedAt: "2026-10-02" },
      { id: "m12", name: "宋栖梧", phoneMasked: "188****1026", note: "演示填充名额用会员。", joinedAt: "2026-10-11" }
    ];
    extras.forEach(function (m) {
      if (!Rules.find(state.members, m.id)) state.members.push(m);
    });
  }

  function ensureFullClass(state, now) {
    ensureExtraMembers(state);
    ["m8", "m9", "m10", "m11", "m12"].forEach(function (id, idx) {
      if (!Rules.find(state.packages, "pk_" + id)) {
        issueDirect(state, {
          id: "pk_" + id,
          memberId: id,
          name: "团课畅练 10 次",
          restrict: "group",
          total: 10,
          expireAt: addDaysStr(now, 70 + idx),
          issuedAt: addDaysStr(now, -20)
        });
      }
    });
    var allUpcoming = state.sessions
      .filter(function (s) { return s.type === "group" && !s.canceled && s.courseId === "g1" && (Rules.sessionStart(s).getTime() - now.getTime()) / 3600000 >= 5; })
      .sort(function (a, b) { return Rules.sessionStart(a) - Rules.sessionStart(b); });
    var target = null;
    for (var i = 0; i < allUpcoming.length; i++) {
      var takenByM1 = state.bookings.some(function (b) {
        return b.sessionId === allUpcoming[i].id && b.memberId === "m1" && (Rules.occupiesSlot(b) || b.status === "候补中");
      });
      if (!takenByM1) { target = allUpcoming[i]; break; }
    }
    if (!target) return;
    var fillers = ["m2", "m3", "m4", "m8", "m9", "m10", "m11", "m12"];
    var pks = { m2: "pk3", m3: "pk4", m4: "pk5", m8: "pk_m8", m9: "pk_m9", m10: "pk_m10", m11: "pk_m11", m12: "pk_m12" };
    var when = Rules.addDays(now, -2);
    fillers.forEach(function (mid, idx) {
      if (Rules.remainingSpots(state, target) < 1) return;
      if (state.bookings.some(function (b) { return b.sessionId === target.id && b.memberId === mid && Rules.occupiesSlot(b); })) return;
      try {
        mustBook(state, { sessionId: target.id, memberId: mid, packageId: pks[mid], now: new Date(when.getTime() + idx * 1500) });
      } catch (e) {}
    });
    state.meta.fullDemoSessionId = target.id;
    if (Rules.remainingSpots(state, target) === 0) {
      try {
        Rules.joinWaitlist(state, {
          sessionId: target.id,
          memberId: "m5",
          packageId: "pk5",
          now: now,
          bookedBy: "self"
        });
      } catch (e) {}
      /* m5 的课包是瑜伽专项，可能不能候补改革器。改用有团课包的会员。m1 来候补更利于顾客端演示。 */
      var wl = Rules.joinWaitlist(state, {
        sessionId: target.id,
        memberId: "m1",
        packageId: "pk1",
        now: new Date(now.getTime() + 1000),
        bookedBy: "self"
      });
      if (wl.ok) state.meta.waitlistDemoBookingId = wl.booking.id;
    }
  }

  function seedPrivate(state, now, laterGroup) {
    function firstSlot(coachId, minHours, courseId) {
      for (var d = 0; d <= 10; d++) {
        var date = addDaysStr(now, d);
        var course = Rules.find(state.courses, courseId || "p1");
        var slots = Rules.privateAvailability(state, coachId, date, course, now);
        for (var i = 0; i < slots.length; i++) {
          if (!slots[i].available) continue;
          var hrs = (Rules.atLocal(date, slots[i].start).getTime() - now.getTime()) / 3600000;
          if (hrs >= minHours) return { date: date, slot: slots[i] };
        }
      }
      return null;
    }

    var slotM1 = firstSlot("t3", 6, "p1");
    if (slotM1) {
      var r = Rules.bookPrivate(state, {
        memberId: "m1",
        courseId: "p1",
        coachId: "t3",
        date: slotM1.date,
        start: slotM1.slot.start,
        end: slotM1.slot.end,
        roomId: slotM1.slot.roomId,
        packageId: "pk2",
        now: Rules.addDays(now, -1),
        bookedBy: "self"
      });
      if (r.ok) state.meta.privateDemoBookingId = r.booking.id;
    }

    var slotM6 = firstSlot("t3", 8, "p1");
    if (slotM6) {
      Rules.bookPrivate(state, {
        memberId: "m6",
        courseId: "p1",
        coachId: "t3",
        date: slotM6.date,
        start: slotM6.slot.start,
        end: slotM6.slot.end,
        roomId: slotM6.slot.roomId,
        packageId: "pk7",
        now: Rules.addDays(now, -2),
        bookedBy: "self"
      });
    }

    /* 过去的私教完成记录 */
    for (var back = 6; back <= 12; back++) {
      var date = addDaysStr(now, -back);
      var course = Rules.find(state.courses, "p1");
      /* 直接创建已结束时段 */
      var created = Rules.createPrivateSession(state, {
        date: date,
        start: "10:00",
        end: "11:00",
        courseId: "p1",
        coachId: "t3",
        roomId: "r3"
      });
      if (!created.ok) continue;
      var bookTime = Rules.addDays(Rules.atLocal(date, "10:00"), -3);
      /* 此刻课次已结束，bookPrivate/canMemberBookSession 会拒绝。用内部补种。 */
      seedPastPrivate(state, created.session, "m1", "pk2", bookTime);
      break;
    }
  }

  function seedPastPrivate(state, session, memberId, packageId, bookTime) {
    var pkg = Rules.find(state.packages, packageId);
    var booking = {
      id: Rules.uid("bk"),
      memberId: memberId,
      sessionId: session.id,
      courseId: session.courseId,
      type: "private",
      status: "已确认",
      packageId: packageId,
      waitlist: false,
      waitlistAt: null,
      bookedBy: "self",
      bookedByStaffId: null,
      createdAt: bookTime.getTime(),
      confirmedAt: bookTime.getTime(),
      rejectedAt: null,
      checkedInAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: "",
      noShow: false,
      deducted: false,
      forfeit: false
    };
    var held = Rules.holdPackage(state, pkg, memberId, booking.id, bookTime, "私教预约预占 1 次");
    if (!held.ok) return;
    state.bookings.push(booking);
    var startAt = Rules.sessionStart(session);
    Rules.checkIn(state, { bookingId: booking.id, now: startAt });
    Rules.completeService(state, { bookingId: booking.id, now: Rules.sessionEnd(session) });
  }

  function seedTodayOps(state, now) {
    var today = Rules.dateStr(now);
    var todays = state.sessions.filter(function (s) {
      return s.date === today && s.type === "group" && !s.canceled;
    });
    todays.forEach(function (s) {
      var started = Rules.sessionStart(s).getTime() <= now.getTime();
      var ended = Rules.sessionEnd(s).getTime() <= now.getTime();
      var people = [
        { id: "m3", pk: "pk4" },
        { id: "m4", pk: "pk5" }
      ];
      if (s.courseId === "g1") people.unshift({ id: "m2", pk: "pk3" });
      if (s.courseId === "g2") people.push({ id: "m5", pk: "pk6" });
      people.forEach(function (m, idx) {
        if (state.bookings.some(function (b) { return b.sessionId === s.id && b.memberId === m.id && Rules.occupiesSlot(b); })) return;
        try {
          var b = mustBook(state, { sessionId: s.id, memberId: m.id, packageId: m.pk, now: Rules.addDays(now, -2) });
          if (ended) {
            Rules.checkIn(state, { bookingId: b.id, now: Rules.sessionStart(s) });
            Rules.completeService(state, { bookingId: b.id, now: Rules.sessionEnd(s) });
          } else if (started) {
            Rules.checkIn(state, { bookingId: b.id, now: Rules.sessionStart(s) });
          }
        } catch (e) {}
      });
    });
  }

  Store.buildSeed = function (now) {
    now = now || new Date();
    var state = baseCatalog();
    Rules.ensureSessions(state, now, 10, 21);
    seedHistory(state, now);
    Rules.ensureSessions(state, now, 10, 21);
    state.meta.seededAt = now.getTime();
    state.meta.seededOn = Rules.dateStr(now);
    return state;
  };

  Store.load = function (now) {
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        var state = JSON.parse(raw);
        if (state && state.meta && state.members) {
          Rules.ensureSessions(state, now || new Date(), 10, 21);
          return state;
        }
      }
    } catch (e) {}
    var seeded = Store.buildSeed(now || new Date());
    Store.save(seeded);
    return seeded;
  };

  Store.save = function (state) {
    state.meta.savedAt = Date.now();
    if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  };

  Store.reset = function (now) {
    if (root.localStorage) root.localStorage.removeItem(KEY);
    var seeded = Store.buildSeed(now || new Date());
    Store.save(seeded);
    return seeded;
  };

  Store.KEY = KEY;

  if (typeof module !== "undefined" && module.exports) module.exports = Store;
  root.FitFlowStore = Store;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
