import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const router = express.Router();
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

async function measureTree(root) {
  try {
    const stat = await fs.promises.stat(root);
    if (!stat.isDirectory()) return stat.size;
    let total = 0;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        try { if (entry.isDirectory()) stack.push(full); else if (entry.isFile()) total += (await fs.promises.stat(full)).size; } catch {}
      }
    }
    return total;
  } catch { return null; }
}
function mb(bytes) { return bytes === null ? null : Math.round(bytes / 1024 / 1024); }
function item(id, name, location, bytes) { const sizeMB = mb(bytes); return { id, name, location, sizeMB, reclaimable: sizeMB === null ? 'UNAVAILABLE' : `${sizeMB} MB`, measured: sizeMB !== null, selected: sizeMB !== null && sizeMB > 0 }; }

router.post('/cleanup-plan', async (_req, res) => {
  if (!isWindows && !isMac) return res.json({ platform: process.platform, planItems: [], measurement: 'unavailable', totalReclaimableMB: null, totalReclaimableGB: null });
  const home = os.homedir();
  const candidates = isMac ? [
    ['xcode','Xcode DerivedData',path.join(home,'Library/Developer/Xcode/DerivedData')],
    ['chrome','Chrome Cache',path.join(home,'Library/Caches/Google/Chrome')],
    ['safari','Safari Cache',path.join(home,'Library/Caches/com.apple.Safari')],
    ['logs','User Logs',path.join(home,'Library/Logs')],
    ['brew','Homebrew Cache',path.join(home,'Library/Caches/Homebrew')],
  ] : [
    ['temp','Windows User Temp',process.env.TEMP || path.join(home,'AppData/Local/Temp')],
    ['chrome','Chrome Cache',path.join(home,'AppData/Local/Google/Chrome/User Data/Default/Cache')],
    ['crash','Windows Crash Dumps',path.join(home,'AppData/Local/CrashDumps')],
  ];
  try {
    const measured = await Promise.all(candidates.map(async ([id,name,location]) => item(id,name,location,await measureTree(location))));
    const observed = measured.filter(x=>x.measured); const total = observed.reduce((sum,x)=>sum+(x.sizeMB||0),0);
    res.json({ platform:isMac?'macos':'windows', planItems:measured, totalReclaimableMB:observed.length?total:null, totalReclaimableGB:observed.length?+(total/1024).toFixed(1):null, measurement:observed.length?'observed':'unavailable', summary:observed.length?'Cleanup candidates are based on measured filesystem contents.':'No cleanup candidate could be measured on this host.' });
  } catch(err) { res.status(500).json({error:err?.message||'Cleanup measurement failed.'}); }
});

router.post('/kill-port', async (req,res) => {
  const port=Number(req.body?.port);
  if(!Number.isInteger(port)||port<1||port>65535)return res.status(400).json({error:'A valid TCP port (1-65535) is required.'});
  if(!isWindows)return res.status(501).json({error:'Windows port termination is unavailable on this backend platform.',measurement:'unsupported'});
  if(req.body?.confirmed!==true)return res.status(400).json({error:'Explicit confirmation is required to terminate a process.',code:'CONFIRMATION_REQUIRED'});
  try {
    const script='$p=[int]$args[0]; $c=Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; $ids=@($c | Select-Object -ExpandProperty OwningProcess -Unique); foreach($id in $ids){ if($id -and $id -ne 0){ Stop-Process -Id $id -Force -ErrorAction Stop } }; $ids | ConvertTo-Json -Compress';
    const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script,'--',String(port)],{encoding:'utf8',timeout:10000,windowsHide:true});
    const parsed=stdout.trim()?JSON.parse(stdout):[]; const pids=Array.isArray(parsed)?parsed:[parsed];
    res.json({success:true,killedPids:pids.filter(v=>Number.isInteger(v)),measurement:'observed'});
  } catch(err) { res.status(500).json({success:false,error:err?.message||'Port termination failed.'}); }
});

router.post('/toggle-startup', async (req,res) => {
  if(!isWindows)return res.status(501).json({error:'Windows startup management is unavailable on this backend platform.',measurement:'unsupported'});
  const itemName=typeof req.body?.itemName==='string'?req.body.itemName.trim():''; const enable=req.body?.enable;
  if(!itemName||typeof enable!=='boolean')return res.status(400).json({error:'itemName and boolean enable are required.'});
  if(req.body?.confirmed!==true)return res.status(400).json({error:'Explicit confirmation is required for startup changes.',code:'CONFIRMATION_REQUIRED'});
  if(!/^[\w .()\-]+$/.test(itemName))return res.status(400).json({error:'Invalid startup item name.'});
  try {
    const desired=enable?'$true':'$false';
    const script=`$name=$args[0]; $enable=${desired}; $backup='HKCU:\\Software\\WinSuite\\DisabledStartupItems'; $run='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; if($enable){ $v=Get-ItemProperty -Path $backup -Name $name -ErrorAction SilentlyContinue; if($null -eq $v){ throw 'No WinSuite backup exists for this startup item.' }; New-ItemProperty -Path $run -Name $name -Value $v.$name -PropertyType String -Force | Out-Null; Remove-ItemProperty -Path $backup -Name $name -ErrorAction SilentlyContinue } else { $v=(Get-ItemProperty -Path $run -Name $name -ErrorAction SilentlyContinue).$name; if($null -eq $v){ throw 'Startup item is not present in the current-user Run key.' }; New-Item -Path $backup -Force | Out-Null; New-ItemProperty -Path $backup -Name $name -Value $v -PropertyType String -Force | Out-Null; Remove-ItemProperty -Path $run -Name $name -ErrorAction Stop }; 'OK'`;
    const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script,'--',itemName],{encoding:'utf8',timeout:10000,windowsHide:true});
    if(!/OK/i.test(stdout))throw new Error('Startup state change was not confirmed.');
    res.json({success:true,itemName,enabled:enable,measurement:'observed'});
  } catch(err) { res.status(500).json({success:false,error:err?.message||'Startup change failed.',measurement:'unavailable'}); }
});

export default router;
