const port = 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const validEmail = 'test@gmail.com';
const validPassword = '1234';

app.post('/login', (req, res) => {
  const { email, password, redirect } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  //sql injection?
  const sql = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

  if (email === validEmail && password === validPassword) {
    //redirection을 통한 침투 테스트
    if (redirect) {
      return res.redirect(redirect);
    }

    return res.redirect('/success');
  } 
  else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
});


app.get('/success', (req, res) => {
  res.send('<h1>Login Successful!</h1>');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
