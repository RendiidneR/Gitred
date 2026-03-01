const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let users = [];      // Постоянная база (до перезагрузки сервера)
let usersQueue = {}; // Очередь для подтверждения кодом
let posts = [];      // Лента постов

const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true, 
    auth: {
        user: 'alesha.sirotkin13@yandex.ru',
        pass: 'bdyobjnrgreuyamw' 
    }
});

// РЕГИСТРАЦИЯ: Шаг 1 (Отправка кода)
app.post('/send-code', (req, res) => {
    const { email, password } = req.body;
    const code = Math.floor(1000 + Math.random() * 9000).toString(); 
    usersQueue[email] = { code, password };

    transporter.sendMail({
        from: 'alesha.sirotkin13@yandex.ru',
        to: email,
        subject: 'Код LiquidNet',
        text: `Ваш код: ${code}`
    }, (err) => {
        if (err) return res.status(500).json({ message: "Ошибка почты" });
        res.status(200).json({ message: "Отправлено" });
    });
});

// РЕГИСТРАЦИЯ: Шаг 2 (Проверка кода и сохранение)
app.post('/verify-code', (req, res) => {
    const { email, code } = req.body;
    if (usersQueue[email] && usersQueue[email].code === code) {
        // Переносим из очереди в базу пользователей
        users.push({ email, password: usersQueue[email].password });
        delete usersQueue[email];
        res.status(200).json({ message: "Зарегистрирован" });
    } else {
        res.status(400).json({ message: "Неверный код" });
    }
});

// ВХОД (Логин)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.status(200).json({ message: "Успешный вход", email: user.email });
    } else {
        res.status(401).json({ message: "Неверный email или пароль" });
    }
});

// ПОСТЫ
app.get('/posts', (req, res) => res.json(posts));
app.post('/posts', (req, res) => {
    const newPost = { email: req.body.email, text: req.body.text, date: new Date().toLocaleTimeString() };
    posts.unshift(newPost);
    res.json(newPost);
});

const fs = require('fs');
// Функции для работы с "базой данных" в файле db.json
const DB_FILE = './db.json';
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) return { users: [], posts: [], servers: [{id: 1, name: 'Главный'}] };
    return JSON.parse(fs.readFileSync(DB_FILE));
};
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// ... (вставь это внутрь своих маршрутов)
app.post('/posts', (req, res) => {
    const db = readDB();
    const newPost = { 
        id: Date.now(),
        email: req.body.email, 
        text: req.body.text, 
        serverId: req.body.serverId || 1, // Привязка к серверу
        date: new Date().toLocaleTimeString() 
    };
    db.posts.push(newPost);
    writeDB(db);
    res.json(newPost);
});

let currentServerId = 1;

// Переключение серверов
function switchServer(id) {
    currentServerId = id;
    document.querySelectorAll('.server-icon').forEach(el => el.classList.remove('active'));
    // Логика фильтрации сообщений по serverId
    loadMessages();
}

// Редактирование профиля
function editProfile() {
    const newNick = prompt("Введите новый никнейм:");
    const newAvatart = prompt("Введите URL аватарки:");
    if(newNick) document.getElementById('my-name').innerText = newNick;
    if(newAvatart) {
        // Логика обновления аватарки в CSS или через src
    }
}

// Звонок (имитация)
function startCall(user) {
    alert("Звонок пользователю " + user + "... (Подключение WebRTC)");
}

// Исправленная загрузка сообщений (без лишних анимаций)
async function loadMessages() {
    const res = await fetch(`${API}/posts`);
    const allMsgs = await res.json();
    
    // Фильтруем сообщения только для текущего сервера
    const msgs = allMsgs.filter(m => m.serverId === currentServerId);
    
    const area = document.getElementById('messages');
    const oldHtml = area.innerHTML;
    const newHtml = msgs.slice().reverse().map(m => `
        <div class="message">
            <div class="msg-avatar" style="background-image: url('${m.avatar || ''}')"></div>
            <div class="msg-content">
                <b>${m.nickname || m.email.split('@')[0]}</b>
                <p>${m.text}</p>
            </div>
        </div>
    `).join('');

    if (oldHtml !== newHtml) {
        area.innerHTML = newHtml;
        area.scrollTop = area.scrollHeight;
    }
}

app.listen(3000, () => console.log('Сервер: http://localhost:3000'));