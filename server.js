require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
 console.error('SESSION_SECRET must be set to at least 32 characters.');
 process.exit(1);
}
if (isProd) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:false}));
app.use(session({
 name:'sasaki.sid',
 store:new SQLiteStore({db:'sessions.sqlite',dir:path.dirname(path.resolve(process.env.DB_PATH || './data/store.sqlite'))}),
 secret:process.env.SESSION_SECRET,
 resave:false, saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:'lax',secure:isProd,maxAge:1000*60*60*24*7}
}));
const authLimit = rateLimit({windowMs:15*60*1000,max:12,standardHeaders:true,legacyHeaders:false});
const checkoutLimit = rateLimit({windowMs:15*60*1000,max:8,standardHeaders:true,legacyHeaders:false});
const publicDir = path.join(__dirname,'public');

function safeUser(u){ return {id:u.id,name:u.name,email:u.email,role:u.role}; }
function requireAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Please log in first.'}); next(); }
function requireAdmin(req,res,next){ if(!req.session.user || req.session.user.role!=='admin') return res.status(403).json({error:'Admin access required.'}); next(); }

app.get('/api/health',(req,res)=>res.json({ok:true,store:"Sasaki's Collection Store",version:'2.0.0'}));
app.post('/api/auth/register',authLimit,async(req,res)=>{
 try {
  const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
  if(name.length<2 || name.length>70) return res.status(400).json({error:'Enter a name between 2 and 70 characters.'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Enter a valid email address.'});
  if(password.length<10 || password.length>100) return res.status(400).json({error:'Password must be 10–100 characters.'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(409).json({error:'An account with this email already exists.'});
  const hash=await bcrypt.hash(password,12);
  const info=db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name,email,hash,'customer');
  const user=db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  req.session.user=safeUser(user);
  res.status(201).json({user:safeUser(user)});
 } catch(e){ console.error(e); res.status(500).json({error:'Could not create account.'}); }
});
app.post('/api/auth/login',authLimit,async(req,res)=>{
 try {
  const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(!user || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:'Email or password is incorrect.'});
  req.session.regenerate(err=>{
   if(err) return res.status(500).json({error:'Could not start session.'});
   req.session.user=safeUser(user);
   res.json({user:safeUser(user)});
  });
 } catch(e){ console.error(e); res.status(500).json({error:'Login failed.'}); }
});
app.post('/api/auth/logout',(req,res)=>req.session.destroy(()=>{res.clearCookie('sasaki.sid');res.json({ok:true});}));
app.get('/api/auth/me',(req,res)=>res.json({user:req.session.user||null}));

app.get('/api/products',(req,res)=>{
 const {category,search}=req.query;
 let sql='SELECT id,name,category,description,price,stock,image,featured FROM products WHERE active=1';
 const args=[];
 if(category && category!=='All'){sql+=' AND category=?';args.push(String(category));}
 if(search){sql+=' AND (name LIKE ? OR description LIKE ?)';args.push('%'+String(search).slice(0,80)+'%','%'+String(search).slice(0,80)+'%');}
 sql+=' ORDER BY featured DESC,id DESC';
 res.json({products:db.prepare(sql).all(...args)});
});
app.post('/api/orders',checkoutLimit,async(req,res)=>{
 const {items,customer}=req.body||{};
 if(!Array.isArray(items)||!items.length||items.length>30) return res.status(400).json({error:'Your cart is empty or invalid.'});
 const name=String(customer?.name||req.session.user?.name||'').trim(), email=String(customer?.email||req.session.user?.email||'').trim(), phone=String(customer?.phone||'').trim(), address=String(customer?.address||'').trim(), city=String(customer?.city||'').trim();
 if(name.length<2||!email||phone.length<7||address.length<8||city.length<2) return res.status(400).json({error:'Please complete your name, email, phone, address and city.'});
 try{
  const orderId=db.transaction(()=>{
   let subtotal=0; const normalized=[];
   for(const item of items){
    const id=Number(item.id), qty=Math.max(1,Math.min(20,Math.floor(Number(item.quantity)||1)));
    const p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(id);
    if(!p) throw new Error('A product in your cart is no longer available.');
    if(p.stock<qty) throw new Error(`${p.name} does not have enough stock.`);
    subtotal+=p.price*qty; normalized.push({p,qty});
   }
   const shipping=subtotal>=8000?0:250, total=subtotal+shipping;
   const info=db.prepare(`INSERT INTO orders(user_id,customer_name,email,phone,address,city,payment_method,status,subtotal,shipping,total)
   VALUES(?,?,?,?,?,?,?,'Pending',?,?,?)`).run(req.session.user?.id||null,name,email,phone,address,city,'Cash on Delivery',subtotal,shipping,total);
   const add=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,?,?,?)');
   const stock=db.prepare('UPDATE products SET stock=stock-? WHERE id=?');
   normalized.forEach(({p,qty})=>{add.run(info.lastInsertRowid,p.id,p.name,p.price,qty);stock.run(qty,p.id);});
   return info.lastInsertRowid;
  })();
  res.status(201).json({orderId,total:db.prepare('SELECT total FROM orders WHERE id=?').get(orderId).total,message:'Order placed successfully. Payment is Cash on Delivery.'});
 }catch(e){res.status(400).json({error:e.message||'Could not place order.'});}
});

app.get('/api/admin/summary',requireAdmin,(req,res)=>{
 const products=db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n;
 const orders=db.prepare('SELECT COUNT(*) n FROM orders').get().n;
 const revenue=db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='Cancelled'").get().n;
 const customers=db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n;
 res.json({products,orders,revenue,customers});
});
app.get('/api/admin/products',requireAdmin,(req,res)=>res.json({products:db.prepare('SELECT * FROM products ORDER BY id DESC').all()}));
app.post('/api/admin/products',requireAdmin,(req,res)=>{
 const p=req.body||{};
 if(!String(p.name||'').trim()||!String(p.category||'').trim()||!Number.isFinite(Number(p.price))||Number(p.price)<0||!Number.isInteger(Number(p.stock))||Number(p.stock)<0) return res.status(400).json({error:'Name, category, valid price and stock are required.'});
 const info=db.prepare('INSERT INTO products(name,category,description,price,stock,image,featured) VALUES(?,?,?,?,?,?,?)').run(String(p.name).trim(),String(p.category).trim(),String(p.description||''),Math.round(Number(p.price)),Number(p.stock),String(p.image||''),p.featured?1:0);
 res.status(201).json({id:info.lastInsertRowid});
});
app.put('/api/admin/products/:id',requireAdmin,(req,res)=>{
 const p=req.body||{};
 const info=db.prepare(`UPDATE products SET name=?,category=?,description=?,price=?,stock=?,image=?,featured=?,active=? WHERE id=?`).run(String(p.name||'').trim(),String(p.category||'Accessories'),String(p.description||''),Math.max(0,Math.round(Number(p.price)||0)),Math.max(0,Math.floor(Number(p.stock)||0)),String(p.image||''),p.featured?1:0,p.active===false?0:1,Number(req.params.id));
 if(!info.changes)return res.status(404).json({error:'Product not found.'});
 res.json({ok:true});
});
app.delete('/api/admin/products/:id',requireAdmin,(req,res)=>{db.prepare('UPDATE products SET active=0 WHERE id=?').run(Number(req.params.id));res.json({ok:true});});
app.get('/api/admin/orders',requireAdmin,(req,res)=>{
 const orders=db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
 const getItems=db.prepare('SELECT product_name,price,quantity FROM order_items WHERE order_id=?');
 res.json({orders:orders.map(o=>({...o,items:getItems.all(o.id)}))});
});
app.patch('/api/admin/orders/:id',requireAdmin,(req,res)=>{
 const status=String(req.body.status||'');
 if(!['Pending','Confirmed','Shipped','Delivered','Cancelled'].includes(status))return res.status(400).json({error:'Invalid status.'});
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(Number(req.params.id));
 if(!order)return res.status(404).json({error:'Order not found.'});
 if(order.status==='Cancelled' && status!=='Cancelled') return res.status(400).json({error:'Cancelled orders cannot be reopened. Create a new order instead.'});
 db.transaction(()=>{
  if(status==='Cancelled' && order.status!=='Cancelled'){
   const items=db.prepare('SELECT product_id,quantity FROM order_items WHERE order_id=?').all(order.id);
   const restore=db.prepare('UPDATE products SET stock=stock+? WHERE id=?');
   items.forEach(i=>{if(i.product_id)restore.run(i.quantity,i.product_id);});
  }
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,order.id);
 })();
 res.json({ok:true});
});

app.use(express.static(publicDir));
app.get('/admin',(req,res)=>res.sendFile(path.join(publicDir,'admin.html')));
app.get('*',(req,res)=>res.sendFile(path.join(publicDir,'index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Sasaki's Collection Store running on port ${PORT}`));
