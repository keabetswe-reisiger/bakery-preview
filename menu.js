/* ============================================================
   TLC Treats – settings + menu data. Edit prices HERE only.
   Both the customer site and the owner app read this file.
   ============================================================ */
window.TLC = {
  name: "TLC Treats",
  whatsapp: "27782043547",          // her WhatsApp number, no + or spaces
  phoneDisplay: "+27 78 204 3547",
  depositPct: 50,                   // "50% deposit confirms your order"
  minLeadDays: 1,                   // earliest order date = tomorrow
  collectDays: [1,2,3,4,5],         // 0=Sun … 6=Sat  (collection Mon–Fri)
  deliverDays: [0,6],               // deliveries on weekends

  /* ---- Online database (order book). Paste Firebase web config here.
     Leave null until the Firebase project exists (see SETUP.md).
     Without it, orders still reach her by WhatsApp. ---- */
  firebase: null,
  /* example: { apiKey:"…", authDomain:"…", projectId:"…", appId:"…" } */

  /* ---- Card payment of the deposit via PayFast.
     Needs her PayFast merchant details (see SETUP.md). ---- */
  payfast: { enabled:false, sandbox:true, merchantId:"", merchantKey:"" },

  categories: [
    { id:"baked", name:"Baked goodies", items:[
      { id:"scones",   name:"Scones",   options:[["20 Litres",690],["10 Litres",440],["5 Litres",290]] },
      { id:"biscuits", name:"Biscuits", options:[["20 Litres",1100],["10 Litres",650],["5 Litres",350]] },
      { id:"muffins",  name:"Muffins",  img:"crunch-muffins.jpg", alt:"Tray of muffins with a crunchy golden topping",
        options:[["20 Litres",1200],["10 Litres",600],["5 Litres",300]] },
      { id:"oats",     name:"Oats Crunch", img:"rusks.jpg", alt:"A white bucket full of oats crunch squares",
        options:[["20 Litres",1100],["10 Litres",680],["5 Litres",370]] },
      { id:"lamingtons", name:"Lamingtons (Red Cakes)", options:[["20 Litres",1200],["10 Litres",600],["5 Litres",300]] },
      { id:"fatcakes", name:"Fat Cakes (Vetkoek)", options:[["Each",4]] },
      { id:"banana",   name:"Banana Loaf", options:[["Each",30]] }
    ]},
    { id:"tarts", name:"Tarts", items:[
      { id:"milktart", name:"Milk Tart (per tray)", desc:"Creamy, smooth milk custard with a touch of cinnamon on a buttery pastry base.", options:[["Per tray",50]] },
      { id:"mint",     name:"Peppermint Tart (per tray)", desc:"Creamy peppermint and rich chocolate layered over a delicious biscuit base.", options:[["Per tray",74]] },
      { id:"jam",      name:"Jam Tarts", desc:"Buttery pastry filled with sweet, fruity jam for a delicious burst of flavour.", options:[["20 Litres",1000],["10 Litres",550],["5 Litres",300]] }
    ]},
    { id:"desserts", name:"Desserts", items:[
      { id:"donuts",   name:"Donuts", img:"sugar-doughnuts.jpg", alt:"Sugar-coated donuts", options:[["Each",16]] },
      { id:"cheese",   name:"Cheese Cake (per tray)", options:[["Per tray",190]] },
      { id:"cinnamon", name:"Cinnamon Bun", options:[["Each",20]] },
      { id:"croissant",name:"Croissants", options:[["Each",25]] }
    ]}
  ]
};
