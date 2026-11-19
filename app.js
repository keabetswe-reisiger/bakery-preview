/* TLC Treats – customer ordering. Reads menu.js, talks to db.js. */
(function () {
  var T = window.TLC, DB = window.TLC_DB;
  var $ = function (id) { return document.getElementById(id); };
  var rand = function (n) { return Math.round(n).toLocaleString("en-ZA").replace(/ /g, " "); };
  var money = function (n) { return "R" + rand(n); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- cart ---------- */
  var cart = {};
  try { cart = JSON.parse(sessionStorage.getItem("tlc-cart") || "{}"); } catch (e) {}
  var index = {}; // key -> {item, label, price}
  T.categories.forEach(function (c) { c.items.forEach(function (it) { it.options.forEach(function (o, i) {
    index[it.id + "|" + i] = { item: it, label: o[0], price: o[1] };
  }); }); });
  Object.keys(cart).forEach(function (k) { if (!index[k]) delete cart[k]; });

  function save() { try { sessionStorage.setItem("tlc-cart", JSON.stringify(cart)); } catch (e) {} }
  function lines() { return Object.keys(cart).filter(function (k) { return cart[k] > 0; }).map(function (k) {
    var x = index[k]; return { id: x.item.id, name: x.item.name, option: x.label, price: x.price, qty: cart[k] }; }); }
  function total() { return lines().reduce(function (s, l) { return s + l.price * l.qty; }, 0); }
  function count() { return lines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function deposit() { return Math.ceil(total() * T.depositPct / 100); }

  /* ---------- menu ---------- */
  function renderMenu() {
    var h = "";
    T.categories.forEach(function (c) {
      h += '<h3 class="cat display">' + esc(c.name) + '</h3><div class="menu">';
      c.items.forEach(function (it) {
        var img = it.img ? '<img src="img/' + it.img + '" alt="' + esc(it.alt || it.name) + '" loading="lazy">' : "";
        h += '<article class="pitem' + (it.img ? " has-img" : "") + '" data-item="' + it.id + '">' + img + '<div class="pbody"><h4 class="display">' + esc(it.name) + "</h4>" +
          (it.desc ? "<p>" + esc(it.desc) + "</p>" : "") + '<ul class="prices">';
        it.options.forEach(function (o, i) {
          var k = it.id + "|" + i;
          h += "<li><span>" + esc(o[0]) + "</span><i></i><b>" + money(o[1]) + '</b><div class="qty" role="group" aria-label="' + esc(it.name + ", " + o[0]) + '">' +
            '<button type="button" data-k="' + k + '" data-d="-1" aria-label="Remove one">&minus;</button><output data-q="' + k + '">0</output>' +
            '<button type="button" data-k="' + k + '" data-d="1" aria-label="Add one">+</button></div></li>';
        });
        h += "</ul></div></article>";
      });
      h += "</div>";
    });
    $("menu-root").innerHTML = h;
  }

  function refresh() {
    document.querySelectorAll("[data-q]").forEach(function (o) {
      var q = cart[o.getAttribute("data-q")] || 0; o.textContent = q;
      o.parentNode.querySelector('[data-d="-1"]').disabled = q < 1;
    });
    document.querySelectorAll(".pitem").forEach(function (p) {
      var has = Array.prototype.some.call(p.querySelectorAll("[data-q]"), function (o) { return +o.textContent > 0; });
      p.classList.toggle("has-qty", has);
    });
    var n = count();
    $("cart-count").textContent = n + (n === 1 ? " item" : " items");
    $("cart-total").textContent = "Total " + money(total());
    $("cartbar").classList.toggle("show", n > 0);
    document.body.classList.toggle("has-cart", n > 0);
  }

  $("menu-root").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]"); if (!b) return;
    var k = b.getAttribute("data-k"), d = +b.getAttribute("data-d");
    cart[k] = Math.max(0, Math.min(99, (cart[k] || 0) + d)); if (!cart[k]) delete cart[k];
    save(); refresh();
  });

  /* ---------- checkout ---------- */
  var dlg = $("checkout"), done = $("done");
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function minDate() { var d = new Date(); d.setDate(d.getDate() + T.minLeadDays); return d; }
  function method() { return document.querySelector('input[name="method"]:checked').value; }
  function pay() { return document.querySelector('input[name="pay"]:checked').value; }
  function dayName(d) { return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }); }
  function parseDate(s) { var p = (s || "").split("-"); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }

  function dateHint() {
    $("date-hint").textContent = method() === "deliver"
      ? "Deliveries are on Saturdays and Sundays. Please pick a weekend date."
      : "Collections are Monday to Friday, 08:00 to 15:00. Please pick a weekday.";
  }
  function dateProblem() {
    var d = parseDate($("f-date").value);
    if (!d) return "Please choose the date you need your order.";
    var m = minDate(); m.setHours(0, 0, 0, 0);
    if (d < m) return "Please choose a date from " + dayName(m) + " onwards, so we have time to bake.";
    var ok = method() === "deliver" ? T.deliverDays : T.collectDays;
    if (ok.indexOf(d.getDay()) < 0) return method() === "deliver" ? "Deliveries are on weekends only. Please pick a Saturday or Sunday." : "Collections are Monday to Friday. Please pick a weekday.";
    return "";
  }
  function normPhone(p) {
    var s = String(p).replace(/[^\d+]/g, "");
    if (s.charAt(0) === "+") s = s.slice(1);
    if (s.indexOf("00") === 0) s = s.slice(2);
    if (s.charAt(0) === "0") s = "27" + s.slice(1);
    return s;
  }
  function phoneOk(n) { return /^27[6-8]\d{8}$/.test(n) || /^27\d{9}$/.test(n); }

  function openCheckout() {
    if (!count()) return;
    $("co-lines").innerHTML = lines().map(function (l) {
      return "<li><span>" + l.qty + " &times; " + esc(l.name) + "<small>" + esc(l.option) + " &middot; " + money(l.price) + " each</small></span><b>" + money(l.price * l.qty) + "</b></li>"; }).join("");
    $("co-total").textContent = money(total());
    $("co-pct").textContent = T.depositPct;
    $("co-dep").textContent = money(deposit());
    $("f-date").min = iso(minDate());
    $("pay-card").hidden = !(T.payfast && T.payfast.enabled);
    dateHint(); $("co-err").hidden = true;
    dlg.showModal();
  }
  $("open-checkout").addEventListener("click", openCheckout);
  $("co-close").addEventListener("click", function () { dlg.close(); });
  document.querySelectorAll('input[name="method"]').forEach(function (r) { r.addEventListener("change", function () {
    $("addr-wrap").hidden = method() !== "deliver"; dateHint(); }); });

  function orderNumber() {
    var d = new Date(), a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 4; i++) s += a.charAt(Math.floor(Math.random() * a.length));
    return "TLC-" + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + s;
  }
  function showErr(m, el) { var e = $("co-err"); e.textContent = m; e.hidden = false; if (el) el.focus(); }

  function waText(o) {
    var t = ["Hello TLC Treats, I would like to place an order.", "", "Order: " + o.number, "Name: " + o.name, "Phone: " + o.phone,
      (o.method === "deliver" ? "Delivery on: " : "Collection on: ") + dayName(parseDate(o.neededOn))];
    if (o.method === "deliver") t.push("Address: " + o.address);
    t.push("", "Items:");
    o.items.forEach(function (l) { t.push("- " + l.qty + " x " + l.name + " (" + l.option + ") " + money(l.price * l.qty)); });
    t.push("", "Total: " + money(o.total), "Deposit (" + T.depositPct + "%): " + money(o.deposit) + " by " + (o.payment.method === "card" ? "card (PayFast)" : "bank transfer"));
    if (o.notes) t.push("Notes: " + o.notes);
    t.push("", "Thank you!");
    return t.join("\n");
  }

  $("co-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = $("f-name").value.trim(), phone = normPhone($("f-phone").value), addr = $("f-addr").value.trim();
    if (name.length < 2) return showErr("Please tell us your name.", $("f-name"));
    if (!phoneOk(phone)) return showErr("Please enter a valid South African cell number, for example 078 123 4567.", $("f-phone"));
    if (method() === "deliver" && addr.length < 5) return showErr("Please add your delivery address.", $("f-addr"));
    var dp = dateProblem(); if (dp) return showErr(dp, $("f-date"));
    $("co-err").hidden = true;

    var order = {
      number: orderNumber(), name: name, phone: phone, method: method(), address: method() === "deliver" ? addr : "",
      neededOn: $("f-date").value, notes: $("f-notes").value.trim(), items: lines(), total: total(), deposit: deposit(),
      payment: { method: pay(), status: "pending" }, status: "new"
    };
    var btn = $("co-submit"); btn.disabled = true; btn.textContent = "Sending...";
    DB.saveOrder(order).then(function (id) { return { id: id, saved: !!id }; }, function () { return { id: null, saved: false }; }).then(function (r) {
      btn.disabled = false; btn.textContent = "Place my order";
      showDone(order, r);
    });
  });

  function showDone(order, r) {
    dlg.close();
    $("dn-no").textContent = "Order " + order.number;
    $("dn-wa").href = "https://wa.me/" + T.whatsapp + "?text=" + encodeURIComponent(waText(order));
    var msg = order.payment.method === "card"
      ? "Please tap the green button to send your order to us on WhatsApp, then pay your " + T.depositPct + "% deposit of " + money(order.deposit) + " by card to confirm it."
      : "Please tap the green button to send your order to us on WhatsApp. We will confirm your date and share our banking details so you can pay your " + T.depositPct + "% deposit of " + money(order.deposit) + ".";
    if (!r.saved && DB.mode !== "none") msg = "We could not save your order online, but please send it on WhatsApp using the green button and we will take it from there.";
    $("dn-msg").textContent = msg;
    $("dn-msg").classList.toggle("warn", !r.saved && DB.mode !== "none");
    var payBtn = $("dn-pay");
    payBtn.hidden = !(order.payment.method === "card" && T.payfast && T.payfast.enabled);
    payBtn.onclick = function () { payfast(order); };
    cart = {}; save(); refresh();
    $("co-form").reset(); $("addr-wrap").hidden = true;
    done.showModal();
  }
  $("dn-close").addEventListener("click", function () { done.close(); });

  function payfast(o) {
    var pf = T.payfast, f = $("pf-form"), base = location.href.split("#")[0].split("?")[0];
    var fields = { merchant_id: pf.merchantId, merchant_key: pf.merchantKey, return_url: base, cancel_url: base,
      m_payment_id: o.number, amount: o.deposit.toFixed(2), item_name: "TLC Treats deposit " + o.number };
    f.action = pf.sandbox ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process";
    f.innerHTML = Object.keys(fields).map(function (k) { return '<input type="hidden" name="' + k + '" value="' + esc(fields[k]) + '">'; }).join("");
    f.submit();
  }

  [dlg, done].forEach(function (d) { d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); });

  if (T.payfast && T.payfast.enabled) $("pay-info").textContent = "A " + T.depositPct + "% deposit confirms your order. You can pay by bank transfer (Capitec, details on request) or by card online.";
  renderMenu(); refresh();
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
