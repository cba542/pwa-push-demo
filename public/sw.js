self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch{d={title:'預約通知',body:e.data?e.data.text():''}}
e.waitUntil(self.registration.showNotification(d.title||'預約通知',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',data:{url:'/'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return clients.openWindow('/')}))});
