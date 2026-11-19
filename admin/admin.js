/* TLC Treats owner app: live order book. */
(function(){
  var T=window.TLC, DB=window.TLC_DB;
  var $=function(i){return document.getElementById(i);};
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
  var money=function(n){return "R"+Math.round(n).toLocaleString("en-ZA").replace(/ /g," ");};
  var STATUS={new:"New",confirmed:"Confirmed",baking:"Baking",ready:"Ready",completed:"Completed",cancelled:"Cancelled"};
  var NEXT={new:["confirmed","Confirm order"],confirmed:["baking","Start baking"],baking:["ready","Mark ready"],ready:["completed","Mark collected / delivered"]};
  var PAY={pending:"Deposit not received",deposit:"Deposit received",paid:"Paid in full"};
  var TABS=[["new","New"],["active","In progress"],["ready","Ready"],["done","Done"],["bake","Baking list"],["reports","Reports"],["costs","Costs"]];
  var costs={},period="month",NOCOUNT={bake:1,reports:1,costs:1};
  var orders=[],tab="new",knownIds=null,unwatch=function(){};

  function show(id){["screen-setup","screen-login","screen-app"].forEach(function(s){$(s).hidden=s!==id;});}
  function dateStr(s){var p=(s||"").split("-");if(p.length!==3)return s||"";return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString("en-ZA",{weekday:"long",day:"numeric",month:"long"});}
  function inTab(o,t){var s=o.status;
    if(t==="new")return s==="new"; if(t==="active")return s==="confirmed"||s==="baking";
    if(t==="ready")return s==="ready"; if(t==="done")return s==="completed"||s==="cancelled"; return false;}

  function renderTabs(){
    $("tabs").innerHTML=TABS.map(function(t){
      var n=NOCOUNT[t[0]]?0:orders.filter(function(o){return inTab(o,t[0]);}).length;
      return '<button class="tab" role="tab" data-t="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+(n&&t[0]!=="done"?"<em>"+n+"</em>":"")+"</button>";}).join("");
  }
  function orderCard(o,fresh){
    var wa="https://wa.me/"+esc(o.phone)+"?text="+encodeURIComponent("Hello "+o.name+", this is TLC Treats about your order "+o.number+". ");
    var next=NEXT[o.status];
    var pay=o.payment||{method:"eft",status:"pending"};
    return '<article class="order'+(fresh?" fresh":"")+'" data-id="'+esc(o.id)+'">'+
      '<div class="row"><div><div class="no">'+esc(o.number)+'</div><div>'+esc(o.name)+'</div></div><span class="badge '+(o.status==="new"?"new":"")+'">'+STATUS[o.status]+"</span></div>"+
      '<div class="due">'+(o.method==="deliver"?"Delivery":"Collection")+" &middot; "+esc(dateStr(o.neededOn))+"</div>"+
      (o.method==="deliver"?'<div class="muted">Address: '+esc(o.address)+"</div>":"")+
      '<ul class="items">'+(o.items||[]).map(function(l){return "<li><span>"+l.qty+" &times; "+esc(l.name)+"<small>"+esc(l.option)+"</small></span><b>"+money(l.price*l.qty)+"</b></li>";}).join("")+"</ul>"+
      '<div class="tot"><span>Total</span><span>'+money(o.total)+'</span></div><div class="tot muted"><span>Deposit ('+T.depositPct+"%)</span><span>"+money(o.deposit)+" &middot; "+(pay.method==="card"?"card":"transfer")+"</span></div>"+
      (o.notes?'<div class="notes">Notes: '+esc(o.notes)+"</div>":"")+
      '<div class="payrow"><label class="muted" for="p-'+esc(o.id)+'">Payment</label><select id="p-'+esc(o.id)+'" data-pay="'+esc(o.id)+'">'+
        Object.keys(PAY).map(function(k){return '<option value="'+k+'"'+(pay.status===k?" selected":"")+">"+PAY[k]+"</option>";}).join("")+"</select></div>"+
      '<div class="acts">'+(next?'<button class="btn" data-next="'+next[0]+'" data-id="'+esc(o.id)+'">'+next[1]+"</button>":"")+
        '<a class="btn alt" href="tel:+'+esc(o.phone)+'">Call</a><a class="btn alt" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>'+
        (o.status!=="cancelled"&&o.status!=="completed"?'<button class="btn danger" data-cancel="'+esc(o.id)+'">Cancel</button>':"")+"</div></article>";
  }
  function bakeList(){
    var act=orders.filter(function(o){return o.status==="new"||o.status==="confirmed"||o.status==="baking";});
    if(!act.length)return '<p class="empty">Nothing to bake right now.</p>';
    var byDay={};act.forEach(function(o){(byDay[o.neededOn]=byDay[o.neededOn]||[]).push(o);});
    return Object.keys(byDay).sort().map(function(d){
      var agg={};byDay[d].forEach(function(o){(o.items||[]).forEach(function(l){var k=l.name+" ("+l.option+")";agg[k]=(agg[k]||0)+l.qty;});});
      return '<div class="day">'+esc(dateStr(d))+'</div><div class="order"><ul class="items">'+Object.keys(agg).sort().map(function(k){return "<li><span>"+esc(k)+"</span><b>&times; "+agg[k]+"</b></li>";}).join("")+
        '</ul><div class="muted">'+byDay[d].length+(byDay[d].length===1?" order":" orders")+"</div></div>";}).join("");
  }
  function render(){
    renderTabs();
    var el=$("list");
    if(tab==="bake"){el.innerHTML=bakeList();return;}
    if(tab==="reports"){el.innerHTML=reportsView();return;}
    if(tab==="costs"){el.innerHTML=costsView();return;}
    var l=orders.filter(function(o){return inTab(o,tab);});
    if(tab!=="done")l.sort(function(a,b){return (a.neededOn||"").localeCompare(b.neededOn||"");});
    el.innerHTML=l.length?l.map(function(o){return orderCard(o,o._fresh);}).join(""):'<p class="empty">No orders here yet.</p>';
  }

  /* ---------- Reports: favourites + margins ---------- */
  var PERIODS=[["today","Today"],["week","This week"],["month","This month"],["all","All time"]];
  function periodStart(p){var n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    if(p==="today")return d.getTime(); if(p==="week"){var k=(d.getDay()+6)%7;d.setDate(d.getDate()-k);return d.getTime();}
    if(p==="month")return new Date(n.getFullYear(),n.getMonth(),1).getTime(); return 0;}
  function ck(l){return l.id+"|"+l.option;}
  function pct(a,b){return b>0?Math.round(a/b*100)+"%":"-";}
  function reportsView(){
    var from=periodStart(period);
    var list=orders.filter(function(o){return o.status!=="cancelled"&&(o.createdMs||0)>=from;});
    var sales=0,costedSales=0,costTotal=0,missing={},items={};
    list.forEach(function(o){(o.items||[]).forEach(function(l){
      var rev=l.price*l.qty,c=costs[ck(l)],it=items[l.name]=items[l.name]||{qty:0,rev:0,cRev:0,cost:0};
      sales+=rev;it.qty+=l.qty;it.rev+=rev;
      if(c!=null&&c!==""){costedSales+=rev;costTotal+=c*l.qty;it.cRev+=rev;it.cost+=c*l.qty;}else missing[l.name]=1;});});
    var profit=costedSales-costTotal,nMissing=Object.keys(missing).length;
    var rank=Object.keys(items).map(function(k){return Object.assign({name:k},items[k]);}).sort(function(a,b){return b.qty-a.qty||b.rev-a.rev;});
    var max=rank.length?rank[0].qty:1;
    var h='<div class="chips">'+PERIODS.map(function(p){return '<button class="tab" data-period="'+p[0]+'" aria-selected="'+(period===p[0])+'">'+p[1]+"</button>";}).join("")+"</div>";
    h+='<div class="tiles"><div class="tile"><span>Orders</span><b>'+list.length+'</b></div><div class="tile"><span>Sales</span><b>'+money(sales)+'</b></div>'+
       '<div class="tile"><span>Profit</span><b>'+(costedSales?money(profit):"-")+'</b></div><div class="tile"><span>Margin</span><b>'+(costedSales?pct(profit,costedSales):"-")+"</b></div></div>";
    if(!costedSales&&sales)h+='<p class="notes">Add what each item costs you to make in the <b>Costs</b> tab to see your profit and margins.</p>';
    else if(nMissing)h+='<p class="notes">Profit and margin only count items that have a cost entered. '+nMissing+(nMissing===1?" item is":" items are")+" still missing a cost (see the Costs tab).</p>";
    h+='<div class="day">Favourite items</div>';
    if(!rank.length)return h+'<p class="empty">No orders in this period yet.</p>';
    h+='<div class="order"><ol class="fav">'+rank.slice(0,10).map(function(r,i){
      return '<li><div class="favtop"><span><b>'+(i+1)+".</b> "+esc(r.name)+"</span><span>"+r.qty+" sold</span></div>"+
        '<div class="bar"><i style="width:'+Math.max(6,Math.round(r.qty/max*100))+'%"></i></div>'+
        '<div class="muted favsub">Sales '+money(r.rev)+(r.cRev?" &middot; Profit "+money(r.cRev-r.cost)+" ("+pct(r.cRev-r.cost,r.cRev)+" margin)":" &middot; add a cost to see profit")+"</div></li>";}).join("")+"</ol></div>";
    return h+'<p class="muted small">Sales are the item prices on orders that are not cancelled. Delivery fees are not included.</p>';
  }
  function costsView(){
    var h='<p class="notes">Enter what each item costs you to make (ingredients, packaging, gas). Your margin appears next to it.</p><div class="order">';
    T.categories.forEach(function(c){h+='<div class="day small">'+esc(c.name)+"</div>";
      c.items.forEach(function(it){h+="<h4 class=\"ci\">"+esc(it.name)+"</h4>";
        it.options.forEach(function(o){var key=it.id+"|"+o[0],v=costs[key],has=v!=null&&v!=="";
          h+='<div class="costrow"><span>'+esc(o[0])+'<small>Price '+money(o[1])+'</small></span><label class="sr" for="c-'+esc(key)+'">Cost for '+esc(it.name+" "+o[0])+'</label>'+
            '<input id="c-'+esc(key)+'" type="number" inputmode="decimal" min="0" step="0.01" data-cost="'+esc(key)+'" data-price="'+o[1]+'" value="'+(has?v:"")+'" placeholder="Cost R">'+
            '<span class="mg" data-mg="'+esc(key)+'">'+(has?marginText(o[1],v):"")+"</span></div>";});});});
    return h+'</div><button class="btn" id="save-costs" style="width:100%;margin-bottom:24px">Save costs</button><p class="ok" id="costs-ok" hidden>Saved.</p>';
  }
  function marginText(price,cost){var m=price-cost;return "Margin "+money(m)+" ("+pct(m,price)+")";}
  function beep(){try{var c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(c.currentTime+.18);}catch(e){}}
  function onOrders(list){
    var fresh=[];
    if(knownIds){list.forEach(function(o){if(!knownIds[o.id]){o._fresh=true;fresh.push(o);}});}
    knownIds={};list.forEach(function(o){knownIds[o.id]=1;});
    orders=list;
    if(fresh.length){beep();document.title="("+fresh.length+") New order | TLC Treats Orders";setTimeout(function(){document.title="TLC Treats Orders";},8000);}
    render();
  }
  function start(){
    show("screen-app");DB.getCosts().then(function(c){costs=c||{};if(tab==="reports"||tab==="costs")render();},function(){});$("demo").hidden=DB.mode!=="local";$("logout").hidden=!DB.needsLogin;
    unwatch=DB.watchOrders(onOrders,function(e){$("list").innerHTML='<p class="empty">We could not load orders. '+esc(e&&e.code==="permission-denied"?"This account is not allowed to see orders.":"Please check your connection.")+"</p>";});
  }
  document.addEventListener("click",function(e){
    var t=e.target.closest("[data-t]");if(t){tab=t.getAttribute("data-t");render();return;}
    var n=e.target.closest("[data-next]");if(n){n.disabled=true;DB.updateOrder(n.getAttribute("data-id"),{status:n.getAttribute("data-next")});return;}
    var c=e.target.closest("[data-cancel]");if(c&&confirm("Cancel this order?"))DB.updateOrder(c.getAttribute("data-cancel"),{status:"cancelled"});
  });
  document.addEventListener("change",function(e){var s=e.target.closest("[data-pay]");if(!s)return;
    var o=orders.filter(function(x){return x.id===s.getAttribute("data-pay");})[0];if(!o)return;
    DB.updateOrder(o.id,{payment:{method:(o.payment||{}).method||"eft",status:s.value}});});
  document.addEventListener("click",function(e){
    var p=e.target.closest("[data-period]");if(p){period=p.getAttribute("data-period");render();return;}
    if(e.target.id==="save-costs"){var o={};document.querySelectorAll("[data-cost]").forEach(function(i){if(i.value!=="")o[i.getAttribute("data-cost")]=Math.max(0,parseFloat(i.value)||0);});
      DB.saveCosts(o).then(function(){costs=o;var ok=$("costs-ok");if(ok)ok.hidden=false;},function(){alert("We could not save your costs. Please check your connection and try again.");});}
  });
  document.addEventListener("input",function(e){var i=e.target.closest("[data-cost]");if(!i)return;
    var m=document.querySelector('[data-mg="'+i.getAttribute("data-cost")+'"]');if(m)m.textContent=i.value===""?"":marginText(+i.getAttribute("data-price"),parseFloat(i.value)||0);});
  $("logout").addEventListener("click",function(){DB.logout();});
  $("login").addEventListener("submit",function(e){e.preventDefault();$("l-err").hidden=true;
    DB.login($("l-email").value.trim(),$("l-pass").value).catch(function(){$("l-err").textContent="That email or password is not right. Please try again.";$("l-err").hidden=false;});});

  if(DB.mode==="none")show("screen-setup");
  else DB.onAuth(function(u){unwatch();knownIds=null;if(u)start();else show("screen-login");});
  if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0)navigator.serviceWorker.register("sw.js").catch(function(){});
})();
