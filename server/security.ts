import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { pool, authenticateUser, hashPassword } from './database.ts';

const digest = (token:string) => createHash('sha256').update(token).digest('hex');
const cookieName = 'vibe_session';
// Absolute cap: a session can never outlive this, however active the user is.
const absoluteDays = 7;
// Idle timeout: a session with no activity for this long is invalidated.
// Enforced server-side so closing the tab or sleeping the laptop still ends it.
export const idleSeconds = Math.max(60, Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60);
const cookie = (value:string, req:Request, age:number) => `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${age}${req.secure || req.headers['x-forwarded-proto']==='https' ? '; Secure' : ''}`;
export const sessionToken = (req:Request) => /(?:^|;\s*)vibe_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];
export async function identity(id:string) {
  const user=(await pool.query('SELECT id,name,email,global_role AS role,company_id FROM users WHERE id=$1',[id])).rows[0];
  if(!user) return null;
  const workspaces=(await pool.query(`SELECT o.id,o.name,o.code,coalesce(m.role, CASE WHEN $2='superadmin' THEN 'superadmin' ELSE 'corporate' END) AS role FROM organizations o LEFT JOIN memberships m ON m.organization_id=o.id AND m.user_id=$1 AND m.active WHERE $2='superadmin' OR ($2='corporate' AND o.company_id=$3) OR ($2='creator' AND m.user_id=$1) ORDER BY o.created_at`,[id,user.role,user.company_id])).rows;
  return {id:user.id,name:user.name,email:user.email,role:user.role,companyId:user.company_id,workspaces};
}
export async function login(email:string,password:string,req:Request,res:Response) {
  const user=await authenticateUser(email,password);
  const token=randomBytes(32).toString('base64url');
  // Housekeeping: drop expired / long-idle sessions before issuing a new one.
  await pool.query('DELETE FROM auth_sessions WHERE expires_at<=now() OR last_seen_at<=now()-make_interval(secs=>$1)',[idleSeconds]);
  await pool.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at,last_seen_at) VALUES($1,$2,now()+make_interval(days=>$3),now())",[digest(token),user.id,absoluteDays]);
  res.setHeader('Set-Cookie',cookie(token,req,idleSeconds));
  res.setHeader('X-Session-Idle-Seconds',String(idleSeconds));
  return identity(user.id);
}
export async function logout(req:Request,res:Response) {
  const token=sessionToken(req);
  if(token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(token)]);
  res.setHeader('Set-Cookie',cookie('',req,0));
}
export async function authenticate(req:Request,res:Response,next:NextFunction) {
  try {
    const token=sessionToken(req);
    if(!token) return res.status(401).json({error:'Authentication required'});
    // Valid only while inside BOTH the absolute cap and the idle window.
    const result=await pool.query(
      'SELECT user_id FROM auth_sessions WHERE token_hash=$1 AND expires_at>now() AND last_seen_at>now()-make_interval(secs=>$2)',
      [digest(token),idleSeconds]
    );
    if(!result.rowCount) return res.status(401).json({error:'Authentication required'});
    const user=await identity(result.rows[0].user_id);
    if(!user) return res.status(401).json({error:'Authentication required'});
    // Slide both the stored timestamp and the cookie so active users stay signed in.
    await pool.query('UPDATE auth_sessions SET last_seen_at=now() WHERE token_hash=$1',[digest(token)]);
    res.setHeader('Set-Cookie',cookie(token,req,idleSeconds));
    res.locals.user=user;
    next();
  } catch(error) {next(error);}
}
export function permitted(user:any,workspaceId:unknown,manage=false) {
  if(typeof workspaceId!=='string' || !workspaceId) return false;
  if(user.role==='superadmin') return true;
  if(!user.workspaces.some((w:any)=>w.id===workspaceId)) return false;
  return !manage || user.role==='corporate';
}
export function requireWorkspace(source:(req:Request)=>unknown,manage=false) {
  return (req:Request,res:Response,next:NextFunction) => permitted(res.locals.user,source(req),manage) ? next() : res.status(403).json({error:'Workspace access denied'});
}
export async function provisionSuperadmin() {
  const email=process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.SUPERADMIN_PASSWORD;
  if(!email || !password) return;
  if(password.length<12) throw new Error('SUPERADMIN_PASSWORD must be at least 12 characters');
  const existing=await pool.query('SELECT id,global_role FROM users WHERE email=$1',[email]);
  if(existing.rowCount) {
    if(existing.rows[0].global_role!=='superadmin') throw new Error('SUPERADMIN_EMAIL belongs to a non-superadmin account');
    return;
  }
  await pool.query(`INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,$2,$3,$4,'superadmin')`,[`usr-${randomUUID()}`,process.env.SUPERADMIN_NAME||'Superadmin',email,await hashPassword(password)]);
}
