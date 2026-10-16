const fs=require('fs'),wp=require('web-push'),D=__dirname;
let keys;
if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY){keys={publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY};console.log('VAPID keys from env')}
else{keys=wp.generateVAPIDKeys();console.log('VAPID keys generated in memory (subscriptions reset on restart)')}
wp.setVapidDetails('mailto:demo@example.com',keys.publicKey,keys.privateKey);
const token=(process.env.SEND_TOKEN||'').trim();if(!token)console.warn('SEND_TOKEN not set: POST /send disabled');
const sf=D+'/subscriptions.json';let subs=[];
try{if(fs.existsSync(sf))subs=JSON.parse(fs.readFileSync(sf))}catch(e){subs=[]}
const load=()=>subs.slice(),save=l=>{subs=l;try{fs.writeFileSync(sf,JSON.stringify(l))}catch(e){}};
async function sendAll(title,body){const l=load();let ok=0,fail=0;const keep=[];
for(const s of l){try{await wp.sendNotification(s,JSON.stringify({title,body}),{TTL:3600,urgency:'high'});ok++;keep.push(s)}catch(e){fail++;if(![404,410].includes(e.statusCode))keep.push(s);console.error('fail',e.statusCode||e.message)}}
save(keep);return{ok,fail,total:l.length}}
module.exports={publicKey:keys.publicKey,token,load,save,sendAll};
