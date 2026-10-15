const {pendingControl}=require('../utils/pendingAccountControl');
const {control}=require('../utils/accountControl');
const {signChange}=require('../utils/passwordChangeToken');
const crypto=require('node:crypto');
const db=require('../config/db');
const {signPortalToken}=require('../utils/portalToken');
const {signApplicant}=require('../utils/applicantToken');
const {checkPassword}=require('../utils/accountPasswords');
const dummyHash='scrypt:'+'0'.repeat(32)+':'+'0'.repeat(128);
async function matches(password,stored){if(typeof stored!=='string'){await checkPassword(password,dummyHash);return false;}if(stored.startsWith('scrypt:'))return checkPassword(password,stored);return crypto.timingSafeEqual(crypto.createHash('sha256').update(password).digest(),crypto.createHash('sha256').update(stored).digest());}
async function loginMember(req,res){
 const {acc_username,password}=req.body||{};
 if(typeof acc_username!=='string'||!acc_username.trim()||acc_username.length>60||typeof password!=='string'||!password||password.length>128)return res.status(400).json({success:false,message:'Enter your username and password.'});
 try{
  const username=acc_username.trim();
  const [accounts]=await db.execute('SELECT id,username,email,password_hash,email_verified_at,approval_status,profile_completed_at FROM pending_accounts WHERE LOWER(TRIM(username))=LOWER(?) LIMIT 2',[username]);
  if(accounts.length>1)return res.status(401).json({success:false,message:'Invalid username or password.'});
  const account=accounts[0];
  if(account&&account.approval_status!=='Approved'){
   if(!await checkPassword(password,account.password_hash))return res.status(401).json({success:false,message:'Invalid username or password.'});
   const access=await pendingControl(account.id);if(access.access_status!=='Active')return res.status(403).json({success:false,message:'Your account access is inactive or archived. Contact the office.'});
   if(!account.email_verified_at)return res.status(403).json({success:false,message:'Verify your email first. Open the email link or use Resend verification.'});
   return res.json({success:true,accountType:'applicant',role:'applicant',profileComplete:Boolean(account.profile_completed_at),token:signApplicant(account.id,Number(access.session_version)),user:{username:account.username,email:account.email}});
  }
  const [members]=await db.execute(`SELECT ul.password,ud.id,ud.acc_username,ud.first_name,ud.middle_name,ud.last_name,ud.pwd_id,ud.disability,ud.house_number,ud.street,ud.baranggay,ud.municipality,ud.province,ud.age,ud.birthday FROM userlogin ul JOIN userdata ud ON ud.acc_username=ul.acc_username WHERE LOWER(TRIM(ul.acc_username))=LOWER(?) LIMIT 2`,[username]);
  if(members.length!==1||!await matches(password,members[0]?.password))return res.status(401).json({success:false,message:'Invalid username or password.'});
  if(account){
   const [links]=await db.execute("SELECT id FROM membership_applications WHERE account_id=? AND member_id=? AND status='Approved' LIMIT 1",[account.id,members[0].id]);
   if(!links.length||!account.email_verified_at)return res.status(409).json({success:false,message:'The verified account link is unavailable. Contact the PWD office.'});
  }
  const {password:ignored,...user}=members[0];void ignored;
  const state=await control('user',user.acc_username);if(!state||state.managed_status!=='Active')return res.status(401).json({success:false,message:'Account is inactive or archived. Contact the office.'});
  if(Number(state.must_change_password))return res.json({success:true,accountType:'password_change',role:'password_change',token:signChange('user',user.acc_username,Number(state.session_version))});
  return res.json({success:true,accountType:'member',role:'user',token:signPortalToken('user',user.acc_username,Number(state.session_version)),user});
 }catch(error){console.error('User login:',error.code||error.message);return res.status(503).json({success:false,message:'Login is unavailable. Check the workflow migration and backend configuration.'});}
};

const {signAdmin}=require('../utils/adminAccessToken');
const invalid=res=>res.status(401).json({success:false,message:'Invalid username or password, or account unavailable. Contact the office if needed.'});
exports.loginUser=async(req,res)=>{
 const {username,password}=req.body||{};
 if(typeof username!=='string'||!username.trim()||username.length>60||typeof password!=='string'||!password||password.length>128)return res.status(400).json({success:false,message:'Enter your username and password.'});
 try{
  const name=username.trim();
  const [memberAccounts]=await db.execute('SELECT acc_username AS username FROM userlogin WHERE LOWER(TRIM(acc_username))=LOWER(?) UNION ALL SELECT username FROM pending_accounts WHERE LOWER(TRIM(username))=LOWER(?)',[name,name]);
  const [staffAccounts]=await db.execute('SELECT sl.id,sl.staff_username,sl.staff_password,sd.first_name,sd.last_name,sd.Staff_id AS staff_id,sd.account_status,sd.staff_since FROM stafflogin sl LEFT JOIN staffdata sd ON sl.staff_username=sd.staff_username WHERE LOWER(TRIM(sl.staff_username))=LOWER(?) LIMIT 2',[name]);
  const [admins]=await db.execute('SELECT id,username,password,account_status FROM adminlogin WHERE LOWER(TRIM(username))=LOWER(?) LIMIT 2',[name]);
  const roles=Number(memberAccounts.length>0)+Number(staffAccounts.length>0)+Number(admins.length>0);
  if(roles!==1){await checkPassword(password,dummyHash);return invalid(res);}
  if(memberAccounts.length)return loginMember({...req,body:{acc_username:name,password}},res);
  if(staffAccounts.length){
   const staff=staffAccounts[0];const valid=await matches(password,staff.staff_password);
   if(staffAccounts.length!==1||!valid||staff.account_status!=='Active')return invalid(res);
   const state=await control('staff',staff.staff_username);if(!state||state.managed_status!=='Active')return invalid(res);
   if(Number(state.must_change_password))return res.json({success:true,accountType:'password_change',role:'password_change',token:signChange('staff',staff.staff_username,Number(state.session_version))});
   return res.json({success:true,accountType:'staff',role:'staff',token:signPortalToken('staff',staff.staff_username,Number(state.session_version)),user:{id:staff.id,staff_username:staff.staff_username,firstName:staff.first_name||'Staff',lastName:staff.last_name||'',role:'staff',staff_id:staff.staff_id,account_status:staff.account_status,staff_since:staff.staff_since}});
  }
  const admin=admins[0];const valid=await checkPassword(password,admin?.password||dummyHash);
  if(admins.length!==1||!valid||admin.account_status!=='Active')return invalid(res);
  return res.json({success:true,accountType:'admin',role:'admin',token:signAdmin(admin.id),admin:{id:admin.id,username:admin.username}});
 }catch(error){console.error('Portal login:',error.code||error.message);return res.status(503).json({success:false,message:'Login is unavailable. Check backend configuration and account migrations.'});}
};
