const express = require('express');
const app = express();

app.use(express.json());

app.use(express.static(__dirname));

let verificationCodes = {};

app.post('/request-code', function (req, res) {
  const email = req.body.email;
  const code = String(Math.floor(10000 + Math.random() * 90000));
  verificationCodes[email] = code;
  console.log('Код для', email, ':', code);
  res.send({ success: true });
});

app.post('/verify-code', function (req, res) {
  const email = req.body.email;
  const code = req.body.code;

  if (verificationCodes[email] === code) {
    res.send({ success: true });
  } else {
    res.send({ success: false });
  }
});

app.listen(3000, function () {
  console.log('Сервер працює на http://localhost:3000');
});