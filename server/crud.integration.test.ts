import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAllData, createOrganizationWithAdmin, createUserMembership, deleteDraft, deleteKnowledgeSource, deleteUserMembership, listBootstrap, pool, runMigrations, saveBrand, saveKnowledgeSource, updateOrganization } from './database.ts';

let workspaceId:string;
test.before(async()=>{await runMigrations();await clearAllData();const created=await createOrganizationWithAdmin({organizationName:'CRUD Org',code:'CRUD',sector:'Service',city:'Jakarta',adminName:'Admin',adminEmail:'admin@crud.test'});workspaceId=created.workspace.id;});
test.after(async()=>{await clearAllData();await pool.end();});

test('organization updates persist',async()=>{await updateOrganization(workspaceId,{name:'Updated Org',code:'UPDATED',sector:'Public',city:'Bandung',tagline:'Manual',primaryColor:'#111111',accentColor:'#222222',description:'Manual data'});const data=await listBootstrap(workspaceId);assert.equal(data.workspaces[0].name,'Updated Org');});

test('user membership supports create and delete',async()=>{const user=await createUserMembership(workspaceId,{name:'Creator',email:'creator@crud.test',role:'creator',title:'Writer',department:'Comms'});let data=await listBootstrap(workspaceId);assert.ok(data.users.some(item=>item.id===user.id));await deleteUserMembership(workspaceId,user.id);data=await listBootstrap(workspaceId);assert.ok(!data.users.some(item=>item.id===user.id));});

test('knowledge and brand support delete',async()=>{await saveBrand({workspaceId,organizationName:'Updated Org',unitDepartment:'',defaultLanguage:'id',toneOfVoice:[],terminology:[],bannedWords:[],officialCTAs:[],approvedChannels:[],brandGuidelinesSummary:'',officialDisclaimer:''});await saveKnowledgeSource({id:'manual-source',workspaceId,title:'Manual Source',category:'sop_layanan',owner:'Admin',version:'1',effectiveDate:'',status:'menunggu_persetujuan',uploadDate:new Date().toISOString(),fileSize:'',summary:'',chunks:[]});await deleteKnowledgeSource(workspaceId,'manual-source');const data=await listBootstrap(workspaceId);assert.deepEqual(data.documents,[]);});

test('draft delete removes record',async()=>{await pool.query(`INSERT INTO content_drafts(id,organization_id,title,format,status,current_version,created_by,creator_name) SELECT 'delete-me',$1,'Delete Me','copy_caption','draft',1,u.id,u.name FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organization_id=$1 LIMIT 1`,[workspaceId]);await deleteDraft(workspaceId,'delete-me');assert.equal((await listBootstrap(workspaceId)).drafts.length,0);});
