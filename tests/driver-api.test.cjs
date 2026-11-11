const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const load=()=>import('../driver/api.mjs');
const session={accessToken:'synthetic-access',refreshToken:'synthetic-refresh',user:{fullName:'Driver'}};
test('login, profile and save follow the API contract',async()=>{
 const {DriverApi}=await load();const calls=[];const client=new DriverApi(async(url,options)=>{calls.push({url,options});return Response.json(url.endsWith('/auth/login')?session:{fullName:'Driver'});});
 await client.login(' driver@example.test ','synthetic-password');await client.profile();await client.saveProfile(' Driver ','');
 assert.equal(calls[0].url,'https://semitrax-api.onrender.com/auth/login');assert.equal(calls[0].options.headers.Authorization,undefined);
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'driver@example.test',password:'synthetic-password'});
 assert.equal(calls[1].options.headers.Authorization,'Bearer synthetic-access');assert.deepEqual(JSON.parse(calls[2].options.body),{fullName:'Driver',phone:null});
 for(const {options} of calls){assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');}
});
test('late login cannot restore a cleared session',async()=>{
 const {DriverApi}=await load();let complete;const client=new DriverApi(()=>new Promise(resolve=>{complete=resolve;}));
 const pending=client.login('driver@example.test','synthetic');client.clear();complete(Response.json(session));
 await assert.rejects(pending,/Session changed/);assert.equal(client.session,null);
});
test('authentication expiry clears state and never retries a write',async()=>{
 const {DriverApi}=await load();let expired=0,calls=0;const client=new DriverApi(async()=>{calls++;return new Response('',{status:401});},()=>expired++);
 client.session=session;await assert.rejects(client.saveProfile('Driver',''),/Sign in again/);assert.equal(expired,1);assert.equal(calls,1);assert.equal(client.session,null);
});
test('logout clears credentials when server revocation fails',async()=>{
 const {DriverApi}=await load();const client=new DriverApi(async()=>new Response('',{status:503}));client.session=session;
 await assert.rejects(client.logout());assert.equal(client.session,null);
});
test('late profile response body cannot escape sign-out',async()=>{
 const {DriverApi}=await load();let complete,started;const ready=new Promise(resolve=>{started=resolve;});
 const client=new DriverApi(async()=>({ok:true,status:200,json:()=>{started();return new Promise(resolve=>{complete=resolve;});}}));
 client.session=session;const pending=client.profile();await ready;client.clear();complete({fullName:'Previous driver'});await assert.rejects(pending,/Session changed/);
});
test('service worker excludes API, authenticated and unrelated requests',()=>{
 const handlers={};vm.runInNewContext(fs.readFileSync('driver/sw.js','utf8'),{URL,self:{registration:{scope:'https://www.semitrax.com/driver/'},addEventListener:(name,cb)=>{handlers[name]=cb;}}});
 for(const [url,method,authorized] of [['https://semitrax-api.onrender.com/me','GET',false],['https://www.semitrax.com/reset-password','GET',false],['https://www.semitrax.com/driver/','POST',false],['https://www.semitrax.com/driver/','GET',true]])handlers.fetch({request:{url,method,headers:{has:()=>authorized}},respondWith:()=>assert.fail('Private request intercepted')});
});
test('empty credentials in successful login response are rejected',async()=>{
 const {DriverApi}=await load();const client=new DriverApi(async()=>Response.json({...session,accessToken:''}));await assert.rejects(client.login('driver@example.test','synthetic'),/Invalid sign-in/);assert.equal(client.session,null);
});
