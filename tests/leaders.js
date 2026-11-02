// Gate for the Heart Meter (leaders/) and its backend. Run from the repo root: node tests/leaders.js
const fs=require("fs"),vm=require("vm"),path=require("path");
process.chdir(path.join(__dirname,".."));
let fails=0;const ok=(c,m)=>{console.log((c?"ok   ":"FAIL ")+m);if(!c)fails++;};
const html=fs.readFileSync("leaders/index.html","utf8");
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
ok(scripts.length===1,"one inline script");
scripts.forEach((s,i)=>{try{new vm.Script(s);ok(true,"inline script parses")}catch(e){ok(false,"inline script parses: "+e.message)}});
try{new vm.Script(fs.readFileSync("backend/Code.gs","utf8"));ok(true,"Code.gs parses")}catch(e){ok(false,"Code.gs parses: "+e.message)}
try{new vm.Script(fs.readFileSync("leaders/config.js","utf8"));ok(true,"config.js parses")}catch(e){ok(false,"config.js parses: "+e.message)}
ok(/<meta name="robots" content="noindex,nofollow">/.test(html),"noindex meta");
ok(/Disallow: \//.test(fs.readFileSync("robots.txt","utf8")),"robots.txt blocks crawlers");
ok(fs.existsSync("leaders/logo.png"),"leaders/logo.png present");
const ids=[...html.matchAll(/[\s<]id="([^"$]+)"/g)].map(m=>m[1]);
ok(ids.length===new Set(ids).size,"ids are unique ("+ids.length+")");
const used=[...scripts[0].matchAll(/\$\("([\w-]+)"\)/g)].map(m=>m[1]);
const missing=[...new Set(used)].filter(x=>!ids.includes(x));
ok(missing.length===0,"every $(id) exists in the page"+(missing.length?": "+missing.join(","):""));
const files=["leaders/index.html","backend/Code.gs","leaders/config.js","README.md"].filter(f=>fs.existsSync(f));
ok(!files.some(f=>fs.readFileSync(f,"utf8").includes("—")),"no em dash in "+files.join(", "));
ok(!/@(gmail|mcgeheeschool|bfhsla|newmanschool|ashrosary)\.|\b504\d{7}\b/.test(html+fs.readFileSync("backend/Code.gs","utf8")),"no leader emails or phone numbers in the code");

// Security checks on the page
ok(/Content-Security-Policy/.test(html),"page has a Content-Security-Policy");
ok(!/data-(id|del|move|odel)="\$\{[go]\.id\}"/.test(html),"row ids are escaped before going into HTML");

// Run Code.gs against a fake Google (Sheets, Properties, Cache)
function fakeGoogle(teamCode,preset){
  const sheets={};
  const mkSheet=name=>{const rows=[];return {rows,
    appendRow:r=>rows.push(r.slice()),setFrozenRows(){},
    getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),
    getLastRow:()=>rows.length,getLastColumn:()=>Math.max(...rows.map(r=>r.length)),
    getRange:(r,c,nr,nc)=>({getValues:()=>{const out=[];for(let i=0;i<(nr||1);i++)out.push(rows[r-1+i].slice(c-1,c-1+(nc||1)));return out},setValue:v=>{rows[r-1][c-1]=v}}),
    deleteRow:r=>rows.splice(r-1,1)}};
  Object.entries(preset||{}).forEach(([n,rows])=>{sheets[n]=mkSheet(n);rows.forEach(r=>sheets[n].rows.push(r.slice()))});
  const ss={getId:()=>"sheet1",getName:()=>"HoP data",getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=mkSheet(n))};
  const cache={};let uuid=0;
  const props={TEAM_CODE:teamCode};
  // Fake Drive: one backups folder whose files can be copied in and trashed.
  const drive={folders:[],copies:[],clock:0};
  const mkFolder=name=>{const f={name,files:[],getFiles(){const live=f.files.filter(x=>!x.trashed);let i=0;return {hasNext:()=>i<live.length,next:()=>live[i++]}}};drive.folders.push(f);return f};
  const triggers=[];
  const spot={code:200,body:"",calls:0};
  const ctx={sheets,console,props,drive,triggers,spot,
    UrlFetchApp:{fetch:()=>{spot.calls++;if(spot.code===0)throw new Error("timeout");return {getResponseCode:()=>spot.code,getContentText:()=>spot.body}}},
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
    DriveApp:{getFoldersByName:n=>{const m=drive.folders.filter(f=>f.name===n);let i=0;return {hasNext:()=>i<m.length,next:()=>m[i++]}},
      createFolder:mkFolder,
      getFileById:id=>({makeCopy:(name,folder)=>{const t=++drive.clock;const c={name,trashed:false,getId:()=>"copy"+t,getDateCreated:()=>new Date(t*1000),setTrashed(v){c.trashed=v}};folder.files.push(c);drive.copies.push(c);return c}})},
    ScriptApp:{getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),
      newTrigger:fn=>({timeBased:()=>({everyHours:h=>({create:()=>{const t={fn,h,getHandlerFunction:()=>fn};triggers.push(t);return t}})})})},
    ContentService:{MimeType:{JSON:"json"},createTextOutput:t=>({setMimeType(){return this},text:t})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]==null?null:props[k],setProperty:(k,v)=>{props[k]=v}})},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v}})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{getUuid:()=>"id"+(++uuid),formatDate:()=> "2026-10-19"}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync("backend/Code.gs","utf8"),ctx);
  ctx.get=()=>JSON.parse(ctx.doGet().text);
  ctx.post=b=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(b)}}).text);
  return ctx;
}
try{
  const g=fakeGoogle("Secret-Code");
  ok(g.get().settings.leaders.length===17,"empty Settings falls back to the 17 leaders");
  ok(g.post({action:"check",code:"nope"}).error==="wrong_code","wrong team code is rejected");
  ok(g.post({action:"check",code:" secret-code "}).ok,"right team code works (case and spaces ignored)");
  ok(g.post({action:"add_donation",code:"Secret-Code",leader:"Nobody",amount:5}).error==="unknown_leader","unknown leader is rejected");
  ok(g.post({action:"add_donation",code:"Secret-Code",leader:"Kate",amount:-5}).error==="bad_amount","negative amount is rejected");
  const r=g.post({action:"add_donation",code:"Secret-Code",leader:"Kate",amount:"25.555",donor:'=IMPORTXML("http://x")',note:"+1 hi",date:"bad"});
  ok(r.ok,"a valid donation is saved");
  const row=g.sheets.Donations.rows[1];
  ok(row[4].startsWith("'=")&&row[7].startsWith("'+"),"formula-looking text is stored as plain text");
  ok(row[5]===25.56&&row[2]==="2026-10-19","amount is rounded and a bad date is replaced");
  ok(g.get().donations[0].amount===25.56,"the page reads back the saved donation");
  ok(g.post({action:"toggle",code:"Secret-Code",kind:"donation",id:r.id,field:"received",value:true}).ok&&g.get().donations[0].received===true,"received can be toggled");
  ok(g.post({action:"delete",code:"Secret-Code",kind:"donation",id:r.id}).ok&&g.get().donations.length===0,"a donation can be deleted");
  const logs=g.sheets.Log.rows.map(x=>x[1]);
  ok(logs.join()==="action,add,toggle,delete"&&g.sheets.Log.rows[3][4].includes("Kate"),"every write is logged and a deleted row keeps its content");
  ok(g.post({action:"add_outreach",code:"Secret-Code",leader:"Ella",org:"Shop",status:"maybe"}).error==="bad_status","unknown outreach status is rejected");
  for(let i=0;i<26;i++)g.post({action:"check",code:"guess"+i});
  ok(g.post({action:"check",code:"Secret-Code"}).error==="paused","after 25 wrong codes, writes pause");

  // Next step: required for every contact, editable later, and every change logged
  const C="Secret-Code";const gn=fakeGoogle(C);
  ok(gn.post({action:"add_outreach",code:C,leader:"Ella",org:"Shop",status:"contacted",nextStep:"   "}).error==="need_next_step","outreach without a next step is rejected");
  const o=gn.post({action:"add_outreach",code:C,leader:"Ella",org:"Shop",status:"contacted",nextStep:"Call back Tuesday"});
  ok(o.ok&&gn.get().outreach.find(x=>x.id===o.id).nextStep==="Call back Tuesday","outreach saves and reads back its next step");
  ok(gn.post({action:"next",code:C,kind:"outreach",id:o.id,nextStep:""}).error==="need_next_step","a next step cannot be cleared to empty");
  ok(gn.post({action:"next",code:C,kind:"outreach",id:o.id,nextStep:"=HYPERLINK(1)"}).ok&&gn.get().outreach.find(x=>x.id===o.id).nextStep==="'=HYPERLINK(1)","next step can be updated and formula text stays plain");
  const nl=gn.sheets.Log.rows.filter(x=>x[1]==="next").pop();
  ok(nl&&nl[4].includes("Call back Tuesday"),"the old next step is kept in the Log when it changes");
  ok(gn.post({action:"next",code:C,kind:"outreach",id:"nope",nextStep:"x"}).error==="not_found","next step on a missing card says not_found");

  // A Sheet made before the next-step column keeps its old rows in place
  const old=fakeGoogle(C,{Outreach:[["id","createdAt","date","leader","org","how","status","note"],["o1","t","2026-10-01","Kate","Old Shop","Email","waiting","hi"]]});
  const ol=old.get().outreach[0];
  ok(old.sheets.Outreach.rows[0][8]==="nextStep"&&ol.org==="Old Shop"&&ol.note==="hi"&&!ol.nextStep,"an old Sheet gets the nextStep header without moving its data");
  const o2=old.post({action:"add_outreach",code:C,leader:"Kate",org:"New",status:"yes",nextStep:"Pick up check"});
  ok(old.get().outreach.find(x=>x.id===o2.id).nextStep==="Pick up check","new rows on an old Sheet land in the right column");
  ok(old.post({action:"next",code:C,kind:"outreach",id:"o1",nextStep:"Email again"}).ok&&old.get().outreach[0].nextStep==="Email again","an old card can get its first next step");

  // Backups
  const b=fakeGoogle(C);
  ok(b.get().lastBackup==="","before any backup the page gets an empty lastBackup");
  const first=b.installBackup();
  ok(first&&b.drive.copies.length===1&&b.drive.folders.length===1&&b.drive.folders[0].name==="HoP Heart Meter backups","installBackup makes the first copy in the backups folder");
  ok(b.triggers.length===1&&b.triggers[0].fn==="backup"&&b.triggers[0].h===1,"installBackup schedules an hourly check");
  b.installBackup();
  ok(b.triggers.length===1&&b.drive.folders.length===1,"running installBackup twice does not double the trigger or the folder");
  const n=b.drive.copies.length;
  ok(b.backup({triggerUid:"x"})===null&&b.drive.copies.length===n,"no copy when nothing changed (the trigger event is not a force)");
  b.post({action:"add_donation",code:C,leader:"Kate",amount:10});
  ok(b.backup({})&&b.drive.copies.length===n+1,"a write since the last copy makes a new copy");
  b.props.lastBackupAt=new Date(Date.now()-25*3600*1000).toISOString();
  ok(b.backup({})&&b.drive.copies.length===n+2,"a copy older than a day is refreshed even without writes");
  ok(b.get().lastBackup===b.props.lastBackupAt,"the page reads the time of the last copy");
  for(let i=0;i<205;i++)b.backup(true);
  const live=b.drive.folders[0].files.filter(x=>!x.trashed);
  ok(live.length===200&&b.drive.copies.filter(x=>x.trashed).every(x=>x.getDateCreated()<=live.reduce((m,y)=>y.getDateCreated()<m?y.getDateCreated():m,new Date(8e15))),"keeps the newest 200 copies and trashes only the oldest");

  const g2=fakeGoogle(null);
  ok(g2.post({action:"check",code:""}).error==="wrong_code","with no TEAM_CODE set, nobody can write");
}catch(e){ok(false,"backend test crashed: "+e.message)}
// Critical rules: money, deletes, codes, and what the page cannot change
try{
  const C="Secret-Code";const g=fakeGoogle(C);
  ok(g.post({action:"add_donation",code:C,leader:"Kate",amount:"abc"}).error==="bad_amount","text amount is rejected");
  ok(g.post({action:"add_donation",code:C,leader:"Kate",amount:0}).error==="bad_amount","zero amount is rejected");
  ok(g.post({action:"add_donation",code:C,leader:"Kate",amount:1000001}).error==="bad_amount","amount over $1,000,000 is rejected");
  ok(g.post({action:"add_donation",code:C,leader:"Kate",amount:"1e3"}).ok&&g.get().donations[0].amount===1000,"scientific notation is read as the number it is");
  ok(g.sheets.Donations.rows.length===2,"rejected donations leave no row behind");
  const d=g.get().donations[0];
  ok(g.post({action:"delete",code:"wrong",kind:"donation",id:d.id}).error==="wrong_code"&&g.get().donations.length===1,"a wrong code cannot delete");
  ok(g.post({action:"delete",code:C,kind:"donation",id:"nope"}).error==="not_found","deleting a missing row says not_found");
  ok(g.post({action:"toggle",code:C,kind:"donation",id:d.id,field:"amount",value:true}).error==="bad_request"&&g.get().donations[0].amount===1000,"toggle cannot change the amount");
  ok(g.post({action:"set_goal",code:C,goal:1}).error==="unknown_action"&&g.get().settings.goal===2000,"the page cannot change the goal");
  ok(g.post({action:"add_outreach",code:C,leader:"Nobody",org:"x",status:"yes",nextStep:"x"}).error==="unknown_leader","outreach for an unknown leader is rejected");
  ok(JSON.parse(g.doPost({postData:{contents:"{not json"}}).text).error==="bad_request","a broken request body is rejected");
  const before=g.sheets.Log.rows.length;g.post({action:"add_donation",code:C,leader:"Ava",amount:5});
  ok(g.sheets.Log.rows.length===before+1,"each saved donation adds exactly one Log row");
}catch(e){ok(false,"critical rule test crashed: "+e.message)}

// The page's math: totals and badges, run from the real inline script
try{
  const src=scripts[0];
  const pick=n=>{const i=src.indexOf("function "+n+"(");let depth=0,j=src.indexOf("{",i);for(let k=j;k<src.length;k++){if(src[k]==="{")depth++;if(src[k]==="}"&&--depth===0)return src.slice(i,k+1);}throw new Error("no "+n)};
  const page=vm.createContext({state:{leaders:["Kate","Ava"],goal:2000,gifts:[]}});
  vm.runInContext(pick("spotLinked")+";"+pick("counted")+";"+pick("totals")+";"+pick("badges"),page);
  const T=gifts=>{page.state.gifts=gifts;return vm.runInContext("totals()",page)};
  let t=T([{leader:"Kate",amount:0.1},{leader:"Kate",amount:0.2},{leader:"Ava",amount:"50"}]);
  ok(Math.abs(t.by.Kate.sum-0.3)<1e-9&&t.by.Ava.sum===50&&Math.abs(t.team-50.3)<1e-9,"totals add each leader and the team, numbers stored as text included");
  ok(t.by.Kate.n===2&&t.by.Ava.n===1,"totals count gifts per leader");
  t=T([{leader:"Kate",amount:"abc"}]);
  ok(t.team===0&&t.by.Kate.n===1,"a broken amount counts as $0, never NaN");
  t=T([{leader:"Gone",amount:100},{leader:"Kate",amount:10}]);
  const sumHearts=Object.values(t.by).reduce((a,b)=>a+b.sum,0);
  ok(t.team===110&&sumHearts===10,"KNOWN: a gift from a leader no longer on the roster counts for the team but in no heart");
  // Spotfund in the hearts: linked leaders count what Spotfund says, never their hand-logged Spotfund gifts on top
  page.state.spot={stories:[{leader:"Kate",counts:150.5},{leader:"Gone",counts:40}]};
  t=T([{leader:"Kate",amount:100,event:"Spotfund"},{leader:"Kate",amount:20,event:"Company sponsorship"},{leader:"Ava",amount:30,event:"Spotfund"}]);
  ok(t.by.Kate.sum===170.5&&t.by.Kate.spot===150.5,"a linked leader's heart adds Spotfund to their other gifts and skips their hand-logged Spotfund gift");
  ok(t.by.Ava.sum===30,"a leader not linked yet still counts their hand-logged Spotfund gift");
  ok(t.team===170.5+30+40,"the team total uses the same rule as the hearts");
  page.state.spot={stories:[]};
  page.state.gifts=[];
  ok(vm.runInContext('badges({sum:2000,n:3})',page)==="Goal reached"&&vm.runInContext('badges({sum:1000,n:1})',page)==="Halfway there"&&vm.runInContext('badges({sum:5,n:1})',page)==="First gift in","badges switch at the goal, at half, and at the first gift");
}catch(e){ok(false,"page math test crashed: "+e.message)}

// Schema: every field the page reads exists in the backend headers
try{
  const g=fakeGoogle("x");const H=vm.runInContext("HEADERS",g);
  const used=f=>[...new Set([...scripts[0].matchAll(new RegExp("\\b"+f+"\\.([a-zA-Z]+)\\b","g"))].map(m=>m[1]))];
  const miss=(u,h)=>u.filter(x=>!h.includes(x));
  ok(miss(used("g"),H.Donations).length===0,"every donation field the page reads is a Donations column"+(miss(used("g"),H.Donations).length?": "+miss(used("g"),H.Donations):""));
  ok(miss(used("o"),H.Outreach).length===0,"every outreach field the page reads is an Outreach column"+(miss(used("o"),H.Outreach).length?": "+miss(used("o"),H.Outreach):""));
  const setupSheets=(fs.readFileSync("backend/Code.gs","utf8").match(/\[('[A-Za-z]+'(?:, )?)+\]\.forEach\(sheet_\)/)||[""])[0];
  ok(Object.keys(H).every(k=>setupSheets.includes("'"+k+"'")),"setup() creates every sheet in HEADERS");
}catch(e){ok(false,"schema test crashed: "+e.message)}

// The guide only names "How it came in" options that exist
try{
  const ev=JSON.parse(scripts[0].match(/const EVENTS=(\[[^\]]*\])/)[1]);
  const guide=(html.match(/<details class="guide"[\s\S]*?<\/details>/)||[""])[0];
  ok(guide.length>0,"the page has the How the Heart Meter works guide");
  const named=[...guide.matchAll(/pick "([^"]+)"/g)].map(m=>m[1]);
  ok(named.length>0&&named.every(n=>ev.includes(n)),"every option the guide tells leaders to pick exists ("+named.join(", ")+")");
  ok(!/zeffy|givebutter/i.test(html),"the page names no donation platform HoP has not approved");
}catch(e){ok(false,"guide test crashed: "+e.message)}

// Spotfund: read HoP's organization page, keep the last good read, count only above the baseline
try{
  const C="Secret-Code";const fx=fs.readFileSync("tests/fixtures/spotfund-org.html","utf8");
  const A="aaaaaaaa-0000-4000-8000-000000000001",B="bbbbbbbb-0000-4000-8000-000000000002";
  const g=fakeGoogle(C);
  const list=g.parseSpotfund_(fx);
  ok(list.length===3,"parser finds each fundraiser once and skips one with no owner or amount ("+list.length+")");
  const a=list.find(x=>x.storyId===A);
  ok(a&&a.raised===250.5&&a.goal===1000&&a.donors===3&&a.created==="2026-11-01"&&a.title==="HoPTest2027"&&a.owner==="Testa L","parser reads raised, goal, donors, date, title and first name plus initial");
  ok(g.parseSpotfund_("<html>nothing here</html>").length===0&&g.parseSpotfund_("").length===0,"a page without fundraisers gives an empty list, never invented rows");
  const links=g.spotfundLinks_("Kate="+A+"|100, Ava="+B+", Nobody="+A+", Ella=not-an-id",["Kate","Ava","Ella"]);
  ok(links.length===2&&links[0].baseline===100&&links[1].baseline===0,"links read the baseline, default it to 0, and skip unknown leaders and bad ids");

  g.spot.body=fx;
  ok(g.installSpotfund()===3&&g.triggers.filter(t=>t.fn==="spotfundSync").length===1,"installSpotfund reads now and schedules one hourly read");
  g.installSpotfund();
  ok(g.triggers.filter(t=>t.fn==="spotfundSync").length===1,"running installSpotfund twice keeps one trigger");
  ok(g.sheets.Spotfund.rows.length===4&&g.props.spotfundError===""&&!!g.props.spotfundReadAt,"a good read saves every fundraiser and clears the error");

  g.get();g.sheets.Settings.rows.push(["spotfund","Kate="+A+"|100, Ava="+B+"|1500"]);
  let r=g.get();
  const k=r.spotfund.stories.find(x=>x.leader==="Kate"),v=r.spotfund.stories.find(x=>x.leader==="Ava");
  ok(k.counts===150.5&&k.raised===250.5&&k.found,"a linked fundraiser counts only what is above its baseline");
  ok(v.counts===0,"a baseline above the raised amount counts $0, never a negative");
  ok(r.spotfund.stories.length===2&&r.settings.spotfund===undefined,"the page gets only linked fundraisers, not the raw Settings");
  ok(r.spotfund.stale===false&&r.spotfund.error==="","a fresh read is not stale");

  const keep=JSON.stringify(g.sheets.Spotfund.rows);
  const fails=[[503,fx,"Spotfund answered 503"],[0,fx,"could not reach Spotfund"],[200,"<html>new design</html>","no fundraisers found"],[200,fx.replace(/\{\\"id\\":\\"cccccccc[^]*?\\"partner\\":null\},?/,""),"fewer than the 3"]];
  fails.forEach(([code,body,msg])=>{
    g.spot.code=code;g.spot.body=body;let thrown="";
    try{g.spotfundSync()}catch(e){thrown=e.message}
    ok(thrown.includes(msg)&&g.props.spotfundError.includes(msg)&&JSON.stringify(g.sheets.Spotfund.rows)===keep,"when the read fails ("+msg+"), it throws, says why, and keeps the last good read");
  });
  ok(g.get().spotfund.error.includes("fewer"),"the page sees the error");
  g.sheets.Log.rows.filter(x=>x[1]==="spotfund_error").length>=4?ok(true,"every failed read is in the Log"):ok(false,"every failed read is in the Log");
  g.props.spotfundReadAt=new Date(Date.now()-4*3600*1000).toISOString();
  ok(g.get().spotfund.stale===true,"a read older than 3 hours is stale");
  g.spot.code=200;g.spot.body=fx;g.spotfundSync();
  ok(g.props.spotfundError===""&&g.get().spotfund.stale===false,"the next good read clears the error");
  const g2=fakeGoogle(C);
  ok(g2.get().spotfund.stories.length===0&&g2.get().spotfund.readAt==="","with no Spotfund links and no read, the page gets an empty Spotfund block");
}catch(e){ok(false,"Spotfund test crashed: "+e.message)}
console.log(fails?`\n${fails} check(s) failed`:"\nall checks passed");process.exit(fails?1:0);
