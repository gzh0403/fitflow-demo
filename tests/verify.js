#!/usr/bin/env node
/* FitFlow P2 核心流程验证。不依赖浏览器。 */
var assert = require("assert");
var path = require("path");
var Rules = require(path.join(__dirname, "../js/rules.js"));
var Store = require(path.join(__dirname, "../js/store.js"));

var fails = [];
function ok(name, cond, detail) {
  if (cond) console.log("  ✓ " + name);
  else {
    console.log("  ✗ " + name + (detail ? " — " + detail : ""));
    fails.push(name + (detail ? " — " + detail : ""));
  }
}

var now = new Date(2026, 10, 11, 18, 15, 0);
console.log("\n[1] 种子数据");
var state = Store.buildSeed(now);
ok("有会员、课次、课包", state.members.length >= 7 && state.sessions.length > 10 && state.packages.length > 5);
var m1 = Rules.memberPackagesView(state, "m1", now);
var groupPkg = m1.filter(function (v) { return v.pkg.restrict === "group"; })[0];
var privPkg = m1.filter(function (v) { return v.pkg.restrict === "private"; })[0];
ok("林予安团课包有可约余次", groupPkg && groupPkg.stats.available > 0, JSON.stringify(groupPkg && groupPkg.stats));
ok("林予安私教包有可约余次", privPkg && privPkg.stats.available > 0);
state.packages.forEach(function (p) {
  var st = Rules.packageStats(state, p.id);
  ok("课包 " + p.id + " 无负余额", st.available >= 0 && st.held >= 0 && st.deducted >= 0, JSON.stringify(st));
});
var fullId = state.meta.fullDemoSessionId;
var full = Rules.find(state.sessions, fullId);
ok("存在满员演示课次", !!full && Rules.remainingSpots(state, full) === 0);
ok("林予安在该课候补", Rules.waitlistOf(state, fullId).some(function (b) { return b.memberId === "m1"; }));

var soon = state.bookings.filter(function (b) {
  if (b.memberId !== "m1" || b.status !== "已确认") return false;
  var s = Rules.find(state.sessions, b.sessionId);
  return s && s.type === "group" && !Rules.inCancelWindow(state, s, now) && Rules.sessionStart(s) > now;
})[0];
var later = state.bookings.filter(function (b) {
  if (b.memberId !== "m1" || b.status !== "已确认") return false;
  var s = Rules.find(state.sessions, b.sessionId);
  return s && s.type === "group" && Rules.inCancelWindow(state, s, now);
})[0];
ok("有窗口外不可取消的已确认团课", !!soon);
ok("有窗口内可取消的已确认团课", !!later);

function outOfWindowBooking(st, t) {
  return st.bookings.filter(function (b) {
    if (b.memberId !== "m1" || b.status !== "已确认") return false;
    var s = Rules.find(st.sessions, b.sessionId);
    return s && s.type === "group" && !Rules.inCancelWindow(st, s, t) && Rules.sessionStart(s) > t;
  })[0];
}
[
  [14, 0],
  [16, 30],
  [11, 0],
  [22, 0],
  [9, 0]
].forEach(function (hm) {
  var t = new Date(2026, 10, 11, hm[0], hm[1], 0);
  var st = Store.buildSeed(t);
  var found = outOfWindowBooking(st, t);
  var label = (hm[0] < 10 ? "0" : "") + hm[0] + ":" + (hm[1] < 10 ? "0" : "") + hm[1];
  ok("重置时刻 " + label + " 仍有窗口外示范课", !!found, found ? found.sessionId : "none");
});

console.log("\n[2] 团课预约：自动确认 + 预占 1 次");
var open = state.sessions.filter(function (s) {
  return s.type === "group" && !s.canceled && Rules.remainingSpots(state, s) > 0 &&
    Rules.sessionStart(s) - now > 5 * 3600000 &&
    !state.bookings.some(function (b) { return b.sessionId === s.id && b.memberId === "m1" && (Rules.occupiesSlot(b) || b.status === "候补中"); });
})[0];
ok("找得到可新约的团课", !!open, open ? open.id : "none");
if (open) {
  var before = Rules.packageStats(state, groupPkg.pkg.id);
  var spotsBefore = Rules.remainingSpots(state, open);
  var booked = Rules.bookGroup(state, { sessionId: open.id, memberId: "m1", packageId: groupPkg.pkg.id, now: now, bookedBy: "self" });
  ok("预约成功", booked.ok, booked.error);
  ok("团课自动进入已确认", booked.booking && booked.booking.status === "已确认");
  var after = Rules.packageStats(state, groupPkg.pkg.id);
  ok("预占 +1，可约 -1，核销不变", after.held === before.held + 1 && after.available === before.available - 1 && after.deducted === before.deducted,
    JSON.stringify({ before: before, after: after }));
  ok("名额减少 1", Rules.remainingSpots(state, open) === spotsBefore - 1);
  var dup = Rules.bookGroup(state, { sessionId: open.id, memberId: "m1", packageId: groupPkg.pkg.id, now: now });
  ok("同一人不能重复预约同一课次", !dup.ok);
}

console.log("\n[3] 满员不可再约，只能候补");
var outsider = "m6"; /* 私教会员，先发一张团课包以便测试满员拒绝 */
var issued = Rules.issuePackage(state, { memberId: "m7", name: "过期不可约应已存在", restrict: "group", total: 2, expireAt: Rules.dateStr(Rules.addDays(now, -1)), now: now });
var m4pack = Rules.memberPackagesView(state, "m4", now).filter(function (v) { return v.usable && v.pkg.restrict === "group"; })[0];
var alreadyInFull = state.bookings.some(function (b) { return b.sessionId === fullId && b.memberId === "m4" && Rules.occupiesSlot(b); });
if (!alreadyInFull && m4pack) {
  var fullBook = Rules.bookGroup(state, { sessionId: fullId, memberId: "m4", packageId: m4pack.pkg.id, now: now });
  ok("满员时普通预约失败", !fullBook.ok && fullBook.full, fullBook.error);
} else {
  /* m4 可能已在满员课中，换一个不在课里的会员 */
  var candidate = state.members.filter(function (m) {
    return !state.bookings.some(function (b) { return b.sessionId === fullId && b.memberId === m.id && (Rules.occupiesSlot(b) || b.status === "候补中"); });
  })[0];
  var usable = candidate && Rules.usablePackages(state, candidate.id, Rules.find(state.courses, full.courseId), now)[0];
  if (!usable) {
    var give = Rules.issuePackage(state, { memberId: candidate.id, name: "临时团课包", restrict: "group", total: 3, expireAt: Rules.dateStr(Rules.addDays(now, 30)), now: now });
    usable = { pkg: give.package };
  }
  var fullBook = Rules.bookGroup(state, { sessionId: fullId, memberId: candidate.id, packageId: usable.pkg.id, now: now });
  ok("满员时普通预约失败", !fullBook.ok && fullBook.full, fullBook.error);
  var wl = Rules.joinWaitlist(state, { sessionId: fullId, memberId: candidate.id, packageId: usable.pkg.id, now: now });
  ok("满员后可加入候补", wl.ok && wl.waitlist, wl.error);
  ok("候补不预占次数", !Rules.hasOpenHold(state, wl.booking.id));
}

console.log("\n[4] 窗口内取消：退回次数、释放名额、候补转正");
/* 在满员课上取消一位占名人，林予安应转正 */
var occupant = state.bookings.filter(function (b) { return b.sessionId === fullId && Rules.occupiesSlot(b); })[0];
ok("满员课有占名人可取消", !!occupant);
if (occupant) {
  var occPkg = Rules.packageStats(state, occupant.packageId);
  var m1before = Rules.packageStats(state, groupPkg.pkg.id);
  var spots0 = Rules.remainingSpots(state, full);
  var cancel = Rules.cancelBooking(state, { bookingId: occupant.id, now: now, actor: "staff" });
  ok("窗口内取消成功并退回", cancel.ok && cancel.refunded, cancel.error);
  var occAfter = Rules.packageStats(state, occupant.packageId);
  ok("被取消者预占退回、可约加回", occAfter.available === occPkg.available + 1 && occAfter.held === occPkg.held - 1, JSON.stringify({ occPkg: occPkg, occAfter: occAfter }));
  ok("有候补被转正", cancel.promoted && cancel.promoted.length >= 1, JSON.stringify(cancel.promoted && cancel.promoted.map(function (b) { return b.memberId; })));
  var m1wait = state.bookings.filter(function (b) { return b.memberId === "m1" && b.sessionId === fullId; })[0];
  if (m1wait && cancel.promoted.some(function (b) { return b.memberId === "m1"; })) {
    ok("林予安候补转正为已确认", m1wait.status === "已确认" && !m1wait.waitlist);
    var m1after = Rules.packageStats(state, groupPkg.pkg.id);
    ok("转正后林予安预占 +1", m1after.held === m1before.held + 1 && m1after.available === m1before.available - 1, JSON.stringify({ m1before: m1before, m1after: m1after }));
  }
  ok("转正后名额仍满或合理", Rules.remainingSpots(state, full) === spots0, "before " + spots0 + " after " + Rules.remainingSpots(state, full));
}

console.log("\n[5] 窗口外取消：顾客不可自行取消；门店取消不退次");
if (soon) {
  var selfCancel = Rules.cancelBooking(state, { bookingId: soon.id, now: now, actor: "customer" });
  ok("窗口外顾客取消被拒绝", !selfCancel.ok && selfCancel.outOfWindow, selfCancel.error);
  var before = Rules.packageStats(state, soon.packageId);
  var staffCancel = Rules.cancelBooking(state, { bookingId: soon.id, now: now, actor: "staff", forceForfeit: true });
  ok("门店窗口外取消成功且不退次", staffCancel.ok && staffCancel.refunded === false, staffCancel.error);
  var after = Rules.packageStats(state, soon.packageId);
  ok("预占转为已核销，可约不变", after.available === before.available && after.held === before.held - 1 && after.deducted === before.deducted + 1,
    JSON.stringify({ before: before, after: after }));
  ok("该预约已标记扣次，避免重复扣", !!soon.deducted && soon.status === "已取消");
}

console.log("\n[6] 签到确认扣次，不可重复扣");
/* 找一节较远的已确认团课给 m3 签到，或新约一节再签到 */
var checkTarget = state.bookings.filter(function (b) {
  return b.status === "已确认" && b.type === "group" && !b.deducted && b.memberId !== "m1";
})[0];
if (!checkTarget) {
  var s2 = state.sessions.filter(function (s) {
    return s.type === "group" && !s.canceled && Rules.remainingSpots(state, s) > 0 && Rules.sessionStart(s) - now > 10 * 3600000;
  })[0];
  var p3 = Rules.usablePackages(state, "m3", Rules.find(state.courses, s2.courseId), now)[0];
  checkTarget = Rules.bookGroup(state, { sessionId: s2.id, memberId: "m3", packageId: p3.pkg.id, now: now }).booking;
}
var pkgBefore = Rules.packageStats(state, checkTarget.packageId);
var ci = Rules.checkIn(state, { bookingId: checkTarget.id, now: now });
ok("签到成功，状态已到店", ci.ok && ci.booking.status === "已到店", ci.error);
var pkgAfter = Rules.packageStats(state, checkTarget.packageId);
ok("预占转为已核销，可约不变", pkgAfter.available === pkgBefore.available && pkgAfter.held === pkgBefore.held - 1 && pkgAfter.deducted === pkgBefore.deducted + 1,
  JSON.stringify({ pkgBefore: pkgBefore, pkgAfter: pkgAfter }));
var ci2 = Rules.checkIn(state, { bookingId: checkTarget.id, now: now });
ok("不可重复签到/扣次", !ci2.ok);
var ded2 = Rules.confirmDeduct(state, checkTarget, now, "再次扣");
ok("不可对同一预约重复扣次", !ded2.ok);

console.log("\n[7] 课包限制与过期");
var yoga = state.sessions.filter(function (s) {
  return s.courseId === "g2" && !s.canceled && Rules.remainingSpots(state, s) > 0 && Rules.sessionStart(s) > now &&
    !state.bookings.some(function (b) { return b.sessionId === s.id && b.memberId === "m2"; });
})[0];
var reformerPkg = Rules.find(state.packages, "pk3"); /* m2 改革器专项 */
if (yoga && reformerPkg) {
  var bad = Rules.bookGroup(state, { sessionId: yoga.id, memberId: "m2", packageId: "pk3", now: now });
  ok("改革器专项课包不能约流动瑜伽", !bad.ok);
}
var expired = Rules.find(state.packages, "pk8");
ok("叶浣溪夏季卡已过期", Rules.isPackageExpired(expired, now));
var anyGroup = state.sessions.filter(function (s) {
  return s.type === "group" && !s.canceled && Rules.remainingSpots(state, s) > 0 && Rules.sessionStart(s) > now;
})[0];
var expBook = Rules.bookGroup(state, { sessionId: anyGroup.id, memberId: "m7", packageId: "pk8", now: now });
ok("过期课包不可约", !expBook.ok);

var privOnGroup = Rules.bookGroup(state, { sessionId: anyGroup.id, memberId: "m1", packageId: "pk2", now: now });
ok("仅限私教的课包不能约团课", !privOnGroup.ok);

console.log("\n[8] 私教自动 / 手动确认，教练时段互斥");
state.settings.privateConfirmMode = "auto";
function firstFree(coachId, afterHours) {
  for (var d = 0; d <= 12; d++) {
    var date = Rules.dateStr(Rules.addDays(now, d));
    var slots = Rules.privateAvailability(state, coachId, date, Rules.find(state.courses, "p1"), now);
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].available) continue;
      var hrs = (Rules.atLocal(date, slots[i].start) - now) / 3600000;
      if (hrs >= (afterHours || 5)) return { date: date, slot: slots[i] };
    }
  }
  return null;
}
var slotA = firstFree("t3", 6);
ok("找得到裴衡可约时段", !!slotA);
var autoPv = Rules.bookPrivate(state, {
  memberId: "m1", courseId: "p1", coachId: "t3", date: slotA.date, start: slotA.slot.start,
  end: slotA.slot.end, roomId: slotA.slot.roomId, packageId: "pk2", now: now
});
ok("自动确认模式下私教直接已确认", autoPv.ok && autoPv.booking.status === "已确认", autoPv.error);
var clash = Rules.bookPrivate(state, {
  memberId: "m6", courseId: "p1", coachId: "t3", date: slotA.date, start: slotA.slot.start,
  end: slotA.slot.end, roomId: slotA.slot.roomId, packageId: "pk7", now: now
});
ok("同一教练同一时段不能再接一节私教", !clash.ok, clash.error);

state.settings.privateConfirmMode = "manual";
var slotB = firstFree("t3", 6);
ok("另有可约私教时段用于手动确认", !!slotB);
var manPv = Rules.bookPrivate(state, {
  memberId: "m6", courseId: "p1", coachId: "t3", date: slotB.date, start: slotB.slot.start,
  end: slotB.slot.end, roomId: slotB.slot.roomId, packageId: "pk7", now: now
});
ok("手动确认模式下进入待确认", manPv.ok && manPv.booking.status === "待确认", manPv.error);
ok("待确认也预占次数并占用时段", Rules.hasOpenHold(state, manPv.booking.id) && Rules.remainingSpots(state, manPv.session) === 0);
var rejected = Rules.rejectPrivate(state, { bookingId: manPv.booking.id, now: now });
ok("拒绝后退回次数并释放时段", rejected.ok && manPv.booking.status === "已拒绝" && !Rules.hasOpenHold(state, manPv.booking.id));
var slotAgain = Rules.privateAvailability(state, "t3", slotB.date, Rules.find(state.courses, "p1"), now)
  .filter(function (s) { return s.start === slotB.slot.start && s.available; });
ok("拒绝后同一时段可再约", slotAgain.length === 1);

var slotC = firstFree("t3", 6);
var man2 = Rules.bookPrivate(state, {
  memberId: "m6", courseId: "p1", coachId: "t3", date: slotC.date, start: slotC.slot.start,
  end: slotC.slot.end, roomId: slotC.slot.roomId, packageId: "pk7", now: now
});
var conf = Rules.confirmPrivate(state, { bookingId: man2.booking.id, now: now });
ok("手动确认可通过，进入已确认", conf.ok && man2.booking.status === "已确认");

console.log("\n[9] 教室冲突与周循环容量模型");
var sample = state.sessions.filter(function (s) { return s.type === "group" && !s.canceled && s.date > Rules.dateStr(now); })[0];
var cap = Rules.sessionCapacity(state, sample);
var c = Rules.find(state.courses, sample.courseId);
var r = Rules.find(state.rooms, sample.roomId);
ok("容量取课程上限与教室容纳较小值", cap === Math.min(c.maxPeople, r.capacity));
var clashRoom = Rules.sessionConflicts(state, {
  id: "tmp", date: sample.date, start: sample.start, end: sample.end,
  coachId: "t3", roomId: sample.roomId, type: "group"
});
ok("同一教室同一时段冲突被检出", clashRoom.some(function (x) { return x.indexOf("教室") !== -1; }), clashRoom.join(";"));
var clashCoach = Rules.sessionConflicts(state, {
  id: "tmp", date: sample.date, start: sample.start, end: sample.end,
  coachId: sample.coachId, roomId: "r3", type: "private"
});
ok("同一教练团课与私教重叠被检出", clashCoach.some(function (x) { return x.indexOf("教练") !== -1; }), clashCoach.join(";"));

console.log("\n[10] 看板数字与操作一致，重置可用");
var dash = Rules.dashboard(state, now);
var today = Rules.dateStr(now);
var todayIds = {};
state.sessions.filter(function (s) { return s.date === today && !s.canceled; }).forEach(function (s) { todayIds[s.id] = true; });
var bookedToday = state.bookings.filter(function (b) {
  return todayIds[b.sessionId] && !b.waitlist && ["待确认", "已确认", "已到店", "服务中", "已完成", "缺席"].indexOf(b.status) !== -1;
}).length;
ok("今日约课数与预约列表一致", dash.booked === bookedToday, dash.booked + " vs " + bookedToday);
ok("看板字段均为数字", typeof dash.arrived === "number" && typeof dash.deducted === "number");

var reset = Store.buildSeed(now);
ok("重新生成种子后数据完整", reset.bookings.length > 10 && reset.packages.length > 5);
var st1 = Rules.packageStats(state, "pk1");
var st2 = Rules.packageStats(reset, "pk1");
/* 验证过程改过 state，reset 应回到初始余次 */
ok("重置后林予安团课包回到种子余次（与被改脏的状态不同）", st2.available !== st1.available || st2.held !== st1.held,
  JSON.stringify({ dirty: st1, reset: st2 }));
ok("重置后仍无负余额", st2.available >= 0);

console.log("\n==== 结果 ====");
if (fails.length) {
  console.log("失败 " + fails.length + " 项：");
  fails.forEach(function (f) { console.log(" - " + f); });
  process.exit(1);
} else {
  console.log("全部通过");
}
