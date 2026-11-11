/* FitFlow P2 — 业务规则（浏览器与 Node 共用）
 * 预约状态机：待确认 → 已确认 → 已到店 → 服务中 → 已完成
 * 取消 / 拒绝 / 缺席会释放名额。团课默认自动确认；私教确认方式可配置，不另起状态机。
 */
(function (root) {
  var Rules = {};

  Rules.STATUS = {
    PENDING: "待确认",
    CONFIRMED: "已确认",
    ARRIVED: "已到店",
    IN_SERVICE: "服务中",
    DONE: "已完成",
    CANCELLED: "已取消",
    REJECTED: "已拒绝",
    NOSHOW: "缺席",
    WAITLIST: "候补中",
    WAIT_EXPIRED: "候补失效"
  };

  var OCCUPY = {
    "待确认": true,
    "已确认": true,
    "已到店": true,
    "服务中": true
  };

  Rules.WEEKDAYS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function dateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function atLocal(date, time) {
    var p = date.split("-").map(Number);
    var t = (time || "00:00").split(":").map(Number);
    return new Date(p[0], p[1] - 1, p[2], t[0] || 0, t[1] || 0, 0, 0);
  }

  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function weekday(d) {
    var n = d.getDay();
    return n === 0 ? 7 : n;
  }

  function toMin(hhmm) {
    var t = hhmm.split(":").map(Number);
    return t[0] * 60 + t[1];
  }

  function overlaps(a1, a2, b1, b2) {
    return toMin(a1) < toMin(b2) && toMin(a2) > toMin(b1);
  }

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr(now) {
    return dateStr(now);
  }

  Rules.clone = clone;
  Rules.find = find;
  Rules.dateStr = dateStr;
  Rules.atLocal = atLocal;
  Rules.addDays = addDays;
  Rules.weekday = weekday;
  Rules.toMin = toMin;
  Rules.overlaps = overlaps;
  Rules.uid = uid;
  Rules.todayStr = todayStr;

  Rules.formatDate = function (iso) {
    var d = atLocal(iso, "00:00");
    return d.getMonth() + 1 + "月" + d.getDate() + "日";
  };

  Rules.formatDateWeek = function (iso) {
    var d = atLocal(iso, "00:00");
    return d.getMonth() + 1 + "月" + d.getDate() + "日 " + Rules.WEEKDAYS[weekday(d)];
  };

  Rules.sessionStart = function (session) {
    return atLocal(session.date, session.start);
  };

  Rules.sessionEnd = function (session) {
    return atLocal(session.date, session.end);
  };

  Rules.sessionCapacity = function (state, session) {
    if (!session) return 0;
    if (session.canceled) return 0;
    if (session.type === "private") return 1;
    var course = find(state.courses, session.courseId);
    var room = find(state.rooms, session.roomId);
    var courseMax = course ? course.maxPeople : session.capacity || 0;
    var roomMax = room ? room.capacity : session.capacity || 0;
    return Math.min(courseMax, roomMax);
  };

  Rules.occupiesSlot = function (booking) {
    return booking && !booking.waitlist && !!OCCUPY[booking.status];
  };

  Rules.occupiedCount = function (state, sessionId) {
    var n = 0;
    for (var i = 0; i < state.bookings.length; i++) {
      var b = state.bookings[i];
      if (b.sessionId === sessionId && Rules.occupiesSlot(b)) n++;
    }
    return n;
  };

  Rules.remainingSpots = function (state, session) {
    if (!session || session.canceled) return 0;
    return Math.max(0, Rules.sessionCapacity(state, session) - Rules.occupiedCount(state, session.id));
  };

  Rules.waitlistOf = function (state, sessionId) {
    return state.bookings
      .filter(function (b) {
        return b.sessionId === sessionId && b.status === Rules.STATUS.WAITLIST;
      })
      .sort(function (a, b) {
        return a.waitlistAt - b.waitlistAt;
      });
  };

  Rules.packageStats = function (state, packageId) {
    var held = 0;
    var deducted = 0;
    for (var i = 0; i < state.ledger.length; i++) {
      var e = state.ledger[i];
      if (e.packageId !== packageId) continue;
      if (e.action === "hold") held += e.qty;
      else if (e.action === "release") held -= e.qty;
      else if (e.action === "deduct" || e.action === "forfeit") {
        /* 预占转为已核销：可用余次只减少一次 */
        held -= e.qty;
        deducted += e.qty;
      }
    }
    var pkg = find(state.packages, packageId);
    var total = pkg ? pkg.total : 0;
    var available = total - held - deducted;
    return { total: total, held: held, deducted: deducted, available: available };
  };

  Rules.isPackageExpired = function (pkg, now) {
    if (!pkg || pkg.voided) return true;
    if (!pkg.expireAt) return false;
    var end = atLocal(pkg.expireAt, "23:59");
    return now.getTime() > end.getTime();
  };

  Rules.packageApplicable = function (state, pkg, course) {
    if (!pkg || !course || pkg.voided) return false;
    if (pkg.restrict === "group") return course.type === "group";
    if (pkg.restrict === "private") return course.type === "private";
    if (pkg.restrict === "category") {
      var cats = pkg.categories || [];
      return cats.indexOf(course.category) !== -1;
    }
    return true;
  };

  Rules.usablePackages = function (state, memberId, course, now) {
    var list = [];
    for (var i = 0; i < state.packages.length; i++) {
      var pkg = state.packages[i];
      if (pkg.memberId !== memberId) continue;
      if (Rules.isPackageExpired(pkg, now)) continue;
      if (!Rules.packageApplicable(state, pkg, course)) continue;
      var stats = Rules.packageStats(state, pkg.id);
      if (stats.available > 0) list.push({ pkg: pkg, stats: stats });
    }
    list.sort(function (a, b) {
      return a.pkg.expireAt < b.pkg.expireAt ? -1 : 1;
    });
    return list;
  };

  Rules.memberPackagesView = function (state, memberId, now) {
    return state.packages
      .filter(function (p) {
        return p.memberId === memberId;
      })
      .map(function (pkg) {
        var stats = Rules.packageStats(state, pkg.id);
        var expired = Rules.isPackageExpired(pkg, now);
        return { pkg: pkg, stats: stats, expired: expired, usable: !expired && !pkg.voided && stats.available > 0 };
      });
  };

  function pushLedger(state, entry) {
    state.ledger.push({
      id: entry.id || uid("ld"),
      packageId: entry.packageId,
      memberId: entry.memberId,
      bookingId: entry.bookingId || null,
      action: entry.action,
      qty: entry.qty || 1,
      at: entry.at,
      note: entry.note || ""
    });
  }

  Rules.holdPackage = function (state, pkg, memberId, bookingId, now, note) {
    var stats = Rules.packageStats(state, pkg.id);
    if (stats.available < 1) return { ok: false, error: "课包可约余次不足，不能预占。" };
    if (Rules.isPackageExpired(pkg, now)) return { ok: false, error: "课包已过期，不能预约。" };
    pushLedger(state, {
      packageId: pkg.id,
      memberId: memberId,
      bookingId: bookingId,
      action: "hold",
      qty: 1,
      at: now.getTime(),
      note: note || "预约预占 1 次"
    });
    var after = Rules.packageStats(state, pkg.id);
    if (after.available < 0) return { ok: false, error: "系统拒绝负余额预占。" };
    return { ok: true };
  };

  Rules.releaseHold = function (state, pkgId, memberId, bookingId, now, note) {
    pushLedger(state, {
      packageId: pkgId,
      memberId: memberId,
      bookingId: bookingId,
      action: "release",
      qty: 1,
      at: now.getTime(),
      note: note || "窗口内取消，退回预占 1 次"
    });
    return { ok: true };
  };

  Rules.confirmDeduct = function (state, booking, now, note) {
    if (booking.deducted) return { ok: false, error: "该预约已核销，不能重复扣次。" };
    var pkg = find(state.packages, booking.packageId);
    if (!pkg) return { ok: false, error: "找不到对应课包。" };
    if (!Rules.hasOpenHold(state, booking.id)) return { ok: false, error: "该预约没有可确认的预占次数，不能扣次。" };
    pushLedger(state, {
      packageId: pkg.id,
      memberId: booking.memberId,
      bookingId: booking.id,
      action: "deduct",
      qty: 1,
      at: now.getTime(),
      note: note || "签到确认扣次，预占转为已核销"
    });
    booking.deducted = true;
    return { ok: true };
  };

  Rules.forfeitHold = function (state, booking, now, note) {
    if (booking.deducted) return { ok: false, error: "该预约已核销，不能重复扣次。" };
    var pkg = find(state.packages, booking.packageId);
    if (!pkg) return { ok: false, error: "找不到对应课包。" };
    pushLedger(state, {
      packageId: pkg.id,
      memberId: booking.memberId,
      bookingId: booking.id,
      action: "forfeit",
      qty: 1,
      at: now.getTime(),
      note: note || "窗口外取消或缺席，预占转为已核销，不退次"
    });
    booking.deducted = true;
    booking.forfeit = true;
    return { ok: true };
  };

  Rules.hasOpenHold = function (state, bookingId) {
    var held = 0;
    for (var i = 0; i < state.ledger.length; i++) {
      var e = state.ledger[i];
      if (e.bookingId !== bookingId) continue;
      if (e.action === "hold") held += e.qty;
      if (e.action === "release" || e.action === "deduct" || e.action === "forfeit") held -= e.qty;
    }
    return held > 0;
  };

  Rules.cancelWindowMs = function (state) {
    return (state.settings.cancelWindowHours || 4) * 3600 * 1000;
  };

  Rules.inCancelWindow = function (state, session, now) {
    var start = Rules.sessionStart(session);
    return start.getTime() - now.getTime() >= Rules.cancelWindowMs(state);
  };

  Rules.hoursUntilStart = function (session, now) {
    return (Rules.sessionStart(session).getTime() - now.getTime()) / 3600000;
  };

  Rules.sessionConflicts = function (state, candidate) {
    var reasons = [];
    for (var i = 0; i < state.sessions.length; i++) {
      var s = state.sessions[i];
      if (s.id === candidate.id || s.canceled) continue;
      if (s.date !== candidate.date) continue;
      if (!overlaps(candidate.start, candidate.end, s.start, s.end)) continue;
      if (s.coachId === candidate.coachId) {
        var coach = find(state.coaches, s.coachId);
        reasons.push("教练「" + (coach ? coach.name : s.coachId) + "」在 " + s.start + "–" + s.end + " 已有课次，不能重叠。");
      }
      if (s.roomId === candidate.roomId) {
        var room = find(state.rooms, s.roomId);
        reasons.push("教室「" + (room ? room.name : s.roomId) + "」在 " + s.start + "–" + s.end + " 已被占用。同一教室同一时段只能有一节课。");
      }
    }
    return reasons;
  };

  Rules.templateConflicts = function (state, template, ignoreId) {
    var reasons = [];
    var list = state.weeklyGroup || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t.enabled || t.id === ignoreId) continue;
      if (t.weekday !== template.weekday) continue;
      if (!overlaps(template.start, template.end, t.start, t.end)) continue;
      if (t.coachId === template.coachId) reasons.push("同一教练在该星期同一时段已有团课。");
      if (t.roomId === template.roomId) reasons.push("同一教室在该星期同一时段已有团课。");
    }
    return reasons;
  };

  Rules.ensureSessions = function (state, now, backDays, forwardDays) {
    backDays = backDays == null ? 7 : backDays;
    forwardDays = forwardDays == null ? 21 : forwardDays;
    var start = addDays(atLocal(dateStr(now), "00:00"), -backDays);
    var end = addDays(atLocal(dateStr(now), "00:00"), forwardDays);
    var existing = {};
    for (var i = 0; i < state.sessions.length; i++) {
      var s = state.sessions[i];
      if (s.templateId) existing[s.templateId + "_" + s.date] = s;
    }
    for (var d = new Date(start.getTime()); d <= end; d = addDays(d, 1)) {
      var wd = weekday(d);
      var ds = dateStr(d);
      for (var j = 0; j < state.weeklyGroup.length; j++) {
        var tpl = state.weeklyGroup[j];
        if (!tpl.enabled || tpl.weekday !== wd) continue;
        var key = tpl.id + "_" + ds;
        if (existing[key]) continue;
        var course = find(state.courses, tpl.courseId);
        var room = find(state.rooms, tpl.roomId);
        var session = {
          id: "ss_" + tpl.id + "_" + ds.replace(/-/g, ""),
          date: ds,
          start: tpl.start,
          end: tpl.end,
          courseId: tpl.courseId,
          coachId: tpl.coachId,
          roomId: tpl.roomId,
          type: "group",
          capacity: Math.min(course ? course.maxPeople : 0, room ? room.capacity : 0),
          source: "weekly",
          templateId: tpl.id,
          canceled: false,
          cancelNote: ""
        };
        var conflicts = Rules.sessionConflicts(state, session);
        if (conflicts.length) continue;
        state.sessions.push(session);
        existing[key] = session;
      }
    }
    return state;
  };

  Rules.createPrivateSession = function (state, opt) {
    var course = find(state.courses, opt.courseId);
    var room = find(state.rooms, opt.roomId);
    if (!course || course.type !== "private") return { ok: false, error: "请选择私教课程。" };
    if (!room || !room.enabled) return { ok: false, error: "教室不可用。" };
    var session = {
      id: opt.id || uid("ss"),
      date: opt.date,
      start: opt.start,
      end: opt.end,
      courseId: opt.courseId,
      coachId: opt.coachId,
      roomId: opt.roomId,
      type: "private",
      capacity: 1,
      source: "private",
      templateId: null,
      canceled: false,
      cancelNote: ""
    };
    var conflicts = Rules.sessionConflicts(state, session);
    if (conflicts.length) return { ok: false, error: conflicts[0], conflicts: conflicts };
    state.sessions.push(session);
    return { ok: true, session: session };
  };

  function defaultEnd(start, durationMin) {
    var m = toMin(start) + (durationMin || 60);
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  }

  Rules.defaultEnd = defaultEnd;

  Rules.privateAvailability = function (state, coachId, date, course, now) {
    var slots = [];
    var d = atLocal(date, "00:00");
    var wd = weekday(d);
    var windows = (state.weeklyPrivate || []).filter(function (w) {
      return w.enabled && w.coachId === coachId && w.weekday === wd;
    });
    var duration = course ? course.durationMin : 60;
    var nowTs = now.getTime();
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i];
      var cursor = toMin(w.start);
      var winEnd = toMin(w.end);
      while (cursor + duration <= winEnd) {
        var start = pad(Math.floor(cursor / 60)) + ":" + pad(cursor % 60);
        var end = defaultEnd(start, duration);
        var startAt = atLocal(date, start);
        var candidate = {
          id: "tmp",
          date: date,
          start: start,
          end: end,
          coachId: coachId,
          roomId: w.roomId,
          type: "private"
        };
        var conflicts = Rules.sessionConflicts(state, candidate);
        var past = startAt.getTime() <= nowTs;
        slots.push({
          start: start,
          end: end,
          roomId: w.roomId,
          available: !past && conflicts.length === 0,
          reason: past ? "此时段已过" : conflicts[0] || "",
          past: past
        });
        cursor += duration;
      }
    }
    return slots;
  };

  function canMemberBookSession(state, memberId, session, now) {
    if (!session || session.canceled) return { ok: false, error: "该课次已停课或不可预约。" };
    if (Rules.sessionEnd(session).getTime() <= now.getTime()) {
      return { ok: false, error: "该课次已结束，不能再预约。" };
    }
    var existing = state.bookings.filter(function (b) {
      return b.memberId === memberId && b.sessionId === session.id &&
        (Rules.occupiesSlot(b) || b.status === Rules.STATUS.WAITLIST);
    });
    if (existing.length) {
      if (existing[0].status === Rules.STATUS.WAITLIST) return { ok: false, error: "你已在该课次候补名单中。", already: existing[0] };
      return { ok: false, error: "你已预约过这一节课。", already: existing[0] };
    }
    var overlapping = state.bookings.some(function (b) {
      if (b.memberId !== memberId || !Rules.occupiesSlot(b)) return false;
      var s = find(state.sessions, b.sessionId);
      if (!s || s.date !== session.date) return false;
      return overlaps(session.start, session.end, s.start, s.end);
    });
    if (overlapping) return { ok: false, error: "你在同一时段已有其他预约，请先取消后再约。" };
    return { ok: true };
  }

  Rules.bookGroup = function (state, opt) {
    var now = opt.now;
    var session = find(state.sessions, opt.sessionId);
    var member = find(state.members, opt.memberId);
    var course = session ? find(state.courses, session.courseId) : null;
    if (!session || session.type !== "group") return { ok: false, error: "找不到该团课课次。" };
    if (!member) return { ok: false, error: "找不到会员。" };
    var gate = canMemberBookSession(state, opt.memberId, session, now);
    if (!gate.ok) return gate;
    var remaining = Rules.remainingSpots(state, session);
    if (remaining < 1) {
      if (opt.allowWaitlist) return Rules.joinWaitlist(state, opt);
      return { ok: false, error: "该课次已满员，不能再占用名额。", full: true };
    }
    var packs = Rules.usablePackages(state, opt.memberId, course, now);
    if (!packs.length) return { ok: false, error: "没有适用于本课程且仍有余次的有效课包。过期或类型不符的课包不可约。" };
    var chosen = opt.packageId ? packs.filter(function (p) { return p.pkg.id === opt.packageId; })[0] : packs[0];
    if (!chosen) return { ok: false, error: "所选课包不适用于本课程，或余次不足 / 已过期。" };
    var booking = {
      id: uid("bk"),
      memberId: opt.memberId,
      sessionId: session.id,
      courseId: session.courseId,
      type: "group",
      status: Rules.STATUS.CONFIRMED,
      packageId: chosen.pkg.id,
      waitlist: false,
      waitlistAt: null,
      bookedBy: opt.bookedBy || "self",
      bookedByStaffId: opt.bookedByStaffId || null,
      createdAt: now.getTime(),
      confirmedAt: now.getTime(),
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
    var held = Rules.holdPackage(state, chosen.pkg, opt.memberId, booking.id, now, "团课预约预占 1 次");
    if (!held.ok) return held;
    state.bookings.push(booking);
    return { ok: true, booking: booking, autoConfirmed: true };
  };

  Rules.joinWaitlist = function (state, opt) {
    var now = opt.now;
    var session = find(state.sessions, opt.sessionId);
    var course = session ? find(state.courses, session.courseId) : null;
    if (!session) return { ok: false, error: "找不到课次。" };
    if (Rules.remainingSpots(state, session) > 0) return { ok: false, error: "该课次仍有名额，请直接预约，不必候补。" };
    var gate = canMemberBookSession(state, opt.memberId, session, now);
    if (!gate.ok) return gate;
    var packs = Rules.usablePackages(state, opt.memberId, course, now);
    if (!packs.length) return { ok: false, error: "没有适用于本课程的有效课包，暂不能候补。候补转正时仍需预占 1 次。" };
    var chosen = opt.packageId ? packs.filter(function (p) { return p.pkg.id === opt.packageId; })[0] : packs[0];
    if (!chosen) return { ok: false, error: "所选课包不适用于候补。" };
    var booking = {
      id: uid("bk"),
      memberId: opt.memberId,
      sessionId: session.id,
      courseId: session.courseId,
      type: session.type,
      status: Rules.STATUS.WAITLIST,
      packageId: chosen.pkg.id,
      waitlist: true,
      waitlistAt: now.getTime(),
      bookedBy: opt.bookedBy || "self",
      bookedByStaffId: opt.bookedByStaffId || null,
      createdAt: now.getTime(),
      confirmedAt: null,
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
    state.bookings.push(booking);
    return { ok: true, booking: booking, waitlist: true, note: "已加入候补。候补暂不预占课次，有名额时按加入顺序转正并预占。" };
  };

  Rules.bookPrivate = function (state, opt) {
    var now = opt.now;
    var course = find(state.courses, opt.courseId);
    var member = find(state.members, opt.memberId);
    var coach = find(state.coaches, opt.coachId);
    if (!member) return { ok: false, error: "找不到会员。" };
    if (!course || course.type !== "private") return { ok: false, error: "请选择私教课程。" };
    if (!coach || !coach.enabled) return { ok: false, error: "该教练暂不可约。" };
    var end = opt.end || defaultEnd(opt.start, course.durationMin);
    var created = Rules.createPrivateSession(state, {
      date: opt.date,
      start: opt.start,
      end: end,
      courseId: course.id,
      coachId: coach.id,
      roomId: opt.roomId
    });
    if (!created.ok) return created;
    var session = created.session;
    var gate = canMemberBookSession(state, opt.memberId, session, now);
    if (!gate.ok) {
      state.sessions = state.sessions.filter(function (s) { return s.id !== session.id; });
      return gate;
    }
    var packs = Rules.usablePackages(state, opt.memberId, course, now);
    if (!packs.length) {
      state.sessions = state.sessions.filter(function (s) { return s.id !== session.id; });
      return { ok: false, error: "没有适用于私教且仍有余次的有效课包。" };
    }
    var chosen = opt.packageId ? packs.filter(function (p) { return p.pkg.id === opt.packageId; })[0] : packs[0];
    if (!chosen) {
      state.sessions = state.sessions.filter(function (s) { return s.id !== session.id; });
      return { ok: false, error: "所选课包不适用于该私教课，或余次不足 / 已过期。" };
    }
    var auto = (state.settings.privateConfirmMode || "auto") === "auto";
    var booking = {
      id: uid("bk"),
      memberId: opt.memberId,
      sessionId: session.id,
      courseId: course.id,
      type: "private",
      status: auto ? Rules.STATUS.CONFIRMED : Rules.STATUS.PENDING,
      packageId: chosen.pkg.id,
      waitlist: false,
      waitlistAt: null,
      bookedBy: opt.bookedBy || "self",
      bookedByStaffId: opt.bookedByStaffId || null,
      createdAt: now.getTime(),
      confirmedAt: auto ? now.getTime() : null,
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
    var held = Rules.holdPackage(state, chosen.pkg, opt.memberId, booking.id, now, "私教预约预占 1 次");
    if (!held.ok) {
      state.sessions = state.sessions.filter(function (s) { return s.id !== session.id; });
      return held;
    }
    state.bookings.push(booking);
    return { ok: true, booking: booking, session: session, autoConfirmed: auto };
  };

  Rules.promoteWaitlist = function (state, sessionId, now) {
    var session = find(state.sessions, sessionId);
    if (!session || session.canceled) return { ok: true, promoted: [] };
    var promoted = [];
    var skipped = [];
    while (Rules.remainingSpots(state, session) > 0) {
      var queue = Rules.waitlistOf(state, sessionId);
      if (!queue.length) break;
      var next = queue[0];
      var course = find(state.courses, session.courseId);
      var pkg = find(state.packages, next.packageId);
      var reason = "";
      if (!pkg || Rules.isPackageExpired(pkg, now) || !Rules.packageApplicable(state, pkg, course)) {
        reason = "课包已过期或不再适用于本课程";
      } else if (Rules.packageStats(state, pkg.id).available < 1) {
        reason = "课包可约余次不足";
      }
      if (reason) {
        next.status = Rules.STATUS.WAIT_EXPIRED;
        next.cancelledAt = now.getTime();
        next.cancelReason = "候补转正失败：" + reason + "。已跳过，继续顺位下一位。";
        skipped.push({ booking: next, reason: reason });
        continue;
      }
      var held = Rules.holdPackage(state, pkg, next.memberId, next.id, now, "候补转正，预占 1 次");
      if (!held.ok) {
        next.status = Rules.STATUS.WAIT_EXPIRED;
        next.cancelledAt = now.getTime();
        next.cancelReason = "候补转正失败：" + held.error;
        skipped.push({ booking: next, reason: held.error });
        continue;
      }
      next.waitlist = false;
      next.status = Rules.STATUS.CONFIRMED;
      next.confirmedAt = now.getTime();
      promoted.push(next);
    }
    return { ok: true, promoted: promoted, skipped: skipped };
  };

  function releaseSessionIfPrivateEmpty(state, session) {
    if (!session || session.type !== "private" || session.source !== "private") return;
    var still = state.bookings.some(function (b) {
      return b.sessionId === session.id && (Rules.occupiesSlot(b) || b.status === Rules.STATUS.WAITLIST);
    });
    if (!still) session.canceled = true;
  }

  Rules.cancelBooking = function (state, opt) {
    var now = opt.now;
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status === Rules.STATUS.CANCELLED || booking.status === Rules.STATUS.REJECTED || booking.status === Rules.STATUS.WAIT_EXPIRED) {
      return { ok: false, error: "该预约已取消或已失效。" };
    }
    if (booking.status === Rules.STATUS.DONE || booking.status === Rules.STATUS.IN_SERVICE || booking.status === Rules.STATUS.ARRIVED) {
      return { ok: false, error: "已到店或已核销的预约不能取消。如需处理，请走请假补课手工记录。" };
    }
    if (booking.status === Rules.STATUS.NOSHOW) return { ok: false, error: "已记缺席，不能再取消。" };
    var session = find(state.sessions, booking.sessionId);
    if (!session) return { ok: false, error: "找不到课次。" };
    var actor = opt.actor || "customer";
    var inWindow = Rules.inCancelWindow(state, session, now);

    if (booking.status === Rules.STATUS.WAITLIST) {
      booking.status = Rules.STATUS.CANCELLED;
      booking.cancelledAt = now.getTime();
      booking.cancelReason = opt.reason || "取消候补";
      return { ok: true, booking: booking, refunded: false, waitlistCancelled: true };
    }

    if (actor === "customer" && !inWindow) {
      return {
        ok: false,
        error: "已过取消窗口（开课前 " + state.settings.cancelWindowHours + " 小时），不能自行取消。如需处理，请联系门店。窗口外取消将不退回已预占次数。",
        outOfWindow: true
      };
    }

    var refund = inWindow;
    if (opt.forceForfeit) refund = false;
    if (refund) {
      if (Rules.hasOpenHold(state, booking.id)) {
        Rules.releaseHold(state, booking.packageId, booking.memberId, booking.id, now, "窗口内取消，退回预占 1 次");
      }
    } else {
      if (Rules.hasOpenHold(state, booking.id)) {
        var f = Rules.forfeitHold(state, booking, now, "窗口外取消，不退次，预占转为已核销");
        if (!f.ok) return f;
      }
    }
    booking.status = Rules.STATUS.CANCELLED;
    booking.cancelledAt = now.getTime();
    booking.cancelReason = opt.reason || (refund ? "窗口内取消，已退回次数并释放名额" : "窗口外取消，名额已释放，次数不退回");
    var promo = Rules.promoteWaitlist(state, session.id, now);
    if (booking.type === "private") releaseSessionIfPrivateEmpty(state, session);
    return { ok: true, booking: booking, refunded: refund, promoted: promo.promoted || [], skipped: promo.skipped || [] };
  };

  Rules.confirmPrivate = function (state, opt) {
    var now = opt.now;
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.type !== "private") return { ok: false, error: "只需确认私教预约。团课已自动确认。" };
    if (booking.status !== Rules.STATUS.PENDING) return { ok: false, error: "当前状态不是待确认。" };
    booking.status = Rules.STATUS.CONFIRMED;
    booking.confirmedAt = now.getTime();
    return { ok: true, booking: booking };
  };

  Rules.rejectPrivate = function (state, opt) {
    var now = opt.now;
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status !== Rules.STATUS.PENDING) return { ok: false, error: "当前状态不是待确认，不能拒绝。" };
    if (Rules.hasOpenHold(state, booking.id)) {
      Rules.releaseHold(state, booking.packageId, booking.memberId, booking.id, now, "私教未通过确认，退回预占 1 次");
    }
    booking.status = Rules.STATUS.REJECTED;
    booking.rejectedAt = now.getTime();
    booking.cancelledAt = now.getTime();
    booking.cancelReason = opt.reason || "门店未确认该私教预约，已退回次数并释放时段";
    var session = find(state.sessions, booking.sessionId);
    if (session) releaseSessionIfPrivateEmpty(state, session);
    return { ok: true, booking: booking };
  };

  Rules.checkIn = function (state, opt) {
    var now = opt.now;
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status === Rules.STATUS.PENDING) return { ok: false, error: "待确认的预约需先确认，才能签到。" };
    if (booking.status !== Rules.STATUS.CONFIRMED) return { ok: false, error: "仅「已确认」的预约可以签到。" };
    var session = find(state.sessions, booking.sessionId);
    if (!session) return { ok: false, error: "找不到课次。" };
    var deduct = Rules.confirmDeduct(state, booking, now, "签到确认扣次，预占转为已核销");
    if (!deduct.ok) return deduct;
    booking.status = Rules.STATUS.ARRIVED;
    booking.checkedInAt = now.getTime();
    return { ok: true, booking: booking };
  };

  Rules.startService = function (state, opt) {
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status !== Rules.STATUS.ARRIVED) return { ok: false, error: "请先签到，再到店上课。" };
    booking.status = Rules.STATUS.IN_SERVICE;
    booking.startedAt = opt.now.getTime();
    return { ok: true, booking: booking };
  };

  Rules.completeService = function (state, opt) {
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status !== Rules.STATUS.IN_SERVICE && booking.status !== Rules.STATUS.ARRIVED) {
      return { ok: false, error: "请先签到后再完成课程。" };
    }
    if (booking.status === Rules.STATUS.ARRIVED) {
      booking.startedAt = opt.now.getTime();
    }
    booking.status = Rules.STATUS.DONE;
    booking.completedAt = opt.now.getTime();
    if (!booking.deducted) {
      var d = Rules.confirmDeduct(state, booking, opt.now, "完成课程时补确认扣次");
      if (!d.ok) return d;
    }
    return { ok: true, booking: booking };
  };

  Rules.markNoShow = function (state, opt) {
    var now = opt.now;
    var booking = find(state.bookings, opt.bookingId);
    if (!booking) return { ok: false, error: "找不到该预约。" };
    if (booking.status !== Rules.STATUS.CONFIRMED && booking.status !== Rules.STATUS.PENDING) {
      return { ok: false, error: "仅待上课的预约可记缺席。" };
    }
    if (booking.status === Rules.STATUS.PENDING) {
      return Rules.rejectPrivate(state, { bookingId: booking.id, now: now, reason: "未确认且未到课，已释放时段" });
    }
    if (Rules.hasOpenHold(state, booking.id)) {
      var f = Rules.forfeitHold(state, booking, now, "缺席不退次，预占转为已核销");
      if (!f.ok) return f;
    }
    booking.status = Rules.STATUS.NOSHOW;
    booking.noShow = true;
    booking.cancelledAt = now.getTime();
    booking.cancelReason = opt.reason || "未到课，记为缺席，次数不退回，名额已释放";
    var session = find(state.sessions, booking.sessionId);
    var promo = session ? Rules.promoteWaitlist(state, session.id, now) : { promoted: [] };
    if (booking.type === "private" && session) releaseSessionIfPrivateEmpty(state, session);
    return { ok: true, booking: booking, promoted: promo.promoted || [] };
  };

  Rules.cancelSession = function (state, opt) {
    var now = opt.now;
    var session = find(state.sessions, opt.sessionId);
    if (!session) return { ok: false, error: "找不到课次。" };
    if (session.canceled) return { ok: false, error: "该课次已停课。" };
    session.canceled = true;
    session.cancelNote = opt.reason || "临时停课";
    var results = [];
    var list = state.bookings.filter(function (b) {
      return b.sessionId === session.id && (Rules.occupiesSlot(b) || b.status === Rules.STATUS.WAITLIST);
    });
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.status === Rules.STATUS.WAITLIST) {
        b.status = Rules.STATUS.CANCELLED;
        b.cancelledAt = now.getTime();
        b.cancelReason = "课次停课，候补取消，未预占次数";
        results.push({ bookingId: b.id, refunded: false });
        continue;
      }
      if (b.status === Rules.STATUS.ARRIVED || b.status === Rules.STATUS.IN_SERVICE || b.status === Rules.STATUS.DONE) {
        results.push({ bookingId: b.id, skipped: true });
        continue;
      }
      if (Rules.hasOpenHold(state, b.id)) {
        Rules.releaseHold(state, b.packageId, b.memberId, b.id, now, "门店停课，退回预占 1 次");
      }
      b.status = Rules.STATUS.CANCELLED;
      b.cancelledAt = now.getTime();
      b.cancelReason = "门店停课，已退回次数并释放名额";
      results.push({ bookingId: b.id, refunded: true });
    }
    return { ok: true, session: session, results: results };
  };

  Rules.addWeeklyGroup = function (state, template) {
    var conflicts = Rules.templateConflicts(state, template);
    if (conflicts.length) return { ok: false, error: conflicts[0], conflicts: conflicts };
    var row = {
      id: template.id || uid("wg"),
      weekday: template.weekday,
      start: template.start,
      end: template.end,
      courseId: template.courseId,
      coachId: template.coachId,
      roomId: template.roomId,
      enabled: template.enabled !== false
    };
    state.weeklyGroup.push(row);
    return { ok: true, template: row };
  };

  Rules.issuePackage = function (state, opt) {
    var now = opt.now;
    var member = find(state.members, opt.memberId);
    if (!member) return { ok: false, error: "找不到会员。" };
    if (!opt.total || opt.total < 1) return { ok: false, error: "发放次数至少为 1。" };
    var pkg = {
      id: uid("pk"),
      memberId: opt.memberId,
      name: opt.name,
      restrict: opt.restrict,
      categories: opt.categories || [],
      total: opt.total,
      expireAt: opt.expireAt,
      issuedAt: dateStr(now),
      voided: false,
      note: opt.note || "演示发放，非真实售卖"
    };
    state.packages.push(pkg);
    pushLedger(state, {
      packageId: pkg.id,
      memberId: opt.memberId,
      bookingId: null,
      action: "issue",
      qty: opt.total,
      at: now.getTime(),
      note: "发放课包「" + pkg.name + "」共 " + opt.total + " 次（演示）"
    });
    return { ok: true, package: pkg };
  };

  Rules.addLeave = function (state, opt) {
    var rec = {
      id: uid("lv"),
      memberId: opt.memberId,
      date: opt.date,
      relatedBookingId: opt.relatedBookingId || null,
      reason: opt.reason || "",
      makeupNote: opt.makeupNote || "",
      createdBy: opt.createdBy || "",
      createdAt: opt.now.getTime()
    };
    state.leaves.push(rec);
    return { ok: true, leave: rec };
  };

  Rules.checkInCode = function (booking) {
    if (!booking) return "------";
    var n = 0;
    var s = booking.id;
    for (var i = 0; i < s.length; i++) n = (n * 33 + s.charCodeAt(i)) % 1000000;
    var code = String(n + 1000000).slice(-6);
    return code;
  };

  Rules.dashboard = function (state, now) {
    var today = dateStr(now);
    var todaySessions = state.sessions.filter(function (s) { return s.date === today && !s.canceled; });
    var todayIds = {};
    todaySessions.forEach(function (s) { todayIds[s.id] = true; });
    var todayBookings = state.bookings.filter(function (b) {
      return todayIds[b.sessionId] && !b.waitlist;
    });
    function countStatus(ss) {
      return todayBookings.filter(function (b) { return ss.indexOf(b.status) !== -1; }).length;
    }
    var booked = todayBookings.filter(function (b) {
      return ["待确认", "已确认", "已到店", "服务中", "已完成", "缺席"].indexOf(b.status) !== -1;
    }).length;
    var arrived = countStatus(["已到店", "服务中", "已完成"]);
    var doneDeduct = 0;
    var startOfDay = atLocal(today, "00:00").getTime();
    var endOfDay = atLocal(today, "23:59").getTime();
    for (var i = 0; i < state.ledger.length; i++) {
      var e = state.ledger[i];
      if ((e.action === "deduct" || e.action === "forfeit") && e.at >= startOfDay && e.at <= endOfDay) doneDeduct += e.qty;
    }
    var noshow = countStatus(["缺席"]);
    var pending = state.bookings.filter(function (b) { return b.status === "待确认"; }).length;
    var courseHits = {};
    state.bookings.forEach(function (b) {
      if (b.waitlist) return;
      if (["已取消", "已拒绝", "候补中", "候补失效"].indexOf(b.status) !== -1) return;
      var s = find(state.sessions, b.sessionId);
      if (!s) return;
      var from = addDays(atLocal(today, "00:00"), -14);
      if (atLocal(s.date, "00:00") < from) return;
      courseHits[s.courseId] = (courseHits[s.courseId] || 0) + 1;
    });
    var popular = Object.keys(courseHits)
      .map(function (id) {
        var c = find(state.courses, id);
        return { courseId: id, name: c ? c.name : id, count: courseHits[id] };
      })
      .sort(function (a, b) { return b.count - a.count; });

    var expiring = [];
    var horizon = addDays(atLocal(today, "23:59"), 21);
    state.packages.forEach(function (pkg) {
      if (pkg.voided) return;
      var expired = Rules.isPackageExpired(pkg, now);
      var stats = Rules.packageStats(state, pkg.id);
      if (stats.available <= 0 && stats.held <= 0) return;
      var exp = atLocal(pkg.expireAt, "23:59");
      if (!expired && exp > horizon) return;
      var member = find(state.members, pkg.memberId);
      expiring.push({
        package: pkg,
        member: member,
        stats: stats,
        expired: expired,
        expireAt: pkg.expireAt
      });
    });
    expiring.sort(function (a, b) { return a.expireAt < b.expireAt ? -1 : 1; });

    var weekStart = addDays(atLocal(today, "00:00"), -(weekday(now) - 1));
    var weekBooked = 0;
    var weekArrived = 0;
    state.bookings.forEach(function (b) {
      var s = find(state.sessions, b.sessionId);
      if (!s || b.waitlist) return;
      var sd = atLocal(s.date, "00:00");
      if (sd < weekStart || sd > addDays(weekStart, 6)) return;
      if (["待确认", "已确认", "已到店", "服务中", "已完成", "缺席"].indexOf(b.status) !== -1) weekBooked++;
      if (["已到店", "服务中", "已完成"].indexOf(b.status) !== -1) weekArrived++;
    });

    return {
      today: today,
      todaySessions: todaySessions.length,
      booked: booked,
      arrived: arrived,
      deducted: doneDeduct,
      noshow: noshow,
      pending: pending,
      popular: popular,
      expiring: expiring,
      weekBooked: weekBooked,
      weekArrived: weekArrived,
      waitlistToday: state.bookings.filter(function (b) {
        return todayIds[b.sessionId] && b.status === "候补中";
      }).length
    };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Rules;
  root.FitFlowRules = Rules;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
