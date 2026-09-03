require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: 'root', password: '', database: 'online_quiz',
  waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4'
});

const subjectIcons = {
  'java':'☕','dbms':'🗄️','cyber security':'🛡️','data mining':'⛏️',
  'software engineering':'⚙️','computer networks':'🌐','operating systems':'💻',
  'cloud computing':'☁️','python':'🐍','artificial intelligence':'🤖'
};
const subjectColors = ['#fff1e6','#eaf2ff','#f3eaff','#e9fbf2','#fff8df','#eafaff'];
const explanations = {
  1:'The Java keyword extends is used when one class inherits from another class.',
  2:'main() is the standard entry point from which a Java application starts execution.',
  3:'String is a class/reference type, while int, float and char are primitive types.',
  4:'A semicolon (;) terminates most Java statements.',
  5:'The new keyword creates an object and allocates memory for it.',
  6:'A Set collection does not allow duplicate elements.',
  7:'Polymorphism allows the same interface or method name to represent different forms.',
  8:'The final keyword can prevent a class from being inherited.',
  9:'Scanner is available in the java.util package.',
  10:'private is the most restrictive Java access modifier.',
  11:'DBMS stands for Database Management System.',
  12:'SQL is the standard language used to query and manage relational databases.',
  13:'A primary key uniquely identifies each row and cannot contain duplicate values.',
  14:'SELECT is used to retrieve data from a database.',
  15:'INSERT adds new rows to a table.',
  16:'WHERE filters rows according to a condition.',
  17:'CREATE is a DDL command used to create database objects.',
  18:'Normalization reduces unnecessary redundancy and update anomalies.',
  19:'A foreign key references a key in another table.',
  20:'UPDATE changes existing rows in a table.',
  21:'CIA represents Confidentiality, Integrity and Availability, the three core security goals.',
  22:'Phishing is a social-engineering attack that tricks users into revealing sensitive information.',
  23:'SHA-256 is a cryptographic hash function commonly used for integrity and password-related applications.',
  24:'Least privilege means giving a user only the permissions needed to perform the required task.',
  25:'MFA means Multi-Factor Authentication and combines two or more authentication factors.',
  26:'DDoS is a network attack that attempts to make a service unavailable by overwhelming it with traffic.',
  27:'HTTPS protects web traffic using TLS encryption.',
  28:'A VPN creates an encrypted tunnel between the device and the VPN endpoint.',
  29:'SQL Injection inserts malicious SQL through application input to manipulate database queries.',
  30:'A firewall filters network traffic according to configured security rules.'
};


function cleanString(value,max){
  if(typeof value!=='string') return '';
  return value.trim().replace(/\s+/g,' ').slice(0,max);
}
function validEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }
function validName(name){ return /^[A-Za-z][A-Za-z .'-]{1,99}$/.test(name); }
function validPassword(password){ return typeof password==='string' && /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(password); }
function validationError(res,message){ return res.status(400).json({error:message}); }

function safeUser(row){ if(!row) return null; const {password,...user}=row; return user; }
function iconFor(name){ return subjectIcons[String(name||'').trim().toLowerCase()] || '📚'; }
function colorFor(id){ return subjectColors[(Number(id||1)-1)%subjectColors.length]; }

async function columnExists(table,column){
  const [r]=await pool.query(`SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,[table,column]);
  return !!r[0].c;
}
async function addColumnIfMissing(table,column,definition){
  if(!(await columnExists(table,column))) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
async function initDb(){
  await pool.query('ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await pool.query('ALTER TABLE subjects CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await pool.query('ALTER TABLE questions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await addColumnIfMissing('users','gender',"ENUM('MALE','FEMALE','OTHER') NOT NULL DEFAULT 'OTHER' AFTER role");
  await addColumnIfMissing('subjects','icon',"VARCHAR(20) NOT NULL DEFAULT '📚' AFTER description");
  await addColumnIfMissing('subjects','color',"VARCHAR(20) NOT NULL DEFAULT '#3157d5' AFTER icon");
  await addColumnIfMissing('subjects','test_duration',"INT NOT NULL DEFAULT 10 AFTER color");
  await addColumnIfMissing('questions','explanation',"TEXT NULL AFTER correct_answer");
  await addColumnIfMissing('quiz_attempts','suspicious_activity_count',"INT NOT NULL DEFAULT 0");
  await addColumnIfMissing('quiz_attempts','suspicious_status',"VARCHAR(30) NOT NULL DEFAULT 'NORMAL'");
  await pool.query(`CREATE TABLE IF NOT EXISTS suspicious_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NULL,
    attempt_id INT NULL,
    activity_type VARCHAR(50) NOT NULL,
    details VARCHAR(255),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id), INDEX(attempt_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query('UPDATE subjects SET icon=?, color=? WHERE name=?',['☕','#fff1e6','Java']);
  await pool.query('UPDATE subjects SET icon=?, color=? WHERE name=?',['🗄️','#eaf2ff','DBMS']);
  await pool.query('UPDATE subjects SET icon=?, color=? WHERE name=?',['🛡️','#f3eaff','Cyber Security']);
  await pool.query("UPDATE subjects SET icon='📚' WHERE icon IS NULL OR icon=''");
  const [qs]=await pool.query('SELECT id,question,option_a,option_b,option_c,option_d,correct_answer FROM questions WHERE explanation IS NULL OR explanation=""');
  for(const q of qs){
    const text=explanations[q.id] || `The correct answer is ${q.correct_answer}: ${q['option_'+String(q.correct_answer).toLowerCase()]}. Review this concept in your ${'subject'} notes for deeper understanding.`;
    await pool.query('UPDATE questions SET explanation=? WHERE id=?',[text,q.id]);
  }
}

app.get('/api/health', async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,database:'online_quiz'});}catch(e){res.status(500).json({ok:false,error:e.message});}});

app.post('/api/register',async(req,res)=>{try{const {name,email,password,gender='OTHER'}=req.body;
    const n=cleanString(name,100), e=String(email||'').trim().toLowerCase(), p=String(password||'');
    if(!n||!e||!p)return validationError(res,'Name, email and password are required');
    if(!validName(n))return validationError(res,'Name must be 2–100 characters and contain letters, spaces, apostrophes or hyphens');
    if(!validEmail(e))return validationError(res,'Enter a valid email address');
    if(!validPassword(p))return validationError(res,'Password must be 8–72 characters and include at least one letter and one number');
    if(!['MALE','FEMALE','OTHER'].includes(gender))return validationError(res,'Invalid gender selection');const [exists]=await pool.query('SELECT id FROM users WHERE email=?',[e]);if(exists.length)return res.status(409).json({error:'Email already registered'});const [r]=await pool.query('INSERT INTO users(name,email,password,role,gender) VALUES(?,?,?,'+"'STUDENT'"+',?)',[name,email,password,gender]);const [rows]=await pool.query('SELECT * FROM users WHERE id=?',[r.insertId]);res.json({message:'Registration successful',user:safeUser(rows[0])});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/login',async(req,res)=>{try{const {email,password}=req.body;
    const e=String(email||'').trim().toLowerCase(), p=String(password||'');
    if(!e||!p)return validationError(res,'Email and password are required');
    if(!validEmail(e))return validationError(res,'Enter a valid email address');
    const [rows]=await pool.query('SELECT * FROM users WHERE email=? AND password=?',[e,p]);if(!rows.length)return res.status(401).json({error:'Invalid email or password'});res.json({message:'Login successful',user:safeUser(rows[0])});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/forgot-password',async(req,res)=>{try{const {email,newPassword}=req.body;
    const e=String(email||'').trim().toLowerCase(), p=String(newPassword||'');
    if(!e||!p)return validationError(res,'Email and new password are required');
    if(!validEmail(e))return validationError(res,'Enter a valid email address');
    if(!validPassword(p))return validationError(res,'New password must be 8–72 characters and include at least one letter and one number');const [rows]=await pool.query('SELECT id FROM users WHERE email=?',[e]);if(!rows.length)return res.status(404).json({error:'No account found with this email'});await pool.query('UPDATE users SET password=? WHERE id=?',[newPassword,rows[0].id]);res.json({message:'Password reset successful'});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/users/:id',async(req,res)=>{try{const {name,gender}=req.body;await pool.query('UPDATE users SET name=?,gender=? WHERE id=?',[name,gender,req.params.id]);const [r]=await pool.query('SELECT * FROM users WHERE id=?',[req.params.id]);res.json({user:safeUser(r[0])});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/users',async(req,res)=>{try{const [r]=await pool.query('SELECT id,name,email,role,gender,created_at FROM users ORDER BY id DESC');res.json(r);}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/students',async(req,res)=>{try{const {name,email,password,gender='OTHER'}=req.body;
    const n=cleanString(name,100), e=String(email||'').trim().toLowerCase(), p=String(password||'');
    if(!n||!e||!p)return validationError(res,'Name, email and password are required');
    if(!validName(n))return validationError(res,'Name must be 2–100 characters and contain letters, spaces, apostrophes or hyphens');
    if(!validEmail(e))return validationError(res,'Enter a valid email address');
    if(!validPassword(p))return validationError(res,'Password must be 8–72 characters and include at least one letter and one number');
    if(!['MALE','FEMALE','OTHER'].includes(gender))return validationError(res,'Invalid gender selection');const [ex]=await pool.query('SELECT id FROM users WHERE email=?',[e]);if(ex.length)return res.status(409).json({error:'Email already registered'});const [r]=await pool.query("INSERT INTO users(name,email,password,role,gender) VALUES(?,?,?,'STUDENT',?)",[name,email,password,gender]);const [rows]=await pool.query('SELECT id,name,email,role,gender,created_at FROM users WHERE id=?',[r.insertId]);res.json({message:'Student added successfully',user:rows[0]});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/students/:id',async(req,res)=>{try{const [u]=await pool.query("SELECT role FROM users WHERE id=?",[req.params.id]);if(!u.length)return res.status(404).json({error:'Student not found'});if(u[0].role!=='STUDENT')return res.status(400).json({error:'Only student accounts can be deleted'});await pool.query('DELETE FROM users WHERE id=?',[req.params.id]);res.json({message:'Student deleted successfully'});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/subjects',async(req,res)=>{try{const [rows]=await pool.query(`SELECT s.*, COUNT(q.id) question_count FROM subjects s LEFT JOIN questions q ON q.subject_id=s.id GROUP BY s.id ORDER BY s.id`);res.json(rows.map(x=>({...x,icon:x.icon||iconFor(x.name),color:x.color||colorFor(x.id)})));}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/subjects',async(req,res)=>{try{const {name,description='',icon,test_duration=10}=req.body;
    const n=cleanString(name,100), d=cleanString(description,255), ic=String(icon||'📚').trim();
    const duration=Number(test_duration);
    if(!n)return validationError(res,'Subject name is required');
    if(n.length<2)return validationError(res,'Subject name must be at least 2 characters');
    if(!Number.isInteger(duration)||duration<1||duration>180)return validationError(res,'Test duration must be a whole number from 1 to 180 minutes');
    if(ic.length<1||[...ic].length>4)return validationError(res,'Subject icon must be 1–4 characters');
    const finalIcon=icon||iconFor(name);const [r]=await pool.query('INSERT INTO subjects(name,description,icon,color,test_duration) VALUES(?,?,?,?,?)',[n,d,ic||iconFor(n),colorFor(Date.now()),duration]);const [rows]=await pool.query('SELECT * FROM subjects WHERE id=?',[r.insertId]);res.json(rows[0]);}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/subjects/:id',async(req,res)=>{try{const {name,description='',icon='📚',test_duration=10}=req.body;const duration=Math.max(1,Math.min(180,Number(test_duration)||10));await pool.query('UPDATE subjects SET name=?,description=?,icon=?,test_duration=? WHERE id=?',[name,description,icon,duration,req.params.id]);res.json({message:'Subject updated'});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/subjects/:id',async(req,res)=>{try{await pool.query('DELETE FROM subjects WHERE id=?',[req.params.id]);res.json({message:'Subject deleted'});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/questions',async(req,res)=>{try{let q='SELECT q.*,s.name subject_name FROM questions q JOIN subjects s ON s.id=q.subject_id';const p=[];if(req.query.subject_id){q+=' WHERE q.subject_id=?';p.push(req.query.subject_id);}q+=' ORDER BY q.id';const [rows]=await pool.query(q,p);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/questions',async(req,res)=>{try{const {subject_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation=''}=req.body;
    const q=cleanString(question,1000), a=cleanString(option_a,500), b=cleanString(option_b,500), c=cleanString(option_c,500), d=cleanString(option_d,500), ex=cleanString(explanation,1500), ca=String(correct_answer||'').trim().toUpperCase();
    if(!subject_id||!q||!a||!b||!c||!d||!ca)return validationError(res,'All question fields are required');
    if(q.length<5)return validationError(res,'Question must be at least 5 characters');
    if([a,b,c,d].some(x=>x.length<1))return validationError(res,'All four answer options are required');
    if(!['A','B','C','D'].includes(ca))return validationError(res,'Correct answer must be A, B, C or D');const [r]=await pool.query('INSERT INTO questions(subject_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation) VALUES(?,?,?,?,?,?,?,?)',[subject_id,q,a,b,c,d,ca,ex]);res.json({id:r.insertId,message:'Question added'});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/questions/:id',async(req,res)=>{try{const {subject_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation=''}=req.body;await pool.query('UPDATE questions SET subject_id=?,question=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_answer=?,explanation=? WHERE id=?',[subject_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,req.params.id]);res.json({message:'Question updated'});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/questions/:id',async(req,res)=>{try{await pool.query('DELETE FROM questions WHERE id=?',[req.params.id]);res.json({message:'Question deleted'});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/quiz/:subjectId',async(req,res)=>{try{const [rows]=await pool.query('SELECT id,subject_id,question,option_a,option_b,option_c,option_d FROM questions WHERE subject_id=? ORDER BY RAND() LIMIT 10',[req.params.subjectId]);const [sub]=await pool.query('SELECT test_duration FROM subjects WHERE id=?',[req.params.subjectId]);res.json({questions:rows,test_duration:Number(sub[0]?.test_duration||10)});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/quiz/suspicious-activity',async(req,res)=>{
  try{
    const {user_id,subject_id,activity_type,details=''}=req.body;
    if(!user_id||!activity_type)return res.status(400).json({error:'Invalid activity event'});
    await pool.query('INSERT INTO suspicious_activities(user_id,subject_id,activity_type,details) VALUES(?,?,?,?)',[user_id,subject_id||null,String(activity_type).slice(0,50),String(details).slice(0,255)]);
    res.json({logged:true});
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/suspicious-activity',async(req,res)=>{
  try{
    const [rows]=await pool.query(`SELECT sa.*,u.name,u.email,s.name subject_name
      FROM suspicious_activities sa JOIN users u ON u.id=sa.user_id
      LEFT JOIN subjects s ON s.id=sa.subject_id ORDER BY sa.event_time DESC LIMIT 200`);
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/quiz/submit',async(req,res)=>{const conn=await pool.getConnection();try{const {user_id,subject_id,answers,suspicious_activity_count=0}=req.body;if(!user_id||!subject_id||!Array.isArray(answers))return res.status(400).json({error:'Invalid quiz submission'});await conn.beginTransaction();let score=0;const checked=[];for(const a of answers){const [rows]=await conn.query('SELECT correct_answer FROM questions WHERE id=?',[a.question_id]);if(!rows.length)continue;const correct=rows[0].correct_answer;const selected=a.selected_answer||null;const ok=selected&&String(selected).toUpperCase()===String(correct).toUpperCase();if(ok)score++;checked.push({question_id:a.question_id,selected_answer:selected,correct_answer:correct,is_correct:!!ok});}const total=checked.length;const percentage=total?score/total*100:0;const [r]=await conn.query('INSERT INTO quiz_attempts(user_id,subject_id,score,total_questions,percentage,suspicious_activity_count,suspicious_status) VALUES(?,?,?,?,?,?,?)',[user_id,subject_id,score,total,percentage,Number(suspicious_activity_count)||0,(Number(suspicious_activity_count)||0)>=3?'REVIEW':'NORMAL']);for(const a of checked)await conn.query('INSERT INTO quiz_answers(attempt_id,question_id,selected_answer,correct_answer,is_correct) VALUES(?,?,?,?,?)',[r.insertId,a.question_id,a.selected_answer,a.correct_answer,a.is_correct]);await conn.commit();res.json({attempt_id:r.insertId,score,total_questions:total,percentage,status:percentage>=40?'PASS':'FAIL'});}catch(e){await conn.rollback().catch(()=>{});res.status(500).json({error:e.message});}finally{conn.release();}});

app.get('/api/results',async(req,res)=>{try{const [rows]=await pool.query(`SELECT r.*,u.name,u.email,u.gender,s.name subject_name,s.icon subject_icon,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.is_correct=1) correct_count,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.is_correct=0 AND x.selected_answer IS NOT NULL) wrong_count,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.selected_answer IS NULL) not_attempted FROM quiz_attempts r JOIN users u ON u.id=r.user_id JOIN subjects s ON s.id=r.subject_id ORDER BY r.quiz_date DESC`);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/results/user/:id',async(req,res)=>{try{const [rows]=await pool.query(`SELECT r.*,s.name subject_name,s.icon subject_icon,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.is_correct=1) correct_count,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.is_correct=0 AND x.selected_answer IS NOT NULL) wrong_count,(SELECT COUNT(*) FROM quiz_answers x WHERE x.attempt_id=r.id AND x.selected_answer IS NULL) not_attempted FROM quiz_attempts r JOIN subjects s ON s.id=r.subject_id WHERE r.user_id=? ORDER BY r.quiz_date DESC`,[req.params.id]);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/results/attempt/:id',async(req,res)=>{try{const [attempts]=await pool.query(`SELECT r.*,u.name,u.email,u.gender,s.name subject_name,s.icon subject_icon FROM quiz_attempts r JOIN users u ON u.id=r.user_id JOIN subjects s ON s.id=r.subject_id WHERE r.id=?`,[req.params.id]);if(!attempts.length)return res.status(404).json({error:'Attempt not found'});const [answers]=await pool.query(`SELECT qa.*,q.question,q.option_a,q.option_b,q.option_c,q.option_d,q.explanation FROM quiz_answers qa JOIN questions q ON q.id=qa.question_id WHERE qa.attempt_id=? ORDER BY qa.id`,[req.params.id]);res.json({attempt:attempts[0],answers});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/leaderboard',async(req,res)=>{try{const [rows]=await pool.query(`SELECT u.id,u.name,u.gender,MAX(r.percentage) best_percentage,COUNT(r.id) attempts FROM quiz_attempts r JOIN users u ON u.id=r.user_id GROUP BY u.id,u.name,u.gender ORDER BY best_percentage DESC LIMIT 20`);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});

const PORT=3000;
initDb().then(()=>app.listen(PORT,()=>console.log(`QuizPro MCA Portal running at http://localhost:${PORT}`))).catch(e=>{console.error('Database initialization failed:',e.message);process.exit(1);});
