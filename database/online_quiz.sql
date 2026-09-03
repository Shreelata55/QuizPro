CREATE DATABASE IF NOT EXISTS online_quiz;
USE online_quiz;

DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
  gender ENUM('MALE','FEMALE','OTHER') NOT NULL DEFAULT 'OTHER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  icon VARCHAR(20) NOT NULL DEFAULT '📚',
  color VARCHAR(20) NOT NULL DEFAULT '#3157d5',
  test_duration INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  question TEXT NOT NULL,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject_id INT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  quiz_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspicious_activity_count INT NOT NULL DEFAULT 0,
  suspicious_status VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer CHAR(1),
  correct_answer CHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE suspicious_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject_id INT NULL,
  attempt_id INT NULL,
  activity_type VARCHAR(50) NOT NULL,
  details VARCHAR(255),
  event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id),
  INDEX(attempt_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE SET NULL
);

INSERT INTO users(name,email,password,role,gender) VALUES
('Administrator','admin@quiz.com','admin123','ADMIN','OTHER'),
('Aarav Sharma','aarav@quiz.com','student123','STUDENT','MALE'),
('Ananya Patil','ananya@quiz.com','student123','STUDENT','FEMALE');

INSERT INTO subjects(name,description,icon,color,test_duration) VALUES
('Java','Java programming fundamentals','☕','#fff1e6',10),
('DBMS','Database management systems','🗄️','#eaf2ff',10),
('Cyber Security','Information and cyber security','🛡️','#f3eaff',10),
('Data Mining','Data preprocessing, mining and analytics','⛏️','#e9fbf2',10),
('Software Engineering','Software process, design and testing','⚙️','#fff8df',10);

INSERT INTO questions(subject_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation) VALUES
(1,'Which keyword is used to inherit a class in Java?','implements','extends','inherits','super','B','The extends keyword is used when one class inherits from another class.'),
(1,'Which method is the entry point of a Java program?','start()','run()','main()','init()','C','main() is the standard entry point from which a Java application starts execution.'),
(1,'Which is not a primitive type?','int','float','String','char','C','String is a reference type/class, while int, float and char are primitive types.'),
(1,'Which symbol ends a Java statement?','.',':',';','!','C','A semicolon terminates most Java statements.'),
(1,'Which keyword creates an object?','new','class','this','object','A','The new keyword creates an object and allocates memory for it.'),
(1,'Which collection does not allow duplicate elements?','List','Set','ArrayList','Vector','B','A Set collection does not allow duplicate elements.'),
(1,'Which concept allows many forms?','Inheritance','Polymorphism','Encapsulation','Abstraction','B','Polymorphism allows the same interface or method name to represent different forms.'),
(1,'Which keyword prevents inheritance?','static','final','private','const','B','The final keyword can prevent a class from being inherited.'),
(1,'Which package contains Scanner?','java.io','java.util','java.net','java.sql','B','Scanner is available in the java.util package.'),
(1,'Which access modifier is most restrictive?','public','protected','default','private','D','private is the most restrictive Java access modifier.'),
(2,'What does DBMS stand for?','Database Management System','Data Backup Management System','Database Machine System','Data Management Service','A','DBMS stands for Database Management System.'),
(2,'Which language is used to query relational databases?','HTML','SQL','CSS','XML','B','SQL is the standard language used to query and manage relational databases.'),
(2,'A primary key must be:','Duplicate','Null','Unique','Optional','C','A primary key uniquely identifies each row and cannot contain duplicate values.'),
(2,'Which command retrieves data?','SELECT','INSERT','DELETE','UPDATE','A','SELECT is used to retrieve data from a database.'),
(2,'Which command adds a row?','ADD','INSERT','CREATE','APPEND','B','INSERT adds new rows to a table.'),
(2,'Which clause filters rows?','ORDER BY','GROUP BY','WHERE','HAVING','C','WHERE filters rows according to a condition.'),
(2,'Which is a DDL command?','SELECT','INSERT','CREATE','UPDATE','C','CREATE is a DDL command used to create database objects.'),
(2,'What is normalization used for?','Increasing redundancy','Reducing redundancy','Deleting databases','Encrypting passwords','B','Normalization reduces unnecessary redundancy and update anomalies.'),
(2,'Which key references another table?','Primary key','Foreign key','Candidate key','Super key','B','A foreign key references a key in another table.'),
(2,'Which SQL command changes existing rows?','CHANGE','UPDATE','MODIFY','ALTER','B','UPDATE changes existing rows in a table.'),
(3,'What does CIA stand for in security?','Confidentiality Integrity Availability','Control Internet Access','Computer Internal Audit','Cyber Information Analysis','A','CIA represents Confidentiality, Integrity and Availability, the three core security goals.'),
(3,'Which attack tricks users into revealing information?','Phishing','Defragmentation','Backup','Caching','A','Phishing is a social-engineering attack that tricks users into revealing sensitive information.'),
(3,'Which is used to hash passwords?','SHA-256','HTTP','FTP','DNS','A','SHA-256 is a cryptographic hash function commonly used for integrity and password-related applications.'),
(3,'Which principle means giving minimum required access?','Least privilege','Open access','Maximum privilege','Anonymous access','A','Least privilege means giving a user only the permissions needed to perform the required task.'),
(3,'What does MFA mean?','Multi-Factor Authentication','Managed File Access','Multiple Firewall Application','Main Function Authorization','A','MFA means Multi-Factor Authentication and combines two or more authentication factors.'),
(3,'Which is a network attack?','DDoS','Formatting','Compression','Indexing','A','DDoS is a network attack that attempts to make a service unavailable by overwhelming it with traffic.'),
(3,'Which protocol is encrypted for web traffic?','HTTP','HTTPS','FTP','SMTP','B','HTTPS protects web traffic using TLS encryption.'),
(3,'What does VPN provide?','Encrypted tunnel','More RAM','Database schema','Antivirus only','A','A VPN creates an encrypted tunnel between the device and the VPN endpoint.'),
(3,'Which attack injects malicious SQL into input?','SQL Injection','XSS','DDoS','Brute force','A','SQL Injection inserts malicious SQL through application input to manipulate database queries.'),
(3,'What is a firewall used for?','Filter network traffic','Create passwords','Store databases','Compile code','A','A firewall filters network traffic according to configured security rules.');