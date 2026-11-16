require('dotenv').config();
const bcrypt=require('bcryptjs');
const db=require('../db');
(async()=>{
 const name=process.env.ADMIN_NAME||'Store Admin';
 const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=String(process.env.ADMIN_PASSWORD||'');
 if(!email||password.length<12){console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env');process.exit(1);}
 const hash=await bcrypt.hash(password,12);
 const existing=db.prepare('SELECT id FROM users WHERE email=?').get(email);
 if(existing){db.prepare("UPDATE users SET name=?,password_hash=?,role='admin' WHERE id=?").run(name,hash,existing.id);console.log('Admin account updated.');}
 else{db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run(name,email,hash);console.log('Admin account created.');}
 process.exit(0);
})();
