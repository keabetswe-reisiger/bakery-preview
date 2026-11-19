/* ============================================================
   Order storage. One interface, three back-ends:
     firebase  – real shared database (when TLC.firebase is set)
     local     – browser storage, ONLY on localhost (for testing)
     none      – nothing stored; orders go by WhatsApp only
   ============================================================ */
(function(){
  var cfg = window.TLC.firebase;
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var V = "10.12.2", G = "https://www.gstatic.com/firebasejs/" + V + "/";

  function localList(){ try{ return JSON.parse(localStorage.getItem("tlc-orders")||"[]"); }catch(e){ return []; } }
  function localSave(l){ localStorage.setItem("tlc-orders", JSON.stringify(l)); window.dispatchEvent(new Event("tlc-orders")); }

  var api;
  if (cfg) {
    var boot;
    function init(){
      return boot || (boot = Promise.all([import(G+"firebase-app.js"),import(G+"firebase-firestore.js"),import(G+"firebase-auth.js")]).then(function(m){
        var app=m[0].initializeApp(cfg);
        return { fs:m[1], au:m[2], db:m[1].getFirestore(app), auth:m[2].getAuth(app) };
      }));
    }
    api = {
      mode:"firebase", needsLogin:true,
      saveOrder:function(o){ return init().then(function(f){
        var d=Object.assign({},o,{createdAt:f.fs.serverTimestamp()});
        return f.fs.addDoc(f.fs.collection(f.db,"orders"),d).then(function(r){return r.id;}); }); },
      watchOrders:function(cb,err){ var un=function(){}; init().then(function(f){
        var q=f.fs.query(f.fs.collection(f.db,"orders"),f.fs.orderBy("createdAt","desc"),f.fs.limit(300));
        un=f.fs.onSnapshot(q,function(s){ cb(s.docs.map(function(d){var x=d.data(); x.id=d.id;
          x.createdMs = x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now(); return x;})); },
          function(e){ err&&err(e); }); }); return function(){un();}; },
      updateOrder:function(id,patch){ return init().then(function(f){ return f.fs.updateDoc(f.fs.doc(f.db,"orders",id),patch); }); },
      getCosts:function(){ return init().then(function(f){ return f.fs.getDoc(f.fs.doc(f.db,"settings","costs")).then(function(s){ return s.exists()?(s.data().costs||{}):{}; }); }); },
      saveCosts:function(c){ return init().then(function(f){ return f.fs.setDoc(f.fs.doc(f.db,"settings","costs"),{costs:c}); }); },
      login:function(e,p){ return init().then(function(f){ return f.au.signInWithEmailAndPassword(f.auth,e,p); }); },
      logout:function(){ return init().then(function(f){ return f.au.signOut(f.auth); }); },
      onAuth:function(cb){ init().then(function(f){ f.au.onAuthStateChanged(f.auth,function(u){cb(u?{email:u.email}:null);}); }); }
    };
  } else if (isLocal) {
    api = {
      mode:"local", needsLogin:false,
      saveOrder:function(o){ var l=localList(), id="local-"+Date.now(); l.unshift(Object.assign({},o,{id:id,createdMs:Date.now()})); localSave(l); return Promise.resolve(id); },
      watchOrders:function(cb){ function go(){cb(localList());} window.addEventListener("tlc-orders",go); window.addEventListener("storage",go); go(); return function(){}; },
      updateOrder:function(id,patch){ var l=localList().map(function(x){return x.id===id?Object.assign(x,patch):x;}); localSave(l); return Promise.resolve(); },
      getCosts:function(){ try{return Promise.resolve(JSON.parse(localStorage.getItem("tlc-costs")||"{}"));}catch(e){return Promise.resolve({});} },
      saveCosts:function(c){ localStorage.setItem("tlc-costs",JSON.stringify(c)); return Promise.resolve(); },
      login:function(){return Promise.resolve();}, logout:function(){return Promise.resolve();}, onAuth:function(cb){cb({email:"demo"});}
    };
  } else {
    api = {
      mode:"none", needsLogin:false,
      saveOrder:function(){ return Promise.resolve(null); },
      watchOrders:function(){return function(){};}, updateOrder:function(){return Promise.resolve();},
      getCosts:function(){return Promise.resolve({});}, saveCosts:function(){return Promise.resolve();},
      login:function(){return Promise.reject(new Error("No database connected"));}, logout:function(){return Promise.resolve();}, onAuth:function(cb){cb(null);}
    };
  }
  window.TLC_DB = api;
})();
